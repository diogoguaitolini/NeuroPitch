import { forwardRef, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CognitiveProfile, PhraseScores, TranscriptSegment } from '../types'
import { DISPLAY_TERMS, REWARD_WEIGHTS, TERM_COLORS } from '../constants'
import { dominantTerm, getPhraseScores, rewardFromScores } from '../utils'

interface Props {
  transcript:         TranscriptSegment[]
  profile:            CognitiveProfile
  activeIndex:        number
  onPhraseActive:     (index: number) => void
  initialActiveIndex?: number
}

function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el
    el = el.parentElement
  }
  return window
}

export default function PhrasePane({ transcript, profile, activeIndex, onPhraseActive, initialActiveIndex = 0 }: Props) {
  const phraseRefs = useRef<(HTMLDivElement | null)[]>([])

  const allScores: PhraseScores[] = transcript.map(seg =>
    getPhraseScores(profile, seg)
  )

  useEffect(() => {
    // Find the scrollable container
    const firstEl = phraseRefs.current.find(el => el !== null)
    if (!firstEl) return
    const scrollParent = getScrollParent(firstEl.parentElement)

    let rafId: number

    function findActive() {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        let viewportTop: number, viewportHeight: number

        if (scrollParent === window) {
          viewportTop = 0
          viewportHeight = window.innerHeight
        } else {
          const rect = (scrollParent as HTMLElement).getBoundingClientRect()
          viewportTop = rect.top
          viewportHeight = rect.height
        }

        const centerY = viewportTop + viewportHeight / 2
        let bestIdx = 0
        let bestDist = Infinity

        phraseRefs.current.forEach((el, i) => {
          if (!el) return
          const rect = el.getBoundingClientRect()
          const elCenterY = rect.top + rect.height / 2
          const dist = Math.abs(elCenterY - centerY)
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = i
          }
        })

        onPhraseActive(bestIdx)
      })
    }

    scrollParent.addEventListener('scroll', findActive, { passive: true })
    findActive()

    return () => {
      scrollParent.removeEventListener('scroll', findActive)
      cancelAnimationFrame(rafId)
    }
  }, [transcript, onPhraseActive])

  // When transcript changes (iteration switch), restore scroll to saved phrase
  useEffect(() => {
    if (transcript.length === 0) return
    const idx = Math.min(initialActiveIndex, transcript.length - 1)

    requestAnimationFrame(() => {
      const el = phraseRefs.current[idx]
      if (!el) return
      const scrollParent = getScrollParent(el.parentElement)

      if (scrollParent === window) {
        const rect = el.getBoundingClientRect()
        const centerY = window.innerHeight / 2
        window.scrollBy({ top: rect.top + rect.height / 2 - centerY, behavior: 'instant' })
      } else {
        const sp = scrollParent as HTMLElement
        const spRect = sp.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const currentRelTop = elRect.top - spRect.top
        const targetRelTop = sp.clientHeight / 2 - el.clientHeight / 2
        sp.scrollTop += currentRelTop - targetRelTop
      }
    })
  }, [transcript])

  return (
    <div
      className="px-12 max-w-2xl mx-auto"
      style={{ paddingTop: '45vh', paddingBottom: '45vh' }}
    >
      {transcript.map((seg, i) => (
        <PhraseBlock
          key={i}
          ref={el => { phraseRefs.current[i] = el }}
          segment={seg}
          scores={allScores[i]}
          isActive={i === activeIndex}
        />
      ))}
    </div>
  )
}

// ── Single phrase block ────────────────────────────────────────────────────────

interface BlockProps {
  segment:  TranscriptSegment
  scores:   PhraseScores
  isActive: boolean
}

const PhraseBlock = forwardRef<HTMLDivElement, BlockProps>(function PhraseBlock(
  { segment, scores, isActive },
  ref,
) {
  const [showTooltip, setShowTooltip] = useState(false)

  const reward    = rewardFromScores(scores, REWARD_WEIGHTS)
  const domTerm   = dominantTerm(scores, REWARD_WEIGHTS)
  const barColor  = TERM_COLORS[domTerm] ?? '#7a6240'
  const intensity = Math.max(0, Math.min(1, (reward + 3) / 6))

  return (
    <div
      ref={ref}
      className="relative mb-10 group cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Left activation bar */}
      <div
        className="absolute -left-5 top-0 bottom-0 w-[2px] rounded-full transition-all duration-500"
        style={{ backgroundColor: barColor, opacity: 0.15 + intensity * 0.85 }}
      />

      {/* Phrase text */}
      <p
        className="text-[1.75rem] font-light leading-[1.5] tracking-tight transition-colors duration-500"
        style={{ color: isActive ? '#2E2C28' : '#C8C3B8' }}
      >
        {segment.text}
      </p>

      {/* Timestamp */}
      <span className="mt-1 block text-warm-muted text-xs font-display tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {formatTime(segment.start)}
      </span>

      {/* Score tooltip */}
      <AnimatePresence>
        {showTooltip && Object.keys(scores).length > 0 && (
          <ScoreTooltip scores={scores} />
        )}
      </AnimatePresence>
    </div>
  )
})

// ── Hover tooltip ──────────────────────────────────────────────────────────────

function ScoreTooltip({ scores }: { scores: PhraseScores }) {
  const ranked = DISPLAY_TERMS
    .map(term => ({
      term,
      value:   scores[term] ?? 0,
      contrib: (REWARD_WEIGHTS[term] ?? 0) * (scores[term] ?? 0),
    }))
    .filter(d => Math.abs(d.value) > 0.001)
    .sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib))
    .slice(0, 5)

  const maxAbs = Math.max(...ranked.map(d => Math.abs(d.value)), 0.1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.12 }}
      className="absolute left-0 top-full mt-2 z-50 bg-warm-surface border border-warm-border rounded-xl p-4 w-60 shadow-lg"
    >
      {ranked.map(({ term, value, contrib }) => (
        <div key={term} className="flex items-center gap-2 mb-2 last:mb-0">
          <div
            className="w-1.5 h-1.5 rounded-full flex-none"
            style={{ backgroundColor: TERM_COLORS[term] ?? '#7a6240' }}
          />
          <span className="text-warm-muted text-xs w-28 truncate font-display">
            {term.replace(/-/g, ' ')}
          </span>
          <div className="flex-1 h-px bg-warm-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width:           `${(Math.abs(value) / maxAbs) * 100}%`,
                backgroundColor: TERM_COLORS[term] ?? '#7a6240',
                opacity:         contrib < 0 ? 0.45 : 1,
              }}
            />
          </div>
          <span className="text-warm-muted text-[10px] w-9 text-right tabular-nums font-display">
            {value.toFixed(3)}
          </span>
        </div>
      ))}
    </motion.div>
  )
}

function formatTime(s: number): string {
  const m  = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}
