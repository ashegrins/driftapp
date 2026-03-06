// drift-sketch.js — v4
// Fixes:
// 1. handlePress no longer resets hue to 210 — tapping is neutral
// 2. sampleTick resets properly at session start
// 3. Background fade is hue-neutral (achromatic) so warm colours aren't swamped
// 4. Speed thresholds lowered so full colour range is reachable on mobile

export const EMOTIONS = [
  { name: 'Anger',     hue: 0,   color: '#ff3b30', gesture: 'Rapid, forceful tapping',      desc: 'High arousal, heat, intense focus' },
  { name: 'Alertness', hue: 30,  color: '#ff9500', gesture: 'Precise, hovering movements',   desc: 'Energetic, looking forward' },
  { name: 'Ecstasy',   hue: 55,  color: '#ffd60a', gesture: 'Frequent micro-interactions',   desc: 'Brightness, positivity, enlightenment' },
  { name: 'Trust',     hue: 120, color: '#34c759', gesture: 'Fluent, fluid navigation',       desc: 'Feeling safe, confident in growth' },
  { name: 'Peace',     hue: 210, color: '#30b0c7', gesture: 'Slow, idle tapping',            desc: 'Calmness, tranquility, openness' },
  { name: 'Sadness',   hue: 240, color: '#5e5ce6', gesture: 'Repeated back-and-forth',       desc: 'Reflection, heaviness, withdrawal' },
  { name: 'Amazement', hue: 280, color: '#bf5af2', gesture: 'Sudden stops & quick tapping',  desc: 'Mystery, the unknown, quick shifts' },
]

export function freshAnalytics() {
  return {
    hueHistory: [],     // { hue } sampled every ~500ms while session active
    tapCount: 0,
    rapidTapCount: 0,   // taps < 400ms apart
    backForthCount: 0,  // direction reversals
    stopCount: 0,       // sudden drop from fast → still
    microCount: 0,      // touch held < 180ms
    idleFrames: 0,      // frames with no active touch
    fluidFrames: 0,     // frames at smooth medium speed
  }
}

