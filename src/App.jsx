import { useEffect, useRef, useState, useCallback } from 'react'
import p5 from 'p5'
import createDriftSketch, { EMOTIONS, analyzeSession, freshAnalytics } from './drift-sketch.js'

const SESSION_DURATION = 30

// ─── Instructions — compact, no scroll needed ─────────────────────────────────
function InstructionsModal({ onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(2,4,8,0.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <style>{`
        @keyframes driftIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(14,16,28,0.98)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.25rem',
        padding: '2rem 1.8rem 1.6rem',
        animation: 'driftIn 0.4s ease',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '2rem',
          fontWeight: 300,
          color: 'rgba(200,220,255,0.92)',
          letterSpacing: '0.2em',
          marginBottom: '0.2rem',
        }}>drift</div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6rem',
          letterSpacing: '0.3em',
          color: 'rgba(130,155,195,0.45)',
          textTransform: 'uppercase',
          marginBottom: '1.6rem',
        }}>your touch reveals your mood</div>

        {/* Steps — compact 2-line each */}
        {[
          ['Touch & drag', 'Move slowly for calm hues, faster for warm ones.'],
          ['Watch the field', 'Particles cluster toward you and shift color.'],
          ['30 seconds', 'Interact freely — a mood summary appears at the end.'],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(120,160,240,0.5)',
              marginTop: '0.45rem', flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1rem',
                color: 'rgba(200,215,245,0.85)',
                letterSpacing: '0.03em',
              }}>{title}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.6rem',
                color: 'rgba(140,160,195,0.45)',
                letterSpacing: '0.1em',
                marginTop: '0.15rem',
                lineHeight: 1.5,
              }}>{desc}</div>
            </div>
          </div>
        ))}

        {/* Colour dots row */}
        <div style={{
          display: 'flex', gap: '0.5rem', alignItems: 'center',
          margin: '1.4rem 0 1.6rem',
          justifyContent: 'center',
        }}>
          {EMOTIONS.map(e => (
            <div key={e.name} title={e.name} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: e.color,
              boxShadow: `0 0 6px ${e.color}99`,
              flexShrink: 0,
            }} />
          ))}
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.55rem',
            color: 'rgba(130,150,190,0.4)',
            letterSpacing: '0.2em',
            marginLeft: '0.4rem',
            textTransform: 'uppercase',
          }}>7 states</div>
        </div>

        {/* CTA */}
        <button
          onPointerUp={onClose}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: 'linear-gradient(135deg, rgba(70,110,200,0.3), rgba(110,70,200,0.3))',
            border: '1px solid rgba(120,150,230,0.3)',
            borderRadius: '0.75rem',
            color: 'rgba(200,220,255,0.92)',
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '1.15rem',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          begin session
        </button>
      </div>
    </div>
  )
}

// ─── Timer ring — always visible during session ────────────────────────────────
function TimerRing({ timeLeft, total }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const pct = timeLeft / total
  const dash = pct * circ
  const isLow = timeLeft <= 8

  return (
    <div style={{
      position: 'fixed',
      top: '1.2rem', right: '1.4rem',
      zIndex: 60,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={32} cy={32} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={3}
        />
        {/* Progress */}
        <circle cx={32} cy={32} r={r}
          fill="none"
          stroke={isLow ? 'rgba(255,100,80,0.8)' : 'rgba(100,160,255,0.7)'}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.75rem',
        color: isLow ? 'rgba(255,120,100,0.9)' : 'rgba(160,200,255,0.8)',
        letterSpacing: '0.05em',
        transition: 'color 0.5s ease',
      }}>{timeLeft}</div>
    </div>
  )
}

// ─── Begin button ──────────────────────────────────────────────────────────────
function BeginButton({ onStart }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '2.2rem', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
    }}>
      <button
        onPointerUp={onStart}
        style={{
          padding: '0.75rem 2.2rem',
          background: 'rgba(60,100,200,0.18)',
          border: '1px solid rgba(120,160,240,0.3)',
          borderRadius: '2rem',
          color: 'rgba(180,210,255,0.85)',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '1.05rem',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >begin session</button>
    </div>
  )
}

// ─── Help button ──────────────────────────────────────────────────────────────
function HelpButton({ onClick }) {
  return (
    <button
      onPointerUp={onClick}
      style={{
        position: 'fixed',
        top: '1.3rem', left: '1.4rem',
        width: 36, height: 36,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(170,195,235,0.7)',
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'italic',
        fontSize: '1.05rem',
        cursor: 'pointer',
        zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >?</button>
  )
}

// ─── Live emotion label ────────────────────────────────────────────────────────

// ─── Session-ending flash ──────────────────────────────────────────────────────
function EndFlash() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(255,255,255,0.07)',
      pointerEvents: 'none',
      animation: 'flashOut 0.8s ease forwards',
    }}>
      <style>{`@keyframes flashOut { 0%{opacity:1} 100%{opacity:0} }`}</style>
    </div>
  )
}

// ─── Summary Screen ───────────────────────────────────────────────────────────
function SummaryScreen({ result, onRetry }) {
  if (!result) return null
  const { primary, secondary, tapCount, wasExpressive } = result

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(2,4,8,0.9)',
      backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <style>{`@keyframes riseIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(12,14,26,0.98)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1.4rem',
        padding: '2rem 1.8rem',
        animation: 'riseIn 0.6s ease',
        boxShadow: `0 0 80px ${primary.color}18, 0 30px 60px rgba(0,0,0,0.5)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          transform: 'translateX(-50%)',
          width: 240, height: 240,
          background: `radial-gradient(circle, ${primary.color}28, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.58rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(130,155,195,0.4)',
          marginBottom: '1.5rem',
          position: 'relative',
        }}>session complete</div>

        {/* Primary emotion */}
        <div style={{ textAlign: 'center', marginBottom: '1.6rem', position: 'relative' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${primary.color}cc, ${primary.color}44)`,
            boxShadow: `0 0 28px ${primary.color}66`,
            margin: '0 auto 1rem',
            border: `1px solid ${primary.color}44`,
          }} />
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(2.2rem, 10vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: primary.color,
            textShadow: `0 0 30px ${primary.color}77`,
            lineHeight: 1,
          }}>{primary.name}</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '0.9rem',
            color: 'rgba(170,190,225,0.5)',
            marginTop: '0.5rem',
          }}>{primary.desc}</div>
        </div>

        {/* Gesture pattern */}
        <div style={{
          background: `${primary.color}0d`,
          border: `1px solid ${primary.color}22`,
          borderRadius: '0.65rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.2rem',
          position: 'relative',
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.55rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: `${primary.color}88`,
            marginBottom: '0.25rem',
          }}>gesture signature</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '0.95rem',
            color: 'rgba(195,210,240,0.75)',
          }}>{primary.gesture}</div>
        </div>

        {/* Secondary + touches */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {secondary && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '0.65rem', padding: '0.7rem',
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.53rem',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(120,145,185,0.4)', marginBottom: '0.3rem',
              }}>undertone</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: secondary.color, flexShrink: 0 }} />
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: secondary.color }}>{secondary.name}</div>
              </div>
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.65rem', padding: '0.7rem',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: '0.53rem',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(120,145,185,0.4)', marginBottom: '0.3rem',
            }}>interactions</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: 'rgba(195,215,250,0.8)' }}>
              {tapCount} <span style={{ fontSize: '0.7rem', color: 'rgba(140,165,200,0.4)' }}>touches</span>
            </div>
          </div>
        </div>

        {wasExpressive && (
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontSize: '0.82rem', color: 'rgba(155,175,215,0.38)',
            textAlign: 'center', marginBottom: '1.2rem',
          }}>your energy moved through many states</div>
        )}

        <button
          onPointerUp={onRetry}
          style={{
            width: '100%', padding: '0.85rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '0.75rem',
            color: 'rgba(185,205,245,0.75)',
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: '1rem',
            letterSpacing: '0.15em', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            position: 'relative',
          }}
        >drift again</button>
      </div>
    </div>
  )
}

// ─── Title ────────────────────────────────────────────────────────────────────
function TitleOverlay({ visible }) {
  return (
    <div style={{
      position: 'fixed', top: '1.3rem', left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: 20,
      opacity: visible ? 0.8 : 0.15,
      transition: 'opacity 1.2s ease',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'italic',
        fontSize: 'clamp(1.3rem, 5vw, 1.7rem)',
        fontWeight: 300,
        letterSpacing: '0.45em',
        color: 'rgba(175,208,242,0.9)',
        textShadow: '0 0 28px rgba(100,175,255,0.3)',
      }}>drift</div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef(null)
  const gestureRef = useRef({ hue: 210, speed: 0, sessionActive: false, targetHue: 210 })
  const p5Ref = useRef(null)
  const [displayState, setDisplayState] = useState({ hue: 210, speed: 0 })
  const [titleVisible, setTitleVisible] = useState(true)
  const titleTimerRef = useRef(null)

  const [showInstructions, setShowInstructions] = useState(true)
  const [sessionState, setSessionState] = useState('idle') // idle | active | ending | done
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [summaryResult, setSummaryResult] = useState(null)
  const sessionTimerRef = useRef(null)

  // Mount p5 — canvas itself handles its own pointer events
  useEffect(() => {
    const sketch = createDriftSketch(gestureRef)
    p5Ref.current = new p5(sketch, canvasRef.current)
    return () => { if (p5Ref.current) p5Ref.current.remove() }
  }, [])

  // Sync gesture → React UI at 20fps
  useEffect(() => {
    const interval = setInterval(() => {
      const g = gestureRef.current
      setDisplayState({ hue: Math.round(g.hue), speed: g.speed })
      if (g.speed > 3) {
        setTitleVisible(false)
        clearTimeout(titleTimerRef.current)
        titleTimerRef.current = setTimeout(() => setTitleVisible(true), 3000)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const startSession = useCallback(() => {
    // Reset analytics cleanly before starting
    gestureRef.current.analytics = freshAnalytics()
    gestureRef.current.sessionActive = true
    gestureRef.current.targetHue = 210
    setSessionState('active')
    setTimeLeft(SESSION_DURATION)
    let t = SESSION_DURATION
    sessionTimerRef.current = setInterval(() => {
      t--
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(sessionTimerRef.current)
        gestureRef.current.sessionActive = false
        setSessionState('ending')
        setTimeout(() => {
          const result = analyzeSession(gestureRef.current.analytics)
          setSummaryResult(result || {
            primary: EMOTIONS[4], secondary: EMOTIONS[3],
            wasExpressive: false, tapCount: 0, allScores: EMOTIONS.map(e => ({ ...e, score: 0 }))
          })
          setSessionState('done')
        }, 800)
      }
    }, 1000)
  }, [])

  const resetSession = useCallback(() => {
    clearInterval(sessionTimerRef.current)
    setSessionState('idle')
    setTimeLeft(SESSION_DURATION)
    setSummaryResult(null)
    gestureRef.current.sessionActive = false
    gestureRef.current.analytics = freshAnalytics()
  }, [])

  const handleInstructionsClose = useCallback(() => {
    setShowInstructions(false)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#020408' }}>

      {/* p5 canvas — pointer events live on the canvas element itself via p5 */}
      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(2,4,8,0.6) 100%)',
        pointerEvents: 'none',
      }} />


      {/* Title */}
      <TitleOverlay visible={titleVisible && !showInstructions && sessionState === 'idle'} />

      {/* Help button — only when not in session */}
      {sessionState !== 'active' && !showInstructions && sessionState !== 'done' && (
        <HelpButton onClick={() => setShowInstructions(true)} />
      )}

      {/* Timer ring — prominent, top-right during session */}
      {sessionState === 'active' && (
        <TimerRing timeLeft={timeLeft} total={SESSION_DURATION} />
      )}

      {/* Begin button — only in idle state, outside instructions */}
      {!showInstructions && sessionState === 'idle' && (
        <BeginButton onStart={startSession} />
      )}

      {/* End flash */}
      {sessionState === 'ending' && <EndFlash />}

      {/* Instructions modal */}
      {showInstructions && (
        <InstructionsModal onClose={handleInstructionsClose} />
      )}

      {/* Summary */}
      {sessionState === 'done' && summaryResult && (
        <SummaryScreen result={summaryResult} onRetry={resetSession} />
      )}
    </div>
  )
}
