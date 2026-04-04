import type { Report } from '../types'

interface Props {
  report:     Report
  activeIter: number
  onSelect:   (n: number) => void
}

export default function IterationBar({ report, activeIter, onSelect }: Props) {
  const iters = Array.from({ length: report.n_iterations + 1 }, (_, i) => i)

  return (
    <div className="flex-none border-t border-warm-border bg-warm-bg px-6 py-3 flex items-center gap-3">

      {/* Iteration tabs */}
      <div className="flex items-center gap-1">
        {iters.map(i => {
          const isActive = i === activeIter
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className="font-display font-medium text-xs tracking-widest px-4 py-1.5 rounded-full border transition-all duration-200"
              style={isActive
                ? { background: '#2E2C28', color: '#EBE7DF', borderColor: '#2E2C28' }
                : { background: 'transparent', color: '#2E2C28', borderColor: '#2E2C28' }
              }
            >
              {i === 0 ? 'ORIGINAL' : `ITERATION ${i}`}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* Improvement badge */}
      {report.n_iterations > 0 && (
        <span
          className="font-display font-semibold text-xs px-3 py-1 rounded-full"
          style={{ background: '#2E2C28', color: '#EBE7DF' }}
        >
          +{report.improvement_pct.toFixed(1)}% overall
        </span>
      )}

    </div>
  )
}
