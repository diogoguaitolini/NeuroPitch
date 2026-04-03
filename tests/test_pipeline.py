"""
Tests for pipeline/ — all fast, no API or model calls.

Run with:
    .venv/Scripts/python -m pytest tests/test_pipeline.py -v
"""

import json
import tempfile
from pathlib import Path

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# session.py
# ---------------------------------------------------------------------------

class TestSession:
    def test_creates_session_dir(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            assert s.root.exists()

    def test_fixed_session_id(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp, session_id="abc123")
            assert s.id == "abc123"
            assert (Path(tmp) / "abc123").exists()

    def test_iter_dir_created(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            d = s.iter_dir(0)
            assert d.exists()

    def test_save_and_load_voxels(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            arr = np.random.default_rng(0).standard_normal((5, 20484)).astype(np.float32)
            s.save_voxels(0, arr)
            loaded = s.load_voxels(0)
            np.testing.assert_array_equal(arr, loaded)

    def test_save_and_load_profile(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            profile = {"attention": [0.1, 0.2], "reward": [0.3, 0.4]}
            s.save_profile(0, profile)
            loaded = s.load_profile(0)
            assert loaded == profile

    def test_save_and_load_transcript(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            transcript = [{"text": "Hello.", "start": 0.0, "end": 1.5}]
            s.save_transcript(0, transcript)
            loaded = s.load_transcript(0)
            assert loaded == transcript

    def test_voxels_cached(self):
        from pipeline.session import Session
        with tempfile.TemporaryDirectory() as tmp:
            s = Session(root=tmp)
            assert not s.voxels_cached(0)
            s.save_voxels(0, np.zeros((3, 20484), dtype=np.float32))
            assert s.voxels_cached(0)


# ---------------------------------------------------------------------------
# report.py
# ---------------------------------------------------------------------------

class TestReport:
    def _make_session(self, tmp):
        from pipeline.session import Session
        s = Session(root=tmp, session_id="test")
        t0 = [{"text": "Hello world.", "start": 0.0, "end": 2.0}]
        t1 = [{"text": "Hi there, friend.", "start": 0.0, "end": 2.0}]
        s.save_transcript(0, t0)
        s.save_transcript(1, t1)
        return s

    def test_report_keys(self):
        from pipeline.report import build_report
        with tempfile.TemporaryDirectory() as tmp:
            s = self._make_session(tmp)
            report = build_report(s, reward_history=[0.10, 0.18])
            for key in ("session_id", "n_iterations", "reward_history",
                        "improvement_pct", "transcript_v1", "transcript_vfinal", "diff"):
                assert key in report

    def test_report_saved_to_disk(self):
        from pipeline.report import build_report
        with tempfile.TemporaryDirectory() as tmp:
            s = self._make_session(tmp)
            build_report(s, reward_history=[0.10, 0.18])
            assert (s.root / "report.json").exists()

    def test_improvement_pct(self):
        from pipeline.report import build_report
        with tempfile.TemporaryDirectory() as tmp:
            s = self._make_session(tmp)
            report = build_report(s, reward_history=[0.10, 0.20])
            assert report["improvement_pct"] == pytest.approx(100.0)

    def test_diff_detects_changes(self):
        from pipeline.report import build_report
        with tempfile.TemporaryDirectory() as tmp:
            s = self._make_session(tmp)
            report = build_report(s, reward_history=[0.10, 0.18])
            assert len(report["diff"]) > 0
