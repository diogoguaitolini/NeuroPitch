"""
optimizer/iterate.py
--------------------
Orchestrates one iteration of the pitch improvement loop.

Public API:
    iterate(audio_path, cognitive_profile, transcript, output_dir, client=None)
        -> {"audio_path": Path, "transcript": list[dict], "reward": float}
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from .reward import score
from .segments import assign_trs, weak_segments
from .rewrite import rewrite
from .tts import synthesise

logger = logging.getLogger(__name__)


def iterate(
    audio_path: str | Path,
    cognitive_profile: dict[str, list[float]],
    transcript: list[dict],
    output_dir: str | Path,
    client=None,
) -> dict:
    """
    Run one improvement iteration on a pitch.

    Steps:
      1. Score every TR with the reward function.
      2. Align transcript segments to TRs.
      3. Identify the bottom 35% of segments by reward.
      4. Rewrite those segments with the LLM.
      5. Synthesise the updated script to a new audio file.

    Parameters
    ----------
    audio_path : current iteration's audio (used only for logging / bookkeeping).
    cognitive_profile : output of neurosynth.decode() for this iteration.
    transcript : list of {"text", "start", "end"} dicts.
    output_dir : folder to write the new audio file into.
    client : openai.OpenAI instance (shared across rewrite + TTS calls).

    Returns
    -------
    dict with keys:
        "audio_path"  – Path to the new synthesised audio file
        "transcript"  – Updated transcript (list of dicts)
        "reward"      – Mean reward score of the *input* profile (before rewrite)
    """
    import openai

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if client is None:
        client = openai.OpenAI()

    # 1. Score TRs
    reward_scores = score(cognitive_profile)
    current_reward = float(np.nanmean(reward_scores))
    n_trs = len(reward_scores)
    logger.info("Mean reward before rewrite: %.4f  (n_trs=%d)", current_reward, n_trs)

    # 2. Align transcript to TRs
    tagged = assign_trs(transcript, n_trs=n_trs)

    # 3. Find weak segments
    weak = weak_segments(tagged, reward_scores)
    if not weak:
        logger.info("No weak segments found — pitch already optimised.")
        new_audio = synthesise(
            " ".join(s["text"] for s in transcript),
            output_dir / "audio.mp3",
            client=client,
        )
        return {"audio_path": new_audio, "transcript": transcript, "reward": current_reward}

    logger.info(
        "Weak segments (%d): %s",
        len(weak),
        [s["text"][:40] + "…" for s in weak],
    )

    # 4. Rewrite
    updated_transcript = rewrite(transcript, weak, client=client)

    # 5. TTS
    full_text = " ".join(s["text"] for s in updated_transcript)
    new_audio = synthesise(full_text, output_dir / "audio.mp3", client=client)

    return {
        "audio_path": new_audio,
        "transcript": updated_transcript,
        "reward": current_reward,
    }
