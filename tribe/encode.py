"""
tribe/encode.py
---------------
Wraps TRIBE V2 inference.

Public API:
    encode(audio_path, cache_path=None) -> np.ndarray  shape: (n_timepoints, n_vertices)

The model is loaded once and reused across calls within the same process.
Pass cache_path to skip inference when results already exist on disk.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# Module-level singleton — loaded once per process
_model = None
_MODEL_REPO = "facebook/tribev2"
_MODEL_CACHE = Path(__file__).parent.parent / ".tribe_cache"


def _resolve_model_dir() -> str:
    """
    Return a local directory path for the TRIBE V2 model.
    On Windows, passing the HF repo ID through Path() corrupts the slash to a backslash,
    so we prefer the HuggingFace hub cache when it exists.
    """
    from huggingface_hub import try_to_load_from_cache, snapshot_download
    import os

    # Check if already cached
    cached = try_to_load_from_cache(_MODEL_REPO, "config.yaml")
    if cached is not None:
        # Return the snapshot directory (two levels up from the file)
        return str(Path(cached).parent)

    # Download and cache
    token = os.environ.get("HF_TOKEN")
    return snapshot_download(repo_id=_MODEL_REPO, token=token)


def _patch_yaml_posixpath():
    """
    Register a YAML constructor for PosixPath so the model config (authored on Linux)
    can be loaded on Windows. The path value isn't used at runtime — it gets overwritten
    by from_pretrained — so we just return a plain string.
    """
    import yaml

    def _posixpath_constructor(loader, node):
        parts = loader.construct_sequence(node)
        return "/".join(str(p) for p in parts)

    yaml.add_constructor(
        "tag:yaml.org,2002:python/object/apply:pathlib.PosixPath",
        _posixpath_constructor,
        Loader=yaml.UnsafeLoader,
    )


def _get_model():
    global _model
    if _model is None:
        from tribev2 import TribeModel

        _patch_yaml_posixpath()
        logger.info("Loading TRIBE V2 from %s (first call — this takes a while)", _MODEL_REPO)
        model_dir = _resolve_model_dir()
        _model = TribeModel.from_pretrained(model_dir, cache_folder=str(_MODEL_CACHE))
        logger.info("TRIBE V2 loaded.")
    return _model


def encode(audio_path: str | Path, cache_path: str | Path | None = None) -> np.ndarray:
    """
    Run TRIBE V2 on an audio file and return predicted voxel activation maps.

    Parameters
    ----------
    audio_path : path to the audio file (.wav, .mp3, .flac, .ogg)
    cache_path : if given, load from this .npy file when it exists; save to it
                 after a fresh inference run. Use this to avoid re-running TRIBE
                 on the same audio (it is the most expensive step in the pipeline).

    Returns
    -------
    np.ndarray of shape (n_timepoints, n_vertices)
        Per-TR voxel activation maps on the fsaverage5 cortical surface (~20k vertices).
        Each row is one TR (~2 s window) of predicted brain activity.
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    if cache_path is not None:
        cache_path = Path(cache_path)
        if cache_path.exists():
            logger.info("Loading cached voxel maps from %s", cache_path)
            return np.load(cache_path)

    model = _get_model()

    logger.info("Building events DataFrame for %s", audio_path)
    events = model.get_events_dataframe(audio_path=str(audio_path))

    logger.info("Running TRIBE V2 inference…")
    voxel_maps, _segments = model.predict(events=events, verbose=True)
    # voxel_maps: np.ndarray shape (n_timepoints, n_vertices)

    # Free the model from VRAM after each inference — TRIBE loads several large
    # sub-models (LLaMA, wav2vec2-bert) that accumulate across iterations on a
    # small GPU.  Force-unload the singleton so the next call starts clean.
    global _model
    import torch, gc
    _model = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.synchronize()
        torch.cuda.empty_cache()

    if cache_path is not None:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(cache_path, voxel_maps)
        logger.info("Saved voxel maps to %s  shape=%s", cache_path, voxel_maps.shape)

    return voxel_maps


def audio_hash(audio_path: str | Path) -> str:
    """Return a short SHA-256 hex digest of the audio file contents."""
    h = hashlib.sha256()
    with open(audio_path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]
