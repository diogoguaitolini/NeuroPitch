import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import type { Demo } from '../types'
import Brain3D from '../components/Brain3D'

// Keyframes for looping brain activation animation
const HERO_KEYFRAMES: Record<string, number>[] = [
  { reward: 0.80, attention: 0.30, 'self-referential': 0.20, social: 0.15, arousal: 0.70, emotion: 0.65, valence: 0.40, imagery: 0.10, surprise: 0.55, 'working memory': -0.05, language: 0, speech: 0 },
  { reward: 0.35, attention: 0.75, 'self-referential': 0.60, social: 0.50, arousal: 0.25, emotion: 0.30, valence: 0.55, imagery: 0.45, surprise: 0.15, 'working memory': -0.20, language: 0, speech: 0 },
  { reward: 0.50, attention: 0.40, 'self-referential': 0.70, social: 0.75, arousal: 0.35, emotion: 0.80, valence: 0.70, imagery: 0.20, surprise: 0.60, 'working memory': -0.15, language: 0, speech: 0 },
  { reward: 0.20, attention: 0.55, 'self-referential': 0.35, social: 0.30, arousal: 0.80, emotion: 0.45, valence: 0.25, imagery: 0.75, surprise: 0.80, 'working memory': -0.30, language: 0, speech: 0 },
  { reward: 0.65, attention: 0.65, 'self-referential': 0.50, social: 0.60, arousal: 0.50, emotion: 0.55, valence: 0.60, imagery: 0.40, surprise: 0.35, 'working memory': -0.10, language: 0, speech: 0 },
]

const KEYFRAME_DURATION = 4000 // ms per transition

