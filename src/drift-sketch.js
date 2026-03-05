// drift-sketch.js — v2
// 7-emotion hue system with gesture analytics for session summary

export const EMOTIONS = [
  { name: 'Anger',     hue: 0,   color: '#ff3b30', gesture: 'Rapid, forceful tapping',       desc: 'High arousal, heat, intense focus' },
  { name: 'Alertness', hue: 30,  color: '#ff9500', gesture: 'Precise, hovering movements',    desc: 'Energetic, looking forward' },
  { name: 'Ecstasy',   hue: 55,  color: '#ffd60a', gesture: 'Frequent micro-interactions',    desc: 'Brightness, positivity, enlightenment' },
  { name: 'Trust',     hue: 120, color: '#34c759', gesture: 'Fluent, fluid navigation',        desc: 'Feeling safe, confident in growth' },
  { name: 'Peace',     hue: 210, color: '#30b0c7', gesture: 'Slow, idle tapping',             desc: 'Calmness, tranquility, openness' },
  { name: 'Sadness',   hue: 240, color: '#5e5ce6', gesture: 'Repeated back-and-forth',        desc: 'Reflection, heaviness, withdrawal' },
  { name: 'Amazement', hue: 280, color: '#bf5af2', gesture: 'Sudden stops & quick tapping',   desc: 'Mystery, the unknown, quick shifts' },
]

export default function createDriftSketch(gestureRef) {
  return function sketch(p) {
    const PARTICLE_COUNT = 220
    const particles = []
    let touchPoints = []
    let gestureSpeed = 0
    let smoothHue = 210
    let targetHue = 210
    let globalTime = 0

    // Analytics
    let hueHistory = []
    let tapCount = 0
    let lastTapTime = 0
    let rapidTapCount = 0
    let backForthCount = 0
    let lastMoveDir = null
    let stopCount = 0
    let lastSpeedHigh = false
    let microInteractionCount = 0
    let touchStartTime = 0
    let hoverTime = 0
    let fluidScore = 0

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
        const angle = p.noise(this.noiseOffsetX + globalTime * 0.0008, this.noiseOffsetY + globalTime * 0.0008) * p.TWO_PI * 2
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
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.noStroke()
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle())
    }

    p.draw = () => {
      globalTime++
      p.background(220, 60, 2, 0.18)

      targetHue = gestureRef.current?.targetHue ?? 210
      smoothHue = lerp(smoothHue, targetHue, 0.04)
      gestureSpeed *= 0.92

      if (gestureSpeed < 3 && touchPoints.length > 0) hoverTime++
      if (gestureSpeed > 5 && gestureSpeed < 15) fluidScore += 0.05

      // Sample hue every ~500ms
      if (globalTime % 30 === 0 && gestureRef.current?.sessionActive) {
        hueHistory.push({ hue: smoothHue, time: globalTime })
      }

      const isSpeedHigh = gestureSpeed > 20
      if (lastSpeedHigh && !isSpeedHigh && gestureSpeed < 5) stopCount++
      lastSpeedHigh = isSpeedHigh

      touchPoints = touchPoints.filter(pt => {
        pt.strength *= 0.97
        pt.radius = 80 + (1 - pt.strength) * 200
        return pt.strength > 0.01
      })

      if (gestureRef) {
        gestureRef.current = {
          ...gestureRef.current,
          hue: smoothHue,
          speed: gestureSpeed,
          touchCount: touchPoints.length,
          analytics: {
            hueHistory,
            tapCount,
            rapidTapCount,
            backForthCount,
            stopCount,
            microInteractionCount,
            hoverTime,
            fluidScore,
          }
        }
      }

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

    function handleMove(x, y) {
      const existing = touchPoints.find(pt => pt.id === 'primary')
      if (existing) {
        const dx = x - existing.x
        const dy = y - existing.y
        const spd = Math.sqrt(dx * dx + dy * dy)
        gestureSpeed = Math.min(spd, 60)

        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
        const opposites = { R: 'L', L: 'R', D: 'U', U: 'D' }
        if (lastMoveDir && dir === opposites[lastMoveDir]) backForthCount++
        lastMoveDir = dir

        if (spd > 3 && spd < 20) fluidScore += 0.05

        existing.x = x; existing.y = y
        existing.strength = Math.min(existing.strength + 0.1, 1.0)
      } else {
        touchPoints.push({ id: 'primary', x, y, strength: 1, radius: 160 })
      }
      if (gestureRef.current) gestureRef.current.targetHue = mapSpeedToHue(gestureSpeed)
    }

    function handlePress(x, y) {
      touchStartTime = Date.now()
      tapCount++
      const now = Date.now()
      if (now - lastTapTime < 500) rapidTapCount++
      lastTapTime = now
      touchPoints.push({ id: 'primary', x, y, strength: 0.6, radius: 160 })
      if (gestureRef.current) gestureRef.current.targetHue = mapSpeedToHue(0)
    }

    function handleRelease() {
      const duration = Date.now() - touchStartTime
      if (duration < 200) microInteractionCount++
    }

    p.mousePressed = () => handlePress(p.mouseX, p.mouseY)
    p.mouseDragged = () => { if (p.mouseButton === p.LEFT) handleMove(p.mouseX, p.mouseY) }
    p.mouseReleased = () => handleRelease()
    p.mouseMoved = () => {
      const existing = touchPoints.find(pt => pt.id === 'hover')
      if (existing) { existing.x = p.mouseX; existing.y = p.mouseY; existing.strength = 0.15 }
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
        const existing = touchPoints.find(pt => pt.id === `t${t.id}`)
        if (existing) {
          const dx = t.x - existing.x; const dy = t.y - existing.y
          gestureSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60)
          existing.x = t.x; existing.y = t.y
          existing.strength = Math.min(existing.strength + 0.05, 1.0)
          if (gestureRef.current) gestureRef.current.targetHue = mapSpeedToHue(gestureSpeed)
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
          const opposites = { R: 'L', L: 'R', D: 'U', U: 'D' }
          if (lastMoveDir && dir === opposites[lastMoveDir]) backForthCount++
          lastMoveDir = dir
        } else {
          touchPoints.push({ id: `t${t.id}`, x: t.x, y: t.y, strength: 0.8, radius: 160 })
        }
      }
      return false
    }
    p.touchEnded = () => { handleRelease(); return false }
    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight)

    function mapSpeedToHue(speed) {
      const t = Math.min(speed / 50, 1)
      if (t < 0.2)  return lerp(210, 240, t / 0.2)          // Peace → Sadness
      if (t < 0.4)  return lerp(240, 280, (t - 0.2) / 0.2)  // Sadness → Amazement
      if (t < 0.6)  return lerp(280, 120, (t - 0.4) / 0.2)  // Amazement → Trust
      if (t < 0.75) return lerp(120, 55,  (t - 0.6) / 0.15) // Trust → Ecstasy
      if (t < 0.9)  return lerp(55,  30,  (t - 0.75) / 0.15)// Ecstasy → Alertness
      return lerp(30, 0, (t - 0.9) / 0.1)                   // Alertness → Anger
    }

    function lerp(a, b, t) { return a + (b - a) * t }
  }
}

