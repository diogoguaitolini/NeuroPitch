"""
optimizer/rewrite.py
--------------------
Uses an OpenAI reasoning model to rewrite the full pitch transcript,
using weak segments as signal for where to focus improvement.

Public API:
    rewrite(full_transcript, weak_segments, client=None) -> list[dict]
        Returns a fully rewritten transcript (same structure, updated text).
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)

MODEL = "gpt-5.4"
REASONING_EFFORT = "high"  # none | low | medium | high | xhigh

_SYSTEM_PROMPT = """\
You are a pitch coach and cognitive neuroscience expert.
You will receive a spoken pitch transcript and a list of underperforming segments \
identified by a brain encoding model.

Your task: rewrite the ENTIRE pitch as a cohesive script.
Use the underperforming segments as your priority targets, but improve everything — \
transitions, flow, and strong sections too. The final script must read as one unified piece.

Rules:
- Keep the same core message and facts — do not invent new claims.
- Maintain the speaker's voice and tone.
- Prefer concrete imagery, personal stakes, and direct second-person address ("you") \
  to boost self-relevance and social engagement.
- Simplify complex sentences to reduce cognitive load.
- Vary rhythm and introduce unexpected angles to sustain attention and surprise.
- Return ONLY a JSON array with the same number of entries as the input transcript, \
  each entry having "text", "start", "end". Preserve the original "start" and "end" \
  timestamps exactly — only "text" should change. Do not include any other text.
"""


def _build_user_message(full_transcript: list[dict], weak: list[dict]) -> str:
    transcript_clean = [
        {"text": s["text"], "start": s["start"], "end": s["end"]}
        for s in full_transcript
    ]
    weak_texts = [s["text"] for s in weak]
    return (
        f"Full pitch transcript:\n{json.dumps(transcript_clean, indent=2)}\n\n"
        f"Priority segments to improve (brain model flagged these as underperforming):\n"
        + "\n".join(f'- "{t}"' for t in weak_texts)
    )


def rewrite(
    full_transcript: list[dict],
    weak: list[dict],
    client=None,
) -> list[dict]:
    """
    Rewrite the full pitch transcript using GPT-5.4 Thinking.

    The weak segments tell the model where to focus, but the entire script
    is rewritten for coherence and flow.

    Parameters
    ----------
    full_transcript : complete list of {"text", "start", "end"} dicts.
    weak : underperforming segments from optimizer.segments.weak_segments().
    client : openai.OpenAI instance. Created from OPENAI_API_KEY env var if None.

    Returns
    -------
    Fully rewritten transcript — same length and timestamps, updated text.
    """
    import openai

    if client is None:
        client = openai.OpenAI()

    logger.info("Rewriting full transcript (%d segments) with %s [effort=%s]…",
                len(full_transcript), MODEL, REASONING_EFFORT)

    response = client.chat.completions.create(
        model=MODEL,
        reasoning_effort=REASONING_EFFORT,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_message(full_transcript, weak)},
        ],
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    rewritten: list[dict] = json.loads(raw)

    logger.info("Rewrite complete.")
    return rewritten
