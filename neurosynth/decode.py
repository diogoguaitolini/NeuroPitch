"""
neurosynth/decode.py
--------------------
Decodes TRIBE V2 voxel activation maps into per-TR cognitive state scores.

Public API:
    decode(voxel_maps) -> cognitive_profile
        voxel_maps : np.ndarray, shape (n_timepoints, n_vertices)
        cognitive_profile : dict[str, list[float]]  — one score per TR per term
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Module-level cache so term maps are loaded only once per process
_term_maps: Optional[dict[str, np.ndarray]] = None


def _get_term_maps() -> dict[str, np.ndarray]:
    global _term_maps
    if _term_maps is None:
        from .term_maps import load_term_maps
        logger.info("Loading Neurosynth term maps (first call)…")
        _term_maps = load_term_maps()
    return _term_maps


def _pearson_rows(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """
    Pearson r between a 2D array a (n_TRs × n_verts) and a 1D vector b (n_verts,).
    NaN vertices are excluded consistently across all rows.

    Returns a 1D array of length n_TRs.
    """
    valid = np.isfinite(b) & np.any(np.isfinite(a), axis=0)
    a = a[:, valid].astype(np.float64)
    b = b[valid].astype(np.float64)

    # z-score each row of a and the vector b
    a_c = a - a.mean(axis=1, keepdims=True)
    b_c = b - b.mean()

    a_std = np.sqrt((a_c**2).mean(axis=1))
    b_std = np.sqrt((b_c**2).mean())

    # Avoid division by zero for flat activation maps
    nonzero = (a_std > 0) & (b_std > 0)
    r = np.full(len(a_c), np.nan)
    r[nonzero] = (a_c[nonzero] * b_c).mean(axis=1) / (a_std[nonzero] * b_std)
    return r


def decode(voxel_maps: np.ndarray) -> dict[str, list[float]]:
    """
    Decode per-TR cognitive state scores from TRIBE V2 voxel activation maps.

    Parameters
    ----------
    voxel_maps : np.ndarray, shape (n_timepoints, n_vertices)
        Output of tribe.encode(). Each row is one TR's predicted brain activity
        on the fsaverage5 surface (20484 vertices: left + right hemisphere).

    Returns
    -------
    dict[str, list[float]]
        Keys are cognitive state labels (see neurosynth/terms.py).
        Values are lists of length n_timepoints: Pearson r between the
        TR's activation pattern and the term's meta-analytic z-map.
        Higher values → the brain pattern at that moment resembles the
        neural signature of that cognitive state.
    """
    if voxel_maps.ndim != 2:
        raise ValueError(f"voxel_maps must be 2D (n_TRs × n_verts), got shape {voxel_maps.shape}")

    term_maps = _get_term_maps()

    cognitive_profile: dict[str, list[float]] = {}
    for state, term_map in term_maps.items():
        if term_map.shape[0] != voxel_maps.shape[1]:
            raise ValueError(
                f"Vertex count mismatch: voxel_maps has {voxel_maps.shape[1]} vertices "
                f"but term map '{state}' has {term_map.shape[0]}. "
                "Make sure both use fsaverage5."
            )
        scores = _pearson_rows(voxel_maps, term_map)
        cognitive_profile[state] = scores.tolist()
        logger.debug("%s  min=%.3f  max=%.3f  mean=%.3f", state, scores.min(), scores.max(), scores.mean())

    return cognitive_profile
