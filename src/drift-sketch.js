// drift-sketch.js — v3
// Analytics driven primarily by hue history (ground truth of gesture speed)
// Gesture counts used only as lightweight tiebreakers

export const EMOTIONS = [
  { name: 'Anger',     hue: 0,   color: '#ff3b30', gesture: 'Rapid, forceful tapping',      desc: 'High arousal, heat, intense focus' },
  { name: 'Alertness', hue: 30,  color: '#ff9500', gesture: 'Precise, hovering movements',   desc: 'Energetic, looking forward' },
  { name: 'Ecstasy',   hue: 55,  color: '#ffd60a', gesture: 'Frequent micro-interactions',   desc: 'Brightness, positivity, enlightenment' },
  { name: 'Trust',     hue: 120, color: '#34c759', gesture: 'Fluent, fluid navigation',       desc: 'Feeling safe, confident in growth' },
  { name: 'Peace',     hue: 210, color: '#30b0c7', gesture: 'Slow, idle tapping',            desc: 'Calmness, tranquility, openness' },
  { name: 'Sadness',   hue: 240, color: '#5e5ce6', gesture: 'Repeated back-and-forth',       desc: 'Reflection, heaviness, withdrawal' },
  { name: 'Amazement', hue: 280, color: '#bf5af2', gesture: 'Sudden stops & quick tapping',  desc: 'Mystery, the unknown, quick shifts' },
]

// Fresh analytics object — call this to reset between sessions
export function freshAnalytics() {
  return {
    hueHistory: [],       // { hue } sampled every ~500ms while session is active
    tapCount: 0,
    rapidTapCount: 0,     // taps < 400ms apart
    backForthCount: 0,    // direction reversals
    stopCount: 0,         // sudden speed drops from fast → still
    microCount: 0,        // touches held < 180ms
    idleFrames: 0,        // frames with no touch and low speed
    fluidFrames: 0,       // frames with smooth medium-speed movement
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

    // Local gesture state (not exposed to React, just for tracking)
    let lastTapTime = 0
    let lastMoveDir = null
    let lastSpeedHigh = false
    let touchStartTime = 0
    let sampleTick = 0

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
        const s = 78
        const b = this.brightness

        for (let i = 0; i < this.trail.length; i++) {
          const t = i / this.trail.length
          p.noStroke()
          p.fill(h, s, b, alpha * t * 0.35)
          p.circle(this.trail[i].x, this.trail[i].y, this.size * t * 0.7)
        }

        p.noStroke()
        p.fill(h, s - 20, b, alpha * 0.08)
        p.circle(this.x, this.y, this.size * 5.5)
        p.fill(h, s, b, alpha * 0.2)
        p.circle(this.x, this.y, this.size * 3)
        p.fill(h, s - 10, 100, alpha * 0.9)
        p.circle(this.x, this.y, this.size)
        p.fill(h + 20, 30, 100, alpha * 0.6)
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
      p.background(220, 60, 2, 0.18)

      const targetHue = gestureRef.current?.targetHue ?? 210
      smoothHue = lerp(smoothHue, targetHue, 0.04)
      gestureSpeed *= 0.92

      const sessionActive = gestureRef.current?.sessionActive ?? false
      const analytics = gestureRef.current?.analytics

      if (sessionActive && analytics) {
        // Sample hue every 30 frames (~500ms at 60fps)
        sampleTick++
        if (sampleTick >= 30) {
          sampleTick = 0
          analytics.hueHistory.push({ hue: smoothHue })
        }

        // Idle frames: no touch and speed near zero
        if (touchPoints.length === 0 && gestureSpeed < 2) {
          analytics.idleFrames++
        }

        // Fluid frames: medium smooth speed
        if (gestureSpeed > 4 && gestureSpeed < 18) {
          analytics.fluidFrames++
        }

        // Stop detection: was fast, now slow
        const isSpeedHigh = gestureSpeed > 22
        if (lastSpeedHigh && !isSpeedHigh && gestureSpeed < 4) {
          analytics.stopCount++
        }
        lastSpeedHigh = isSpeedHigh
      } else {
        sampleTick = 0
        lastSpeedHigh = false
      }

      touchPoints = touchPoints.filter(pt => {
        pt.strength *= 0.97
        pt.radius = 80 + (1 - pt.strength) * 200
        return pt.strength > 0.01
      })

      // Write back minimal state (don't overwrite analytics object reference)
      gestureRef.current.hue = smoothHue
      gestureRef.current.speed = gestureSpeed

      for (const particle of particles) {
        particle.update(smoothHue)
        particle.draw()
      }

      for (const pt of touchPoints) {
        if (pt.strength > 0.2) {
          p.noStroke()
          p.fill(smoothHue, 60, 80, pt.strength * 0.03)
          p.circle(pt.x, pt.y, pt.radius * 2.5)
        }
      }
    }

    // ── Interaction handlers ────────────────────────────────────────────────

    function handleMove(x, y) {
      const existing = touchPoints.find(pt => pt.id === 'primary')
      if (existing) {
        const dx = x - existing.x
        const dy = y - existing.y
        const spd = Math.sqrt(dx * dx + dy * dy)
        gestureSpeed = Math.min(spd, 60)

        // Back-and-forth detection
        const dir = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'R' : 'L')
          : (dy > 0 ? 'D' : 'U')
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
      if (gestureRef.current) {
        gestureRef.current.targetHue = mapSpeedToHue(0)
      }
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

    // ── Hue → emotion mapping ───────────────────────────────────────────────
    // Idle/slow  → Peace (210) / Sadness (240)
    // Medium     → Amazement (280) / Trust (120)
    // Fast       → Ecstasy (55) / Alertness (30) / Anger (0)
    function mapSpeedToHue(speed) {
      const t = Math.min(speed / 50, 1)
      if (t < 0.18) return lerp(210, 240, t / 0.18)
      if (t < 0.36) return lerp(240, 280, (t - 0.18) / 0.18)
      if (t < 0.55) return lerp(280, 120, (t - 0.36) / 0.19)
      if (t < 0.70) return lerp(120, 55,  (t - 0.55) / 0.15)
      if (t < 0.85) return lerp(55,  30,  (t - 0.70) / 0.15)
      return           lerp(30,  0,   (t - 0.85) / 0.15)
    }

    function lerp(a, b, t) { return a + (b - a) * t }
  }
}

