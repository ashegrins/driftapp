import { useEffect, useRef, useState, useCallback } from 'react'
import p5 from 'p5'
import createDriftSketch, { EMOTIONS, analyzeSession } from './drift-sketch.js'

const SESSION_DURATION = 30 // seconds

// ─── Utility ──────────────────────────────────────────────────────────────────
function closestEmotion(hue) {
  let best = EMOTIONS[0]
  let bestDist = 999
  for (const e of EMOTIONS) {
    let dist = Math.abs(e.hue - hue)
    if (dist > 180) dist = 360 - dist
    if (dist < bestDist) { bestDist = dist; best = e }
  }
  return best
}

// ─── Instructions Modal ───────────────────────────────────────────────────────
function InstructionsModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(2,4,8,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.4s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        @keyframes fadeOut { from { opacity:1 } to { opacity:0 } }
        .emotion-row:hover { background: rgba(255,255,255,0.04) !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 420,
        maxHeight: '88vh',
        background: 'linear-gradient(160deg, rgba(20,22,35,0.98) 0%, rgba(8,10,20,0.99) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '1.8rem',
            fontWeight: 300,
            color: 'rgba(200,220,255,0.95)',
            letterSpacing: '0.2em',
            marginBottom: '0.3rem',
          }}>how to drift</div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.65rem',
            letterSpacing: '0.25em',
            color: 'rgba(140,160,190,0.5)',
            textTransform: 'uppercase',
          }}>your touch reveals your mood</div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '1.2rem 1.5rem', flexGrow: 1 }}>

          {/* How it works */}
          <div style={{ marginBottom: '1.4rem' }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(120,150,200,0.6)',
              marginBottom: '0.7rem',
            }}>the experience</div>
            {[
              ['01', 'Tap "Begin Session" to start a 30-second reading.'],
              ['02', 'Touch and move across the particle field freely.'],
              ['03', 'Your gesture speed and pattern shape the color.'],
              ['04', 'After 30 seconds, your mood summary appears.'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.6rem',
                  color: 'rgba(100,140,200,0.45)',
                  paddingTop: '0.1rem',
                  flexShrink: 0,
                }}>{n}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '0.95rem',
                  color: 'rgba(190,210,240,0.8)',
                  lineHeight: 1.5,
                }}>{t}</div>
              </div>
            ))}
          </div>

          {/* Emotions table */}
          <div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(120,150,200,0.6)',
              marginBottom: '0.7rem',
            }}>the seven states</div>

            {EMOTIONS.map((e) => (
              <div key={e.name} className="emotion-row" style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr',
                gap: '0.7rem',
                padding: '0.55rem 0.4rem',
                borderRadius: '0.5rem',
                marginBottom: '0.2rem',
                transition: 'background 0.2s',
                alignItems: 'start',
              }}>
                <div style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  background: e.color,
                  boxShadow: `0 0 8px ${e.color}88`,
                  marginTop: '0.2rem',
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '1rem',
                      fontWeight: 400,
                      color: e.color,
                      letterSpacing: '0.05em',
                    }}>{e.name}</span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '0.58rem',
                      color: 'rgba(150,170,200,0.45)',
                      letterSpacing: '0.15em',
                    }}>— {e.gesture}</span>
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontSize: '0.8rem',
                    color: 'rgba(160,180,210,0.5)',
                    marginTop: '0.1rem',
                  }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '1rem 1.5rem 1.5rem', flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: '100%',
            padding: '0.85rem',
            background: 'linear-gradient(135deg, rgba(80,120,200,0.25), rgba(120,80,200,0.25))',
            border: '1px solid rgba(120,150,220,0.3)',
            borderRadius: '0.75rem',
            color: 'rgba(200,220,255,0.9)',
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '1.1rem',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'linear-gradient(135deg, rgba(80,120,200,0.4), rgba(120,80,200,0.4))'}
          onMouseLeave={e => e.target.style.background = 'linear-gradient(135deg, rgba(80,120,200,0.25), rgba(120,80,200,0.25))'}
          >
            begin session
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Screen ────────────────────────────────────────────────────────────
function SummaryScreen({ result, onRetry }) {
  if (!result) return null
  const { primary, secondary, wasExpressive, tapCount, allScores } = result
  const top3 = allScores.slice(0, 3)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(2,4,8,0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.6s ease',
    }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{
        width: '100%', maxWidth: 400,
        background: 'linear-gradient(160deg, rgba(18,20,32,0.99), rgba(8,10,18,0.99))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1.5rem',
        padding: '2rem 1.8rem',
        boxShadow: `0 0 60px ${primary.color}22, 0 40px 80px rgba(0,0,0,0.5)`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 200,
          background: `radial-gradient(circle, ${primary.color}33, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(140,160,190,0.5)',
          marginBottom: '1.2rem',
          position: 'relative',
        }}>session complete</div>

        {/* Primary emotion */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem', position: 'relative' }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${primary.color}cc, ${primary.color}44)`,
            boxShadow: `0 0 30px ${primary.color}66, 0 0 60px ${primary.color}22`,
            margin: '0 auto 1rem',
            border: `1px solid ${primary.color}44`,
          }} />
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(2rem, 10vw, 2.8rem)',
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: primary.color,
            textShadow: `0 0 30px ${primary.color}88`,
            lineHeight: 1,
          }}>{primary.name}</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'rgba(180,200,230,0.55)',
            marginTop: '0.5rem',
          }}>{primary.desc}</div>
        </div>

        {/* Gesture hint */}
        <div style={{
          background: `linear-gradient(135deg, ${primary.color}11, transparent)`,
          border: `1px solid ${primary.color}22`,
          borderRadius: '0.75rem',
          padding: '0.8rem 1rem',
          marginBottom: '1.4rem',
          position: 'relative',
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.58rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: `${primary.color}99`,
            marginBottom: '0.3rem',
          }}>your gesture pattern</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '0.95rem',
            color: 'rgba(200,215,240,0.75)',
          }}>{primary.gesture}</div>
        </div>

        {/* Secondary + stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.6rem' }}>
          {secondary && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '0.75rem',
              padding: '0.75rem',
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.55rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(130,150,180,0.45)',
                marginBottom: '0.3rem',
              }}>undertone</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: secondary.color, flexShrink: 0 }} />
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '1rem',
                  color: secondary.color,
                }}>{secondary.name}</div>
              </div>
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.75rem',
            padding: '0.75rem',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(130,150,180,0.45)',
              marginBottom: '0.3rem',
            }}>interactions</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '1.4rem',
              color: 'rgba(200,220,255,0.8)',
            }}>{tapCount} <span style={{ fontSize: '0.75rem', color: 'rgba(150,170,200,0.4)' }}>touches</span></div>
          </div>
        </div>

        {/* Expression note */}
        {wasExpressive && (
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '0.85rem',
            color: 'rgba(160,180,220,0.45)',
            textAlign: 'center',
            marginBottom: '1.4rem',
          }}>your energy moved through many states today</div>
        )}

        {/* Try again */}
        <button onClick={onRetry} style={{
          width: '100%',
          padding: '0.85rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.75rem',
          color: 'rgba(190,210,245,0.8)',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '1.05rem',
          letterSpacing: '0.15em',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.04)'}
        >drift again</button>
      </div>
    </div>
  )
}

