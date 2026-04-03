"""
neurosynth/term_maps.py
-----------------------
Downloads Neurosynth v7, runs term-specific meta-analyses, and projects the
resulting z-stat maps from MNI space onto the fsaverage5 surface so they
match TRIBE V2's output space.

Each term gets one cached file: neurosynth/data/{term}_fsaverage5.npy
Shape: (20484,) — left hemisphere (10242) + right hemisphere (10242).

Public API:
    load_term_maps(data_dir=None) -> dict[str, np.ndarray]
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np

from .terms import TERMS

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent / "data"


def _safe_filename(term: str) -> str:
    return term.replace(" ", "_").replace("-", "_")


def _cached_path(term: str) -> Path:
    return _DATA_DIR / f"{_safe_filename(term)}_fsaverage5.npy"


def _all_cached() -> bool:
    return all(_cached_path(t).exists() for t in TERMS)


def _build_term_maps(data_dir: Path) -> None:
    """Download Neurosynth, run meta-analyses, project to fsaverage5, cache."""
    from nilearn.datasets import fetch_surf_fsaverage
    from nilearn.surface import vol_to_surf
    from nimare.decode.continuous import CorrelationDecoder
    from nimare.extract import fetch_neurosynth
    from nimare.meta.cbma.mkda import MKDAChi2

    logger.info("Downloading Neurosynth v7 dataset…")
    [studyset] = fetch_neurosynth(
        data_dir=str(data_dir),
        version="7",
        source="abstract",
        vocab="terms",
    )

    n_cores = max(1, os.cpu_count() or 1)
    logger.info("Fitting meta-analyses for %d terms (n_cores=%d)…", len(TERMS), n_cores)

    decoder = CorrelationDecoder(
        feature_group="terms_abstract_tfidf",
        features=TERMS,
        meta_estimator=MKDAChi2(),
        n_cores=n_cores,
    )
    decoder.fit(studyset)

    results = decoder.results_
    masker = results.masker
    fsaverage = fetch_surf_fsaverage("fsaverage5")

    _DATA_DIR.mkdir(parents=True, exist_ok=True)

    for term in TERMS:
        feature_key = f"terms_abstract_tfidf__{term}"
        if feature_key not in results.maps:
            feature_key = term
        if feature_key not in results.maps:
            logger.warning("Term '%s' not found in results — skipping", term)
            continue

        masked_vec = results.maps[feature_key]
        z_img = masker.inverse_transform(masked_vec)

        left = vol_to_surf(z_img, fsaverage["pial_left"], radius=6.0)
        right = vol_to_surf(z_img, fsaverage["pial_right"], radius=6.0)
        surface_map = np.concatenate([left, right]).astype(np.float32)

        out_path = _cached_path(term)
        np.save(out_path, surface_map)
        logger.info("Saved %-20s  shape=%s", term, surface_map.shape)


def load_term_maps(data_dir: Optional[str | Path] = None) -> dict[str, np.ndarray]:
    """
    Return per-term surface maps on fsaverage5, shape (20484,) each.

    Downloads and builds maps on first call (takes a few minutes).
    Subsequent calls load from local cache instantly.

    Parameters
    ----------
    data_dir : path where Neurosynth raw data is stored.
               Defaults to neurosynth/data/neurosynth_raw/.

    Returns
    -------
    dict mapping term string → np.ndarray of shape (20484,)
    """
    if data_dir is None:
        data_dir = _DATA_DIR / "neurosynth_raw"

    if not _all_cached():
        logger.info("Term maps not cached — building now (takes a few minutes)…")
        _build_term_maps(Path(data_dir))

    return {term: np.load(_cached_path(term)) for term in TERMS}
