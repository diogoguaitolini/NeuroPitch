"""
optimizer/reward.py
-------------------
Converts a cognitive profile into a single reward score per TR.

The reward is a weighted sum of term correlations. Weights encode what
"a pitch landing well" looks like neurally: high engagement/reward signals,
low cognitive load.

Public API:
    score(cognitive_profile) -> np.ndarray  shape: (n_timepoints,)
    mean_reward(cognitive_profile) -> float
"""

from __future__ import annotations

import numpy as np

# Default weights. Positive = want more. Negative = want less.
# Edit freely — these are just sensible pitch defaults.
DEFAULT_WEIGHTS: dict[str, float] = {
    "reward":           2.0,
    "attention":        1.5,
    "self-referential": 1.5,
    "social":           1.0,
    "arousal":          1.0,
    "emotion":          1.0,
    "valence":          1.0,
    "imagery":          0.5,
    "surprise":         0.5,
    "working memory":  -2.0,  # penalise confusion / cognitive overload
    "language":         0.0,  # always high for speech — not informative
    "speech":           0.0,
}


def score(
    cognitive_profile: dict[str, list[float]],
    weights: dict[str, float] | None = None,
) -> np.ndarray:
    """
    Compute a scalar reward score for each TR.

    Parameters
    ----------
    cognitive_profile : output of neurosynth.decode()
    weights : term → weight mapping. Defaults to DEFAULT_WEIGHTS.

    Returns
    -------
    np.ndarray of shape (n_timepoints,)
        Higher = this TR looks more like a well-landing pitch moment.
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS

    terms = list(cognitive_profile.keys())
    n_trs = len(next(iter(cognitive_profile.values())))
    matrix = np.array([cognitive_profile[t] for t in terms], dtype=np.float64)  # (n_terms, n_trs)
    w = np.array([weights.get(t, 0.0) for t in terms], dtype=np.float64)        # (n_terms,)

    return (w[:, None] * matrix).sum(axis=0)  # (n_trs,)


def mean_reward(
    cognitive_profile: dict[str, list[float]],
    weights: dict[str, float] | None = None,
) -> float:
    """Mean reward score across all TRs — single number summarising the pitch."""
    return float(np.nanmean(score(cognitive_profile, weights)))