// ─── Help button ──────────────────────────────────────────────────────────────
function HelpButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed',
      top: '1.4rem',
      left: '1.4rem',
      width: 36, height: 36,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'rgba(180,200,240,0.7)',
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: 'italic',
      fontSize: '1rem',
      cursor: 'pointer',
      zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
    onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
    title="How to use Drift"
    >?</button>
  )
}

// ─── Session controls ─────────────────────────────────────────────────────────
function SessionBar({ sessionState, timeLeft, onStart }) {
  if (sessionState === 'active') {
    const pct = (timeLeft / SESSION_DURATION) * 100
    return (
      <div style={{
        position: 'fixed', bottom: '1.2rem', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
        zIndex: 50, pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: 'rgba(160,190,230,0.5)',
          textTransform: 'uppercase',
        }}>{timeLeft}s remaining</div>
        <div style={{
          width: 120, height: 2,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, rgba(100,160,255,0.6), rgba(160,100,255,0.6))',
            transition: 'width 1s linear',
            borderRadius: 2,
          }} />
        </div>
      </div>
    )
  }

  if (sessionState === 'idle') {
    return (
      <div style={{
        position: 'fixed', bottom: '1.8rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 50,
      }}>
        <button onClick={onStart} style={{
          padding: '0.7rem 2rem',
          background: 'rgba(80,120,200,0.15)',
          border: '1px solid rgba(120,160,240,0.25)',
          borderRadius: '2rem',
          color: 'rgba(180,210,255,0.8)',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '1rem',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s',
        }}
        onMouseEnter={e => e.target.style.background = 'rgba(80,120,200,0.3)'}
        onMouseLeave={e => e.target.style.background = 'rgba(80,120,200,0.15)'}
        >begin session</button>
      </div>
    )
  }

  return null
}

