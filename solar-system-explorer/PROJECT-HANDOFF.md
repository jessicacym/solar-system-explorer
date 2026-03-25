# Solar System Explorer — Project Handoff Document

> VDES39915 — Visualizing Information: Dynamic Data Models | Sheridan College | Winter 2026
> Generated: 2026-03-23

---

## 1. Project Overview

**Solar System Explorer** is an interactive web application that visualizes the solar system with real-time planetary data. The design is inspired by [BlueYard.com](https://blueyard.com) — featuring a central spiral particle nebula with 8 clickable planet elements arranged around it, each rendered as a **3D rotating particle sphere**.

### Key Features

- **Spiral galaxy particle cloud** (canvas-based, 18,000+ particles with blue/teal/purple/pink colors)
- **8 planet particle spheres** (3D rotating WebGL-like globes using canvas 2D)
- **Real-time data** from Le Systeme Solaire API + NASA JPL Horizons
- **Observer location settings** — calculates RA/DEC/AZ/ALT for any location/time
- **Vercel-deployed** with serverless proxy for NASA Horizons CORS bypass
- **Auto-refresh** every 15 seconds

---

## 2. File Structure

```
solar-system-explorer/
├── index.html              # Main HTML page
├── style.css               # All CSS styling
├── planets.js              # Planet configs, static data, categories, UNITS
├── particle-sphere.js      # 3D rotating particle sphere class
├── main.js                 # Core logic: galaxy, spheres, API, UI
├── planets-api.json        # Pre-fetched Le Systeme Solaire data (offline cache)
├── fetch-data.js           # Node.js script to refresh planets-api.json
├── vercel.json             # Vercel deployment config
├── api/
│   └── horizons.js         # Vercel serverless function (NASA proxy)
├── PLAN.md                 # Original project plan
└── README.md               # GitHub README
```

---

## 3. Architecture

### Data Flow

```
User enters location/time
    ↓
Settings Form (index.html)
    ↓
main.js → fetchAllData()
    ├── loadApiPlanetData() → planets-api.json (physical data)
    │   └── fallback: PLANET_STATIC_DATA (in planets.js)
    └── fetchHorizonsData() × 8 planets (parallel)
        ├── Production: /api/horizons (Vercel proxy)
        └── Local dev: NASA direct + CORS proxy fallbacks
    ↓
planetData[] + positionData{} populated
    ↓
Rendered in UI: planet spheres + detail panel
```

### Rendering Layers (z-index order)

1. **z-0**: `#galaxy-canvas` — spiral nebula + background particles
2. **z-2**: `.planet-spheres` — 8 planet particle sphere elements
3. **z-55**: `.bottom-bar` — refresh badge + location button
4. **z-60**: `.detail-panel` — slide-in planet data panel
5. **z-100**: `.settings-overlay` — observer settings form

---

## 4. Complete Source Code

### 4.1 index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Solar System Explorer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Bitcount+Prop+Double+Ink:wght@100..900&family=Bitcount+Prop+Double:wght@100..900&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css?v=7" />
  </head>
  <body>
    <h1 class="site-title">Solar System Explorer</h1>
    <canvas id="galaxy-canvas"></canvas>
    <div class="planet-spheres" id="planet-spheres" style="display: none"></div>

    <!-- Observer Settings Overlay -->
    <div class="settings-overlay" id="settings-overlay">
      <div class="settings-card">
        <h2 class="settings-title">Solar System Explorer</h2>
        <p class="settings-desc">
          Enter your observation location and time to calculate real-time planet
          positions.
        </p>
        <form id="settings-form" autocomplete="off">
          <div class="settings-row">
            <div class="settings-field">
              <label for="obs-lat">Latitude (°)</label>
              <input
                type="number"
                id="obs-lat"
                step="any"
                min="-90"
                max="90"
                placeholder="e.g. 45.78"
                required
              />
            </div>
            <div class="settings-field">
              <label for="obs-lon">Longitude (°)</label>
              <input
                type="number"
                id="obs-lon"
                step="any"
                min="-180"
                max="180"
                placeholder="e.g. 3.07"
                required
              />
            </div>
            <div class="settings-field">
              <label for="obs-elev">Elevation (m)</label>
              <input
                type="number"
                id="obs-elev"
                step="1"
                min="0"
                max="9000"
                value="0"
                required
              />
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-field">
              <label for="obs-zone">Timezone (UTC+)</label>
              <input
                type="number"
                id="obs-zone"
                step="1"
                min="-12"
                max="14"
                value="0"
                required
              />
            </div>
            <div class="settings-field settings-field--wide">
              <label for="obs-datetime">Date & Time (UTC)</label>
              <input type="datetime-local" id="obs-datetime" required />
            </div>
          </div>
          <div class="settings-actions">
            <button
              type="submit"
              class="settings-btn settings-btn--primary"
              id="btn-calculate"
            >
              Calculate Positions
            </button>
            <button
              type="button"
              class="settings-btn settings-btn--now"
              id="btn-now"
            >
              Now
            </button>
            <button
              type="button"
              class="settings-btn settings-btn--locate"
              id="btn-locate"
            >
              Use My Location
            </button>
          </div>
          <p class="settings-status" id="settings-status"></p>
        </form>
      </div>
    </div>

    <!-- Planet detail panel -->
    <aside class="detail-panel" id="detail-panel" hidden>
      <button class="detail-close" id="detail-close">&times;</button>
      <div class="detail-header">
        <div class="detail-dot" id="detail-dot"></div>
        <div>
          <h3 class="detail-name" id="detail-name"></h3>
          <p class="detail-cn" id="detail-cn"></p>
          <p class="detail-tagline" id="detail-tagline"></p>
        </div>
      </div>
      <div class="detail-grid" id="detail-grid"></div>
      <p class="detail-source">
        Data:
        <a href="https://api.le-systeme-solaire.net" target="_blank"
          >Le Systeme Solaire API</a
        >
        +
        <a href="https://ssd.jpl.nasa.gov/" target="_blank"
          >NASA JPL Horizons</a
        >
      </p>
    </aside>

    <!-- Bottom bar -->
    <div class="bottom-bar" id="bottom-bar" style="display: none">
      <div class="refresh-badge">
        <span class="refresh-dot"></span>
        <span id="refresh-label">Updated just now</span>
      </div>
      <button class="recalc-btn" id="recalc-btn">Location</button>
    </div>

    <script src="planets.js?v=7"></script>
    <script src="particle-sphere.js?v=7"></script>
    <script src="main.js?v=7"></script>
  </body>
</html>
```

### 4.2 particle-sphere.js

The `ParticleSphere` class creates a 3D rotating particle globe effect:

- **Fibonacci sphere distribution** for even particle coverage
- **Perspective projection** with depth-based alpha
- **Additive blending** (`globalCompositeOperation: "lighter"`) for glow
- **Per-planet color palettes** (e.g., Earth = blue + green + white)
- **Auto-rotation** with configurable speed

Key function: `createPlanetParticleSphere(planetId, size, overrides)` — creates a canvas element with a running ParticleSphere instance.

### 4.3 main.js — Core Logic

Key systems:

1. **Galaxy rendering** — Pre-rendered offscreen canvases for performance:
   - `bgLayer`: 600 star dots + 200 colored glow blobs
   - `nebulaLayer`: 18,000 spiral particles with `lighter` blending
   - Per-frame: composite layers + slow rotation + dark center void
2. **Planet positions** — Each planet placed along the spiral arm using `orbitScale` parameter
3. **NASA Horizons API** — Fetches RA/DEC/AZ/ALT + Earth distance via Vercel serverless proxy
4. **Settings form** — Observer location/time input with geolocation + "Now" button
5. **Auto-refresh** — Re-fetches Horizons data every 15 seconds

### 4.4 planets.js — Configuration

Contains:

- `PLANET_CONFIG[8]` — Visual config per planet (color, gradient, position, categoryLabel, facts)
- `CATEGORIES[3]` — Inner Planets, Gas Giants, Ice Giants
- `PLANET_STATIC_DATA` — Fallback physical data when API unavailable
- `UNITS` — Conversion helpers (kmToAU, kelvinToCelsius, formatMass, etc.)

### 4.5 api/horizons.js — Vercel Serverless Function

Proxies requests to `https://ssd.jpl.nasa.gov/api/horizons.api` to bypass CORS restrictions in the browser.

---

## 5. Development History

### Phase 1: Original Canvas-Based Solar System

- Canvas orbital animation with 8 planets orbiting a central sun
- Side panel for planet data
- Footer controls (speed slider, filter tabs, search)
- Dark sci-fi theme with cyan accents
- Fonts: Orbitron + Share Tech Mono

### Phase 2: BlueYard-Inspired Redesign

- Replaced canvas orbital animation with full-page scrolling layout
- Added category sections (Inner Planets, Gas Giants, Ice Giants)
- Planet cards with gradient border hover effects
- Scrolling ticker, comparison table, footer
- Fixed navigation with IntersectionObserver scroll spy
- Font: Instrument Sans

### Phase 3: Galaxy View (BlueYard Homepage Style)

- Spiral particle cloud (canvas) as central visual element
- Planets positioned around edges of viewport (like BlueYard's 5 category items)
- Each planet: subtitle (category) + bold name + colored sphere with ring
- Scroll-snap sections for hero text, about, category detail views
- Detail panel slides in from right on click

### Phase 4: Particle Sphere Planets

- Replaced static colored circles with 3D rotating particle spheres
- `ParticleSphere` class with Fibonacci distribution
- Per-planet color palettes (4 colors each)
- Particle spheres also shown in detail panel

### Phase 5: Real-Time Position Data

- Integrated NASA JPL Horizons API for real-time astronomical positions
- Observer settings form (location, time, timezone)
- Shows RA, DEC, Azimuth, Altitude for each planet
- Current distance from Earth in AU and km
- Vercel serverless proxy to bypass CORS
- Auto-geolocation + "Now" button for convenience

### Phase 6: Spiral-Bound Planet Positions

- Changed planet placement from fixed viewport edges to spiral arm positions
- Planets now move with the spiral rotation using `orbitScale` parameter
- `getSpiralScreenPos()` calculates real-time screen coordinates
- Pre-rendered nebula layer for better performance (offscreen canvas)

---

## 6. API Details

### Le Systeme Solaire API

- **URL**: `https://api.le-systeme-solaire.net/rest/bodies/{planetId}`
- **No API key required**
- **Data**: semimajorAxis, sideralOrbit, sideralRotation, meanRadius, mass, avgTemp, gravity, moons
- **Pre-fetched**: Run `node fetch-data.js` to save to `planets-api.json`

### NASA JPL Horizons API

- **URL**: `https://ssd.jpl.nasa.gov/api/horizons.api`
- **Proxied via**: `/api/horizons` on Vercel
- **Parameters**: COMMAND (planet code), CENTER (observer coords), EPHEM_TYPE (OBSERVER), QUANTITIES (RA/DEC, AZ/ALT, Delta)
- **Planet codes**: Mercury=199, Venus=299, Earth=399, Mars=499, Jupiter=599, Saturn=699, Uranus=799, Neptune=899

---

## 7. Deployment

### Vercel (Production)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd solar-system-explorer
vercel
```

### Local Development

Open `index.html` directly in a browser. The Horizons API will attempt CORS proxies for local development.

---

## 8. Known Issues & TODOs

- [ ] Small Red Book (小红书) particle effect reference — user wanted to apply a specific Python universe particle effect from a Xiaohongshu post to the planet spheres (link was not scrapeable)
- [ ] Particle density could be further increased to match BlueYard's density
- [ ] Mobile responsiveness needs further testing on actual devices
- [ ] Consider adding WebGL renderer for better particle performance on high-DPI screens

---

## 9. Design Reference

The project's visual design is inspired by:

- **BlueYard.com** — Spiral galaxy homepage with category items around edges
- **Color palette**: Dark background (#090b11), blue/teal/purple/pink particle spectrum
- **Typography**: Instrument Sans (body), Bitcount Prop Double (title)
- **Layout**: Full-viewport with fixed elements, no scroll on main view
