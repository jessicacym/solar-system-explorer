# 🪐 Solar System Explorer

**VDES39915 — Visualizing Information: Dynamic Data Models | Project 2**  
Sheridan College | Winter 2026

## Live Demo
👉 [View on GitHub Pages](#) ← replace with your URL after deploy

## About
An interactive solar system dashboard that fetches real-time planetary data from the Le Système Solaire open API and visualizes it as an animated orbital map with a dark sci-fi aesthetic.

## Features
- 🔄 **Dynamic data** — fetches from API on load, refreshes every 60 seconds
- 🪐 **Animated orbital map** — planets orbit the Sun at real relative speeds
- 🖱️ **Click to explore** — select any planet to view its full data card
- ⏱️ **Time control** — speed up or pause orbital animation
- 🔍 **Filter & search** — filter by inner/outer planets or search by name
- 📊 **Data panel** — distance, mass, temperature, gravity, moons and more

## Data Pipeline
```
Le Système Solaire API → JS Fetch → Data clean/transform → Canvas render → User interaction → Auto-refresh
```

## Tech Stack
- HTML5 Canvas (animation)
- Vanilla JavaScript (Fetch API, DOM)
- CSS3 (dark theme, glow effects)
- Le Système Solaire API (https://api.le-systeme-solaire.net)
- Google Fonts: Orbitron + Share Tech Mono

## How to Run Locally
Just open `index.html` in your browser — no build step required.

## How to Deploy (GitHub Pages)
1. Push this folder to a GitHub repository
2. Go to Settings → Pages → Source: main branch → /root
3. Your URL will be: `https://yourusername.github.io/solar-system-explorer/`

## File Structure
```
solar-system-explorer/
├── index.html    ← Page structure
├── style.css     ← Dark sci-fi styles
├── main.js       ← API fetch + Canvas animation + interactions
├── planets.js    ← Planet visual config + unit helpers
├── PLAN.md       ← Project planning document
└── README.md     ← This file
```

## AI Use Documentation
This project was planned and developed with assistance from **Claude (Anthropic)** via Claude.ai.  
Conversation covered: API selection, rubric analysis, data pipeline design, and code generation.  
All code reviewed and understood by the student. AI assistance documented per course academic integrity guidelines.

## Data Source
[Le Système Solaire](https://api.le-systeme-solaire.net) — Open Solar System Data API  
Free, no API key required, CORS-enabled.
