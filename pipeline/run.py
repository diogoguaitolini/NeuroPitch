"""
pipeline/run.py
---------------
End-to-end pipeline: audio → encode → decode → [optimize loop] → report.

Public API:
    run(audio_path, session_id=None, max_iterations=3, min_delta=0.02) -> dict
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 3
MIN_DELTA = 0.02  # stop early if reward improves less than this between rounds


def run(
    audio_path: str | Path,
    session_id: str | None = None,
    max_iterations: int = MAX_ITERATIONS,
    min_delta: float = MIN_DELTA,
) -> dict:
    """
    Run the full NeuroPitch pipeline on a pitch audio file.

    Steps
    -----
    0. Transcribe the original audio (Whisper).
    1. Encode with TRIBE V2 → voxel maps (cached).
    2. Decode with Neurosynth → cognitive profile.
    3. Score with the reward function.
    4. Loop up to max_iterations:
       a. Identify weak segments.
       b. Rewrite full transcript with GPT-5.4.
       c. Synthesise new audio with OpenAI TTS.
       d. Re-encode and re-decode the new audio.
       e. Check convergence — stop if improvement < min_delta.
    5. Build and return the final report.

    Parameters
    ----------
    audio_path : path to the original pitch audio (.wav / .mp3 / .flac).
    session_id : optional — resume an existing session by ID.
    max_iterations : hard cap on optimisation rounds (default 3).
    min_delta : stop early if mean reward improves by less than this (default 0.02).

    Returns
    -------
    report dict (also written to sessions/{id}/report.json).
    """
    import openai

    from tribe import encode
    from neurosynth import decode
    from optimizer import iterate, transcribe
    from optimizer.reward import mean_reward
    from .session import Session
    from .report import build_report

    audio_path = Path(audio_path)
    client = openai.OpenAI()
    session = Session(session_id=session_id)
    logger.info("Session %s  —  input: %s", session.id, audio_path)

    # ------------------------------------------------------------------
    # Iteration 0 — original audio
    # ------------------------------------------------------------------
    logger.info("=== Iteration 0 (original) ===")

    # Transcribe (skip if already on disk)
    transcript_cache = session.iter_dir(0) / "transcript.json"
    if transcript_cache.exists():
        logger.info("Iter 0 transcript already on disk — skipping Whisper.")
        transcript = session.load_transcript(0)
    else:
        transcript = transcribe(audio_path, client=client)
        session.save_audio(0, audio_path)
        session.save_transcript(0, transcript)

    # Encode (use voxels cache if this session already ran iter 0)
    voxel_cache = session.iter_dir(0) / "voxels.npy"
    voxels = encode(audio_path, cache_path=voxel_cache)
    session.save_voxels(0, voxels)

    # Decode (use profile cache if already on disk)
    profile_cache = session.iter_dir(0) / "profile.json"
    if profile_cache.exists():
        logger.info("Iter 0 profile already on disk — skipping decode.")
        profile = session.load_profile(0)
    else:
        profile = decode(voxels)
        session.save_profile(0, profile)

    reward_history = [mean_reward(profile)]
    logger.info("Iter 0 reward: %.4f", reward_history[0])

    current_audio = audio_path
    current_transcript = transcript
    current_profile = profile

    # ------------------------------------------------------------------
    # Optimisation loop
    # ------------------------------------------------------------------
    for i in range(1, max_iterations + 1):
        logger.info("=== Iteration %d ===", i)

        if session.voxels_cached(i):
            # Full iteration already on disk — reload and skip GPT/TTS/encode
            logger.info("Iteration %d already complete — loading from disk.", i)
            new_voxels = session.load_voxels(i)
            new_profile = session.load_profile(i)
            new_transcript = session.load_transcript(i)
            new_audio = session.iter_dir(i) / "audio.mp3"
        else:
            result = iterate(
                audio_path=current_audio,
                cognitive_profile=current_profile,
                transcript=current_transcript,
                output_dir=session.iter_dir(i),
                client=client,
            )

            new_audio = result["audio_path"]
            new_transcript = result["transcript"]

            # Encode new audio
            voxel_cache = session.iter_dir(i) / "voxels.npy"
            new_voxels = encode(new_audio, cache_path=voxel_cache)
            session.save_voxels(i, new_voxels)

            # Decode new audio
            new_profile = decode(new_voxels)
            session.save_profile(i, new_profile)
            session.save_transcript(i, new_transcript)

        new_reward = mean_reward(new_profile)
        reward_history.append(new_reward)
        delta = new_reward - reward_history[-2]
        logger.info("Iter %d reward: %.4f  (delta: %+.4f)", i, new_reward, delta)

        current_audio = new_audio
        current_transcript = new_transcript
        current_profile = new_profile

        if delta < min_delta:
            logger.info("Converged (delta %.4f < threshold %.4f) — stopping.", delta, min_delta)
            break

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------
    report = build_report(session, reward_history)
    logger.info(
        "Done. %d iterations. Reward: %.4f → %.4f  (+%.1f%%)",
        len(reward_history) - 1,
        reward_history[0],
        reward_history[-1],
        report["improvement_pct"],
    )
    return report
