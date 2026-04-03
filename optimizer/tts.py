"""
optimizer/tts.py
----------------
Converts text to speech using the OpenAI TTS API.

Public API:
    synthesise(text, output_path, client=None, voice="alloy") -> Path
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Available OpenAI TTS voices: alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer
DEFAULT_VOICE = "alloy"


def synthesise(
    text: str,
    output_path: str | Path,
    client=None,
    voice: str = DEFAULT_VOICE,
) -> Path:
    """
    Synthesise text to an MP3 file using OpenAI TTS.

    Parameters
    ----------
    text : the full pitch text to synthesise.
    output_path : where to write the .mp3 file.
    client : openai.OpenAI instance. Created from OPENAI_API_KEY env var if None.
    voice : OpenAI TTS voice name.

    Returns
    -------
    Path to the written audio file.
    """
    import openai

    if client is None:
        client = openai.OpenAI()

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Synthesising %d chars with TTS voice '%s'…", len(text), voice)
    response = client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
    )
    response.stream_to_file(output_path)
    logger.info("TTS written to %s", output_path)
    return output_path
