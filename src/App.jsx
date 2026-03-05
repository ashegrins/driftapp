import { useEffect, useRef, useState } from 'react'
import p5 from 'p5'
import createDriftSketch from './drift-sketch.js'

const HUE_LABELS = {
  indigo: { range: [210, 260], label: 'still', sub: 'deep & quiet' },
  teal:   { range: [160, 210], label: 'flowing', sub: 'moving through' },
  amber:  { range: [0, 60],   label: 'charged', sub: 'energized & fast' },
}

function getHueLabel(hue) {
  // Normalize hue for amber (wraps around)
  if (hue >= 210 && hue <= 260) return HUE_LABELS.indigo
  if (hue >= 160 && hue < 210)  return HUE_LABELS.teal
  return HUE_LABELS.amber
}

function HueBadge({ hue, speed }) {
  const info = getHueLabel(hue)
  const opacity = Math.min(0.5 + speed / 80, 1)

  return (
    <div style={{
      position: 'fixed',
      bottom: '2.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      pointerEvents: 'none',
      transition: 'opacity 0.6s ease',
      opacity,
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(2rem, 8vw, 3.5rem)',
        fontWeight: 300,
        letterSpacing: '0.15em',
        color: `hsl(${hue}, 75%, 78%)`,
        textShadow: `0 0 40px hsl(${hue}, 80%, 50%), 0 0 80px hsl(${hue}, 60%, 30%)`,
        transition: 'color 0.8s ease, text-shadow 0.8s ease',
        lineHeight: 1,
      }}>
        {info.label}
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 'clamp(0.6rem, 2.5vw, 0.75rem)',
        letterSpacing: '0.3em',
        color: `hsla(${hue}, 40%, 65%, 0.7)`,
        textTransform: 'uppercase',
        marginTop: '0.4rem',
        transition: 'color 0.8s ease',
      }}>
        {info.sub}
      </div>
    </div>
  )
}

function TitleOverlay({ visible }) {
  return (
    <div style={{
      position: 'fixed',
      top: '2.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      pointerEvents: 'none',
      opacity: visible ? 0.85 : 0.2,
      transition: 'opacity 1.2s ease',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'italic',
        fontSize: 'clamp(1.4rem, 5vw, 2rem)',
        fontWeight: 300,
        letterSpacing: '0.4em',
        color: 'rgba(180, 210, 240, 0.9)',
        textShadow: '0 0 30px rgba(100, 180, 255, 0.3)',
      }}>
        drift
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 'clamp(0.55rem, 2vw, 0.65rem)',
        letterSpacing: '0.35em',
        color: 'rgba(140, 170, 200, 0.5)',
        marginTop: '0.3rem',
        textTransform: 'uppercase',
      }}>
        touch to shape
      </div>
    </div>
  )
}

function SpeedOrb({ speed }) {
  const size = 6 + Math.min(speed * 0.8, 20)
  const opacity = Math.min(0.3 + speed / 60, 0.9)
  return (
    <div style={{
      position: 'fixed',
      top: '2.6rem',
      right: '1.8rem',
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, rgba(255,200,100,${opacity}), rgba(255,120,50,${opacity * 0.5}))`,
      boxShadow: `0 0 ${size * 2}px rgba(255,160,60,${opacity * 0.6})`,
      transition: 'width 0.15s ease, height 0.15s ease, opacity 0.15s ease',
      pointerEvents: 'none',
      transform: 'translate(50%, -50%)',
    }} />
  )
}

export default function App() {
  const canvasRef = useRef(null)
  const gestureRef = useRef({ hue: 220, speed: 0, touchCount: 0 })
  const p5Ref = useRef(null)
  const [displayState, setDisplayState] = useState({ hue: 220, speed: 0 })
  const [titleVisible, setTitleVisible] = useState(true)
  const titleTimerRef = useRef(null)

  // Mount p5 sketch
  useEffect(() => {
    const sketch = createDriftSketch(gestureRef)
    p5Ref.current = new p5(sketch, canvasRef.current)

    return () => {
      if (p5Ref.current) p5Ref.current.remove()
    }
  }, [])

  // Sync gesture state to React UI at 20fps (not every frame)
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

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#020408' }}>
      {/* p5 canvas mount point */}
      <div
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />

      {/* UI overlays */}
      <TitleOverlay visible={titleVisible} />
      <HueBadge hue={displayState.hue} speed={displayState.speed} />
      <SpeedOrb speed={displayState.speed} />

      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,4,8,0.7) 100%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
    </div>
  )
}