function useHeroScores(): Record<string, number> {
  const [scores, setScores] = useState<Record<string, number>>(HERO_KEYFRAMES[0])
  const startTime = useRef(performance.now())

  useEffect(() => {
    let raf: number
    const n = HERO_KEYFRAMES.length
    const keys = Object.keys(HERO_KEYFRAMES[0])

    function tick() {
      const elapsed = performance.now() - startTime.current
      const totalCycle = KEYFRAME_DURATION * n
      const pos = (elapsed % totalCycle) / KEYFRAME_DURATION
      const i = Math.floor(pos)
      const t = pos - i // 0→1 progress within current segment
      const from = HERO_KEYFRAMES[i % n]
      const to = HERO_KEYFRAMES[(i + 1) % n]
      // Smooth easing (ease-in-out)
      const e = t * t * (3 - 2 * t)
      const lerped: Record<string, number> = {}
      for (const k of keys) {
        lerped[k] = from[k] + (to[k] - from[k]) * e
      }
      setScores(lerped)
    }
    const interval = setInterval(tick, 100)
    tick()
    return () => clearInterval(interval)
  }, [])

  return scores
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Section label  "TITLE ————————" ──────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <Reveal>
      <div className="flex items-center gap-5 mb-14">
        <h2 className="font-display font-bold text-3xl lg:text-4xl text-warm-dark whitespace-nowrap tracking-tight">
          {text}
        </h2>
        <div className="flex-1 h-[2px]" style={{ background: 'linear-gradient(90deg, #948E81 0%, #C8C3B8 100%)' }} />
      </div>
    </Reveal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [demos, setDemos] = useState<Demo[]>([])
  const demoRef   = useRef<HTMLElement>(null)
  const ideaRef   = useRef<HTMLElement>(null)
  const howRef    = useRef<HTMLElement>(null)
  const techRef   = useRef<HTMLElement>(null)
  const heroScores = useHeroScores()
  const [activeTech, setActiveTech] = useState(0)

  useEffect(() => {
    api.demos().then(setDemos).catch(() => {})
  }, [])

  useEffect(() => {
    if ((location.state as { anchor?: string })?.anchor === 'demos') {
      setTimeout(() => demoRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      // Clear the anchor so a subsequent visit / back-navigation doesn't re-scroll
      navigate('.', { replace: true, state: {} })
    }
  }, [location.state])

  useEffect(() => {
    const id = setInterval(() => setActiveTech(i => (i + 1) % TECH.length), 12000)
    return () => clearInterval(id)
  }, [])

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="bg-warm-bg font-sans overflow-x-hidden">

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-2.5 flex items-center justify-between sm:justify-start gap-2 sm:gap-3"
        style={{ background: 'rgba(235,231,223,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <NavPill label="HOME"         onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <NavPill label="HOW IT WORKS" onClick={() => scrollTo(howRef)} className="hidden sm:block" />
        <NavPill label="TECH"         onClick={() => scrollTo(techRef)} />
        <div className="hidden sm:block flex-1" />
        <NavPill label="DEMO ↗"       onClick={() => scrollTo(demoRef)} filled />
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-0 overflow-hidden" style={{ background: '#EBE7DF' }}>
        {/* Giant wordmark — sits behind the card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-0 text-center leading-none select-none overflow-hidden w-full"
          style={{
            fontSize: 'clamp(3.5rem, 13.5vw, 13rem)',
            fontFamily: "'Josefin Sans', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: '0.04em',
            lineHeight: 0.95,
            background: 'linear-gradient(180deg, #2E2C28 0%, #7A7468 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          NEUROPITCH
        </motion.div>

        {/* Hero card + floating brain wrapper */}
        <div className="relative mx-4 sm:mx-8" style={{ marginTop: '1rem' }}>

          {/* Brain — floats above the card, centered horizontally */}
          <div
            className="absolute left-1/2 z-20 pointer-events-auto"
            style={{
              transform: 'translateX(-50%)',
              top: 'clamp(-160px, -26vw, -60px)',
              width: 'clamp(280px, 72vw, 720px)',
              height: 'clamp(280px, 72vw, 720px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="w-full h-full"
            >
              <Brain3D scores={heroScores} />
            </motion.div>
          </div>

          {/* Dark gradient card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="relative z-10 rounded-3xl overflow-hidden min-h-0 md:min-h-[50vh]"
            style={{
              background: 'linear-gradient(180deg, #2E2C28 0%, #948E81 100%)',
            }}
          >
            {/* Mobile: stacked layout */}
            <div className="flex flex-col md:hidden p-6 gap-4" style={{ paddingTop: 'clamp(140px, 35vw, 200px)' }}>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="font-display font-light leading-tight tracking-tight text-center"
                style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', color: '#EBE7DF' }}
              >
                What if we could leverage neuroscience to guide LLMs?
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.65 }}
                className="font-display font-light leading-tight tracking-tight text-center"
                style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', color: '#EBE7DF' }}
              >
                This project bridges the gap.
              </motion.p>
            </div>

            {/* Desktop: 3-col layout */}
            <div className="hidden md:grid grid-cols-3 items-center gap-4 p-8 lg:p-12 min-h-[420px] lg:min-h-[500px]">
              {/* Left copy */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="self-start"
              >
                <p
                  className="font-display font-light leading-tight tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)', color: '#EBE7DF' }}
                >
                  What if we could leverage neuroscience to guide LLMs?
                </p>
              </motion.div>

              {/* Center spacer — reserves room for the brain floating above */}
              <div />

              {/* Right copy */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="text-right self-end"
              >
                <p
                  className="font-display font-light leading-tight tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)', color: '#EBE7DF' }}
                >
                  This project bridges the gap.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* THE IDEA teaser at bottom of hero */}
        <Reveal className="px-8 sm:px-12 pt-14 pb-0">
          <div className="max-w-screen-xl mx-auto flex items-center gap-5">
            <h3
              className="font-display font-bold tracking-tight whitespace-nowrap"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
                background: 'linear-gradient(180deg, #2E2C28 0%, #7A7468 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              THE IDEA
            </h3>
            <div className="flex-1 h-[2px]" style={{ background: 'linear-gradient(90deg, #948E81 0%, #C8C3B8 100%)' }} />
          </div>
        </Reveal>
      </section>

      {/* ── THE IDEA ───────────────────────────────────────────────────── */}
      <section ref={ideaRef} className="px-8 sm:px-12 pt-16 pb-24 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_4fr] gap-12 lg:gap-20">

          {/* Photos */}
          <div className="w-full">
            <img
              src="/the-idea.svg"
              alt="The Idea"
              className="w-full rounded-2xl"
            />
          </div>

          {/* Personal text */}
          <div className="flex flex-col justify-center gap-6 lg:gap-8">
            {[
              `Over the past few months, I've been pitching constantly. Through my entrepreneurial work, university projects, and job interviews, I've spent a lot of time writing scripts and trying to shape them to generate very specific feelings in the listener.`,
              `Naturally, I started using LLMs to help me refine those pitches. They were useful for structure and clarity, but something always felt off. Even when the wording was technically correct, the output often felt "artificial" (ironic — I know). It lacked real emotion. Over time, I even developed a sense for it. You can tell when something is AI-generated.`,
              `My conclusion is that LLMs are good at producing convincing language, but much weaker at understanding how language actually creates emotional and cognitive responses in a listener.`,
              `That is where the idea started: What if we could give AI a "human brain" and a reward mechanism, so that it doesn't just optimize a pitch for how it reads, but for how it is experienced?`,
            ].map((text, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <p className="text-warm-muted text-lg leading-relaxed text-center">{text}</p>
              </Reveal>
            ))}</div>
        </div>

        {/* HOW IT WORKS teaser */}
        <Reveal className="flex items-end justify-end gap-5 mt-24">
          <div className="flex-1 h-[2px] self-center" style={{ background: 'linear-gradient(90deg, #C8C3B8 0%, #948E81 100%)' }} />
          <h3
            className="font-display font-bold tracking-tight text-right leading-tight whitespace-nowrap"
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
              background: 'linear-gradient(180deg, #2E2C28 0%, #7A7468 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            HOW IT WORKS
          </h3>
        </Reveal>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section ref={howRef} className="px-8 sm:px-12 pb-24 max-w-screen-xl mx-auto">

        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.06}>
              <div className="group border-t border-warm-border py-6 sm:py-8 transition-colors duration-300 hover:bg-warm-surface rounded-xl px-4 -mx-4">
                {/* Mobile layout */}
                <div className="flex sm:hidden items-baseline gap-4 mb-2">
                  <span className="font-display font-bold leading-none select-none flex-none" style={{ fontSize: '2rem', color: '#C8C3B8' }}>
                    {step.n}
                  </span>
                  <h3 className="font-display font-bold text-xl text-warm-dark tracking-tight">{step.title}</h3>
                </div>
                <p className="sm:hidden text-warm-muted text-sm font-light leading-relaxed">{step.body}</p>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[5rem_1fr_2fr_auto] items-center gap-8">
                  <span
                    className="font-display font-bold leading-none select-none"
                    style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', color: '#C8C3B8' }}
                  >
                    {step.n}
                  </span>
                  <h3 className="font-display font-bold text-2xl text-warm-dark tracking-tight">{step.title}</h3>
                  <p className="text-warm-muted text-sm font-light leading-relaxed">{step.body}</p>
                  <span className="text-xs font-display px-3 py-1 rounded-full border border-warm-border text-warm-muted whitespace-nowrap">
                    {step.tag}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-warm-border" />
        </div>
      </section>

      {/* ── TECH ───────────────────────────────────────────────────────── */}
      <section ref={techRef} style={{ background: '#2E2C28' }} className="px-8 sm:px-12 py-24">
        <div className="max-w-screen-xl mx-auto">

          {/* Section label */}
          <Reveal>
          <div className="flex items-center gap-5 mb-16">
            <h2
              className="font-display font-bold whitespace-nowrap tracking-tight"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
                background: 'linear-gradient(180deg, #EBE7DF 0%, #948E81 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              THE TECH
            </h2>
            <div className="flex-1 h-[2px]" style={{ background: 'linear-gradient(90deg, #948E81 0%, #2E2C28 100%)' }} />
          </div>
          </Reveal>

          {/* Tab indicators */}
          <Reveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-12">
            {TECH.map((item, i) => (
              <button
                key={item.name}
                onClick={() => setActiveTech(i)}
                className="font-display text-xs tracking-widest px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300"
                style={activeTech === i
                  ? { background: '#EBE7DF', color: '#2E2C28', borderColor: '#EBE7DF' }
                  : { background: 'transparent', color: '#948E81', borderColor: '#948E81' }
                }
              >
                {item.name}
              </button>
            ))}
          </div>
          </Reveal>

          {/* Content */}
          <Reveal delay={0.15}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:h-[460px]">

            {/* Left — text */}
            <div className="relative lg:h-full overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTech}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-6"
                >
                  <div>
<h3 className="font-display font-bold tracking-tight mb-1" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', color: '#EBE7DF' }}>
                      {TECH[activeTech].name}
                    </h3>
                    <span className="font-display text-sm" style={{ color: '#948E81' }}>
                      {TECH[activeTech].subtitle}
                    </span>
                  </div>
                  <p className="text-base font-light leading-relaxed" style={{ color: '#C8C3B8' }}>
                    {TECH[activeTech].desc}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {TECH[activeTech].bullets.map(b => (
                      <li key={b} className="flex items-start gap-3 text-base font-light" style={{ color: '#C8C3B8' }}>
                        <span className="mt-[0.4rem] w-1 h-1 rounded-full flex-none" style={{ background: '#C8C3B8' }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>

              {/* Progress bar */}
              <div className="lg:absolute mt-8 lg:mt-0 bottom-0 left-0 right-0 h-[2px] rounded-full overflow-hidden" style={{ background: '#48463F' }}>
                <motion.div
                  key={activeTech}
                  className="h-full rounded-full"
                  style={{ background: '#EBE7DF' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 12, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Right — visual (hidden on mobile) */}
            <div className="hidden lg:flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTech}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  {activeTech === 0 && <TribeVisual />}
                  {activeTech === 1 && <NeurosynthVisual />}
                  {activeTech === 2 && <GPTVisual />}
                  {activeTech === 3 && <PipelineVisual />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          </Reveal>
        </div>
      </section>

      {/* Divider */}
      {/* ── DEMO ───────────────────────────────────────────────────────── */}
      <section ref={demoRef} className="px-8 sm:px-12 py-24 max-w-screen-xl mx-auto">
        <Reveal>
          <div className="flex items-center gap-5 mb-14">
            <h2
              className="font-display font-bold tracking-tight whitespace-nowrap"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
                background: 'linear-gradient(180deg, #2E2C28 0%, #7A7468 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              DEMOS
            </h2>
            <div className="flex-1 h-[2px]" style={{ background: 'linear-gradient(90deg, #948E81 0%, #C8C3B8 100%)' }} />
          </div>
        </Reveal>

        {demos.length === 0 ? (
          <p className="text-warm-muted text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demos.map((demo, i) => (
              <Reveal key={demo.id} delay={i * 0.08}>
                <DemoCard demo={demo} onClick={() => navigate(`/session/${demo.session_id}`)} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-warm-border">
        <div className="px-6 sm:px-12 py-8 sm:py-10 max-w-screen-xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="font-display font-bold text-sm tracking-widest text-warm-dark">NEUROPITCH</span>
            <span className="font-display text-xs text-warm-muted font-light tracking-wide">
              Neuroscience-guided pitch optimization
            </span>
          </div>
          <span className="font-display text-xs text-warm-muted font-light tracking-wide">
            A personal research project · 2026
          </span>
        </div>
      </footer>
    </div>
  )
}

// ── Nav pill ──────────────────────────────────────────────────────────────────
function NavPill({
  label,
  onClick,
  filled = false,
  className = '',
}: {
  label: string
  onClick: () => void
  filled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display font-medium text-sm tracking-widest px-5 py-1.5 rounded-full border transition-all duration-200 ${className}`}
      style={
        filled
          ? { background: '#2E2C28', color: '#EBE7DF', borderColor: '#2E2C28' }
          : { background: 'transparent', color: '#2E2C28', borderColor: '#2E2C28' }
      }
    >
      {label}
    </button>
  )
}

// ── Demo card ─────────────────────────────────────────────────────────────────
function DemoCard({ demo, onClick }: { demo: Demo; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full rounded-2xl p-8 flex flex-col"
      style={{
        minHeight: 280,
        background: hovered ? '#2E2C28' : '#E0DBD2',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0px)',
        transition: 'background 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* Score — the hero */}
      <div
        className="font-display font-bold leading-none tracking-tight mb-5"
        style={{
          fontSize: 'clamp(3rem, 5vw, 4.5rem)',
          color: hovered ? '#EBE7DF' : '#2E2C28',
          transition: 'color 0.3s ease',
        }}
      >
        +{demo.improvement_pct.toFixed(1)}%
      </div>

      {/* Title + subtitle */}
      <h3
        className="font-display font-semibold text-lg tracking-tight mb-2"
        style={{ color: hovered ? '#EBE7DF' : '#2E2C28', transition: 'color 0.3s ease' }}
      >
        {demo.title}
      </h3>
      <p
        className="text-sm font-light leading-relaxed flex-1"
        style={{ color: hovered ? '#C8C3B8' : '#948E81', transition: 'color 0.3s ease' }}
      >
        {demo.subtitle}
      </p>

      {/* Footer row */}
      <div
        className="flex items-center justify-between mt-8 pt-5 border-t"
        style={{ borderColor: hovered ? '#48463F' : '#C8C3B8', transition: 'border-color 0.3s ease' }}
      >
        <span
          className="font-display text-xs tracking-wide"
          style={{ color: hovered ? '#948E81' : '#948E81' }}
        >
          {demo.duration}
        </span>
        <span
          className="font-display text-xs flex items-center gap-1.5"
          style={{ color: hovered ? '#EBE7DF' : '#2E2C28', transition: 'color 0.3s ease' }}
        >
          Open analysis
          <span style={{ display: 'inline-block', transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}>→</span>
        </span>
      </div>
    </button>
  )
}

// ── Static content ────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Record',
    body: 'Feed any spoken pitch as an audio file. The pipeline accepts MP3, WAV, or M4A.',
    tag: 'Audio input',
  },
  {
    n: '02',
    title: 'Encode',
    body: 'TRIBE V2 by Meta predicts voxel-level brain activation for every 2-second window, trained on 500+ hours of real fMRI recordings.',
    tag: 'TRIBE V2',
  },
  {
    n: '03',
    title: 'Decode',
    body: 'Neurosynth correlates those brain patterns against 10 cognitive term maps: reward, attention, working memory, social cognition, and more.',
    tag: 'Neurosynth',
  },
  {
    n: '04',
    title: 'Rewrite',
    body: 'An LLM identifies the lowest-scoring moments, rewrites them with the cognitive profile as context, then re-encodes and scores again.',
    tag: 'LLM iteration',
  },
]


const TECH = [
  {
    name: 'TRIBE V2',
    subtitle: 'Meta FAIR · Brain Encoder',
    desc: 'A foundation model that predicts how a human brain would respond to any spoken sentence. Given audio and a transcript, it outputs a detailed activation map across the cortical surface — one snapshot every 2 seconds.',
    bullets: [
      'Trained on 500+ hours of real fMRI recordings from 700+ participants',
      'Processes natural speech, not synthetic stimuli',
      'Resolution of one brain map per 2-second window',
    ],
  },
  {
    name: 'Neurosynth',
    subtitle: 'Meta-analytic · Cognitive Decoder',
    desc: 'A large-scale database that links brain activation patterns to cognitive states. It bridges the gap between raw voxel maps and human-readable meaning — telling us not just where the brain activates, but what that activation signifies.',
    bullets: [
      'Built from 15,000+ peer-reviewed fMRI studies',
      'Provides reference maps for 10 cognitive dimensions',
      'Reward, attention, emotion, social cognition, arousal, and more',
    ],
  },
  {
    name: 'GPT',
    subtitle: 'OpenAI · Pitch Rewriter',
    desc: 'Given the cognitive profile of a pitch, GPT identifies the weakest segments and rewrites them. The goal is not better grammar or clearer structure — it is to trigger specific cognitive responses in the listener\'s brain.',
    bullets: [
      'Receives the full cognitive score profile as a reward signal',
      'Runs with high reasoning effort for nuanced rewriting',
      'Each rewritten pitch is re-encoded and re-scored to close the loop',
    ],
  },
  {
    name: 'The Pipeline',
    subtitle: 'Python · Orchestration',
    desc: 'A Python backend chains every stage into a single automated loop: transcription, brain encoding, cognitive decoding, LLM rewriting, and TTS synthesis. Each session is stored with full iteration history.',
    bullets: [
      'File-based caching keeps re-runs fast',
      'Stores every iteration for side-by-side comparison',
      'Exposes a REST API consumed by this interface',
    ],
  },
]

// ── Tech visuals ──────────────────────────────────────────────────────────────

function TribeVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return
    const W = canvas.width, H = canvas.height

    const N_BARS = 16, BAR_W = 7, BAR_GAP = 4
    const WAVE_X = 20
    const WAVE_W = N_BARS * (BAR_W + BAR_GAP)
    const BCX = WAVE_X + WAVE_W + 100
    const BCY = H / 2, BRX = 88, BRY = 106

    const blobs = [
      { dx: -26, dy: -46, r: 40, phase: 0.0 },
      { dx:  26, dy: -46, r: 40, phase: 1.3 },
      { dx: -33, dy:   4, r: 32, phase: 2.2 },
      { dx:  33, dy:   4, r: 32, phase: 0.8 },
      { dx: -20, dy:  48, r: 36, phase: 1.7 },
      { dx:  20, dy:  48, r: 36, phase: 2.8 },
    ]

    function heatRGBA(v: number, a: number) {
      v = Math.max(0, Math.min(1, v))
      let r = 0, g = 0, b = 0
      if (v < 0.25)      { const s=v/0.25;           r=0;              g=Math.round(s*80);       b=200 }
      else if (v < 0.5)  { const s=(v-0.25)/0.25;    r=0;              g=Math.round(80+s*175);   b=Math.round(200*(1-s)) }
      else if (v < 0.75) { const s=(v-0.5)/0.25;     r=Math.round(s*255); g=255;               b=0 }
      else               { const s=(v-0.75)/0.25;    r=255;            g=Math.round(255*(1-s)); b=0 }
      return `rgba(${r},${g},${b},${a})`
    }

    let raf: number
    function render() {
      const t = tRef.current; tRef.current += 0.016
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='#0D0C0B'; ctx.fillRect(0,0,W,H)

      // Audio bars
      for (let i=0; i<N_BARS; i++) {
        const h = (0.15 + 0.85*Math.abs(Math.sin(t*2.1+i*0.45)*Math.cos(t*1.1+i*0.3))) * H*0.62
        const x = WAVE_X + i*(BAR_W+BAR_GAP), y = (H-h)/2
        ctx.fillStyle=`rgba(148,142,129,${0.35+(h/(H*0.62))*0.65})`
        ctx.fillRect(x, y, BAR_W, h)
      }

      // Particles audio → brain
      const pStart=WAVE_X+WAVE_W+6, pEnd=BCX-BRX-4
      for (let i=0;i<5;i++) {
        const prog=((t*0.45+i/5)%1)
        const px=pStart+(pEnd-pStart)*prog
        const py=H/2+Math.sin(t*1.8+i*1.3)*10
        ctx.fillStyle=`rgba(235,231,223,${Math.sin(prog*Math.PI)*0.75})`
        ctx.beginPath(); ctx.arc(px,py,2.2,0,Math.PI*2); ctx.fill()
      }

      // Brain clip + activation blobs
      ctx.save()
      ctx.beginPath(); ctx.ellipse(BCX,BCY,BRX,BRY,0,0,Math.PI*2); ctx.clip()
      ctx.fillStyle='#080706'; ctx.fillRect(BCX-BRX-2,BCY-BRY-2,BRX*2+4,BRY*2+4)
      for (const blob of blobs) {
        const act=0.25+0.75*(0.5+0.5*Math.sin(t*0.55+blob.phase))
        const bx=BCX+blob.dx, by=BCY+blob.dy
        const g=ctx.createRadialGradient(bx,by,0,bx,by,blob.r)
        g.addColorStop(0,   heatRGBA(act,0.95))
        g.addColorStop(0.5, heatRGBA(act*0.6,0.5))
        g.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.fillStyle=g; ctx.fillRect(bx-blob.r,by-blob.r,blob.r*2,blob.r*2)
      }
      ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(BCX,BCY-BRY); ctx.lineTo(BCX,BCY+BRY); ctx.stroke()
      ctx.restore()

      // Brain outline
      ctx.beginPath(); ctx.ellipse(BCX,BCY,BRX,BRY,0,0,Math.PI*2)
      ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5; ctx.stroke()

      // Labels
      ctx.font='600 9px "Josefin Sans",sans-serif'
      ctx.fillStyle='rgba(255,255,255,0.25)'
      ctx.fillText('AUDIO INPUT', WAVE_X, 14)
      ctx.fillText('ACTIVATION MAP', BCX-BRX, 14)
      ctx.fillStyle='rgba(255,255,255,0.18)'
      ctx.fillText('t = '+(t*1.1).toFixed(1)+'s', W-52, 14)

      raf=requestAnimationFrame(render)
    }
    raf=requestAnimationFrame(render)
    return ()=>cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0C0B' }}>
      <canvas ref={canvasRef} width={500} height={270} className="w-full" />
      <div className="flex items-center gap-2 px-5 pb-4">
        <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.2)' }}>low</span>
        <div className="flex-1 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg,#001899,#00ccff,#00ff88,#ffff00,#ff4400)' }} />
        <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.2)' }}>high</span>
      </div>
    </div>
  )
}

function NeurosynthVisual() {
  const TERMS = [
    { label: 'REWARD',    phase: 0.0, color: [255, 107,  53] },
    { label: 'ATTENTION', phase: 0.9, color: [255, 209, 102] },
    { label: 'EMOTION',   phase: 1.8, color: [239,  71, 111] },
    { label: 'SOCIAL',    phase: 2.7, color: [  6, 214, 160] },
    { label: 'AROUSAL',   phase: 1.2, color: [ 17, 138, 178] },
    { label: 'IMAGERY',   phase: 2.1, color: [168, 218, 220] },
  ]

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return
    const W = canvas.width, H = canvas.height

    const BCX = 108, BCY = H/2, BRX = 80, BRY = 98
    const termStartX = BCX + BRX + 40
    const termW = W - termStartX - 20
    const rowH = (H - 40) / TERMS.length

    // blob positions inside brain per term
    const blobPos = [
      { dx: -20, dy: -50, r: 32 },
      { dx:  20, dy: -50, r: 32 },
      { dx: -30, dy:   0, r: 28 },
      { dx:  30, dy:   0, r: 28 },
      { dx: -18, dy:  46, r: 30 },
      { dx:  18, dy:  46, r: 30 },
    ]

    let raf: number
    function render() {
      const t = tRef.current; tRef.current += 0.014
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='#0D0C0B'; ctx.fillRect(0,0,W,H)

      // Brain clip + blobs
      ctx.save()
      ctx.beginPath(); ctx.ellipse(BCX,BCY,BRX,BRY,0,0,Math.PI*2); ctx.clip()
      ctx.fillStyle='#080706'; ctx.fillRect(0,0,BCX+BRX+2,H)

      TERMS.forEach((term,i) => {
        const act = 0.25 + 0.75*(0.5+0.5*Math.sin(t*0.55+term.phase))
        const b = blobPos[i]
        const bx=BCX+b.dx, by=BCY+b.dy
        const [r,g,bl] = term.color
        const grad=ctx.createRadialGradient(bx,by,0,bx,by,b.r)
        grad.addColorStop(0,   `rgba(${r},${g},${bl},${act*0.9})`)
        grad.addColorStop(0.6, `rgba(${r},${g},${bl},${act*0.3})`)
        grad.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.fillStyle=grad; ctx.fillRect(bx-b.r,by-b.r,b.r*2,b.r*2)
      })

      ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(BCX,BCY-BRY); ctx.lineTo(BCX,BCY+BRY); ctx.stroke()
      ctx.restore()

      // Brain outline
      ctx.beginPath(); ctx.ellipse(BCX,BCY,BRX,BRY,0,0,Math.PI*2)
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1.5; ctx.stroke()

      // Terms + particles + bars
      TERMS.forEach((term,i) => {
        const act = 0.25 + 0.75*(0.5+0.5*Math.sin(t*0.55+term.phase))
        const [r,g,bl] = term.color
        const ty = 28 + i*rowH + rowH*0.5
        const b = blobPos[i]
        const srcX=BCX+b.dx, srcY=BCY+b.dy

        // Particles from brain to term
        for (let p=0;p<4;p++) {
          const prog=((t*0.38+p/4+i*0.15)%1)
          const px=(BCX+BRX+4)+(termStartX-BCX-BRX-8)*prog
          const py=srcY+(ty-srcY)*prog
          const alpha=Math.sin(prog*Math.PI)*act*0.8
          ctx.fillStyle=`rgba(${r},${g},${bl},${alpha})`
          ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill()
        }

        // Label
        ctx.font=`600 10px "Josefin Sans",sans-serif`
        ctx.fillStyle=`rgba(255,255,255,${0.3+act*0.6})`
        ctx.fillText(term.label, termStartX, ty+4)

        // Bar track
        const barX=termStartX+75, barY=ty-1, barH=3
        ctx.fillStyle='rgba(255,255,255,0.07)'
        ctx.fillRect(barX, barY, termW-75, barH)

        // Bar fill
        ctx.fillStyle=`rgba(${r},${g},${bl},${0.5+act*0.5})`
        ctx.fillRect(barX, barY, (termW-75)*act, barH)
      })

      // Label
      ctx.font='600 9px "Josefin Sans",sans-serif'
      ctx.fillStyle='rgba(255,255,255,0.22)'
      ctx.fillText('COGNITIVE DECODING', BCX-BRX, 14)

      raf=requestAnimationFrame(render)
    }
    raf=requestAnimationFrame(render)
    return ()=>cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0C0B' }}>
      <canvas ref={canvasRef} width={500} height={270} className="w-full" />
    </div>
  )
}

function GPTVisual() {
  const before = [
    { text: 'Our product ', weak: false },
    { text: 'solves the problem', weak: true },
    { text: ' of inefficiency. It is ', weak: false },
    { text: 'a good solution', weak: true },
    { text: ' for businesses.', weak: false },
  ]
  const after = [
    { text: 'Every hour your team spends on manual work ', weak: false },
    { text: 'is an hour not spent building.', weak: false },
    { text: ' We eliminate that entirely.', weak: false },
  ]

  const [phase, setPhase] = useState<'before' | 'rewriting' | 'after'>('before')
  const [scoreVal, setScoreVal] = useState(34)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    let t3: ReturnType<typeof setTimeout>

    function cycle() {
      setPhase('before')
      setScoreVal(34)
      t1 = setTimeout(() => setPhase('rewriting'), 4500)
      t2 = setTimeout(() => { setPhase('after'); setScoreVal(81) }, 6500)
      t3 = setTimeout(cycle, 14000)
    }
    cycle()
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-5" style={{ background: '#1A1917' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-display tracking-widest" style={{ color: '#948E81' }}>
          {phase === 'after' ? 'REWRITTEN SEGMENT' : 'ORIGINAL SEGMENT'}
        </span>
        <span
          className="font-display font-bold text-sm px-3 py-1 rounded-full"
          style={{
            background: scoreVal > 60 ? 'rgba(100,200,120,0.15)' : 'rgba(220,80,60,0.15)',
            color: scoreVal > 60 ? '#6DC87A' : '#E05C45',
            transition: 'all 0.6s ease',
          }}
        >
          score {scoreVal}
        </span>
      </div>

      <div className="text-base font-light leading-relaxed min-h-[80px]" style={{ color: '#C8C3B8' }}>
        {phase === 'before' && before.map((chunk, i) => (
          <span
            key={i}
            style={{
              background: chunk.weak ? 'rgba(220,80,60,0.25)' : 'transparent',
              borderRadius: 3,
              padding: chunk.weak ? '0 2px' : '0',
              color: chunk.weak ? '#E05C45' : '#C8C3B8',
            }}
          >
            {chunk.text}
          </span>
        ))}
        {phase === 'rewriting' && (
          <span style={{ color: '#948E81' }}>Rewriting<span className="animate-pulse">...</span></span>
        )}
        {phase === 'after' && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            {after.map((chunk, i) => <span key={i}>{chunk.text}</span>)}
          </motion.span>
        )}
      </div>

      <div className="h-[2px] rounded-full overflow-hidden" style={{ background: '#2E2C28' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${scoreVal}%`,
            background: scoreVal > 60 ? '#6DC87A' : '#E05C45',
            transition: 'width 0.8s ease, background 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

function PipelineVisual() {
  const steps = [
    { label: 'Audio Input', sub: 'MP3 / WAV / M4A' },
    { label: 'TRIBE V2 Encode', sub: 'Voxel activation maps' },
    { label: 'Neurosynth Decode', sub: 'Cognitive scores per segment' },
    { label: 'GPT Rewrite', sub: 'Score-guided iteration' },
    { label: 'TTS Synthesis', sub: 'New audio output' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive(i => (i + 1) % steps.length), 2500)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: '#1A1917' }}>
      <div className="text-xs font-display tracking-widest mb-2" style={{ color: '#948E81' }}>
        PIPELINE EXECUTION
      </div>
      {steps.map((step, i) => (
        <div key={step.label}>
          <div
            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500"
            style={{
              background: active === i ? 'rgba(235,231,223,0.08)' : 'transparent',
              borderLeft: `2px solid ${active === i ? '#EBE7DF' : '#48463F'}`,
            }}
          >
            <span
              className="font-display text-xs w-5 text-center transition-colors duration-300"
              style={{ color: active >= i ? '#EBE7DF' : '#48463F' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div
                className="font-display font-semibold text-sm transition-colors duration-300"
                style={{ color: active === i ? '#EBE7DF' : active > i ? '#948E81' : '#48463F' }}
              >
                {step.label}
              </div>
              <div className="text-xs font-light" style={{ color: '#48463F' }}>
                {step.sub}
              </div>
            </div>
            {active > i && (
              <span className="ml-auto text-xs" style={{ color: '#6DC87A' }}>✓</span>
            )}
            {active === i && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EBE7DF' }} />
            )}
          </div>
          {i < steps.length - 1 && (
            <div className="ml-[2.1rem] w-px h-3" style={{ background: active > i ? '#948E81' : '#48463F', transition: 'background 0.5s' }} />
          )}
        </div>
      ))}
    </div>
  )
}
