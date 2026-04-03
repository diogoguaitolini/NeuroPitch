"""
Tests for tribe/encode.py

Run with:
    .venv/Scripts/python -m pytest tests/test_tribe.py -v

The first run will download TRIBE V2 weights and sub-models (several GB).
Subsequent runs hit the local cache and are fast.
"""

import tempfile
from pathlib import Path

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_sine_wav(path: Path, duration_s: float = 10.0, sr: int = 16000) -> None:
    """Write a minimal 16 kHz mono WAV with a 440 Hz sine tone."""
    import struct, math

    n_samples = int(sr * duration_s)
    amplitude = 16000
    samples = [int(amplitude * math.sin(2 * math.pi * 440 * i / sr)) for i in range(n_samples)]

    with open(path, "wb") as f:
        # RIFF header
        data_size = n_samples * 2
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        # fmt chunk
        f.write(b"fmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16))
        # data chunk
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        for s in samples:
            f.write(struct.pack("<h", s))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_encode_returns_2d_array():
    """encode() should return a (n_timepoints, n_vertices) float array."""
    from tribe import encode

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = Path(tmpdir) / "test_pitch.wav"
        _make_sine_wav(audio_path, duration_s=15.0)

        voxel_maps = encode(audio_path)

    assert isinstance(voxel_maps, np.ndarray), "Expected np.ndarray"
    assert voxel_maps.ndim == 2, f"Expected 2D array, got shape {voxel_maps.shape}"
    n_timepoints, n_vertices = voxel_maps.shape
    assert n_timepoints >= 1, "Expected at least 1 timepoint"
    # fsaverage5 has ~20484 vertices; allow a broad range for robustness
    assert 1000 < n_vertices < 100_000, f"Unexpected n_vertices={n_vertices}"
    print(f"\nvoxel_maps shape: {voxel_maps.shape}  dtype: {voxel_maps.dtype}")


def test_encode_cache_roundtrip():
    """encode() with cache_path should save, then reload without re-running TRIBE."""
    from tribe import encode

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        audio_path = tmpdir / "test_pitch.wav"
        cache_path = tmpdir / "voxels.npy"
        _make_sine_wav(audio_path, duration_s=15.0)

        # First call — runs inference and saves cache
        voxels_first = encode(audio_path, cache_path=cache_path)
        assert cache_path.exists(), "Cache file was not created"

        # Second call — should load from cache
        voxels_cached = encode(audio_path, cache_path=cache_path)

    np.testing.assert_array_equal(voxels_first, voxels_cached)


def test_audio_hash_stable():
    """audio_hash() should return the same digest for the same file."""
    from tribe import audio_hash

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = Path(tmpdir) / "test.wav"
        _make_sine_wav(audio_path, duration_s=5.0)

        h1 = audio_hash(audio_path)
        h2 = audio_hash(audio_path)

    assert h1 == h2
    assert len(h1) == 16


def test_encode_missing_file_raises():
    from tribe import encode

    with pytest.raises(FileNotFoundError):
        encode("/nonexistent/path/pitch.wav")
