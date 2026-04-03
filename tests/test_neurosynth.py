"""
Tests for neurosynth/decode.py

Run with:
    .venv/Scripts/python -m pytest tests/test_neurosynth.py -v

The full decode test requires pre-built term maps (run
`neurosynth/term_maps.py` or let decode() build them on first call).
The unit tests below are fast and cover the math independently.
"""

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# Unit tests for the correlation logic (no network access required)
# ---------------------------------------------------------------------------

class TestPearsonRows:
    """Test the internal _pearson_rows helper."""

    def _fn(self):
        from neurosynth.decode import _pearson_rows
        return _pearson_rows

    def test_perfect_positive_correlation(self):
        fn = self._fn()
        term = np.array([1.0, 2.0, 3.0, 4.0])
        acts = np.tile(term, (5, 1))  # 5 identical rows
        r = fn(acts, term)
        np.testing.assert_allclose(r, 1.0, atol=1e-6)

    def test_perfect_negative_correlation(self):
        fn = self._fn()
        term = np.array([1.0, 2.0, 3.0, 4.0])
        acts = np.tile(-term, (3, 1))
        r = fn(acts, term)
        np.testing.assert_allclose(r, -1.0, atol=1e-6)

    def test_nan_vertices_excluded(self):
        fn = self._fn()
        term = np.array([1.0, np.nan, 3.0, 4.0])
        acts = np.array([[1.0, 999.0, 3.0, 4.0]])  # junk in NaN slot
        r_nan = fn(acts, term)
        term_clean = np.array([1.0, 2.0, 3.0, 4.0])
        acts_clean = np.array([[1.0, 2.0, 3.0, 4.0]])
        r_clean = fn(acts_clean, term_clean)
        np.testing.assert_allclose(r_nan, r_clean, atol=1e-6)

    def test_flat_activation_returns_nan(self):
        fn = self._fn()
        term = np.array([1.0, 2.0, 3.0, 4.0])
        flat = np.zeros((2, 4))
        r = fn(flat, term)
        assert np.all(np.isnan(r))

    def test_output_shape(self):
        fn = self._fn()
        n_trs, n_verts = 10, 20484
        rng = np.random.default_rng(0)
        acts = rng.standard_normal((n_trs, n_verts))
        term = rng.standard_normal(n_verts)
        r = fn(acts, term)
        assert r.shape == (n_trs,)


# ---------------------------------------------------------------------------
# Integration tests (require term maps — may trigger download on first run)
# ---------------------------------------------------------------------------

def test_decode_output_structure():
    """decode() returns the right keys and list lengths."""
    from neurosynth import decode, TERMS

    n_trs, n_verts = 7, 20484
    rng = np.random.default_rng(42)
    fake_voxels = rng.standard_normal((n_trs, n_verts)).astype(np.float32)

    profile = decode(fake_voxels)

    assert set(profile.keys()) == set(TERMS)
    for state, scores in profile.items():
        assert len(scores) == n_trs, f"{state}: expected {n_trs} scores, got {len(scores)}"
        assert all(isinstance(s, float) for s in scores)


def test_decode_scores_in_valid_range():
    """Pearson r values must lie in [-1, 1]."""
    from neurosynth import decode

    n_trs, n_verts = 5, 20484
    rng = np.random.default_rng(7)
    fake_voxels = rng.standard_normal((n_trs, n_verts)).astype(np.float32)

    profile = decode(fake_voxels)

    for state, scores in profile.items():
        for r in scores:
            assert -1.0 <= r <= 1.0 or np.isnan(r), f"{state}: r={r} out of range"


def test_decode_rejects_wrong_shape():
    from neurosynth import decode

    with pytest.raises(ValueError):
        decode(np.ones((10,)))  # 1D input — should raise
