"""
scripts/export_static.py
------------------------
Copies all demo session data into ui/public/ so the React app can be
deployed as a fully static site with no backend.

Run from the project root (venv active):
    python scripts/export_static.py
"""

import json
import math
import shutil
from pathlib import Path

ROOT      = Path(__file__).parent.parent
SESSIONS  = ROOT / "sessions"
PUBLIC    = ROOT / "ui" / "public"
DEMOS     = ROOT / "demos.json"


def sanitize_profile(data: dict) -> dict:
    """Replace NaN/Inf with None so JSON.parse doesn't choke in the browser."""
    return {
        term: [
            None if (v is None or (isinstance(v, float) and not math.isfinite(v))) else v
            for v in values
        ]
        for term, values in data.items()
    }


def main():
    demos = json.loads(DEMOS.read_text())

    # Copy demos.json
    out_demos = PUBLIC / "demos.json"
    out_demos.write_text(json.dumps(demos, indent=2))
    print(f"Wrote {out_demos}")

    for demo in demos:
        session_id = demo["session_id"]
        session_dir = SESSIONS / session_id

        if not session_dir.exists():
            print(f"WARNING: session {session_id} not found, skipping.")
            continue

        # Find all iter_N folders
        iter_dirs = sorted(
            (d for d in session_dir.iterdir() if d.is_dir() and d.name.startswith("iter_")),
            key=lambda d: int(d.name.split("_")[1]),
        )

        for iter_dir in iter_dirs:
            n = iter_dir.name.split("_")[1]
            out_iter = PUBLIC / "sessions" / session_id / f"iter_{n}"
            out_iter.mkdir(parents=True, exist_ok=True)

            # transcript.json
            src = iter_dir / "transcript.json"
            if src.exists():
                shutil.copy2(src, out_iter / "transcript.json")

            # profile.json — sanitize NaN
            src = iter_dir / "profile.json"
            if src.exists():
                raw = json.loads(src.read_text())
                (out_iter / "profile.json").write_text(
                    json.dumps(sanitize_profile(raw), indent=2)
                )

            # audio.mp3
            src = iter_dir / "audio.mp3"
            if src.exists():
                shutil.copy2(src, out_iter / "audio.mp3")

            print(f"  Exported {session_id}/iter_{n}")

        # report.json
        src = session_dir / "report.json"
        if src.exists():
            out_report = PUBLIC / "sessions" / session_id / "report.json"
            shutil.copy2(src, out_report)
            print(f"  Exported {session_id}/report.json")

    print("Done.")


if __name__ == "__main__":
    main()
