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
  const [isIterating,  setIsIterating]  = useState(false)
  const [loadError,    setLoadError]    = useState('')

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

  async function handleRunIteration() {
    if (!id || isIterating) return
    setIsIterating(true)
    try {
      await api.iterate(id)
      const interval = setInterval(async () => {
        const status = await api.status(id)
        if (status.status === 'done') {
          clearInterval(interval)
          const newReport = await api.report(id)
          setReport(newReport)
          setIterIndex(newReport.n_iterations)
          setIsIterating(false)
        } else if (status.status === 'error') {
          clearInterval(interval)
          setIsIterating(false)
        }
      }, 3000)
    } catch {
      setIsIterating(false)
    }
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
        className="flex-none px-8 py-3 flex items-center justify-between border-b border-warm-border"
        style={{ background: 'rgba(235,231,223,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => navigate('/', { state: { anchor: 'demos' } })}
          className="font-display text-xs tracking-widest text-warm-dark hover:opacity-60 transition-opacity flex items-center gap-2"
        >
          ← BACK
        </button>

      </header>

      {/* ── Main split ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: scrollable pitch text */}
        <div className="flex-1 overflow-y-auto warm-scroll">
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
        <aside className="flex-none w-[400px] flex flex-col overflow-hidden bg-warm-surface">
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
          onRunIteration={handleRunIteration}
          isRunning={isIterating}
        />
      )}
    </div>
  )
}
