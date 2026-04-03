# NeuroPitch — UI Handoff Document

This document is written for the agent building the `ui/` module.
It covers what the system does, how data flows, where everything lives,
and the decisions made during backend development that the UI needs to respect.

---

## What the system does (30 seconds)

A user records a spoken pitch. The pipeline feeds it through Meta's TRIBE V2 brain
encoding model, which predicts what a listener's brain would look like on an fMRI
scanner at every moment of the pitch. Those brain maps are decoded into 12 cognitive
state scores per time window. An LLM (GPT-5.4 Thinking) rewrites the pitch to improve
those scores. This loops up to 3 times. The final output is a rewritten pitch and a
full cognitive timeline showing what changed and why.

The key framing for the LinkedIn post: *"I ran my pitch through Meta's brain model and
mapped exactly what a listener's brain is doing at every moment."*

---

## The single entry point

```python
from pipeline import run

report = run("path/to/pitch.mp3")
```

That is the only function the UI calls. It handles everything end-to-end and returns
a report dict (documented below). The UI does not import from `tribe`, `neurosynth`,
or `optimizer` directly.

Optional parameters:
```python
run(
    audio_path,
    session_id=None,    # pass an existing ID to resume a session
    max_iterations=3,   # hard cap on optimisation rounds
    min_delta=0.02,     # stop early if improvement < 2% between rounds
)
```

---

## Session folder structure

Every run creates a session folder under `sessions/`. This is the source of truth
for all data the UI needs to display.

```
sessions/
└── {session_id}/           ← 8-character hex ID, e.g. "a3f9c21b"
    ├── iter_0/             ← original pitch
    │   ├── audio.mp3       ← original audio file (copy)
    │   ├── voxels.npy      ← TRIBE output, shape (n_trs, 20484) float32
    │   ├── profile.json    ← cognitive scores per TR
    │   └── transcript.json ← timed transcript
    ├── iter_1/             ← after first LLM rewrite + TTS
    │   ├── audio.mp3       ← synthesised audio (OpenAI TTS)
    │   ├── voxels.npy
    │   ├── profile.json
    │   └── transcript.json
    ├── iter_2/ ...
    └── report.json         ← final summary (written when run() completes)
```

A session can be re-opened by passing its ID back to `run()`. TRIBE inference is
cached — it will never re-run for an audio file that already has a `voxels.npy`.

---

## Data formats

### profile.json
One file per iteration. Contains every cognitive score at every TR (2-second window).

```json
{
  "attention":        [0.12, 0.18, 0.22, 0.19, ...],
  "arousal":          [0.05, 0.09, 0.14, 0.11, ...],
  "reward":           [0.03, 0.07, 0.19, 0.25, ...],
  "surprise":         [0.01, 0.03, 0.11, 0.08, ...],
  "emotion":          [0.08, 0.12, 0.21, 0.18, ...],
  "social":           [0.15, 0.14, 0.16, 0.17, ...],
  "valence":          [0.06, 0.08, 0.12, 0.10, ...],
  "self-referential": [0.09, 0.10, 0.08, 0.11, ...],
  "language":         [0.24, 0.22, 0.25, 0.23, ...],
  "speech":           [0.18, 0.19, 0.20, 0.21, ...],
  "imagery":          [0.04, 0.07, 0.11, 0.09, ...],
  "working memory":   [0.28, 0.25, 0.20, 0.18, ...]
}
```

- Each list has exactly `n_trs` values.
- `n_trs = ceil(audio_duration_seconds / 2.0)` — one entry per 2-second window.
- Values are Pearson r, range roughly -0.5 to +0.5. They are NOT probabilities.
- Higher = the brain pattern at that moment resembles the known neural signature of
  that cognitive state. Lower (or negative) = the opposite.
- `working memory` is intentionally negative-weighted in the reward function —
  high working memory means the listener is struggling to follow.

### transcript.json
```json
[
  {"text": "Hi, I'm Diogo.", "start": 0.0, "end": 1.8},
  {"text": "Here's my idea.", "start": 1.8, "end": 3.5},
  ...
]
```

- `start` and `end` are seconds from the beginning of the audio.
- To align a transcript segment to profile scores: any TR index `i` where
  `i * 2.0` falls within `[start, end]` belongs to that segment.

### report.json
Written once when `run()` completes.

