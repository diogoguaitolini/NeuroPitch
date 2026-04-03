"""
pipeline/session.py
-------------------
Manages the session folder structure.

sessions/
└── {session_id}/
    ├── iter_0/
    │   ├── audio.mp3
    │   ├── voxels.npy
    │   ├── profile.json
    │   └── transcript.json
    ├── iter_1/
    │   └── ...
    └── report.json

Public API:
    Session(root, session_id=None)
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

import numpy as np


class Session:
    def __init__(self, root: str | Path = "sessions", session_id: str | None = None):
        self.id = session_id or uuid.uuid4().hex[:8]
        self.root = Path(root) / self.id
        self.root.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Iteration folders
    # ------------------------------------------------------------------

    def iter_dir(self, n: int) -> Path:
        d = self.root / f"iter_{n}"
        d.mkdir(parents=True, exist_ok=True)
        return d

    # ------------------------------------------------------------------
    # Save helpers
    # ------------------------------------------------------------------

    def save_audio(self, n: int, src: Path) -> Path:
        """Copy audio into the session (iter_N/audio.mp3)."""
        import shutil
        dst = self.iter_dir(n) / "audio.mp3"
        if src.resolve() != dst.resolve():
            shutil.copy2(src, dst)
        return dst

    def save_voxels(self, n: int, voxels: np.ndarray) -> Path:
        path = self.iter_dir(n) / "voxels.npy"
        np.save(path, voxels)
        return path

    def save_profile(self, n: int, profile: dict) -> Path:
        path = self.iter_dir(n) / "profile.json"
        path.write_text(json.dumps(profile, indent=2))
        return path

    def save_transcript(self, n: int, transcript: list[dict]) -> Path:
        path = self.iter_dir(n) / "transcript.json"
        path.write_text(json.dumps(transcript, indent=2))
        return path

    def save_report(self, report: dict) -> Path:
        path = self.root / "report.json"
        path.write_text(json.dumps(report, indent=2))
        return path

    # ------------------------------------------------------------------
    # Load helpers
    # ------------------------------------------------------------------

    def load_voxels(self, n: int) -> np.ndarray:
        return np.load(self.iter_dir(n) / "voxels.npy")

    def load_profile(self, n: int) -> dict:
        return json.loads((self.iter_dir(n) / "profile.json").read_text())

    def load_transcript(self, n: int) -> list[dict]:
        return json.loads((self.iter_dir(n) / "transcript.json").read_text())

    def voxels_cached(self, n: int) -> bool:
        return (self.iter_dir(n) / "voxels.npy").exists()
