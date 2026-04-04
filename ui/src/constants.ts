// Reward weights mirroring optimizer/reward.py DEFAULT_WEIGHTS
export const REWARD_WEIGHTS: Record<string, number> = {
  reward:            2.0,
  attention:         1.5,
  'self-referential':1.5,
  social:            1.0,
  arousal:           1.0,
  emotion:           1.0,
  valence:           1.0,
  imagery:           0.5,
  surprise:          0.5,
  'working memory': -2.0,
  language:          0.0,
  speech:            0.0,
}

// Display color per cognitive term (CSS hex strings)
export const TERM_COLORS: Record<string, string> = {
  reward:            '#c9a96e',
  attention:         '#7ab8e0',
  'self-referential':'#b09fd4',
  social:            '#72c8a4',
  arousal:           '#f0a060',
  emotion:           '#e07898',
  valence:           '#7ec87a',
  imagery:           '#d4c07a',
  surprise:          '#f0d050',
  'working memory':  '#e06860',
  language:          '#4a4744',
  speech:            '#4a4744',
}

// Terms shown in the score panel (skip language/speech — always high)
export const DISPLAY_TERMS = [
  'reward',
  'attention',
  'self-referential',
  'social',
  'arousal',
  'emotion',
  'valence',
  'imagery',
  'surprise',
  'working memory',
]

export const API_BASE = ''  // proxied by Vite dev server
