"""
optimizer/transcribe.py
-----------------------
Transcribes audio to a timed transcript using OpenAI Whisper.

Public API:
    transcribe(audio_path, client=None) -> list[dict]
        Returns [{"text": str, "start": float, "end": float}, ...]
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def transcribe(audio_path: str | Path, client=None) -> list[dict]:
    """
    Transcribe an audio file using OpenAI Whisper with word-level timestamps.

    Segments are returned at the sentence level (Whisper's natural chunking).
    Each segment has "start" and "end" in seconds.

    Parameters
    ----------
    audio_path : path to the audio file.
    client : openai.OpenAI instance. Created from OPENAI_API_KEY env var if None.

    Returns
    -------
    list of {"text": str, "start": float, "end": float}
    """
    import openai

    audio_path = Path(audio_path)
    if client is None:
        client = openai.OpenAI()

    logger.info("Transcribing %s with Whisper…", audio_path.name)
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = [
        {
            "text": seg.text.strip(),
            "start": seg.start,
            "end": seg.end,
        }
        for seg in response.segments
        if seg.text.strip()
    ]
    logger.info("Transcribed %d segments", len(segments))
    return segments
