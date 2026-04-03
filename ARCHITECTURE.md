# NeuroPitch — Architecture

## Repository Structure

```
neuropitch/
├── tribe/          # Module 1 — Brain encoding (audio → voxel maps)
├── neurosynth/     # Module 2 — Cognitive decoding (voxel maps → cognitive states)
├── optimizer/      # Module 3 — Iteration loop (cognitive profile → better pitch)
├── ui/             # Module 4 — Frontend (audio input + results visualization)
├── pipeline/       # Orchestration (connects all modules end-to-end)
├── tests/
└── scripts/        # One-off utilities, data prep, experiments
```

Each module has a single, well-defined responsibility and a clean interface. The pipeline layer is the only code that knows about all four modules.

---

## Data Flow

```
Audio file
    │
    ▼
[ tribe ]  ──────────────────────────────────────────────────────────────────────►  voxel_maps
                                                                                    (n_timepoints × n_vertices)
                                                                                         │
                                                                                         ▼
                                                                               [ neurosynth ]  ──►  cognitive_profile
                                                                                                     (state → scores per TR)
                                                                                                          │
                                                                              ┌───────────────────────────┘
                                                                              │
                                                               ┌──────────────▼──────────────┐
                                                               │         [ optimizer ]        │
                                                               │  identify weak segments      │
                                                               │  LLM rewrite                 │
                                                               │  TTS → new audio             │
                                                               └──────────────┬───────────────┘
                                                                              │
                                                                    loop back to [ tribe ]
                                                                    until convergence
                                                                              │
                                                                              ▼
                                                                       [ ui ]  ──►  visualization + final report
```

---

## Module Responsibilities

### `tribe/`
**Concern:** Wrap TRIBE V2 inference. Know nothing about cognition, optimization, or UI.

- Load and cache the TRIBE V2 model from HuggingFace
- Accept an audio file path, return voxel activation maps (numpy array, shape `n_timepoints × n_vertices`)
- Handle TR windowing and segment alignment
- Expose a single clean function: `encode(audio_path) → voxel_maps`

### `neurosynth/`
**Concern:** Decode voxel activation maps into human-readable cognitive state scores. Know nothing about audio or TRIBE internals.

- Load Neurosynth meta-analytic maps for target cognitive terms
- For each TR, correlate the voxel map against each term map → score
- Return a structured cognitive profile: a dict of `{state: [score_per_TR]}`
- Expose a single clean function: `decode(voxel_maps) → cognitive_profile`

### `optimizer/`
**Concern:** Use the cognitive profile to drive iterative pitch improvement. Know nothing about voxels or brain anatomy.

- Receive a cognitive profile and a transcript (with TR-aligned segment boundaries)
- Identify which segments score poorly on target states
- Call an LLM to rewrite those segments with explicit cognitive targets
- Convert rewritten text to TTS audio
- Track iteration history and evaluate convergence
- Expose: `iterate(audio_path, cognitive_profile, transcript) → new_audio_path, new_transcript`

### `ui/`
**Concern:** Present the system to a user. Know nothing about TRIBE, Neurosynth internals, or optimization logic.

- Audio input: record or upload a pitch
- Display: waveform with multi-track cognitive state timeline overlaid
- Per-iteration comparison: show how the cognitive profile evolves
- Final report: v1 vs vFinal diff, "master insight" summary
- Calls the pipeline, not individual modules directly

### `pipeline/`
**Concern:** Wire the modules together. The only layer allowed to import from all four modules.

- Define the end-to-end run: audio → encode → decode → [optimize loop] → report
- Manage iteration state (current audio, current profile, history)
- Enforce convergence logic (delta threshold, max iterations)
- Expose a single entry point callable by both the UI and scripts

---

## Storage

No database. All state is persisted as files in a session folder:

```
sessions/
└── {session_id}/
    ├── iter_0/
    │   ├── audio.mp3          # audio for this iteration (original or TTS)
    │   ├── voxels.npy         # TRIBE output — large, expensive, never recompute
    │   ├── profile.json       # cognitive state scores per TR
    │   └── transcript.json    # text with TR-aligned segment boundaries
    ├── iter_1/
    │   └── ...
    └── report.json            # final diff + master insight
```

`voxels.npy` is the critical cache — TRIBE inference is the most expensive step and must never run twice on the same audio. Everything else is lightweight JSON.

A database becomes relevant only if this evolves into a multi-user product. For a single-user demo, a file tree is simpler, more debuggable, and has zero operational overhead.

---

## Key Design Principles

- **Modules are decoupled.** `tribe` never imports from `neurosynth`. `neurosynth` never imports from `optimizer`. Only `pipeline` has the full picture.
- **Interfaces are simple.** Each module exposes one or two functions with plain Python types (file paths, numpy arrays, dicts). No internal types leak across boundaries.
- **Audio is the universal currency.** Every iteration produces a new audio file. The pipeline always passes audio paths between modules, never intermediate representations.
- **The optimizer is LLM-agnostic.** The LLM client (OpenAI, Anthropic, local LLaMA) is a swappable dependency inside `optimizer/`, not hardcoded.
- **The UI is a consumer, not a participant.** It calls `pipeline` and renders results. No business logic lives in the UI layer.
