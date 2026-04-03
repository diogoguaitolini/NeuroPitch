"""
pipeline/report.py
------------------
Generates the final report comparing v1 to vFinal.

Public API:
    build_report(session, reward_history) -> dict
"""

from __future__ import annotations

import difflib

from .session import Session


def _text(transcript: list[dict]) -> str:
    return " ".join(s["text"] for s in transcript)


def _diff_summary(text_v1: str, text_vfinal: str) -> list[dict]:
    """Word-level diff between v1 and vFinal transcripts."""
    words_v1 = text_v1.split()
    words_vf = text_vfinal.split()
    matcher = difflib.SequenceMatcher(None, words_v1, words_vf)
    changes = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        changes.append({
            "type": tag,
            "before": " ".join(words_v1[i1:i2]),
            "after":  " ".join(words_vf[j1:j2]),
        })
    return changes


def build_report(session: Session, reward_history: list[float]) -> dict:
    """
    Build the final report dict and save it to session/report.json.

    Parameters
    ----------
    session : active Session object.
    reward_history : mean reward score per iteration, e.g. [0.12, 0.18, 0.23].

    Returns
    -------
    dict with keys: reward_history, improvement_pct, diff, transcript_v1,
                    transcript_vfinal, n_iterations.
    """
    n = len(reward_history) - 1  # last completed iteration index
    transcript_v1 = session.load_transcript(0)
    transcript_vf = session.load_transcript(n)

    text_v1 = _text(transcript_v1)
    text_vf = _text(transcript_vf)

    improvement_pct = (
        (reward_history[-1] - reward_history[0]) / abs(reward_history[0]) * 100
        if reward_history[0] != 0 else 0.0
    )

    report = {
        "session_id":        session.id,
        "n_iterations":      n,
        "reward_history":    reward_history,
        "improvement_pct":   round(improvement_pct, 2),
        "transcript_v1":     transcript_v1,
        "transcript_vfinal": transcript_vf,
        "diff":              _diff_summary(text_v1, text_vf),
    }

    session.save_report(report)
    return report