export default function createDriftSketch(gestureRef) {
  return function sketch(p) {
    const PARTICLE_COUNT = 220
    const particles = []
    let touchPoints = []
    let gestureSpeed = 0
    let smoothHue = 210
    let globalTime = 0

    let lastTapTime = 0
    let lastMoveDir = null
    let lastSpeedHigh = false
    let touchStartTime = 0
    let sampleTick = 0
    let wasSessionActive = false  // track transitions

    class Particle {
      constructor() { this.reset(true) }

      reset(initial = false) {
        this.x = p.random(p.width)
        this.y = initial ? p.random(p.height) : p.random(-20, p.height + 20)
        this.vx = p.random(-0.3, 0.3)
        this.vy = p.random(-0.3, 0.3)
        this.size = p.random(1.5, 5.5)
        this.hueOffset = p.random(-25, 25)
        this.brightness = p.random(60, 100)
        this.opacity = p.random(0.3, 0.95)
        this.noiseOffsetX = p.random(1000)
        this.noiseOffsetY = p.random(1000)
        this.clusterStrength = p.random(0.4, 1.0)
        this.life = p.random(0.5, 1.0)
        this.lifeSpeed = p.random(0.001, 0.004)
        this.trail = []
        this.maxTrail = Math.floor(p.random(3, 10))
      }

      update(hue) {
        const angle = p.noise(
          this.noiseOffsetX + globalTime * 0.0008,
          this.noiseOffsetY + globalTime * 0.0008
        ) * p.TWO_PI * 2
        this.vx += Math.cos(angle) * 0.018
        this.vy += Math.sin(angle) * 0.018

        for (const pt of touchPoints) {
          const dx = pt.x - this.x
          const dy = pt.y - this.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const radius = pt.radius || 180
          if (dist < radius && dist > 1) {
            const force = (1 - dist / radius) * 0.55 * this.clusterStrength * (pt.strength || 1)
            this.vx += (dx / dist) * force
            this.vy += (dy / dist) * force
          }
          if (dist < 30 && dist > 1) {
            this.vx -= (dx / dist) * 0.8
            this.vy -= (dy / dist) * 0.8
          }
        }

        this.vx *= 0.94
        this.vy *= 0.94
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > this.maxTrail) this.trail.shift()
        this.x += this.vx
        this.y += this.vy
        this.life += this.lifeSpeed
        if (this.life > 1 || this.life < 0) this.lifeSpeed *= -1
        if (this.x < -30) this.x = p.width + 20
        if (this.x > p.width + 30) this.x = -20
        if (this.y < -30) this.y = p.height + 20
        if (this.y > p.height + 30) this.y = -20

        this.currentHue = hue + this.hueOffset
      }

      draw() {
        const alpha = this.opacity * (0.5 + this.life * 0.5)
        const h = this.currentHue
        const s = 80
        const b = this.brightness

        for (let i = 0; i < this.trail.length; i++) {
          const t = i / this.trail.length
          p.noStroke()
          p.fill(h, s, b, alpha * t * 0.3)
          p.circle(this.trail[i].x, this.trail[i].y, this.size * t * 0.7)
        }

        p.noStroke()
        p.fill(h, s - 20, b, alpha * 0.07)
        p.circle(this.x, this.y, this.size * 5.5)
        p.fill(h, s, b, alpha * 0.18)
        p.circle(this.x, this.y, this.size * 3)
        p.fill(h, s - 10, 100, alpha * 0.9)
        p.circle(this.x, this.y, this.size)
        p.fill(h + 15, 20, 100, alpha * 0.5)
        p.circle(this.x, this.y, this.size * 0.4)
      }
    }

    p.setup = () => {
      const canvas = p.createCanvas(window.innerWidth, window.innerHeight)
      canvas.style('display', 'block')
      canvas.style('pointer-events', 'auto')
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.noStroke()
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle())
    }

    p.draw = () => {
      globalTime++

      // ── Achromatic fade — no blue tint, warm colours survive ──────────────
      // Draw a near-black rectangle each frame instead of p.background()
      // This lets all hues fade equally without a blue cast
      p.noStroke()
      p.fill(0, 0, 3, 0.2)
      p.rect(0, 0, p.width, p.height)

      const targetHue = gestureRef.current?.targetHue ?? smoothHue
      smoothHue = lerp(smoothHue, targetHue, 0.05)
      gestureSpeed *= 0.91

      const sessionActive = gestureRef.current?.sessionActive ?? false
      const analytics = gestureRef.current?.analytics

      // Detect session start transition — reset sampleTick cleanly
      if (sessionActive && !wasSessionActive) {
        sampleTick = 0
      }
      wasSessionActive = sessionActive

      if (sessionActive && analytics) {
        sampleTick++
        if (sampleTick >= 30) {
          sampleTick = 0
          analytics.hueHistory.push({ hue: smoothHue })
        }

        if (touchPoints.filter(pt => pt.id !== 'hover').length === 0 && gestureSpeed < 2) {
          analytics.idleFrames++
        }
        if (gestureSpeed > 3 && gestureSpeed < 16) {
          analytics.fluidFrames++
        }

        const isSpeedHigh = gestureSpeed > 18
        if (lastSpeedHigh && !isSpeedHigh && gestureSpeed < 3) {
          analytics.stopCount++
        }
        lastSpeedHigh = isSpeedHigh
      } else if (!sessionActive) {
        sampleTick = 0
        lastSpeedHigh = false
      }

      touchPoints = touchPoints.filter(pt => {
        pt.strength *= 0.97
        pt.radius = 80 + (1 - pt.strength) * 200
        return pt.strength > 0.01
      })

      gestureRef.current.hue = smoothHue
      gestureRef.current.speed = gestureSpeed

      for (const particle of particles) {
        particle.update(smoothHue)
        particle.draw()
      }

      for (const pt of touchPoints) {
        if (pt.strength > 0.2) {
          p.noStroke()
          p.fill(smoothHue, 65, 85, pt.strength * 0.04)
          p.circle(pt.x, pt.y, pt.radius * 2.5)
        }
      }
    }

    // ── Interaction ──────────────────────────────────────────────────────────

    function handleMove(x, y) {
      const existing = touchPoints.find(pt => pt.id === 'primary')
      if (existing) {
        const dx = x - existing.x
        const dy = y - existing.y
        const spd = Math.sqrt(dx * dx + dy * dy)
        gestureSpeed = Math.min(spd, 60)

        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
        const opp = { R: 'L', L: 'R', D: 'U', U: 'D' }
        const analytics = gestureRef.current?.analytics
        if (analytics && lastMoveDir && dir === opp[lastMoveDir]) {
          analytics.backForthCount++
        }
        lastMoveDir = dir

        existing.x = x
        existing.y = y
        existing.strength = Math.min(existing.strength + 0.1, 1.0)
      } else {
        touchPoints.push({ id: 'primary', x, y, strength: 1, radius: 160 })
      }
      // Update hue from movement speed
      if (gestureRef.current) {
        gestureRef.current.targetHue = mapSpeedToHue(gestureSpeed)
      }
    }

    function handlePress(x, y) {
      touchStartTime = Date.now()
      const analytics = gestureRef.current?.analytics
      if (analytics) {
        analytics.tapCount++
        const now = Date.now()
        if (now - lastTapTime < 400) analytics.rapidTapCount++
        lastTapTime = now
      }
      touchPoints.push({ id: 'primary', x, y, strength: 0.6, radius: 160 })
      // FIX: do NOT reset targetHue on press — let movement speed drive it.
      // Pressing without moving is a neutral gesture, not a "Peace" signal.
    }

    function handleRelease() {
      const duration = Date.now() - touchStartTime
      const analytics = gestureRef.current?.analytics
      if (analytics && duration < 180) {
        analytics.microCount++
      }
    }

    p.mousePressed  = () => handlePress(p.mouseX, p.mouseY)
    p.mouseDragged  = () => { if (p.mouseButton === p.LEFT) handleMove(p.mouseX, p.mouseY) }
    p.mouseReleased = () => handleRelease()
    p.mouseMoved    = () => {
      const ex = touchPoints.find(pt => pt.id === 'hover')
      if (ex) { ex.x = p.mouseX; ex.y = p.mouseY; ex.strength = 0.15 }
      else touchPoints.push({ id: 'hover', x: p.mouseX, y: p.mouseY, strength: 0.15, radius: 100 })
    }

    p.touchStarted = () => {
      touchPoints = touchPoints.filter(pt => pt.id !== 'primary')
      for (const t of p.touches) {
        handlePress(t.x, t.y)
        const last = touchPoints[touchPoints.length - 1]
        if (last) last.id = `t${t.id}`
      }
      return false
    }
    p.touchMoved = () => {
      for (const t of p.touches) {
        const ex = touchPoints.find(pt => pt.id === `t${t.id}`)
        if (ex) {
          const dx = t.x - ex.x
          const dy = t.y - ex.y
          gestureSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60)
          ex.x = t.x; ex.y = t.y
          ex.strength = Math.min(ex.strength + 0.05, 1.0)
          if (gestureRef.current) {
            gestureRef.current.targetHue = mapSpeedToHue(gestureSpeed)
          }
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
          const opp = { R: 'L', L: 'R', D: 'U', U: 'D' }
          const analytics = gestureRef.current?.analytics
          if (analytics && lastMoveDir && dir === opp[lastMoveDir]) {
            analytics.backForthCount++
          }
          lastMoveDir = dir
        } else {
          touchPoints.push({ id: `t${t.id}`, x: t.x, y: t.y, strength: 0.8, radius: 160 })
        }
      }
      return false
    }
    p.touchEnded   = () => { handleRelease(); return false }
    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight)

    // ── Speed → hue mapping ─────────────────────────────────────────────────
    // Speed is pixels/frame. Thresholds lowered for mobile reachability.
    // 0      → 210  Peace     (blue)
    // ~5px   → 240  Sadness   (deep blue)
    // ~10px  → 280  Amazement (violet)
    // ~16px  → 120  Trust     (green)   ← crosses the hue wheel
    // ~22px  → 55   Ecstasy   (yellow)
    // ~28px  → 30   Alertness (orange)
    // ~35px+ → 0    Anger     (red)
    function mapSpeedToHue(speed) {
      const t = Math.min(speed / 35, 1)  // full range at 35px/frame (was 50)
      if (t < 0.14) return lerp(210, 240, t / 0.14)
      if (t < 0.28) return lerp(240, 280, (t - 0.14) / 0.14)
      if (t < 0.46) return lerp(280, 120, (t - 0.28) / 0.18)
      if (t < 0.63) return lerp(120, 55,  (t - 0.46) / 0.17)
      if (t < 0.80) return lerp(55,  30,  (t - 0.63) / 0.17)
      return           lerp(30,  0,   (t - 0.80) / 0.20)
    }

    function lerp(a, b, t) { return a + (b - a) * t }
  }
}

