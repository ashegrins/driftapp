# 🌌 Drift — Mood Particle Journal

A full-screen bioluminescent particle PWA. Touch and drag to shape the particle field — gesture speed shifts the hue from deep indigo → electric teal → warm amber.

## Features

- **220 autonomous particles** drifting via Perlin noise
- **Gesture clustering** — particles attract toward touch/mouse
- **Hue shifting** based on velocity (slow = indigo, fast = amber)
- **Bioluminescent trails** with glow halos
- **PWA** — installable on iOS and Android from the browser
- **Mobile-first** — multi-touch support

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output in `/dist` — ready to deploy.

## Deploy to Netlify

### Option A: Drag & Drop
1. Run `npm run build`
2. Go to [netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder onto the page

### Option B: Git Deploy (recommended)
1. Push this repo to GitHub/GitLab
2. Connect to Netlify → "New site from Git"
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy!

### Option C: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

## PWA Install
On mobile, open the deployed URL in Safari (iOS) or Chrome (Android), then use "Add to Home Screen" to install as a native-feeling app.

## Customization

### Particle count
In `src/drift-sketch.js`, change:
```js
const PARTICLE_COUNT = 220; // increase for denser field
```

### Hue mapping
The `mapSpeedToHue()` function controls color transitions:
```js
// slow → deep indigo (240)
// medium → electric teal (185)
// fast → warm amber (35)
```

### Attraction radius
```js
const radius = pt.radius || 180; // pixels
```

## Tech Stack
- React 18 + Vite
- p5.js 1.9
- vite-plugin-pwa
- Netlify (hosting)
