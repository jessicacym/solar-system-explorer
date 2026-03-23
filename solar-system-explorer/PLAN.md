# 🪐 Solar System Explorer — Project Plan

## VDES39915 | Project 2: Visualize Dynamic Data

---

## 📋 Project Overview

**Project Name:** Solar System Explorer  
**Course:** VDES39915 — Visualizing Information: Dynamic Data Models  
**Due:** Week 10 (Week of March 16, 2026)  
**Worth:** 35%

**Concept:** A real-time interactive solar system dashboard that fetches live planetary data from a public API and visualizes it with an animated orbital map. Users can explore each planet's physical characteristics through clicking, filtering, and time controls.

---

## 🎯 Rationale

**Environment:** Web browser (desktop-first), hosted on GitHub Pages  
**Purpose:** Allow users to explore real-time planetary data from NASA's solar system in an engaging, visual way — bridging astronomy education with interactive data design.  
**Target Audience:** Curious general public, students, science enthusiasts who want an intuitive and beautiful way to explore space data.

---

## 🔗 APIs

### API 1 — Le Système Solaire (Planet Physical Data)

- Base URL: `https://api.le-systeme-solaire.net/rest/`
- **API Key required:** `Authorization: Bearer <KEY>` (key obtained via `/generatekey.html`)
- CORS-enabled — works directly in browser
- Provides: static physical/orbital properties of all solar system bodies

**Endpoints:**

```
GET /rest/bodies/mercury    (with Bearer token)
GET /rest/bodies/venus
...
GET /rest/bodies/neptune
```

**Data Fields Used:**
| Field | Description |
|-------|-------------|
| `englishName` | Planet name |
| `semimajorAxis` | Distance from Sun (km) |
| `sideralOrbit` | Orbital period (Earth days) |
| `sideralRotation` | Rotation period (hours) |
| `meanRadius` | Mean radius (km) |
| `mass.massValue + mass.massExponent` | Mass |
| `avgTemp` | Average temperature (K) |
| `moons` | Array of moons |
| `gravity` | Surface gravity (m/s²) |

### API 2 — NASA JPL Horizons (Real-Time Earth Distance)

- Base URL: `https://ssd.jpl.nasa.gov/api/horizons.api`
- **No API key required** — completely free
- Provides: real-time ephemeris data (current planet-to-Earth distance in AU & km)

**Query Example:**

```
GET /api/horizons.api?format=json
    &COMMAND='499'           ← Mars (199=Mercury, 299=Venus, 499=Mars, etc.)
    &CENTER='500@399'        ← Observer at Earth center
    &EPHEM_TYPE='OBSERVER'
    &START_TIME='2026-03-23' ← Today's date (dynamic)
    &STOP_TIME='2026-03-24'
    &STEP_SIZE='1 d'
    &QUANTITIES='20'         ← Observer range (delta, AU)
    &MAKE_EPHEM='YES'
```

**Response Parsing:** The distance value (in AU) is extracted from the text block between `$$SOE` and `$$EOE` markers in the JSON `result` field.

### Fallback — Static Data (planets.js)

- `PLANET_STATIC_DATA` object with hardcoded real astronomical values
- Used automatically when Le Système Solaire API is unavailable
- Sourced from NASA fact sheets — same data fields as the API

---

## 🗂️ File Structure

```text
solar-system-explorer/
├── index.html            ← Single-page HTML (homepage only)
├── style.css             ← All styles (dark space theme, Instrument Sans)
├── main.js               ← Galaxy canvas, spiral animation, API fetch, detail panel
├── planets.js            ← Planet config, static fallback data, unit helpers
├── particle-sphere.js    ← 3D rotating particle sphere class for planet visuals
├── PLAN.md               ← This file (project documentation)
└── README.md             ← GitHub README
```

---

## 🔄 Data Pipeline

