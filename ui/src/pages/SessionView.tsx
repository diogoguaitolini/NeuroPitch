import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { CognitiveProfile, PhraseScores, Report, TranscriptSegment } from '../types'
import { getPhraseScores } from '../utils'
import Brain3D from '../components/Brain3D'
import PhrasePane from '../components/PhrasePane'
import IterationBar from '../components/IterationBar'
import ScorePanel from '../components/ScorePanel'

export default function SessionView() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()

  const [report,       setReport]       = useState<Report | null>(null)
  const [iterIndex,    setIterIndex]    = useState(0)
  const [profile,      setProfile]      = useState<CognitiveProfile | null>(null)
  const [transcript,   setTranscript]   = useState<TranscriptSegment[]>([])
  const [activePhrase, setActivePhrase] = useState<number>(0)
  const savedPhraseRef = useRef(0)
  const [phraseScores, setPhraseScores] = useState<PhraseScores>({})
  const [loadError,    setLoadError]    = useState('')
  const [mobileTab,    setMobileTab]    = useState<'brain' | 'text'>('brain')

  useEffect(() => {
    if (!id) return
    api.report(id).then(setReport).catch(() => setLoadError('Session not found.'))
  }, [id])

  useEffect(() => {
    if (!id) return
    setProfile(null)
    setTranscript([])
    Promise.all([
      api.profile(id, iterIndex),
      api.transcript(id, iterIndex),
    ]).then(([p, t]) => {
      setProfile(p)
      setTranscript(t)
    }).catch(e => setLoadError(String(e)))
  }, [id, iterIndex])

  useEffect(() => {
    if (!profile || transcript.length === 0) return
    const segment = transcript[activePhrase]
    if (!segment) return
    setPhraseScores(getPhraseScores(profile, segment))
  }, [activePhrase, profile, transcript])

  const handlePhraseActive = useCallback((index: number) => {
    setActivePhrase(index)
  }, [])

  function handleSelectIter(i: number) {
    savedPhraseRef.current = activePhrase
    setIterIndex(i)
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-muted mb-4 font-display">{loadError}</p>
          <button
            onClick={() => navigate('/', { state: { anchor: 'demos' } })}
            className="font-display text-xs tracking-widest text-warm-dark hover:opacity-70 transition-opacity"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-warm-bg flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="flex-none px-6 py-3 flex items-center justify-between border-b border-warm-border"
        style={{ background: 'rgba(235,231,223,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => navigate('/', { state: { anchor: 'demos' } })}
          className="font-display text-xs tracking-widest text-warm-dark hover:opacity-60 transition-opacity flex items-center gap-2"
        >
          ← BACK
        </button>

        {/* Mobile toggle */}
        <div className="flex sm:hidden items-center gap-1 p-1 rounded-full border border-warm-border">
          {(['brain', 'text'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="font-display text-xs tracking-widest px-3 py-1 rounded-full transition-all duration-200"
              style={mobileTab === tab
                ? { background: '#2E2C28', color: '#EBE7DF' }
                : { color: '#948E81' }
              }
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main split ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: scrollable pitch text */}
        <div className={`flex-1 overflow-y-auto warm-scroll ${mobileTab === 'text' ? 'block' : 'hidden'} sm:block`}>
          {transcript.length > 0 && profile ? (
            <PhrasePane
              transcript={transcript}
              profile={profile}
              activeIndex={activePhrase}
              onPhraseActive={handlePhraseActive}
              initialActiveIndex={savedPhraseRef.current}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-warm-dark border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Right: brain + scores */}
        <aside className={`flex-none w-full sm:w-[400px] overflow-hidden bg-warm-surface sm:flex sm:flex-col ${mobileTab === 'brain' ? 'flex flex-col' : 'hidden'}`}>
          <div className="flex-1 relative bg-warm-surface">
            <Brain3D scores={phraseScores} />
          </div>
          <div className="flex-none border-t border-warm-border">

            <ScorePanel scores={phraseScores} />
          </div>
        </aside>
      </div>

      {/* ── Iteration bar ───────────────────────────────────────────── */}
      {report && (
        <IterationBar
          report={report}
          activeIter={iterIndex}
          onSelect={handleSelectIter}
        />
      )}
    </div>
  )
}
