"""
Tests for optimizer/ — all fast, no API calls.

Run with:
    .venv/Scripts/python -m pytest tests/test_optimizer.py -v
"""

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# reward.py
# ---------------------------------------------------------------------------

class TestReward:
    def test_score_shape(self):
        from optimizer.reward import score
        profile = {
            "attention": [0.1, 0.2, 0.3],
            "reward":    [0.2, 0.1, 0.4],
            "working memory": [0.3, 0.4, 0.1],
        }
        r = score(profile)
        assert r.shape == (3,)

    def test_high_reward_low_load(self):
        from optimizer.reward import score, DEFAULT_WEIGHTS
        # Max reward signal, zero cognitive load → high score
        high = {t: [1.0] for t in DEFAULT_WEIGHTS}
        low  = {t: [-1.0] for t in DEFAULT_WEIGHTS}
        assert score(high)[0] > score(low)[0]

    def test_working_memory_penalised(self):
        from optimizer.reward import score
        base   = {"working memory": [0.0], "attention": [0.5]}
        loaded = {"working memory": [1.0], "attention": [0.5]}
        assert score(base)[0] > score(loaded)[0]

    def test_mean_reward_scalar(self):
        from optimizer.reward import mean_reward
        profile = {"attention": [0.1, 0.2, 0.3], "reward": [0.4, 0.5, 0.6]}
        r = mean_reward(profile)
        assert isinstance(r, float)


# ---------------------------------------------------------------------------
# segments.py
# ---------------------------------------------------------------------------

class TestSegments:
    def _transcript(self):
        return [
            {"text": "Hello world.",   "start": 0.0, "end": 2.0},
            {"text": "Here is my pitch.", "start": 2.0, "end": 4.5},
            {"text": "Please invest.",  "start": 4.5, "end": 6.0},
        ]

    def test_assign_trs_adds_key(self):
        from optimizer.segments import assign_trs
        segs = assign_trs(self._transcript(), n_trs=4)
        assert all("tr_indices" in s for s in segs)

    def test_assign_trs_coverage(self):
        from optimizer.segments import assign_trs
        segs = assign_trs(self._transcript(), n_trs=4)
        # First segment (0–2 s) → TR 0
        assert 0 in segs[0]["tr_indices"]
        # Second segment (2–4.5 s) → TRs 1 and 2
        assert 1 in segs[1]["tr_indices"]
        assert 2 in segs[1]["tr_indices"]

    def test_weak_segments_returns_subset(self):
        from optimizer.segments import assign_trs, weak_segments
        segs = assign_trs(self._transcript(), n_trs=4)
        # Low reward for first two TRs, high for last two
        rewards = np.array([-1.0, -1.0, 1.0, 1.0])
        weak = weak_segments(segs, rewards, bottom_fraction=0.4)
        assert len(weak) >= 1
        # The weak segments should have lower mean_reward
        weak_rewards = [s["mean_reward"] for s in weak]
        assert all(r <= 0.0 for r in weak_rewards)

    def test_weak_segments_has_mean_reward_field(self):
        from optimizer.segments import assign_trs, weak_segments
        segs = assign_trs(self._transcript(), n_trs=4)
        rewards = np.array([0.1, 0.2, 0.8, 0.9])
        weak = weak_segments(segs, rewards)
        assert all("mean_reward" in s for s in weak)
