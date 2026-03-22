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

## 🔗 API

**Primary API:** Le Système Solaire (Solar System Open Data)  
- Base URL: `https://api.le-systeme-solaire.net/rest/`  
- No API key required  
- No CORS issues — works directly in browser  
- Free, open, stable

**Key Endpoints:**
```
GET https://api.le-systeme-solaire.net/rest/bodies/
GET https://api.le-systeme-solaire.net/rest/bodies/mars
GET https://api.le-systeme-solaire.net/rest/bodies/jupiter
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

---

## 🗂️ File Structure

```
solar-system-explorer/
├── index.html          ← Main HTML page
├── style.css           ← All styles (dark sci-fi theme)
├── main.js             ← Core logic, API fetch, animation loop
├── planets.js          ← Planet config (colors, sizes, names in Chinese)
├── PLAN.md             ← This file (project documentation)
└── README.md           ← GitHub README
```

---

## 🔄 Data Pipeline

```
[Le Système Solaire API]
        │  HTTP GET /rest/bodies/
        │  (fetched on load + every 60s refresh)
        ▼
[main.js — fetch + parse]
        │  Filter: isPlanet === true
        │  Clean: convert units, calculate AU
        │  Store: planetData[] array
        ▼
[planets.js — config layer]
        │  Match API data with visual config
        │  (color, glow, display name)
        ▼
[Canvas Animation Loop]
        │  requestAnimationFrame — 60fps
        │  Time-driven orbital positions
        │  Real sidereal orbital periods
        ▼
[User Interactions]  ← Human Actions
        │  Click planet → show data card
        │  Speed slider → control time
        │  Filter buttons → show/hide planets
        │  Search input → highlight planet
        ▼
[DOM — Data Card]
        │  Display API data for selected planet
        │  Animated card reveal
        └─ Auto-refresh badge shows last fetch time
```

**Refresh Cycle:** API data refetched every 60 seconds. A visible "Last updated: X seconds ago" timer is displayed to make the dynamic refresh explicit for the rubric.

---

## 🖥️ Page Layout

```
┌─────────────────────────────────────────────────┐
│  HEADER: "Solar System Explorer" + refresh timer │
├────────────────────────┬────────────────────────┤
│                        │                        │
│   CANVAS               │   DATA PANEL           │
│   (orbital animation)  │   (planet info card)   │
│                        │                        │
│   • Sun at center      │   • Planet name        │
│   • 8 planets orbiting │   • Distance from Sun  │
│   • Click to select    │   • Orbital period     │
│   • Hover = name label │   • Rotation period    │
│                        │   • Radius / Mass      │
│                        │   • Temperature        │
│                        │   • Moon count         │
│                        │   • Gravity            │
├────────────────────────┴────────────────────────┤
│  CONTROLS: [Speed Slider] [Planet Filter Tabs]  │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Visual Style

**Theme:** Sci-fi / Dark Space  
**Background:** Deep space `#050a18` with subtle star field  
**Accent Color:** Electric cyan `#00d4ff` with glow effects  
**Planet Colors:** Unique per planet (see planets.js)  
**Font:** `Orbitron` (display) + `Share Tech Mono` (data) — Google Fonts  
**Effects:**
- CSS `filter: blur()` glow on planets and orbits
- Animated pulse on selected planet
- Fade-in data card on selection
- Subtle orbit trail opacity

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
--bg-deep: #050a18
--bg-card: #0a1628
--accent: #00d4ff
--accent-glow: rgba(0, 212, 255, 0.3)
--text-primary: #e8f4fd
--text-dim: #5a7a9a
--border: rgba(0, 212, 255, 0.15)
```

**Planet IDs in API** (use these for direct fetch):
```
mercury, venus, earth, mars, jupiter, saturn, uranus, neptune
```
