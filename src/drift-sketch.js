// drift-sketch.js
// Bioluminescent particle system — deep space organic aesthetic
// Particles drift autonomously, cluster toward touch/mouse, shift hue by velocity

export default function createDriftSketch(gestureRef) {
  return function sketch(p) {
    const PARTICLE_COUNT = 220;
    const particles = [];
    let bgGraphics;
    let touchPoints = []; // active touch/mouse points
    let lastPos = { x: -9999, y: -9999 };
    let gestureSpeed = 0;
    let smoothHue = 200; // start: cool indigo-blue
    let targetHue = 200;
    let globalTime = 0;

    // ─── Particle class ────────────────────────────────────────────────────────
    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = p.random(p.width);
        this.y = initial ? p.random(p.height) : p.random(-20, p.height + 20);
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = p.random(-0.3, 0.3);
        this.vy = p.random(-0.3, 0.3);
        this.size = p.random(1.5, 5.5);
        this.baseSize = this.size;
        this.hueOffset = p.random(-30, 30);
        this.brightness = p.random(60, 100);
        this.opacity = p.random(0.3, 0.95);
        this.noiseOffsetX = p.random(1000);
        this.noiseOffsetY = p.random(1000);
        this.clusterStrength = p.random(0.4, 1.0);
        this.life = p.random(0.5, 1.0);
        this.lifeSpeed = p.random(0.001, 0.004);
        this.trail = [];
        this.maxTrail = Math.floor(p.random(3, 10));
      }

      update(hue) {
        // Perlin drift
        const angle = p.noise(this.noiseOffsetX + globalTime * 0.0008, this.noiseOffsetY + globalTime * 0.0008) * p.TWO_PI * 2;
        this.vx += Math.cos(angle) * 0.018;
        this.vy += Math.sin(angle) * 0.018;

        // Attraction to touch/mouse points
        for (const pt of touchPoints) {
          const dx = pt.x - this.x;
          const dy = pt.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = pt.radius || 180;

          if (dist < radius && dist > 1) {
            const force = (1 - dist / radius) * 0.55 * this.clusterStrength * (pt.strength || 1);
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
          }

          // Slight repulsion very close to finger
          if (dist < 30 && dist > 1) {
            this.vx -= (dx / dist) * 0.8;
            this.vy -= (dy / dist) * 0.8;
          }
        }

        // Damping
        this.vx *= 0.94;
        this.vy *= 0.94;

        // Trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        this.x += this.vx;
        this.y += this.vy;

        // Life cycle (subtle pulsing opacity)
        this.life += this.lifeSpeed;
        if (this.life > 1) this.lifeSpeed *= -1;
        if (this.life < 0) { this.lifeSpeed *= -1; }

        // Wrap edges softly
        if (this.x < -30) this.x = p.width + 20;
        if (this.x > p.width + 30) this.x = -20;
        if (this.y < -30) this.y = p.height + 20;
        if (this.y > p.height + 30) this.y = -20;

        this.currentHue = hue + this.hueOffset;
      }

      draw() {
        const alpha = this.opacity * (0.5 + this.life * 0.5);
        const h = this.currentHue;
        const s = 75;
        const b = this.brightness;

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
          const t = i / this.trail.length;
          const trailAlpha = alpha * t * 0.35;
          const trailSize = this.size * t * 0.7;
          p.noStroke();
          p.fill(h, s, b, trailAlpha);
          p.circle(this.trail[i].x, this.trail[i].y, trailSize);
        }

        // Glow outer halo
        p.noStroke();
        p.fill(h, s - 20, b, alpha * 0.08);
        p.circle(this.x, this.y, this.size * 5.5);

        p.fill(h, s, b, alpha * 0.2);
        p.circle(this.x, this.y, this.size * 3);

        // Core
        p.fill(h, s - 10, 100, alpha * 0.9);
        p.circle(this.x, this.y, this.size);

        // Hot center
        p.fill(h + 20, 30, 100, alpha * 0.6);
        p.circle(this.x, this.y, this.size * 0.4);
      }
    }

    // ─── p5 lifecycle ─────────────────────────────────────────────────────────
    p.setup = () => {
      const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
      canvas.style('display', 'block');
      p.colorMode(p.HSB, 360, 100, 100, 1);
      p.noStroke();

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }

      // Background layer
      bgGraphics = p.createGraphics(p.width, p.height);
      bgGraphics.colorMode(p.HSB, 360, 100, 100, 1);
      bgGraphics.background(220, 60, 3);
    };

    p.draw = () => {
      globalTime++;

      // Fade trail on main canvas
      p.background(220, 60, 2, 0.18);

      // Smooth hue toward target
      targetHue = mapSpeedToHue(gestureSpeed);
      smoothHue = lerp(smoothHue, targetHue, 0.04);

      // Decay gesture speed
      gestureSpeed *= 0.92;

      // Update touch points (decay radius over time)
      touchPoints = touchPoints.filter(pt => {
        pt.strength *= 0.97;
        pt.radius = 80 + (1 - pt.strength) * 200;
        return pt.strength > 0.01;
      });

      // Expose current hue for external use
      if (gestureRef) {
        gestureRef.current = {
          hue: smoothHue,
          speed: gestureSpeed,
          touchCount: touchPoints.length
        };
      }

      // Update + draw particles
      for (const particle of particles) {
        particle.update(smoothHue);
        particle.draw();
      }

      // Nebula overlay — subtle atmospheric haze around active touch zones
      for (const pt of touchPoints) {
        if (pt.strength > 0.2) {
          const c = p.color(smoothHue, 60, 80, pt.strength * 0.03);
          p.noStroke();
          p.fill(c);
          p.circle(pt.x, pt.y, pt.radius * 2.5);
        }
      }
    };

    // ─── Interaction ──────────────────────────────────────────────────────────
    function addTouchPoint(x, y, strength = 1) {
      // Update or add
      const existing = touchPoints.find(pt => pt.id === 'primary');
      if (existing) {
        const dx = x - existing.x;
        const dy = y - existing.y;
        gestureSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60);
        existing.x = x;
        existing.y = y;
        existing.strength = Math.min(existing.strength + 0.1, 1.0);
      } else {
        touchPoints.push({ id: 'primary', x, y, strength, radius: 160 });
      }
    }

    p.mouseDragged = () => {
      if (p.mouseButton === p.LEFT) {
        addTouchPoint(p.mouseX, p.mouseY);
      }
    };

    p.mousePressed = () => {
      addTouchPoint(p.mouseX, p.mouseY, 0.5);
    };

    p.mouseMoved = () => {
      // Gentle attraction even without click
      const existing = touchPoints.find(pt => pt.id === 'hover');
      const strength = 0.15;
      if (existing) {
        existing.x = p.mouseX;
        existing.y = p.mouseY;
        existing.strength = strength;
      } else {
        touchPoints.push({ id: 'hover', x: p.mouseX, y: p.mouseY, strength, radius: 100 });
      }
    };

    p.touchStarted = () => {
      touchPoints = touchPoints.filter(pt => pt.id !== 'primary');
      for (const t of p.touches) {
        touchPoints.push({ id: `t${t.id}`, x: t.x, y: t.y, strength: 0.7, radius: 160 });
      }
      return false;
    };

    p.touchMoved = () => {
      for (const t of p.touches) {
        const existing = touchPoints.find(pt => pt.id === `t${t.id}`);
        if (existing) {
          const dx = t.x - existing.x;
          const dy = t.y - existing.y;
          gestureSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60);
          existing.x = t.x;
          existing.y = t.y;
          existing.strength = Math.min(existing.strength + 0.05, 1.0);
        } else {
          touchPoints.push({ id: `t${t.id}`, x: t.x, y: t.y, strength: 0.8, radius: 160 });
        }
      }
      return false;
    };

    p.touchEnded = () => {
      // Let points decay naturally
      return false;
    };

    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight);
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function mapSpeedToHue(speed) {
      // slow (0)   → 240 deep indigo
      // medium (15)→ 185 electric teal
      // fast (40+) → 35  warm amber-gold
      const t = Math.min(speed / 40, 1);
      if (t < 0.5) {
        return lerp(240, 185, t * 2);
      } else {
        return lerp(185, 35, (t - 0.5) * 2);
      }
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
  };
}
