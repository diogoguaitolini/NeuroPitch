"""
Neurosynth terms used for cognitive decoding.

Each string is a term that exists in the Neurosynth v7 abstract-derived
vocabulary. The term itself is used as the key in the cognitive profile.

Chosen for pitch/communication relevance:
  - engagement loop  : attention, arousal, reward, surprise
  - social/emotional : emotion, social, valence, self-referential
  - language/meaning : language, speech, imagery
  - effort           : working memory
"""

TERMS: list[str] = [
    "attention",
    "arousal",
    "reward",
    "surprise",
    "emotion",
    "social",
    "valence",
    "self-referential",
    "language",
    "speech",
    "imagery",
    "working memory",
]