// ── Session analysis ──────────────────────────────────────────────────────────
// Primary result = emotion whose hue bucket dominated the session.
// Gesture counts used only to break ties, with conservative weights.
export function analyzeSession(analytics) {
  if (!analytics) return null
  const { hueHistory, tapCount, rapidTapCount, backForthCount,
          stopCount, microCount, idleFrames, fluidFrames } = analytics

  // Need at least a few samples to be meaningful
  if (!hueHistory || hueHistory.length < 2) return null

  // 1. Count how many samples landed in each emotion's hue bucket
  const buckets = {}
  for (const e of EMOTIONS) buckets[e.name] = 0

  for (const { hue } of hueHistory) {
    const e = closestEmotion(hue)
    buckets[e.name]++
  }

  const total = hueHistory.length

  // 2. Convert bucket counts to base scores (0–100 scale)
  const scores = {}
  for (const e of EMOTIONS) {
    scores[e.name] = (buckets[e.name] / total) * 100
  }

  // 3. Gesture tiebreakers — small flat bonuses, capped so they can't
  //    flip the result unless two emotions are genuinely close in hue time
  const BONUS = 6  // max bonus any single gesture signal can add

  scores['Anger']     += Math.min(rapidTapCount * 1.5, BONUS)
  scores['Ecstasy']   += Math.min(microCount * 1.2, BONUS)
  scores['Sadness']   += Math.min(backForthCount * 1.0, BONUS)
  scores['Amazement'] += Math.min(stopCount * 1.5, BONUS)
  scores['Trust']     += Math.min((fluidFrames / 60) * 1.0, BONUS)
  scores['Peace']     += Math.min((idleFrames / 60) * 1.0, BONUS)
  scores['Alertness'] += Math.min(tapCount > 5 && rapidTapCount < 2 ? 3 : 0, BONUS)

  // 4. Sort and pick top two
  const sorted = EMOTIONS
    .map(e => ({ ...e, score: scores[e.name] }))
    .sort((a, b) => b.score - a.score)

  const primary   = sorted[0]
  const secondary = sorted[1].score > 5 ? sorted[1] : null

  const hueSpread = Math.max(...hueHistory.map(h => h.hue))
                  - Math.min(...hueHistory.map(h => h.hue))
  const wasExpressive = hueSpread > 70

  return { primary, secondary, wasExpressive, tapCount, allScores: sorted }
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
