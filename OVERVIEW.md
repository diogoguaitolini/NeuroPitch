# NeuroPitch — Project Overview

## Ultimate Goal

Build a shareable LinkedIn project that demonstrates technical depth in AI,
neuroscience-informed systems, and LLM pipelines.

## What We're Building

A pitch optimizer that uses a brain encoding model to produce a full cognitive
state analysis of a spoken pitch — mapping how the listener's brain responds
moment to moment across the entire delivery. The system then uses those
signals as a reward function to iteratively rewrite and improve the pitch.

## Specific Objectives

- Record any spoken pitch (job interview, elevator pitch, idea pitch, etc.)
- Feed the audio through TRIBE V2 to get per-TR voxel activation timelines
- Decode voxel activations into a rich set of cognitive states via Neurosynth
- Visualize a full cognitive timeline: waveform with multiple state tracks overlaid
- Use the full cognitive profile as a reward signal to drive LLM rewrites
- Convert rewritten segments to TTS, re-score, iterate
- Terminate when the pitch converges on a target cognitive profile
- Record a final human version of the optimized pitch
- Analyze what linguistically changed between v1 and vFinal — the "master insight"

## What the Analysis Reveals

The pipeline extracts a continuous timeline of cognitive states across the pitch — not just where attention drops, but the full emotional and cognitive texture of how a listener's brain responds. This includes:

- **Narrative transportation** — when the listener gets pulled into the story
- **Self-relevance** — when the listener mentally connects the content to themselves
- **Reward anticipation** — when the brain signals excitement or desire to hear more
- **Cognitive load** — when the pitch becomes effortful to follow
- **Emotional arousal** — peaks of affective engagement across the delivery
- **Semantic richness** — density of meaning being processed per moment

The final output is a rich cognitive fingerprint of the pitch — a map of what the listener's brain is doing at every moment, not just a single engagement score.

## Overall Approach

1. Record pitch → feed raw audio into TRIBE V2
2. TRIBE V2 → per-TR voxel activation maps (~2s windows across the pitch)
3. Voxel maps → Neurosynth functional decoding → cognitive state scores per time window
4. Visualize: pitch waveform + multi-track cognitive state timeline
5. Full cognitive profile → LLM analysis of strengths, weaknesses, and rewrite targets
6. Rewritten segments → TTS → re-score with TRIBE V2
7. Loop until convergence (delta < threshold or max iterations reached)
8. Final human recording of optimized script
9. Diff v1 vs vFinal: extract linguistic patterns that drove improvement

## Tools

| Tool                              | Role                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| **TRIBE V2** (`facebook/tribev2`) | Predict brain response to audio — outputs per-TR voxel maps |
| **Neurosynth**                    | Decode voxel maps into cognitive state scores               |
| **LLaMA / GPT-4o**                | Cognitive profile analysis and segment rewriting            |
| **gTTS / ElevenLabs**             | TTS for iteration cycles                                    |
| **Python**                        | Pipeline orchestration                                      |
| **Streamlit or React**            | Demo UI — waveform + multi-track cognitive state timeline   |

## Framing for LinkedIn

> "I ran my pitch through Meta's brain model and mapped exactly what a
> listener's brain is doing at every moment. Here's the full cognitive
> fingerprint — and what I changed."

## Reusability

The pipeline is input-agnostic. The same code supports:

- Job interview pitch optimizer
- Elevator pitch / idea pitch optimizer
- Viral content decoder (analyze existing high/low-engagement content)
- Rejection letter decoder (TTS → score corporate HR language)

## Known Limitations (to address openly in the post)

- TRIBE outputs population-average brain responses, not individual predictions
- Neurosynth decoding is correlational, not causal
- TTS iterations use synthetic voice — final recording uses real speech
- Cognitive states are proxies for listener experience, not direct measurements
- Results are directional signals, not clinical measurements
