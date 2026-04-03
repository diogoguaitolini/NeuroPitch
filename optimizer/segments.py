"""
optimizer/segments.py
---------------------
Aligns a timed transcript to TRIBE TRs and identifies which segments
are underperforming on the reward signal.

Transcript format (list of dicts):
    [{"text": "...", "start": 0.0, "end": 2.4}, ...]

Public API:
    assign_trs(transcript, tr_duration, n_trs) -> list[dict]
        Adds a "tr_indices" key to each segment.

    weak_segments(transcript, reward_scores, bottom_fraction=0.35) -> list[dict]
        Returns segments whose mean reward is below the threshold.
"""

from __future__ import annotations

import numpy as np

TR_DURATION = 2.0  # seconds — matches TRIBE V2 default


def assign_trs(
    transcript: list[dict],
    n_trs: int,
    tr_duration: float = TR_DURATION,
) -> list[dict]:
    """
    Tag each transcript segment with the TR indices it covers.

    A TR at index i covers [i * tr_duration, (i+1) * tr_duration).
    A segment is assigned to a TR if they overlap by at least 0.1 s.
    """
    segments = []
    for seg in transcript:
        start, end = seg["start"], seg["end"]
        tr_indices = []
        for i in range(n_trs):
            tr_start = i * tr_duration
            tr_end = tr_start + tr_duration
            overlap = min(end, tr_end) - max(start, tr_start)
            if overlap >= 0.1:
                tr_indices.append(i)
        segments.append({**seg, "tr_indices": tr_indices})
    return segments


def weak_segments(
    transcript: list[dict],
    reward_scores: np.ndarray,
    bottom_fraction: float = 0.35,
) -> list[dict]:
    """
    Identify segments whose average reward score falls in the bottom fraction.

    Parameters
    ----------
    transcript : segments already tagged with tr_indices (from assign_trs).
    reward_scores : per-TR reward array from optimizer.reward.score().
    bottom_fraction : fraction of segments to flag as weak (default 35%).

    Returns
    -------
    List of weak segments, each with an added "mean_reward" field.
    """
    scored = []
    for seg in transcript:
        indices = seg.get("tr_indices", [])
        if indices:
            seg_reward = float(np.nanmean(reward_scores[indices]))
        else:
            seg_reward = 0.0
        scored.append({**seg, "mean_reward": seg_reward})

    if not scored:
        return []

    threshold = np.quantile([s["mean_reward"] for s in scored], bottom_fraction)
    return [s for s in scored if s["mean_reward"] <= threshold]
