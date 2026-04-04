# NeuroPitch

A personal research project exploring whether neuroscience can be used as a reward signal to guide LLM-driven pitch optimization.

The core idea: instead of asking an LLM to rewrite a pitch based on vague instructions like "make it more compelling," give it a measurable signal — predicted brain activations — and let it optimize against that.

**[Live demo →](https://neuropitch.vercel.app)**

---

## How it works

```
Audio recording
      │
      ▼
  Whisper         — transcribe speech to text (OpenAI)
      │
      ▼
  TRIBE V2        — predict fMRI-like brain activations from audio
                    output: voxel maps (n_timepoints × 20,484 vertices)
      │
      ▼
  Neurosynth      — decode voxel maps into cognitive state scores
                    (attention, reward, emotion, valence, arousal, …)
      │
      ▼
  Reward fn       — score the cognitive profile
      │
      ▼
  GPT rewrite     — identify weak segments, rewrite full transcript
      │
      ▼
  OpenAI TTS      — synthesise new audio from rewritten script
      │
      └──────────── loop (up to N iterations, stop on convergence)
```

Each iteration produces a new audio file and cognitive profile. The UI lets you compare brain activation patterns across iterations and read the before/after transcripts side by side.

---

## Stack

| Layer | Tools |
|---|---|
| Brain encoding | [TRIBE V2](https://huggingface.co/facebook/tribev2) (`facebook/tribev2`) |
| Cognitive decoding | [Neurosynth](https://neurosynth.org) term maps |
| Transcription | OpenAI Whisper |
| LLM rewriting | GPT (high reasoning effort) |
| TTS | OpenAI TTS (`alloy` voice) |
| Frontend | React + Vite + Three.js (3D brain), Tailwind, Framer Motion |
| Pipeline | Python |

---

## Running the pipeline

**Prerequisites:** Python 3.11+, Node 18+, an OpenAI API key, and a HuggingFace token with access to `facebook/tribev2`.

```bash
# 1. Clone and set up the Python environment
git clone https://github.com/your-username/neuropitch
cd neuropitch
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env
# Fill in OPENAI_API_KEY and HF_TOKEN

# 3. Run the pipeline on a pitch recording
python scripts/run_pipeline.py
# Edit that file to point at your audio file and set max_iterations

# 4. Export session data to the UI
python scripts/export_static.py

# 5. Generate brain mesh assets (first time only)
python scripts/export_brain_assets.py
```

**Running the UI locally:**

```bash
cd ui
npm install
npm run dev
```

---

## Project structure

```
neuropitch/
├── tribe/          # TRIBE V2 wrapper — audio → voxel maps
├── neurosynth/     # Neurosynth decoder — voxel maps → cognitive profile
├── optimizer/      # GPT rewriter + TTS synthesis
├── pipeline/       # Orchestration — connects all modules end-to-end
├── scripts/        # run_pipeline.py, export_static.py, export_brain_assets.py
├── sessions/       # Raw pipeline outputs (gitignored)
├── demos.json      # Registry of demo sessions shown on the website
└── ui/             # React frontend (self-contained static site after export)
```

---

## Caveats and honest limitations

This is a proof of concept. There are real scientific and engineering limitations worth being upfront about.

**Domain mismatch in TRIBE V2.**
TRIBE was trained on fMRI recordings of people passively listening to naturalistic audio — film clips, audiobooks, stories. A sales pitch is a fundamentally different cognitive context: the listener is evaluating, not just experiencing. There is no published validation of TRIBE's predictions for persuasion-focused speech, so the voxel maps it produces for pitches are extrapolations outside the training distribution.

**Missing Neurosynth terms.**
Two of the twelve cognitive dimensions — `surprise` and `self-referential` — have no available Neurosynth term maps and are permanently zeroed out. The reward signal is operating with an incomplete picture.

**No human validation.**
There is no A/B test, user study, or listener feedback confirming that the optimized pitches actually perform better with real audiences. The improvement metric is purely model-internal.

---

## What this demonstrates

Despite the caveats, the project achieves what it set out to do:

- A working end-to-end pipeline connecting brain encoding, cognitive decoding, and LLM rewriting in a closed loop
- A real reward signal derived from neuroscience, even if its validity for this domain is uncertain
- An interactive visualization of cognitive state timelines across pitch iterations
- A concrete exploration of whether neuroscience can inform AI-driven language optimization

The honest framing: this is a hypothesis about how to make LLMs more cognitively grounded, implemented well enough to be a credible research artifact — not a validated product.

---

*Personal research project by [Diogo Guaitolini](https://www.linkedin.com/in/guaitolinidiogo/) — 2026*