```text
┌──────────────────────────────────────────────────────────────┐
│                    DATA SOURCES (Parallel)                    │
└──────────────────────────────────────────────────────────────┘

[Le Système Solaire API]          [NASA JPL Horizons API]
  api.le-systeme-solaire.net        ssd.jpl.nasa.gov
  Bearer token authentication       No auth required
        │                                  │
        │ GET /rest/bodies/{planet}         │ GET /api/horizons.api
        │ × 8 planets (parallel)           │ × 7 planets (parallel)
        │                                  │ (Earth excluded — distance = 0)
        ▼                                  ▼
[Physical Data]                    [Real-Time Distance]
  semimajorAxis, meanRadius,         Current distance from Earth
  mass, avgTemp, gravity,            in AU and km (today's date)
  sideralOrbit, sideralRotation,     Parsed from $$SOE..$$EOE
  moons[]                            text block in JSON response
        │                                  │
        ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│              main.js — fetchPlanetData()                     │
│                                                              │
│  1. Try Le Système Solaire API (with API key)                │
│     └─ On failure → fallback to PLANET_STATIC_DATA           │
│        (hardcoded real NASA values in planets.js)             │
│                                                              │
│  2. Fetch NASA Horizons distances (always attempted)         │
│     └─ On failure → distEarthAU/distEarthKm remain null      │
│                                                              │
│  3. Merge into planetData[] array                            │
│     └─ Each entry = PLANET_CONFIG + API data + live distance │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              VISUALIZATION LAYER                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Galaxy Canvas]  ← requestAnimationFrame (60fps)            │
│    • Pre-rendered spiral nebula texture (18,000 particles)   │
│    • Slowly rotating with motion trail diffusion effect      │
│    • Background star field + ambient glow                    │
│    • Center void (dark core)                                 │
│                                                              │
│  [Planet Spheres]  ← positioned on spiral arms               │
│    • Each planet = ParticleSphere (particle-sphere.js)       │
│    • 3D rotating particle globe with planet-specific colors  │
│    • Bound to spiral via orbitScale → getSpiralScreenPos()   │
│    • Positions update every frame to follow spiral rotation  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              USER INTERACTIONS  ← Human Actions              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Click planet → open detail panel (slide-in from right)      │
│  Click outside → close detail panel                          │
│  Click × button → close detail panel                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              DETAIL PANEL (DOM)                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🌍 Current Distance from Earth  ← NASA Horizons (live)     │
│  Distance from Sun               ← Le Système Solaire API   │
│  Orbital Period                                              │
│  Rotation Period                                             │
│  Mean Radius                                                 │
│  Mass                                                        │
│  Avg Temperature                                             │
│  Surface Gravity                                             │
│  Known Moons                                                 │
│                                                              │
│  + Planet particle sphere in header                          │
│  + Planet name (EN + CN) + tagline                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Refresh Cycle:** Planet physical data fetched on page load. Real-time Earth distances fetched from NASA Horizons on load. API data re-fetched every 60 seconds. Fallback to static data ensures the visualization always works even if APIs are down.

---

## 🖥️ Page Layout

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   FULLSCREEN GALAXY CANVAS (position: fixed)            │
│   • Spiral nebula rotating slowly                       │
│   • Background stars + colored dust                     │
│   • Motion trail diffusion effect                       │
│   • Center void (dark core)                             │
│                                                         │
│          ✦ Mercury          ✦ Venus                     │
│                    ✦ Earth                               │
│              ✦ Mars                                     │
│     ✦ Jupiter                                           │
│                         ✦ Saturn                        │
│        ✦ Uranus              ✦ Neptune                  │
│                                                         │
│   (Planets positioned on spiral arms,                   │
│    rotating with the spiral each frame)                  │
│                                                         │
│                              ┌──────────────────┐       │
│                              │  DETAIL PANEL    │       │
│   Click any planet →         │  (slide-in right)│       │
│                              │  Planet data     │       │
│                              │  + particle orb  │       │
│                              └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Style

**Theme:** Immersive Dark Space (BlueYard-inspired)
**Background:** Deep space `#090b11` with particle star field
**Accent Color:** Blue/teal/purple/magenta particle palette
**Planet Colors:** Unique per planet — multi-color particle palettes (see planets.js)
**Font:** `Instrument Sans` (Google Fonts)
**Effects:**

- 3D rotating particle spheres for each planet (ParticleSphere class)
- Pre-rendered spiral nebula with additive blending glow
- Motion trail diffusion (semi-transparent frame clear)
- Planets bound to spiral arms, rotating together
- Slide-in detail panel with particle sphere header

---

## ✅ Rubric Checklist

### Deliverable 1 — Dynamic Visualization (30%)

- [x] **Dynamic data** — API fetched on load, refreshes every 60s
- [x] **Interactive features** — click, hover, slider, filter
- [x] **Chart components** — orbital diagram + annotated data card
- [x] **Typography / layout / colour** — Orbitron font, dark theme, cyan accent
- [x] **Accessibility** — labels, contrast ratios considered

### Deliverable 2 — Rationale + Data Pipeline (30%)

- [x] **Environment** described above
- [x] **Purpose** described above
- [x] **Target audience** described above
- [x] **Data pipeline diagram** — see pipeline section above
- [x] **Refresh cycle** — 60-second API re-fetch
- [x] **Human actions** — click, filter, speed control, search

### Professionalism (40%)

- [ ] Weekly check-ins with instructor ← do in class
- [ ] Final milestone discussion ← prepare reflection
- [ ] AI use documented ← cite this conversation
- [ ] Code comments crediting sources ← add to all files

---

## 🚀 Build Steps (in order)

1. **[ ]** Set up file structure (index.html, style.css, main.js, planets.js)
2. **[ ]** Build HTML skeleton + import fonts
3. **[ ]** Style dark theme base (CSS variables, layout)
4. **[ ]** Write API fetch in main.js + test in console
5. **[ ]** Draw static canvas (sun + orbit rings)
6. **[ ]** Add planet animation loop (orbital motion)
7. **[ ]** Add click interaction → data card
8. **[ ]** Add speed slider control
9. **[ ]** Add planet filter tabs
10. **[ ]** Add 60s auto-refresh + "last updated" badge
11. **[ ]** Polish: glow effects, transitions, hover labels
12. **[ ]** Deploy to GitHub Pages → get URL
13. **[ ]** Take screenshot
14. **[ ]** ZIP source code for submission

---

## 📝 AI Use Documentation (for submission)

This project was planned and developed with assistance from Claude (Anthropic).  
Conversation covered: API selection, rubric analysis, pipeline design, code generation.  
All code reviewed and understood by student before submission.  
→ Reference: Claude.ai conversation, March 2026

---

## 🔧 Notes for Claude Code

When editing files in VSCode with Claude Code, reference this plan:

- `index.html` — structure only, no inline styles/scripts
- `style.css` — all visual styles, use CSS variables defined at `:root`
- `main.js` — API logic + canvas animation + event listeners
- `planets.js` — planet config array (exported, imported by main.js)

**CSS Variables to define in `:root`:**

```css
--bg-deep: #050a18 --bg-card: #0a1628 --accent: #00d4ff
  --accent-glow: rgba(0, 212, 255, 0.3) --text-primary: #e8f4fd
  --text-dim: #5a7a9a --border: rgba(0, 212, 255, 0.15);
```

**Planet IDs in API** (use these for direct fetch):

```
mercury, venus, earth, mars, jupiter, saturn, uranus, neptune
```
