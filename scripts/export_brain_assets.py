"""
scripts/export_brain_assets.py
-------------------------------
Generates the static brain assets used by the React UI:
  ui/public/brain_mesh.json   — fsaverage5 inflated surface (vertices + faces + sulcal shading)
  ui/public/term_maps.json    — per-term vertex activation maps

Run once from the project root with the venv active:
    .venv/Scripts/python scripts/export_brain_assets.py
"""

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

OUTPUT_DIR = ROOT / "ui" / "public"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def export_brain_mesh() -> None:
    from nilearn.datasets import fetch_surf_fsaverage
    from nilearn.surface import load_surf_mesh, load_surf_data

    # Use pial surface — real cortical folds, not the inflated balloon shape.
    # Vertex count and ordering match fsaverage5, so term maps still align.
    print("Loading fsaverage5 pial surface...")
    fsaverage = fetch_surf_fsaverage("fsaverage5")

    left  = load_surf_mesh(fsaverage["pial_left"])
    right = load_surf_mesh(fsaverage["pial_right"])

    lc = np.array(left.coordinates,  dtype=np.float32)
    rc = np.array(right.coordinates, dtype=np.float32)
    lf = np.array(left.faces,        dtype=np.int32)
    rf = np.array(right.faces,       dtype=np.int32)

    # Pial hemispheres are already in MNI space: left has negative x, right positive x.
    # No artificial separation needed; just add a small gap at the midline.
    lc[:, 0] -= 4.0
    rc[:, 0] += 4.0

    n_left = len(lc)
    all_coords = np.vstack([lc, rc])
    all_faces  = np.vstack([lf, rf + n_left])

    # Centre the whole brain at origin
    all_coords -= all_coords.mean(axis=0)

    # Sulcal depth for base shading (light gyri, dark sulci)
    try:
        sulc_l = load_surf_data(fsaverage["sulc_left"]).astype(np.float32)
        sulc_r = load_surf_data(fsaverage["sulc_right"]).astype(np.float32)
        sulcal = np.concatenate([sulc_l, sulc_r])
        # Normalize to [0, 1]: 0 = deep sulcus (dark), 1 = gyrus (light)
        s_min, s_max = sulcal.min(), sulcal.max()
        sulcal = (sulcal - s_min) / (s_max - s_min + 1e-8)
        sulcal = np.round(sulcal, 4).tolist()
    except Exception as e:
        print(f"  Warning: sulcal data unavailable ({e}), using flat shading")
        sulcal = [0.5] * len(all_coords)

    mesh = {
        "positions": np.round(all_coords, 2).flatten().tolist(),
        "indices":   all_faces.flatten().tolist(),
        "sulcal":    sulcal,
        "n_left":    n_left,
        "n_right":   len(rc),
    }

    out = OUTPUT_DIR / "brain_mesh.json"
    with open(out, "w") as f:
        json.dump(mesh, f, separators=(",", ":"))
    print(f"  Saved brain_mesh.json  ({out.stat().st_size / 1024 / 1024:.1f} MB)")


def export_term_maps() -> None:
    from neurosynth.term_maps import _cached_path
    from neurosynth.terms import TERMS

    print("Loading term maps...")
    term_maps: dict[str, list] = {}
    for term in TERMS:
        path = _cached_path(term)
        if path.exists():
            arr = np.load(path).astype(np.float32)
            # Normalize to [-1, 1] per term
            mx = np.abs(arr).max()
            if mx > 1e-8:
                arr /= mx
            term_maps[term] = np.round(arr, 4).tolist()
        else:
            print(f"  Warning: no cached map for '{term}' — using zeros")
            term_maps[term] = [0.0] * 20484

    out = OUTPUT_DIR / "term_maps.json"
    with open(out, "w") as f:
        json.dump(term_maps, f, separators=(",", ":"))
    print(f"  Saved term_maps.json   ({out.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    export_brain_mesh()
    export_term_maps()
    print("Done. Run `npm run dev` in ui/ to start the frontend.")