```json
{
  "session_id": "a3f9c21b",
  "n_iterations": 2,
  "reward_history": [0.112, 0.198, 0.241],
  "improvement_pct": 115.2,
  "transcript_v1": [...],
  "transcript_vfinal": [...],
  "diff": [
    {"type": "replace", "before": "leverage synergies", "after": "save you three hours"},
    {"type": "insert",  "before": "", "after": "imagine this"},
    ...
  ]
}
```

- `reward_history` has `n_iterations + 1` entries (iter_0 through iter_N).
- `diff` is a word-level diff. Types follow Python's `difflib`: `replace`, `insert`, `delete`.
- `improvement_pct` is `(final_reward - initial_reward) / |initial_reward| * 100`.

---

## The 12 cognitive terms

These are the Neurosynth vocabulary terms used for decoding. Use them as-is for labels.

| Term | What it captures for a pitch |
|---|---|
| `attention` | Is the listener paying attention? |
| `arousal` | General alertness / activation level |
| `reward` | "I want to hear more" — the strongest pitch signal |
| `surprise` | Unexpected angles that re-engage attention |
| `emotion` | Affective activation |
| `social` | Social cognition — thinking about people |
| `valence` | Positive vs. negative emotional colouring |
| `self-referential` | Listener is connecting content to themselves |
| `language` | Language processing (always high for speech — not very discriminating) |
| `speech` | Acoustic speech processing |
| `imagery` | Mental imagery / visualisation |
| `working memory` | Cognitive effort — high = listener is struggling |

`language` and `speech` will always be high for spoken content and aren't
very informative. The high-signal terms for a pitch are: `reward`, `attention`,
`self-referential`, `social`, `arousal`, `working memory` (inverted).

---

## The reward score

The optimizer collapses the 12 terms into one scalar reward per TR using a weighted sum.
Weights live in `optimizer/reward.py` → `DEFAULT_WEIGHTS`. The UI does not need to
recompute this — `report.json` already contains `reward_history` (one mean reward per
iteration). But if the UI wants to show a per-TR reward timeline for any iteration,
it can reconstruct it:

```python
from optimizer.reward import score
profile = json.load(open("sessions/{id}/iter_N/profile.json"))
reward_per_tr = score(profile)  # np.ndarray shape (n_trs,)
```

---

## Key decisions that affect the UI

**TR = 2 seconds.** Every score list is indexed by 2-second windows. The x-axis of any
timeline chart is `[0, 2, 4, 6, ...]` seconds.

**voxels.npy is large and internal.** The UI should never load or display `voxels.npy`.
It is only used by the pipeline. Load `profile.json` for visualisation.

**TTS audio (iter_1+) uses OpenAI's "alloy" voice.** It will sound different from the
original human recording. This is expected — the final step (not yet automated) is the
user re-recording the optimised script in their own voice.

**Sessions are file-based.** There is no database. To list all past sessions, list the
subdirectories of `sessions/`. To load a session, read its JSON files directly or use
the `Session` class in `pipeline/session.py`.

**Iteration 0 is always the human original.** Iterations 1+ are TTS. The UI should
make this distinction clear when playing audio.

**The diff in report.json is word-level, not segment-level.** If the UI shows a
before/after comparison, it should render the diff entries sequentially as they appear
in the original word order.

---

## Files the UI should read

| File | When to read it |
|---|---|
| `sessions/{id}/iter_N/profile.json` | To draw the cognitive timeline for any iteration |
| `sessions/{id}/iter_N/transcript.json` | To show segment text aligned to the timeline |
| `sessions/{id}/iter_N/audio.mp3` | To play the audio for that iteration |
| `sessions/{id}/report.json` | For the final summary view (reward trajectory, diff) |
| `neurosynth/terms.py` → `TERMS` | To get the list of term labels in order |
| `optimizer/reward.py` → `DEFAULT_WEIGHTS` | If the UI wants to show which terms matter most |

---

## What the UI does NOT need to do

- Call TRIBE, Neurosynth, or the LLM directly.
- Understand voxels or brain anatomy.
- Handle API keys (all API calls happen inside `pipeline.run()`).
- Manage iteration state — `run()` handles convergence and saving.

---

## Reference documents

- `OVERVIEW.md` — project goals, framing, LinkedIn angle
- `ARCHITECTURE.md` — module responsibilities, data flow diagram, design principles
- `neurosynth/terms.py` — canonical list of the 12 terms
- `optimizer/reward.py` — reward weights and formula
- `pipeline/session.py` — Session class (use this to load data cleanly)
- `pipeline/report.py` — report structure
