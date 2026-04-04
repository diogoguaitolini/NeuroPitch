"""
api/main.py
-----------
FastAPI backend for the NeuroPitch UI.

Run from the project root:
    .venv/Scripts/python -m uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

import json
import shutil
import tempfile
import threading
import uuid
from pathlib import Path

import math

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT         = Path(__file__).parent.parent
SESSIONS_DIR = ROOT / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

# In-memory pipeline status (demo-only; no persistence across restarts)
_status: dict[str, dict] = {}


# ── sessions ──────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def list_sessions():
    sessions = []
    for d in sorted(SESSIONS_DIR.iterdir()):
        if not d.is_dir():
            continue
        report_path = d / "report.json"
        n_iters = sum(1 for x in d.iterdir() if x.is_dir() and x.name.startswith("iter_"))
        sessions.append({
            "id":           d.name,
            "has_report":   report_path.exists(),
            "n_iterations": n_iters,
            "report":       json.loads(report_path.read_text()) if report_path.exists() else None,
        })
    return sessions


@app.get("/api/sessions/{session_id}/report")
def get_report(session_id: str):
    path = SESSIONS_DIR / _safe(session_id) / "report.json"
    if not path.exists():
        raise HTTPException(404, "Report not found")
    return json.loads(path.read_text())


@app.get("/api/sessions/{session_id}/iter/{n}/profile")
def get_profile(session_id: str, n: int):
    path = SESSIONS_DIR / _safe(session_id) / f"iter_{n}" / "profile.json"
    if not path.exists():
        raise HTTPException(404)
    data = json.loads(path.read_text())
    # Replace NaN / Inf with null so the browser can parse it
    data = {
        term: [None if (v is None or (isinstance(v, float) and not math.isfinite(v))) else v
               for v in values]
        for term, values in data.items()
    }
    return JSONResponse(content=data)


@app.get("/api/sessions/{session_id}/iter/{n}/transcript")
def get_transcript(session_id: str, n: int):
    path = SESSIONS_DIR / _safe(session_id) / f"iter_{n}" / "transcript.json"
    if not path.exists():
        raise HTTPException(404)
    return json.loads(path.read_text())


@app.get("/api/sessions/{session_id}/iter/{n}/audio")
def get_audio(session_id: str, n: int):
    path = SESSIONS_DIR / _safe(session_id) / f"iter_{n}" / "audio.mp3"
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="audio/mpeg")


# ── upload & run ──────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    session_id = uuid.uuid4().hex[:8]
    tmp = Path(tempfile.mktemp(suffix=".mp3"))
    with open(tmp, "wb") as f:
        shutil.copyfileobj(file.file, f)

    _status[session_id] = {"status": "running", "message": "Pipeline starting..."}
    background_tasks.add_task(_run_pipeline, session_id, tmp)
    return {"session_id": session_id}


@app.post("/api/sessions/{session_id}/iterate")
async def run_iteration(session_id: str, background_tasks: BackgroundTasks):
    """Run one more LLM iteration on an existing session."""
    sess_dir = SESSIONS_DIR / _safe(session_id)
    if not sess_dir.exists():
        raise HTTPException(404, "Session not found")

    _status[session_id] = {"status": "running", "message": "Running iteration..."}
    background_tasks.add_task(_run_pipeline, session_id, None)
    return {"session_id": session_id}


@app.get("/api/status/{session_id}")
def get_status(session_id: str):
    return _status.get(session_id, {"status": "not_found"})


# ── demos ─────────────────────────────────────────────────────────────────────

@app.get("/api/demos")
def get_demos():
    demos_path = ROOT / "demos.json"
    if not demos_path.exists():
        return []
    return json.loads(demos_path.read_text())


# ── helpers ───────────────────────────────────────────────────────────────────

def _safe(session_id: str) -> str:
    """Prevent path traversal."""
    return Path(session_id).name


def _run_pipeline(session_id: str, audio_path: Path | None) -> None:
    try:
        _status[session_id] = {"status": "running", "message": "Encoding audio..."}
        from pipeline import run
        report = run(
            audio_path=str(audio_path) if audio_path else None,
            session_id=session_id,
            max_iterations=1,
        )
        _status[session_id] = {"status": "done", "report": report}
    except Exception as exc:  # noqa: BLE001
        _status[session_id] = {"status": "error", "message": str(exc)}
