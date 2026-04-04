import { motion } from 'framer-motion'
import type { PhraseScores } from '../types'
import { DISPLAY_TERMS, REWARD_WEIGHTS, TERM_COLORS } from '../constants'

interface Props {
  scores: PhraseScores
}

export default function ScorePanel({ scores }: Props) {
  if (Object.keys(scores).length === 0) {
    return (
      <div className="px-6 py-5 text-warm-muted text-xs text-center font-display tracking-wide">
        Scroll through the pitch to see cognitive signals
      </div>
    )
  }

  const rows = DISPLAY_TERMS.map(term => ({
    term,
    value:  scores[term] ?? 0,
    weight: REWARD_WEIGHTS[term] ?? 0,
  })).sort((a, b) => Math.abs(b.weight * b.value) - Math.abs(a.weight * a.value))

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.value)), 0.1)
  const reward = rows.reduce((acc, r) => acc + r.weight * r.value, 0)

  return (
    <div className="px-6 py-5">
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xs tracking-[0.18em] text-warm-muted uppercase">Score</span>
          <div className="relative group">
            <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-warm-border text-warm-muted font-display text-[9px] cursor-default leading-none">?</span>
            <div className="absolute left-0 top-full mt-2 w-56 bg-warm-surface border border-warm-border rounded-xl px-3 py-2.5 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
              <p className="font-display text-[11px] text-warm-muted leading-relaxed">
                Weighted sum of the cognitive signals below. Higher = the predicted brain response looks like engagement, attention, and emotion. Lower = cognitive overload. Phrases with the lowest scores are the ones GPT will focus on improving.
              </p>
            </div>
          </div>
        </div>
        <span
          className="font-display font-semibold text-sm tabular-nums"
          style={{ color: reward > 0 ? '#2E2C28' : '#948E81' }}
        >
          {reward.toFixed(3)}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map(({ term, value, weight }) => {
          const barPct     = (Math.abs(value) / maxAbs) * 100
          const isNegative = weight < 0
          const dimmed     = term === 'language' || term === 'speech'

          return (
            <div key={term} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-none"
                style={{ backgroundColor: TERM_COLORS[term] ?? '#948E81', opacity: dimmed ? 0.25 : 1 }}
              />
              <span
                className="font-display text-xs w-32 truncate tracking-wide"
                style={{ color: dimmed ? '#C8C3B8' : '#948E81' }}
              >
                {term.replace(/-/g, ' ')}
              </span>
              <div className="flex-1 h-[3px] bg-warm-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    backgroundColor: TERM_COLORS[term] ?? '#948E81',
                    opacity: dimmed ? 0.2 : isNegative && value > 0 ? 0.4 : 0.85,
                  }}
                />
              </div>
              <span
                className="font-display text-xs w-12 text-right tabular-nums"
                style={{ color: dimmed ? '#C8C3B8' : '#948E81' }}
              >
                {value.toFixed(3)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