// ── Session analysis ──────────────────────────────────────────────────────────
export function analyzeSession(analytics) {
  if (!analytics) return null
  const { hueHistory, tapCount, rapidTapCount, backForthCount,
          stopCount, microCount, idleFrames, fluidFrames } = analytics

  if (!hueHistory || hueHistory.length < 2) return null

  // 1. Bucket hue samples into emotions
  const buckets = {}
  for (const e of EMOTIONS) buckets[e.name] = 0
  for (const { hue } of hueHistory) {
    buckets[closestEmotion(hue).name]++
  }

  const total = hueHistory.length

  // 2. Base score = fraction of session time in that hue zone (0–100)
  const scores = {}
  for (const e of EMOTIONS) {
    scores[e.name] = (buckets[e.name] / total) * 100
  }

  // 3. Gesture tiebreakers — capped at +8 so they only flip very close ties
  const CAP = 8
  scores['Anger']     += Math.min(rapidTapCount * 2,        CAP)
  scores['Ecstasy']   += Math.min(microCount * 1.5,         CAP)
  scores['Sadness']   += Math.min(backForthCount * 1.2,     CAP)
  scores['Amazement'] += Math.min(stopCount * 2,            CAP)
  scores['Trust']     += Math.min((fluidFrames / 30) * 0.5, CAP)
  scores['Peace']     += Math.min((idleFrames / 30) * 0.5,  CAP)
  scores['Alertness'] += (tapCount > 8 && rapidTapCount < 3) ? 4 : 0

  const sorted = EMOTIONS
    .map(e => ({ ...e, score: scores[e.name] }))
    .sort((a, b) => b.score - a.score)

  const primary   = sorted[0]
  const secondary = sorted[1].score > 8 ? sorted[1] : null

  const hues = hueHistory.map(h => h.hue)
  const hueSpread = Math.max(...hues) - Math.min(...hues)

  return { primary, secondary, wasExpressive: hueSpread > 60, tapCount, allScores: sorted }
}

function closestEmotion(hue) {
  let best = EMOTIONS[0], bestDist = 999
  for (const e of EMOTIONS) {
    let dist = Math.abs(e.hue - hue)
    if (dist > 180) dist = 360 - dist
    if (dist < bestDist) { bestDist = dist; best = e }
  }
  return best
}