// ─── Live emotion label ───────────────────────────────────────────────────────
function LiveEmotionLabel({ hue, speed, sessionActive }) {
  const emotion = closestEmotion(hue)
  const opacity = sessionActive ? Math.min(0.4 + speed / 60, 1) : 0.3
  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      pointerEvents: 'none',
      opacity,
      transition: 'opacity 0.5s ease',
      zIndex: 10,
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(2.5rem, 12vw, 5rem)',
        fontWeight: 300,
        letterSpacing: '0.08em',
        color: emotion.color,
        textShadow: `0 0 60px ${emotion.color}55, 0 0 120px ${emotion.color}22`,
        transition: 'color 1s ease, text-shadow 1s ease',
        lineHeight: 1,
      }}>{emotion.name}</div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 'clamp(0.55rem, 2vw, 0.7rem)',
        letterSpacing: '0.3em',
        color: `${emotion.color}88`,
        textTransform: 'uppercase',
        marginTop: '0.5rem',
        transition: 'color 1s ease',
      }}>{emotion.desc}</div>
    </div>
  )
}

// ─── Title ────────────────────────────────────────────────────────────────────
function TitleOverlay({ visible }) {
  return (
    <div style={{
      position: 'fixed', top: '1.2rem', left: '50%', transform: 'translateX(-50%)',
      textAlign: 'center', pointerEvents: 'none', zIndex: 20,
      opacity: visible ? 0.85 : 0.15,
      transition: 'opacity 1.2s ease',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'italic',
        fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
        fontWeight: 300,
        letterSpacing: '0.4em',
        color: 'rgba(180,210,240,0.9)',
        textShadow: '0 0 30px rgba(100,180,255,0.3)',
      }}>drift</div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef(null)
  const gestureRef = useRef({ hue: 210, speed: 0, touchCount: 0, sessionActive: false, targetHue: 210 })
  const p5Ref = useRef(null)
  const [displayState, setDisplayState] = useState({ hue: 210, speed: 0 })
  const [titleVisible, setTitleVisible] = useState(true)
  const titleTimerRef = useRef(null)

  // UI state
  const [showInstructions, setShowInstructions] = useState(true)
  const [sessionState, setSessionState] = useState('idle') // idle | active | done
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [summaryResult, setSummaryResult] = useState(null)
  const sessionTimerRef = useRef(null)

  // Mount p5
  useEffect(() => {
    const sketch = createDriftSketch(gestureRef)
    p5Ref.current = new p5(sketch, canvasRef.current)
    return () => { if (p5Ref.current) p5Ref.current.remove() }
  }, [])

  // Sync gesture state to React UI at 20fps
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
    setSessionState('active')
    setTimeLeft(SESSION_DURATION)
    gestureRef.current.sessionActive = true

    let t = SESSION_DURATION
    sessionTimerRef.current = setInterval(() => {
      t--
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(sessionTimerRef.current)
        gestureRef.current.sessionActive = false
        setSessionState('done')
        const analytics = gestureRef.current.analytics
        const result = analyzeSession(analytics)
        setSummaryResult(result)
      }
    }, 1000)
  }, [])

  const resetSession = useCallback(() => {
    clearInterval(sessionTimerRef.current)
    setSessionState('idle')
    setTimeLeft(SESSION_DURATION)
    setSummaryResult(null)
    gestureRef.current.sessionActive = false
    gestureRef.current.analytics = null
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#020408' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }
      `}</style>

      {/* p5 canvas */}
      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(2,4,8,0.65) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Live emotion (behind modals) */}
      {sessionState !== 'done' && !showInstructions && (
        <LiveEmotionLabel
          hue={displayState.hue}
          speed={displayState.speed}
          sessionActive={sessionState === 'active'}
        />
      )}

      <TitleOverlay visible={titleVisible && !showInstructions} />
      <HelpButton onClick={() => setShowInstructions(true)} />

      {/* Session controls */}
      {!showInstructions && sessionState !== 'done' && (
        <SessionBar sessionState={sessionState} timeLeft={timeLeft} onStart={startSession} />
      )}

      {/* Modals */}
      {showInstructions && (
        <InstructionsModal onClose={() => setShowInstructions(false)} />
      )}

      {sessionState === 'done' && summaryResult && (
        <SummaryScreen result={summaryResult} onRetry={resetSession} />
      )}
    </div>
  )
}