export function analyzeSession(analytics) {
  const { hueHistory, tapCount, rapidTapCount, backForthCount,
          stopCount, microInteractionCount, hoverTime, fluidScore } = analytics

  if (!hueHistory || hueHistory.length === 0) return null

  const hueCounts = {}
  for (const { hue } of hueHistory) {
    const emotion = closestEmotion(hue)
    hueCounts[emotion.name] = (hueCounts[emotion.name] || 0) + 1
  }

  const scores = {}
  for (const e of EMOTIONS) scores[e.name] = (hueCounts[e.name] || 0) * 10

  scores['Anger']     += rapidTapCount * 8
  scores['Alertness'] += (hoverTime > 20 ? 15 : 0)
  scores['Ecstasy']   += microInteractionCount * 6
  scores['Trust']     += fluidScore * 0.8
  scores['Peace']     += hoverTime * 0.3
  scores['Sadness']   += backForthCount * 7
  scores['Amazement'] += stopCount * 9

  const sorted = EMOTIONS
    .map(e => ({ ...e, score: scores[e.name] || 0 }))
    .sort((a, b) => b.score - a.score)

  const primary = sorted[0]
  const secondary = sorted[1]
  const hueSpread = hueHistory.length > 1
    ? Math.max(...hueHistory.map(h => h.hue)) - Math.min(...hueHistory.map(h => h.hue))
    : 0
  const wasExpressive = hueSpread > 80

  return {
    primary,
    secondary,
    wasExpressive,
    tapCount,
    rapidTapCount,
    backForthCount,
    stopCount,
    microInteractionCount,
    dominantHue: hueHistory[Math.floor(hueHistory.length / 2)]?.hue ?? 210,
    allScores: sorted,
  }
}

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
