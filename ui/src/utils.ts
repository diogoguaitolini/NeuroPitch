import type { CognitiveProfile, PhraseScores, TranscriptSegment } from './types'

/** Return mean cognitive scores for the TRs that overlap a transcript segment. */
export function getPhraseScores(
  profile:  CognitiveProfile,
  segment:  TranscriptSegment,
): PhraseScores {
  const TR = 2.0
  const nTRs = profile.attention.length

  const trStart = Math.floor(segment.start / TR)
  const trEnd   = Math.min(Math.ceil(segment.end / TR), nTRs)

  if (trStart >= trEnd) return {}

  const scores: PhraseScores = {}
  for (const [term, values] of Object.entries(profile)) {
    const slice = values.slice(trStart, trEnd)
    const clean = slice.filter((v): v is number => v !== null && isFinite(v))
    scores[term] = clean.length > 0 ? clean.reduce((a, b) => a + b, 0) / clean.length : 0
  }
  return scores
}

/** Compute a scalar reward for a set of phrase scores using the default weights. */
export function rewardFromScores(
  scores:  PhraseScores,
  weights: Record<string, number>,
): number {
  let total = 0
  for (const [term, w] of Object.entries(weights)) {
    if (w !== 0 && scores[term] !== undefined) {
      total += w * scores[term]
    }
  }
  return total
}

/** Map a value in [-1, 1] to an rgba CSS string using the caramel hot colormap. */
export function activationToColor(t: number): string {
  // t: 0 = neutral, positive = activated
  const a = Math.max(0, t)  // clip negative
  if (a < 0.5) {
    const s = a * 2
    const r = Math.round(22   + s * (139 - 22))
    const g = Math.round(20   + s * (85  - 20))
    const b = Math.round(24   + s * (32  - 24))
    return `rgb(${r},${g},${b})`
  }
  const s = (a - 0.5) * 2
  const r = Math.round(139 + s * (255 - 139))
  const g = Math.round(85  + s * (224 - 85))
  const b = Math.round(32  + s * (160 - 32))
  return `rgb(${r},${g},${b})`
}

/** Dominant term (by absolute weighted contribution) for a phrase. */
export function dominantTerm(
  scores:  PhraseScores,
  weights: Record<string, number>,
): string {
  let best = ''
  let bestVal = -Infinity
  for (const [term, w] of Object.entries(weights)) {
    if (w === 0 || scores[term] === undefined) continue
    const v = Math.abs(w * scores[term])
    if (v > bestVal) { bestVal = v; best = term }
  }
  return best
}
