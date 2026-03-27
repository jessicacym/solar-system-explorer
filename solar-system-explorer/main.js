// ═══════════════════════════════════════════
// main.js — Solar System Explorer (Homepage only)
// Spiral galaxy with planets bound to arms
// API: Le Système Solaire (https://api.le-systeme-solaire.net)
// VDES39915 Project 2 | 2026
// ═══════════════════════════════════════════

// ─── Constants ───────────────────────────
const PLANET_IDS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];

// ─── State ────────────────────────────────
let planetData = [];
let lastFetchTime = null;
let selectedPlanet = null;
let positionData = {};  // keyed by planet name (French→English mapped)
let observerSettings = null; // { lat, lon, elev, zone, datetime }

// Pre-rendered layers
let nebulaLayer = null;
let bgLayer = null;

// Active particle spheres
let activeParticleSpheres = {};
let detailParticleSphere = null;


// ─── DOM Refs ─────────────────────────────
const canvas = document.getElementById("galaxy-canvas");
const ctx = canvas.getContext("2d");
const spheresContainer = document.getElementById("planet-spheres");
const detailPanel = document.getElementById("detail-panel");

// ─── Canvas Setup ─────────────────────────
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => {
  resizeCanvas();
  buildGalaxyLayers();
});
resizeCanvas();

// ─── Orbit radius: fit all planets on screen ───
// Neptune has orbitScale=1.0 (log-normalized). maxR = available radius / neptune scale.
function getMaxR() {
  const W = canvas.width;
  const H = canvas.height;
  const margin = 110;
  const neptuneScale = PLANET_CONFIG[PLANET_CONFIG.length - 1].orbitScale;
  return (Math.min(W, H) / 2 - margin) / neptuneScale;
}

// ─── Color utility ───────────────────────
function pickColor(roll) {
  if (roll < 0.35) return [210 + Math.random() * 30, 60 + Math.random() * 30, 55 + Math.random() * 30];
  if (roll < 0.55) return [180 + Math.random() * 20, 60 + Math.random() * 30, 50 + Math.random() * 25];
  if (roll < 0.72) return [255 + Math.random() * 30, 45 + Math.random() * 40, 40 + Math.random() * 25];
  if (roll < 0.85) return [310 + Math.random() * 30, 50 + Math.random() * 40, 40 + Math.random() * 25];
  return [200 + Math.random() * 40, 8 + Math.random() * 12, 80 + Math.random() * 20];
}

// ─── Build background + orbit ring layers (offscreen) ─────
function buildGalaxyLayers() {
  const W = canvas.width;
  const H = canvas.height;
  const maxR = getMaxR();

  // 1. Starfield background layer
  const bgC = document.createElement("canvas");
  bgC.width = W; bgC.height = H;
  const bgCtx = bgC.getContext("2d");

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const s = Math.random() * 1.2 + 0.3;
    const a = Math.random() * 0.5 + 0.1;
    bgCtx.beginPath();
    bgCtx.arc(x, y, s, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(200,210,240,${a})`;
    bgCtx.fill();
  }

  bgCtx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const [h, s, l] = pickColor(Math.random() * 0.85 + 0.15);
    const r = Math.random() * 4 + 1.5;
    const grad = bgCtx.createRadialGradient(x, y, 0, x, y, r * 2);
    grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${Math.random() * 0.25 + 0.08})`);
    grad.addColorStop(1, "transparent");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  }
  bgCtx.globalCompositeOperation = "source-over";
  bgLayer = bgC;

  // 2. Orbit rings layer — same size as viewport so center aligns exactly
  const nC = document.createElement("canvas");
  nC.width = W; nC.height = H;
  const nCtx = nC.getContext("2d");
  const ncx = W / 2;
  const ncy = H / 2;

  PLANET_CONFIG.forEach(config => {
    const orbitR = config.orbitScale * maxR;

    // Faint dust scatter around the orbit ring
    nCtx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 280; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radialJitter = (Math.random() - 0.5) * maxR * 0.032;
      const r = orbitR + radialJitter;
      const px = ncx + Math.cos(angle) * r;
      const py = ncy + Math.sin(angle) * r;
      const [h, s, l] = pickColor(Math.random());
      const size = Math.random() * 1.6 + 0.3;
      const alpha = (Math.random() * 0.28 + 0.06);
      const glowR = size * 2.2;
      const grad = nCtx.createRadialGradient(px, py, 0, px, py, glowR);
      grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${alpha})`);
      grad.addColorStop(1, "transparent");
      nCtx.fillStyle = grad;
      nCtx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
    }

    // Orbit ring line
    nCtx.globalCompositeOperation = "source-over";
    nCtx.beginPath();
    nCtx.arc(ncx, ncy, orbitR, 0, Math.PI * 2);
    nCtx.strokeStyle = "rgba(160, 185, 230, 0.22)";
    nCtx.lineWidth = 1.0;
    nCtx.stroke();
  });

  nebulaLayer = nC;
}

// ─── Draw frame ──────────────────────────
function drawGalaxy() {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = "rgba(9, 11, 17, 0.25)";
  ctx.fillRect(0, 0, W, H);

  if (bgLayer) {
    ctx.globalAlpha = 0.7;
    ctx.drawImage(bgLayer, 0, 0);
    ctx.globalAlpha = 1;
  }

  const glowR = Math.min(W, H) * 0.4;
  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g1.addColorStop(0, "rgba(40, 80, 180, 0.08)");
  g1.addColorStop(0.3, "rgba(60, 40, 140, 0.05)");
  g1.addColorStop(0.6, "rgba(40, 160, 160, 0.03)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  // Sun warm glow at center
  const sunGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.15);
  sunGlow.addColorStop(0, "rgba(255, 200, 80, 0.12)");
  sunGlow.addColorStop(0.5, "rgba(255, 120, 30, 0.05)");
  sunGlow.addColorStop(1, "transparent");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H);

  // Draw static orbit rings layer — same size as viewport, draw at (0,0)
  if (nebulaLayer) {
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(nebulaLayer, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  // Draw sun as glowing point on canvas
  drawSun();

  updatePlanetOrbitPositions();
  requestAnimationFrame(drawGalaxy);
}

// ─── Concentric orbit position calculator ─
// Each planet sits on its own circular orbit at a fixed angle.
// orbitAngle is stored per-planet and advances each frame.
const orbitAngles = {};

function initOrbitAngles() {
  // Spread planets evenly so they don't start clustered
  PLANET_CONFIG.forEach((config, i) => {
    orbitAngles[config.id] = (i / PLANET_CONFIG.length) * Math.PI * 2;
  });
}

function getOrbitScreenPos(config) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = getMaxR();
  const r = config.orbitScale * maxR;
  const angle = orbitAngles[config.id];
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

// ─── Orbital speed constants ─────────────
// Earth base speed (rad/frame). All planets scale relative to Earth's sideralOrbit.
const EARTH_ORBIT_DAYS = 365.26;
const EARTH_BASE_SPEED = 0.0008; // rad/frame for Earth
// Min speed so outer planets are always visibly moving (~15% of Earth speed)
const MIN_ORBIT_SPEED = EARTH_BASE_SPEED * 0.18;

function getOrbitSpeed(planetId) {
  // Prefer live planetData if loaded, else fall back to static data
  const live = planetData.find(p => p.id === planetId);
  const period = (live && live.orbitalPeriod) || PLANET_STATIC_DATA[planetId]?.sideralOrbit || EARTH_ORBIT_DAYS;
  const computed = EARTH_BASE_SPEED * (EARTH_ORBIT_DAYS / Math.abs(period));
  return Math.max(computed, MIN_ORBIT_SPEED);
}

// ─── Visibility: dim planets not above horizon ───
function applyVisibilityStyles() {
  // Only apply dimming if we have real position data from the API
  const hasData = Object.keys(positionData).length > 0;
  PLANET_CONFIG.forEach(config => {
    const el = spheresContainer.querySelector(`[data-planet="${config.id}"]`);
    if (!el) return;
    if (!hasData) {
      // No API data yet — show everything at full brightness
      el.classList.remove("below-horizon");
      el.classList.remove("above-horizon");
      el.style.opacity = "1";
      el.style.filter = "";
      const nameEl = el.querySelector(".sphere-name");
      if (nameEl) nameEl.style.color = "";
      const subEl = el.querySelector(".sphere-subtitle");
      if (subEl) subEl.style.color = "";
      return;
    }
    const pos = positionData[config.id];
    const visible = pos && !isNaN(parseFloat(pos.alt)) && parseFloat(pos.alt) >= 0;
    // Visible: boosted glow; below horizon: noticeably dimmed but not invisible
    el.classList.toggle("below-horizon", !visible);
    el.classList.toggle("above-horizon", visible);
    el.style.opacity = visible ? "1" : "0.45";
    el.style.filter = visible ? "brightness(1.1)" : "grayscale(0.5) brightness(0.7)";
    const nameEl = el.querySelector(".sphere-name");
    if (nameEl) nameEl.style.color = visible ? "" : "rgba(170,175,190,0.7)";
    const subEl = el.querySelector(".sphere-subtitle");
    if (subEl) subEl.style.color = visible ? "" : "rgba(140,145,160,0.6)";
  });
}

// ─── Local View ──────────────────────────
// Mirrors Sky & Telescope "Selected View": realistic horizon silhouette,
// planet size + brightness from NASA Horizons apparent magnitude (quantity 9).
const localViewCanvas = document.getElementById("local-view-canvas");
let _localViewScaled = false;
const LV_W = 520, LV_H = 220;

// Map apparent magnitude → { radius, glowRadius, alpha }
// Bright planets (Venus mag ~-4) get larger dots; dim ones (Neptune mag ~8) get small faint dots.
// Naked-eye limit ≈ mag 6. We clamp display to that range.
function magToVisual(mag) {
  if (mag === null || mag === undefined || !isFinite(mag)) mag = 2; // default if unavailable
  // Clamp to naked-eye range: -5 (Venus near max) to 6 (limit of human eye)
  const clamped = Math.max(-5, Math.min(6, mag));
  // t=1 at mag -5 (brightest), t=0 at mag 6 (dimmest)
  const t = 1 - (clamped + 5) / 11;
  // Smoothstep for perceptual curve — bright planets are much more prominent
  const ts = t * t * (3 - 2 * t);
  const radius = 1.0 + ts * 5.0;          // 1–6 px
  const glowR  = radius * (2.0 + ts * 2.0); // tighter for dim, wider for bright
  const alpha  = 0.35 + ts * 0.65;          // 0.35–1.0
  return { radius, glowR, alpha };
}

function drawLocalView() {
  if (!localViewCanvas) return;
  const lc = localViewCanvas.getContext("2d");
  const W = LV_W, H = LV_H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (!_localViewScaled) {
    localViewCanvas.width = W * dpr;
    localViewCanvas.height = H * dpr;
    localViewCanvas.style.width = W + "px";
    localViewCanvas.style.height = H + "px";
    lc.scale(dpr, dpr);
    _localViewScaled = true;
  }

  lc.clearRect(0, 0, W, H);

  // ── Sky gradient: pitch black at zenith, deep navy near horizon ──
  const skyGrad = lc.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0,    "#010306");
  skyGrad.addColorStop(0.5,  "#04101e");
  skyGrad.addColorStop(1,    "#0c1d35");
  lc.fillStyle = skyGrad;
  lc.fillRect(0, 0, W, H);

  const horizonY = H * 0.70;
  const skyH = horizonY;

  // ── Deterministic background star field ──
  const rng = (n) => Math.abs(Math.sin(n * 127.3 + 91.5));
  // Dim background stars
  for (let i = 0; i < 120; i++) {
    const sx = rng(i * 3.1) * W;
    const sy = rng(i * 7.7) * skyH * 0.95;
    const sa = rng(i * 13.3) * 0.28 + 0.05;
    const sr = rng(i * 5.9) * 0.55 + 0.15;
    lc.beginPath();
    lc.arc(sx, sy, sr, 0, Math.PI * 2);
    lc.fillStyle = `rgba(200,215,255,${sa})`;
    lc.fill();
  }
  // Brighter named stars
  for (let i = 0; i < 15; i++) {
    const sx = rng(i * 41.7 + 5) * W;
    const sy = rng(i * 19.3 + 2) * skyH * 0.88;
    const sr = rng(i * 3.7) * 0.8 + 0.6;
    const sa = rng(i * 8.1) * 0.35 + 0.3;
    lc.beginPath();
    lc.arc(sx, sy, sr, 0, Math.PI * 2);
    lc.fillStyle = `rgba(230,238,255,${sa})`;
    lc.fill();
    // tiny glow
    const sg = lc.createRadialGradient(sx, sy, 0, sx, sy, sr * 3);
    sg.addColorStop(0, `rgba(200,215,255,${sa * 0.4})`);
    sg.addColorStop(1, "transparent");
    lc.fillStyle = sg;
    lc.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  }

  // ── Ground fill ──
  lc.fillStyle = "#04060c";
  lc.fillRect(0, horizonY, W, H - horizonY);

  // ── Treeline silhouette (left 2/3 — natural landscape) ──
  lc.fillStyle = "#060910";
  lc.beginPath();
  lc.moveTo(0, horizonY);
  // Rolling tree canopy using triangular pine shapes approximated by curves
  const trees = [
    [8, 26], [24, 18], [40, 30], [55, 20], [70, 32], [88, 16],
    [105, 28], [118, 14], [135, 24], [150, 18], [165, 30], [180, 12],
    [195, 22], [210, 16], [225, 26], [240, 14], [255, 20], [270, 28],
    [285, 12], [300, 18], [315, 24], [330, 10],
  ];
  trees.forEach(([tx, th], idx) => {
    if (idx === 0) {
      lc.moveTo(tx - 10, horizonY);
    }
    // Pine triangle peak
    lc.lineTo(tx - 6, horizonY - th * 0.4);
    lc.lineTo(tx,     horizonY - th);
    lc.lineTo(tx + 6, horizonY - th * 0.4);
    lc.lineTo(tx + 10, horizonY);
  });
  lc.lineTo(340, horizonY);
  lc.lineTo(0, horizonY);
  lc.closePath();
  lc.fill();

  // ── Urban silhouette (right 1/3 — buildings + construction crane) ──
  lc.fillStyle = "#050810";
  // Buildings
  const bldgs = [
    {x:340, w:18, h:24}, {x:360, w:12, h:36}, {x:374, w:20, h:20},
    {x:396, w:10, h:30}, {x:408, w:16, h:16}, {x:426, w:22, h:26},
    {x:450, w:12, h:38}, {x:464, w:18, h:18}, {x:484, w:10, h:28},
    {x:496, w:24, h:22},
  ];
  bldgs.forEach(b => {
    lc.fillRect(b.x, horizonY - b.h, b.w, b.h + 4);
    // Antenna on tall buildings
    if (b.h >= 30) {
      lc.fillRect(b.x + b.w / 2 - 0.6, horizonY - b.h - 8, 1.2, 9);
    }
  });
  // Construction crane (iconic Sky & Telescope silhouette detail)
  const craneX = 455, craneBase = horizonY, craneH = 55;
  lc.fillRect(craneX - 1.5, craneBase - craneH, 3, craneH);       // mast
  lc.fillRect(craneX - 28, craneBase - craneH + 2, 44, 2.5);      // jib (horizontal arm)
  lc.fillRect(craneX + 14, craneBase - craneH + 2, 2, 18);        // counter-jib support
  lc.fillRect(craneX - 28, craneBase - craneH + 4, 1.5, 14);      // hook line

  // ── Atmospheric horizon glow ──
  const hGlow = lc.createLinearGradient(0, horizonY - 22, 0, horizonY + 4);
  hGlow.addColorStop(0, "rgba(30, 75, 160, 0.09)");
  hGlow.addColorStop(1, "transparent");
  lc.fillStyle = hGlow;
  lc.fillRect(0, horizonY - 22, W, 26);

  // ── Horizon line (very subtle) ──
  lc.beginPath();
  lc.moveTo(0, horizonY); lc.lineTo(W, horizonY);
  lc.strokeStyle = "rgba(50, 85, 150, 0.3)";
  lc.lineWidth = 0.5;
  lc.stroke();

  // ── No data state ──
  if (Object.keys(positionData).length === 0) {
    lc.font = "12px 'Instrument Sans',sans-serif";
    lc.fillStyle = "rgba(110,150,210,0.5)";
    lc.textAlign = "center";
    lc.textBaseline = "middle";
    lc.fillText("Enter your location to see visible planets", W / 2, skyH * 0.42);
    return;
  }

  // ── Check for any visible planet ──
  const hasVisible = PLANET_CONFIG.some(c => {
    const p = positionData[c.id];
    return p && !isNaN(parseFloat(p.alt)) && parseFloat(p.alt) >= 0;
  });
  if (!hasVisible) {
    lc.font = "11px 'Instrument Sans',sans-serif";
    lc.fillStyle = "rgba(100,135,195,0.42)";
    lc.textAlign = "center";
    lc.textBaseline = "middle";
    lc.fillText("No planets above the horizon right now", W / 2, skyH * 0.42);
  }

  // ── Draw planets above horizon, sized + brightened by apparent magnitude ──
  PLANET_CONFIG.forEach(config => {
    const pdata = positionData[config.id];
    if (!pdata) return;
    const alt = parseFloat(pdata.alt);
    const az  = parseFloat(pdata.az);
    if (isNaN(alt) || isNaN(az) || alt < 0) return;

    // Map az (0–360°) → x across canvas width
    // Map alt (0–90°) → y from horizonY up toward top
    const px = (az / 360) * W;
    const py = horizonY - (alt / 90) * (skyH - 20);
    const cx = Math.max(12, Math.min(W - 12, px));
    const cy = Math.max(16, Math.min(horizonY - 12, py));

    const { radius, glowR, alpha } = magToVisual(pdata.mag);

    // Atmospheric reddening: planets near horizon look warmer/redder
    const horizonTint = Math.max(0, 1 - alt / 12); // fades in below 12°

    // Outer coloured glow (planet tint from config color)
    const colorGlow = lc.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    const glowA = alpha * 0.5;
    colorGlow.addColorStop(0,   config.color + Math.min(255, Math.round(glowA * 255)).toString(16).padStart(2, "0"));
    colorGlow.addColorStop(0.6, config.color + "30");
    colorGlow.addColorStop(1,   "transparent");
    lc.fillStyle = colorGlow;
    lc.beginPath();
    lc.arc(cx, cy, glowR, 0, Math.PI * 2);
    lc.fill();

    // Warm horizon tint overlay for low-altitude planets
    if (horizonTint > 0.05) {
      const warmGlow = lc.createRadialGradient(cx, cy, 0, cx, cy, glowR * 0.75);
      warmGlow.addColorStop(0, `rgba(255,140,50,${horizonTint * alpha * 0.4})`);
      warmGlow.addColorStop(1, "transparent");
      lc.fillStyle = warmGlow;
      lc.beginPath();
      lc.arc(cx, cy, glowR * 0.75, 0, Math.PI * 2);
      lc.fill();
    }

    // White-hot core halo (how planets appear to the naked eye)
    const haloR = radius * 2.5;
    const coreGlow = lc.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    coreGlow.addColorStop(0,   `rgba(255,255,255,${alpha * 0.95})`);
    coreGlow.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.35})`);
    coreGlow.addColorStop(1,   "transparent");
    lc.fillStyle = coreGlow;
    lc.beginPath();
    lc.arc(cx, cy, haloR, 0, Math.PI * 2);
    lc.fill();

    // Solid planet point
    lc.beginPath();
    lc.arc(cx, cy, radius, 0, Math.PI * 2);
    lc.fillStyle = `rgba(255,255,255,${alpha})`;
    lc.fill();

    // Label: place above dot, edge-aware horizontal alignment
    const edgeLeft  = cx < 50;
    const edgeRight = cx > W - 50;
    const textAlign = edgeLeft ? "left" : edgeRight ? "right" : "center";
    const lx        = edgeLeft  ? cx + radius + 5
                    : edgeRight ? cx - radius - 5
                    : cx;

    lc.font = `600 ${radius >= 3.5 ? 9 : 8}px 'Instrument Sans',sans-serif`;
    lc.fillStyle = `rgba(210,230,255,${Math.min(1, alpha + 0.1)})`;
    lc.textAlign  = textAlign;
    lc.textBaseline = "bottom";
    lc.fillText(config.nameEN, lx, cy - radius - 3);

    // Magnitude badge only for bright planets (mag < 3) — shown below the dot
    if (pdata.mag !== null && pdata.mag < 3) {
      lc.font = "7px 'SF Mono','Fira Code',monospace";
      lc.fillStyle = `rgba(160,195,255,${alpha * 0.55})`;
      lc.textBaseline = "top";
      lc.fillText(`${pdata.mag >= 0 ? "+" : ""}${pdata.mag.toFixed(1)}`, lx, cy + radius + 3);
    }
  });
}

// ─── Update planet positions each frame ───
function updatePlanetOrbitPositions() {
  PLANET_CONFIG.forEach(config => {
    // Advance angle based on real orbital period relative to Earth
    orbitAngles[config.id] += getOrbitSpeed(config.id);

    const el = spheresContainer.querySelector(`[data-planet="${config.id}"]`);
    if (!el) return;
    const pos = getOrbitScreenPos(config);
    // Offset by half sphere size so the ball's center sits exactly on the orbit
    const half = (parseInt(el.dataset.sphereSize) || 80) / 2;
    el.style.left = (pos.x - half) + "px";
    el.style.top = (pos.y - half) + "px";
  });
  applyVisibilityStyles();
}

// ─── Sun: drawn directly on canvas as a glowing point ───
function drawSun() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Outer soft glow
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
  outerGlow.addColorStop(0, "rgba(255, 220, 80, 0.55)");
  outerGlow.addColorStop(0.3, "rgba(255, 160, 30, 0.25)");
  outerGlow.addColorStop(0.7, "rgba(255, 100, 10, 0.08)");
  outerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();

  // Bright core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 7);
  core.addColorStop(0, "rgba(255, 255, 230, 1)");
  core.addColorStop(0.4, "rgba(255, 220, 80, 0.95)");
  core.addColorStop(1, "rgba(255, 140, 20, 0.6)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Planet Spheres (on concentric orbits) ───
function createPlanetSpheres() {
  spheresContainer.innerHTML = "";
  Object.values(activeParticleSpheres).forEach(s => s.destroy());
  activeParticleSpheres = {};

  PLANET_CONFIG.forEach(config => {
    const sphere = document.createElement("div");
    sphere.className = "planet-sphere";
    sphere.dataset.planet = config.id;

    // Initial position — will be corrected each frame once sphereSize is stored
    const pos = getOrbitScreenPos(config);
    sphere.style.left = pos.x + "px";
    sphere.style.top = pos.y + "px";

    // Ball first — so div top = ball top, allowing precise center alignment
    const ballWrap = document.createElement("div");
    ballWrap.className = "sphere-ball-wrap";

    const PLANET_VISUAL_SIZES = { mercury:55, venus:75, earth:80, mars:65, jupiter:130, saturn:115, uranus:95, neptune:90 };
    const sphereSize = PLANET_VISUAL_SIZES[config.id] || 80;
    sphere.dataset.sphereSize = sphereSize;
    const { canvas: pCanvas, sphere: pSphere } = createPlanetParticleSphere(config.id, sphereSize, {
      particleCount: 600,
      particleSize: 0.9,
      glowIntensity: 0.5,
    });
    pCanvas.classList.add("sphere-ball");
    ballWrap.appendChild(pCanvas);
    sphere.appendChild(ballWrap);

    // Labels below the ball
    const name = document.createElement("span");
    name.className = "sphere-name";
    name.textContent = config.nameEN;
    sphere.appendChild(name);

    const subtitle = document.createElement("span");
    subtitle.className = "sphere-subtitle";
    subtitle.textContent = config.categoryLabel;
    sphere.appendChild(subtitle);

    sphere.addEventListener("click", () => {
      const planet = planetData.find(p => p.id === config.id) || config;
      openDetailPanel(planet);
    });

    spheresContainer.appendChild(sphere);
    pSphere.start();
    activeParticleSpheres[config.id] = pSphere;
  });
}

// ─── Color Helpers ────────────────────────
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
  const b = Math.min(255, (num & 0xFF) + percent);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - percent);
  const g = Math.max(0, ((num >> 8) & 0xFF) - percent);
  const b = Math.max(0, (num & 0xFF) - percent);
  return `rgb(${r},${g},${b})`;
}

// ─── Planet Stats Panel (comparison chart vs Earth) ─────────
const planetStatsPanel = document.getElementById("planet-stats");
const planetStatsBody  = document.getElementById("planet-stats-body");
const planetStatsVs    = document.getElementById("planet-stats-vs");

// Earth baseline from static data (always available)
const EARTH_BASELINE = PLANET_STATIC_DATA.earth;

function buildStatsPanel(planet) {
  if (!planet) { planetStatsPanel.style.display = "none"; return; }

  const earthRadius   = EARTH_BASELINE.meanRadius;          // 6371 km
  const earthMassV    = EARTH_BASELINE.mass.massValue;       // 5.97
  const earthMassE    = EARTH_BASELINE.mass.massExponent;    // 24
  const earthGravity  = EARTH_BASELINE.gravity;              // 9.8
  const earthTemp     = EARTH_BASELINE.avgTemp;              // 288 K
  const earthOrbit    = EARTH_BASELINE.sideralOrbit;         // 365.26 days
  const earthRotation = Math.abs(EARTH_BASELINE.sideralRotation); // 23.93 h
  const earthMoons    = 1;

  // Calculate ratios (log scale for extreme values)
  const stats = [
    {
      label: "Radius",
      value: planet.radiusKm ? UNITS.formatNumber(Math.round(planet.radiusKm)) + " km" : "N/A",
      ratio: planet.radiusKm ? planet.radiusKm / earthRadius : 0,
      earthRatio: 1,
      max: 12, // Jupiter ~11x
      color: planet.color || "#888",
    },
    {
      label: "Mass",
      value: UNITS.formatMass(planet.massValue, planet.massExponent),
      ratio: (planet.massValue && planet.massExponent) ? (planet.massValue * Math.pow(10, planet.massExponent)) / (earthMassV * Math.pow(10, earthMassE)) : 0,
      earthRatio: 1,
      max: 320, // Jupiter ~318x
      color: planet.color || "#888",
      logScale: true,
    },
    {
      label: "Gravity",
      value: planet.gravity ? planet.gravity + " m/s²" : "N/A",
      ratio: planet.gravity ? planet.gravity / earthGravity : 0,
      earthRatio: 1,
      max: 3, // Jupiter ~2.5x
      color: planet.color || "#888",
    },
    {
      label: "Temperature",
      value: planet.tempK ? UNITS.kelvinToCelsius(planet.tempK) + "°C" : "N/A",
      ratio: planet.tempK ? planet.tempK / earthTemp : 0,
      earthRatio: 1,
      max: 2.8, // Venus ~2.56x
      color: planet.tempK > earthTemp ? "#e06030" : "#4ac8e8",
    },
    {
      label: "Orbital Period",
      value: UNITS.formatPeriod(planet.orbitalPeriod),
      ratio: planet.orbitalPeriod ? planet.orbitalPeriod / earthOrbit : 0,
      earthRatio: 1,
      max: 180, // Neptune ~165x
      color: planet.color || "#888",
      logScale: true,
    },
    {
      label: "Day Length",
      value: planet.rotationPeriod ? Math.abs(planet.rotationPeriod).toFixed(1) + " h" : "N/A",
      ratio: planet.rotationPeriod ? Math.abs(planet.rotationPeriod) / earthRotation : 0,
      earthRatio: 1,
      max: 250, // Venus ~244x
      color: planet.color || "#888",
      logScale: true,
    },
    {
      label: "Moons",
      value: planet.moonCount !== undefined ? String(planet.moonCount) : "N/A",
      ratio: planet.moonCount || 0,
      earthRatio: earthMoons,
      max: 150,
      color: planet.color || "#888",
      logScale: true,
      discrete: true,
    },
  ];

  planetStatsVs.textContent = planet.id === "earth" ? "baseline" : "vs Earth";

  planetStatsBody.innerHTML = stats.map(s => {
    if (!s.ratio && s.ratio !== 0) return "";
    // For log scale: use log to compress extreme ranges
    const useLog = s.logScale && s.max > 10;
    const pct = useLog
      ? Math.min(100, (Math.log(s.ratio + 1) / Math.log(s.max + 1)) * 100)
      : Math.min(100, (s.ratio / s.max) * 100);
    const earthPct = useLog
      ? Math.min(100, (Math.log(s.earthRatio + 1) / Math.log(s.max + 1)) * 100)
      : Math.min(100, (s.earthRatio / s.max) * 100);

    const earthMarker = planet.id === "earth" ? "" :
      `<span class="stat-bar-earth" style="left:${earthPct}%"></span>`;

    return `<div class="stat-row">
      <div class="stat-row-top">
        <span class="stat-label">${s.label}</span>
        <span class="stat-value">${s.value}</span>
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:${pct}%;background:${s.color};opacity:0.7;"></div>
        ${earthMarker}
      </div>
    </div>`;
  }).join("");

  planetStatsPanel.style.display = "";
}

// ─── Sky Radar Chart ─────────────────────────
const skyRadarCanvas = document.getElementById("sky-radar-canvas");
const skyRadarCtx = skyRadarCanvas.getContext("2d");
const skyRadarEl = document.getElementById("sky-radar");
let _radarAnimId = null;
let _radarHighlight = null;

// Planet color map (matches PLANET_CONFIG)
const PLANET_COLORS = {};
PLANET_CONFIG.forEach(c => { PLANET_COLORS[c.id] = c.color; });

// Short names for labels
const PLANET_SHORT = {
  mercury: "Mercury", venus: "Venus", earth: "Earth", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune",
};

function drawSkyRadar() {
  if (_radarAnimId) cancelAnimationFrame(_radarAnimId);
  skyRadarEl.style.display = "";

  const W = skyRadarCanvas.width;   // 560 (2x for retina)
  const H = skyRadarCanvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = (Math.min(W, H) / 2) - 40; // chart radius, leave margin for labels

  const hasData = Object.keys(positionData).length > 0;

  function render() {
    const t = performance.now();
    skyRadarCtx.clearRect(0, 0, W, H);

    // ── Background ──
    const bgGrad = skyRadarCtx.createRadialGradient(cx, cy, 0, cx, cy, R + 30);
    bgGrad.addColorStop(0, "rgba(8, 14, 28, 0.95)");
    bgGrad.addColorStop(1, "rgba(4, 6, 14, 0.98)");
    skyRadarCtx.fillStyle = bgGrad;
    skyRadarCtx.fillRect(0, 0, W, H);

    // ── Grid rings (0°=edge/horizon, 90°=center/zenith) ──
    // Rings at 0°, 30°, 60°, 90° altitude
    const altitudes = [0, 30, 60, 90];
    altitudes.forEach(alt => {
      const r = R * (1 - alt / 90);
      skyRadarCtx.beginPath();
      skyRadarCtx.arc(cx, cy, r, 0, Math.PI * 2);
      skyRadarCtx.strokeStyle = alt === 0
        ? "rgba(80, 130, 200, 0.25)"
        : "rgba(60, 100, 160, 0.1)";
      skyRadarCtx.lineWidth = alt === 0 ? 1.5 : 0.8;
      skyRadarCtx.stroke();

      // Altitude labels
      if (alt > 0 && alt < 90) {
        skyRadarCtx.font = "600 16px 'SF Mono', 'Consolas', monospace";
        skyRadarCtx.fillStyle = "rgba(100, 140, 200, 0.25)";
        skyRadarCtx.textAlign = "left";
        skyRadarCtx.textBaseline = "middle";
        skyRadarCtx.fillText(`${alt}°`, cx + 4, cy - r + 2);
      }
    });

    // ── Cross-hairs (N-S, E-W lines) ──
    skyRadarCtx.strokeStyle = "rgba(60, 100, 160, 0.08)";
    skyRadarCtx.lineWidth = 0.8;
    // Vertical (N-S)
    skyRadarCtx.beginPath();
    skyRadarCtx.moveTo(cx, cy - R); skyRadarCtx.lineTo(cx, cy + R);
    skyRadarCtx.stroke();
    // Horizontal (E-W)
    skyRadarCtx.beginPath();
    skyRadarCtx.moveTo(cx - R, cy); skyRadarCtx.lineTo(cx + R, cy);
    skyRadarCtx.stroke();

    // ── Cardinal direction labels ──
    // Sky chart convention: N=top, E=left (mirror of map), S=bottom, W=right
    const cardinals = [
      { label: "N", angle: -Math.PI / 2 },
      { label: "E", angle: Math.PI },      // East on left in sky view
      { label: "S", angle: Math.PI / 2 },
      { label: "W", angle: 0 },            // West on right in sky view
    ];
    skyRadarCtx.font = "700 20px 'SF Mono', 'Consolas', monospace";
    skyRadarCtx.textAlign = "center";
    skyRadarCtx.textBaseline = "middle";
    cardinals.forEach(c => {
      const lx = cx + (R + 22) * Math.cos(c.angle);
      const ly = cy + (R + 22) * Math.sin(c.angle);
      skyRadarCtx.fillStyle = c.label === "N"
        ? "rgba(220, 120, 100, 0.7)"
        : "rgba(120, 160, 210, 0.45)";
      skyRadarCtx.fillText(c.label, lx, ly);
    });

    // ── Zenith marker ──
    skyRadarCtx.beginPath();
    skyRadarCtx.arc(cx, cy, 3, 0, Math.PI * 2);
    skyRadarCtx.fillStyle = "rgba(100, 150, 220, 0.3)";
    skyRadarCtx.fill();

    // ── Horizon ring glow ──
    skyRadarCtx.beginPath();
    skyRadarCtx.arc(cx, cy, R, 0, Math.PI * 2);
    skyRadarCtx.strokeStyle = "rgba(80, 140, 220, 0.12)";
    skyRadarCtx.lineWidth = 4;
    skyRadarCtx.stroke();

    // ── Plot planets ──
    if (hasData) {
      // Below-horizon first (so above-horizon draws on top)
      const sorted = PLANET_IDS.filter(id => id !== "earth").map(id => {
        const pos = positionData[id];
        if (!pos) return null;
        const az = parseFloat(pos.az);
        const alt = parseFloat(pos.alt);
        return { id, az, alt, visible: alt >= 0 };
      }).filter(Boolean);

      // Sort: below-horizon first, then above-horizon
      sorted.sort((a, b) => (a.visible === b.visible ? 0 : a.visible ? 1 : -1));

      sorted.forEach(p => {
        const color = PLANET_COLORS[p.id] || "#888";
        const isHighlight = p.id === _radarHighlight;

        // Convert AZ/ALT to x,y
        // AZ: 0°=N, 90°=E, 180°=S, 270°=W (clockwise from north)
        // Sky chart: N=top, E=left (mirrored)
        // Angle from top, clockwise, but E goes left → negate horizontal
        const azRad = (p.az - 90) * Math.PI / 180; // shift so 0°=right
        // In sky chart East is on left, so mirror: use -azRad for x
        const altClamped = Math.max(-90, Math.min(90, p.alt));
        const dist = p.visible
          ? R * (1 - altClamped / 90) // above horizon: 0° at edge, 90° at center
          : R + R * Math.min(Math.abs(altClamped) / 90, 1) * 0.22; // below horizon: slightly outside

        // N=top: az 0° → up (negative y)
        // Sky chart mirror: E(90°) is left
        const px = cx - dist * Math.sin(azRad + Math.PI / 2);
        const py = cy - dist * Math.cos(azRad + Math.PI / 2);

        // Planet dot
        const baseSize = isHighlight ? 9 : 6;

        if (!p.visible) {
          // ── Below horizon: blinking ghost ──
          const blink = 0.3 + 0.3 * Math.sin(t / 600 + p.az);
          skyRadarCtx.globalAlpha = blink;

          // Dashed circle outline
          skyRadarCtx.beginPath();
          skyRadarCtx.arc(px, py, baseSize + 2, 0, Math.PI * 2);
          skyRadarCtx.strokeStyle = color;
          skyRadarCtx.lineWidth = 1;
          skyRadarCtx.setLineDash([3, 3]);
          skyRadarCtx.stroke();
          skyRadarCtx.setLineDash([]);

          // Dim dot
          skyRadarCtx.beginPath();
          skyRadarCtx.arc(px, py, baseSize * 0.6, 0, Math.PI * 2);
          skyRadarCtx.fillStyle = color;
          skyRadarCtx.fill();

          // Label
          skyRadarCtx.font = "500 14px 'SF Mono', 'Consolas', monospace";
          skyRadarCtx.fillStyle = color;
          skyRadarCtx.textAlign = "center";
          skyRadarCtx.textBaseline = "bottom";
          skyRadarCtx.fillText(PLANET_SHORT[p.id], px, py - baseSize - 5);

          skyRadarCtx.globalAlpha = 1;
        } else {
          // ── Above horizon: bright solid dot with glow ──
          skyRadarCtx.globalAlpha = 1;

          // Glow
          const glow = skyRadarCtx.createRadialGradient(px, py, 0, px, py, baseSize * 3);
          glow.addColorStop(0, color + "60");
          glow.addColorStop(1, color + "00");
          skyRadarCtx.fillStyle = glow;
          skyRadarCtx.beginPath();
          skyRadarCtx.arc(px, py, baseSize * 3, 0, Math.PI * 2);
          skyRadarCtx.fill();

          // Solid dot
          skyRadarCtx.beginPath();
          skyRadarCtx.arc(px, py, baseSize, 0, Math.PI * 2);
          skyRadarCtx.fillStyle = color;
          skyRadarCtx.fill();

          // Bright core
          skyRadarCtx.beginPath();
          skyRadarCtx.arc(px, py, baseSize * 0.4, 0, Math.PI * 2);
          skyRadarCtx.fillStyle = "#fff";
          skyRadarCtx.globalAlpha = 0.7;
          skyRadarCtx.fill();
          skyRadarCtx.globalAlpha = 1;

          // Highlight ring for selected planet
          if (isHighlight) {
            skyRadarCtx.beginPath();
            skyRadarCtx.arc(px, py, baseSize + 5, 0, Math.PI * 2);
            skyRadarCtx.strokeStyle = "#fff";
            skyRadarCtx.lineWidth = 1.2;
            skyRadarCtx.globalAlpha = 0.4 + 0.2 * Math.sin(t / 400);
            skyRadarCtx.stroke();
            skyRadarCtx.globalAlpha = 1;
          }

          // Label
          skyRadarCtx.font = isHighlight
            ? "700 15px 'SF Mono', 'Consolas', monospace"
            : "500 14px 'SF Mono', 'Consolas', monospace";
          skyRadarCtx.fillStyle = isHighlight ? "#fff" : color;
          skyRadarCtx.textAlign = "center";
          skyRadarCtx.textBaseline = "bottom";
          skyRadarCtx.fillText(PLANET_SHORT[p.id], px, py - baseSize - 5);
        }
      });
    } else {
      // No data state
      skyRadarCtx.font = "500 18px 'Instrument Sans', sans-serif";
      skyRadarCtx.fillStyle = "rgba(120, 150, 200, 0.3)";
      skyRadarCtx.textAlign = "center";
      skyRadarCtx.textBaseline = "middle";
      skyRadarCtx.fillText("Awaiting position data…", cx, cy);
    }

    _radarAnimId = requestAnimationFrame(render);
  }

  render();
}

function stopSkyRadar() {
  if (_radarAnimId) {
    cancelAnimationFrame(_radarAnimId);
    _radarAnimId = null;
  }
}

// ─── Detail Panel ─────────────────────────
function openDetailPanel(planet) {
  selectedPlanet = planet.id;

  if (detailParticleSphere) {
    detailParticleSphere.destroy();
    detailParticleSphere = null;
  }

  const detailDotContainer = document.getElementById("detail-dot");
  detailDotContainer.innerHTML = "";
  const detailSize = 72;
  const { canvas: detailCanvas, sphere: dSphere } = createPlanetParticleSphere(planet.id, detailSize, {
    particleCount: 400,
    particleSize: 0.7,
    glowIntensity: 0.5,
  });
  detailDotContainer.appendChild(detailCanvas);
  dSphere.start();
  detailParticleSphere = dSphere;

  document.getElementById("detail-name").textContent = planet.nameEN;
  document.getElementById("detail-cn").textContent = planet.nameCN;
  document.getElementById("detail-tagline").textContent = planet.tagline || "";

  // Format Earth distance
  const earthDistText = planet.id === "earth"
    ? "—"
    : planet.distEarthAU
      ? `${planet.distEarthAU} AU (${UNITS.formatNumber(planet.distEarthKm)} km)`
      : "N/A";

  // Position data from positions API
  const pos = positionData[planet.id];
  const posHTML = pos ? `
    <div class="detail-item" style="border-color: rgba(130,80,255,0.3);">
      <span class="detail-item-label">Right Ascension (RA)</span>
      <span class="detail-item-value" style="color: #a07af0;">${pos.ra}</span>
    </div>
    <div class="detail-item" style="border-color: rgba(130,80,255,0.3);">
      <span class="detail-item-label">Declination (DEC)</span>
      <span class="detail-item-value" style="color: #a07af0;">${pos.dec}</span>
    </div>
    <div class="detail-item" style="border-color: rgba(130,80,255,0.3);">
      <span class="detail-item-label">Azimuth (AZ)</span>
      <span class="detail-item-value" style="color: #a07af0;">${pos.az}</span>
    </div>
    <div class="detail-item" style="border-color: rgba(130,80,255,0.3);">
      <span class="detail-item-label">Altitude (ALT)</span>
      <span class="detail-item-value" style="color: ${parseFloat(pos.alt) >= 0 ? '#4ade80' : '#e06030'};">${pos.alt}${parseFloat(pos.alt) >= 0 ? ' (visible)' : ' (below horizon)'}</span>
    </div>
  ` : '';

  // Build stats chart panel (top-left)
  buildStatsPanel(planet);

  // Sidebar: only show position/distance data (physical stats moved to chart)
  const grid = document.getElementById("detail-grid");
  grid.innerHTML = `
    <div class="detail-item" style="border-color: rgba(74,158,255,0.3);">
      <span class="detail-item-label">Current Distance from Earth</span>
      <span class="detail-item-value" style="color: #4a9eff;">${earthDistText}</span>
    </div>
    ${posHTML}
    <div class="detail-item">
      <span class="detail-item-label">Distance from Sun</span>
      <span class="detail-item-value">${planet.distanceAU || "—"} AU (${UNITS.formatNumber(planet.distanceKm)} km)</span>
    </div>
    <div class="detail-item" style="border-color: rgba(255,255,255,0.05);">
      <span class="detail-item-label">Data Source</span>
      <span class="detail-item-value" style="font-size:11px; color: var(--text-dim);">${planet._source === "API" ? "Le Système Solaire API (live)" : "Static fallback data"} + NASA Horizons</span>
    </div>
  `;

  // Update radar highlight to this planet
  _radarHighlight = planet.id;

  detailPanel.hidden = false;
  detailPanel.offsetHeight;
  detailPanel.classList.add("open");
}

function closeDetailPanel() {
  detailPanel.classList.remove("open");
  planetStatsPanel.style.display = "none";
  _radarHighlight = null;
  setTimeout(() => {
    detailPanel.hidden = true;
  }, 400);
  selectedPlanet = null;
  if (detailParticleSphere) {
    detailParticleSphere.destroy();
    detailParticleSphere = null;
  }
}

document.getElementById("detail-close").addEventListener("click", closeDetailPanel);

document.addEventListener("click", (e) => {
  if (detailPanel.classList.contains("open") &&
      !detailPanel.contains(e.target) &&
      !e.target.closest(".planet-sphere")) {
    closeDetailPanel();
  }
});

// ─── NASA JPL Horizons API (via Vercel proxy) ───
// On Vercel: calls /api/horizons (serverless function, no CORS)
// On localhost: tries NASA direct, then falls back to CORS proxies
const IS_LOCAL = window.location.hostname === "127.0.0.1"
  || window.location.hostname === "localhost";

const HORIZONS_API = IS_LOCAL
  ? "https://ssd.jpl.nasa.gov/api/horizons.api"  // direct (local dev)
  : "/api/horizons";                              // Vercel proxy (production)

const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

const HORIZONS_CODES = {
  mercury: "199", venus: "299", earth: "399",
  mars: "499", jupiter: "599", saturn: "699",
  uranus: "799", neptune: "899",
};

async function fetchHorizonsData(planetId, lat, lon, elev, datetime) {
  if (planetId === "earth") {
    return { ra: "—", dec: "—", az: "—", alt: "—", distEarthAU: 0, distEarthKm: 0 };
  }

  const code = HORIZONS_CODES[planetId];
  const startDate = new Date(datetime.replace(" ", "T") + "Z");
  const stopDate  = new Date(startDate.getTime() + 86400000);
  const stopTime  = stopDate.toISOString().slice(0, 10);
  const elevKm    = (elev / 1000).toFixed(3);

  const params = new URLSearchParams({
    format:     "json",
    COMMAND:    `'${code}'`,
    CENTER:     "'coord@399'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${lon},${lat},${elevKm}'`,
    EPHEM_TYPE: "'OBSERVER'",
    START_TIME: `'${datetime}'`,
    STOP_TIME:  `'${stopTime}'`,
    STEP_SIZE:  "'1 d'",
    QUANTITIES: "'1,4,9,20'",
    MAKE_EPHEM: "'YES'",
  });

  const directUrl = `${HORIZONS_API}?${params.toString()}`;

  // Try direct first, then CORS proxies if on localhost
  const attempts = [directUrl];
  if (IS_LOCAL) {
    const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    CORS_PROXIES.forEach(proxy => attempts.push(proxy + encodeURIComponent(nasaUrl)));
  }

  let response;
  for (const url of attempts) {
    try {
      response = await fetch(url);
      if (response.ok) break;
    } catch (e) {
      continue;
    }
  }
  if (!response || !response.ok) throw new Error("All fetch attempts failed (CORS)");

  const data  = await response.json();
  const text  = data.result;
  const soe   = text.indexOf("$$SOE");
  const eoe   = text.indexOf("$$EOE");
  if (soe === -1) throw new Error("No ephemeris data for " + planetId);

  const line  = text.substring(soe + 5, eoe).trim().split("\n")[0].trim();
  const parts = line.split(/\s+/);

  // Debug: log parts to find actual column positions
  console.log(`Horizons raw parts for ${planetId}:`, parts);

  // Horizons QUANTITIES 1,4,9,20 — RA/DEC in hms/dms, then Az/El, APmag, S-brt, delta
  // [0]=date [1]=time [2-4]=RA hh mm ss.ss [5-7]=DEC ±dd mm ss.s
  // But DEC sign may merge with degrees: "+18 09 25.7" → parts[5]="+18"
  // Safe extraction: find Az/El/mag by scanning for the numeric Az column
  // Az is always in range 0–360, Alt in -90 to 90, after the DEC fields
  const ra  = `${parts[2]} ${parts[3]} ${parts[4]}`;

  // DEC: parts[5] may be "+18" or "-05", parts[6]=mm, parts[7]=ss
  const dec = `${parts[5]} ${parts[6]} ${parts[7]}`;

  // Find Az/Alt: scan from parts[8] onward for first value in 0–360 range
  let azIdx = -1;
  for (let i = 8; i < parts.length - 1; i++) {
    const v = parseFloat(parts[i]);
    const v2 = parseFloat(parts[i + 1]);
    // Az is 0–360, Alt is -90 to 90, and they appear consecutively
    if (!isNaN(v) && v >= 0 && v <= 360 && !isNaN(v2) && v2 >= -90 && v2 <= 90) {
      azIdx = i;
      break;
    }
  }
  if (azIdx === -1) throw new Error(`Cannot find Az/Alt columns for ${planetId}. parts=${JSON.stringify(parts)}`);

  const azVal  = parseFloat(parts[azIdx]);
  const altVal = parseFloat(parts[azIdx + 1]);
  const magVal = parseFloat(parts[azIdx + 2]);   // APmag immediately after Alt
  // delta (AU) is a few columns later — find first value > 0.1 after mag
  let deltaAU = NaN;
  for (let i = azIdx + 3; i < parts.length; i++) {
    const v = parseFloat(parts[i]);
    if (!isNaN(v) && v > 0.1 && v < 100) { deltaAU = v; break; }
  }
  if (isNaN(deltaAU)) deltaAU = 1;

  const az  = azVal.toFixed(4) + "°";
  const alt = altVal.toFixed(4) + "°";
  const mag = isNaN(magVal) ? null : magVal;

  return {
    ra, dec, az, alt,
    mag,
    distEarthAU: deltaAU.toFixed(5),
    distEarthKm: Math.round(deltaAU * 149597870.7),
  };
}

// ─── Load physical data: planets-api.json (API) → PLANET_STATIC_DATA (fallback) ───
let apiPlanetCache = null; // cached API data from planets-api.json

async function loadApiPlanetData() {
  if (apiPlanetCache) return apiPlanetCache;
  try {
    const resp = await fetch("planets-api.json");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    apiPlanetCache = data.planets;
    console.log(`Loaded API planet data (fetched at ${data._fetchedAt})`);
    return apiPlanetCache;
  } catch (err) {
    console.warn("planets-api.json not available, using static fallback:", err.message);
    return null;
  }
}

// ─── Build planet data from API JSON + Horizons live data ───
async function fetchAllData(lat, lon, elev, zone, datetime) {
  // 1. Physical data: try API JSON first, fallback to static
  const apiData = await loadApiPlanetData();
  planetData = PLANET_IDS.map((id, i) => {
    const config = PLANET_CONFIG[i];
    const d = (apiData && apiData[id]) ? apiData[id] : (PLANET_STATIC_DATA[id] || {});
    return {
      ...config,
      distanceKm:     d.semimajorAxis || 0,
      distanceAU:     UNITS.kmToAU(d.semimajorAxis),
      orbitalPeriod:  d.sideralOrbit  || 0,
      rotationPeriod: d.sideralRotation || 0,
      radiusKm:       d.meanRadius    || 0,
      massValue:      d.mass?.massValue,
      massExponent:   d.mass?.massExponent,
      tempK:          d.avgTemp       || null,
      gravity:        d.gravity       || null,
      moonCount:      d.moons?.length || 0,
      distEarthAU:    null,
      distEarthKm:    null,
      _source:        (apiData && apiData[id]) ? "API" : "static",
    };
  });

  // 2. Fetch real-time positions + distances from NASA Horizons (parallel)
  const results = await Promise.all(
    PLANET_IDS.map(id => fetchHorizonsData(id, lat, lon, elev, datetime).catch(err => {
      console.warn(`Horizons failed for ${id}:`, err.message);
      return null;
    }))
  );

  results.forEach((r, i) => {
    if (!r) return;
    planetData[i].distEarthAU = r.distEarthAU;
    planetData[i].distEarthKm = r.distEarthKm;
    positionData[PLANET_IDS[i]] = { ra: r.ra, dec: r.dec, az: r.az, alt: r.alt, mag: r.mag };
  });

  lastFetchTime = Date.now();
  console.log("All data loaded:", planetData, positionData);
}

// ─── Positions API (Le Système Solaire /rest/positions) ───
// ─── Settings Form Logic ─────────────────
const settingsOverlay = document.getElementById("settings-overlay");
const settingsForm = document.getElementById("settings-form");
const settingsStatus = document.getElementById("settings-status");
const btnNow = document.getElementById("btn-now");
const btnLocate = document.getElementById("btn-locate");
const btnCalculate = document.getElementById("btn-calculate");
const recalcBtn = document.getElementById("recalc-btn");
const bottomBar = document.getElementById("bottom-bar");
const refreshLabel = document.getElementById("refresh-label");
const REFRESH_INTERVAL_MS = 15000;
let refreshTimerId = null;
let refreshCounterId = null;

// "Now" button — fill current UTC datetime
btnNow.addEventListener("click", () => {
  const now = new Date();
  // Format as yyyy-MM-ddTHH:mm
  const iso = now.toISOString().slice(0, 16);
  document.getElementById("obs-datetime").value = iso;
  // Auto-detect timezone offset
  const offset = -now.getTimezoneOffset() / 60;
  document.getElementById("obs-zone").value = Math.round(offset);
});

// "Use My Location" button — geolocation
btnLocate.addEventListener("click", () => {
  if (!navigator.geolocation) {
    settingsStatus.textContent = "Geolocation not supported by your browser.";
    settingsStatus.className = "settings-status error";
    return;
  }
  settingsStatus.textContent = "Getting location...";
  settingsStatus.className = "settings-status";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById("obs-lat").value = pos.coords.latitude.toFixed(6);
      document.getElementById("obs-lon").value = pos.coords.longitude.toFixed(6);
      if (pos.coords.altitude) {
        document.getElementById("obs-elev").value = Math.round(pos.coords.altitude);
      }
      settingsStatus.textContent = "Location detected!";
      settingsStatus.className = "settings-status success";
    },
    (err) => {
      settingsStatus.textContent = "Location access denied. Please enter manually.";
      settingsStatus.className = "settings-status error";
    }
  );
});

// ─── "Last updated X seconds ago" counter ───
function updateRefreshLabel() {
  if (!lastFetchTime) return;
  const sec = Math.floor((Date.now() - lastFetchTime) / 1000);
  if (sec < 5) refreshLabel.textContent = "Updated just now";
  else if (sec < 60) refreshLabel.textContent = `Updated ${sec}s ago`;
  else refreshLabel.textContent = `Updated ${Math.floor(sec / 60)}m ${sec % 60}s ago`;
}

// ─── Auto-refresh: re-fetch every 60s with current settings ───
async function autoRefresh() {
  if (!observerSettings) return;
  const { lat, lon, elev, zone } = observerSettings;
  // Use current real time for refresh (not the original form time)
  const now = new Date();
  const datetime = now.toISOString().slice(0, 19);
  try {
    await fetchAllData(lat, lon, elev, zone, datetime);
    drawLocalView();
    console.log("Auto-refresh complete");
  } catch (err) {
    console.warn("Auto-refresh failed:", err.message);
  }
}

function startRefreshCycle() {
  // Clear previous timers
  if (refreshTimerId) clearInterval(refreshTimerId);
  if (refreshCounterId) clearInterval(refreshCounterId);
  // Update label every second
  refreshCounterId = setInterval(updateRefreshLabel, 1000);
  // Re-fetch API every 60 seconds
  refreshTimerId = setInterval(autoRefresh, REFRESH_INTERVAL_MS);
}

// ─── Show galaxy view (called after successful data load) ───
function showGalaxyView() {
  settingsOverlay.classList.add("hidden");
  spheresContainer.style.display = "";
  bottomBar.style.display = "";
  const localView = document.getElementById("local-view");
  if (localView) localView.style.display = "";
  if (observerSettings) {
    const coordEl = document.getElementById("local-view-coords");
    if (coordEl) {
      const latStr = observerSettings.lat >= 0
        ? observerSettings.lat.toFixed(2) + "°N"
        : Math.abs(observerSettings.lat).toFixed(2) + "°S";
      const lonStr = observerSettings.lon >= 0
        ? observerSettings.lon.toFixed(2) + "°E"
        : Math.abs(observerSettings.lon).toFixed(2) + "°W";
      coordEl.textContent = `${latStr}  ${lonStr}`;
    }
  }
  drawLocalView();
  drawSkyRadar();
  startRefreshCycle();
}

// Form submit — calculate positions
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const lat = parseFloat(document.getElementById("obs-lat").value);
  const lon = parseFloat(document.getElementById("obs-lon").value);
  const elev = parseInt(document.getElementById("obs-elev").value);
  const zone = parseInt(document.getElementById("obs-zone").value);
  const datetimeRaw = document.getElementById("obs-datetime").value;
  const datetime = datetimeRaw.length === 16 ? datetimeRaw + ":00" : datetimeRaw;

  observerSettings = { lat, lon, elev, zone, datetime };

  settingsStatus.textContent = "Calculating positions...";
  settingsStatus.className = "settings-status";
  btnCalculate.disabled = true;
  btnCalculate.textContent = "Loading...";

  try {
    await fetchAllData(lat, lon, elev, zone, datetime);
    drawLocalView();

    const hasPositions = Object.keys(positionData).length > 0;
    settingsStatus.textContent = hasPositions
      ? "Done! Real-time positions loaded."
      : "Positions unavailable (CORS). Showing physical data only.";
    settingsStatus.className = hasPositions ? "settings-status success" : "settings-status";

    setTimeout(showGalaxyView, 500);
  } catch (err) {
    settingsStatus.textContent = "API error — showing cached data. " + err.message;
    settingsStatus.className = "settings-status error";
    setTimeout(showGalaxyView, 1500);
  }

  btnCalculate.disabled = false;
  btnCalculate.textContent = "Calculate Positions";
});

// Recalculate button — reopen settings
recalcBtn.addEventListener("click", () => {
  settingsOverlay.classList.remove("hidden");
  settingsStatus.textContent = "";
});

// ─── Init ─────────────────────────────────
function init() {
  initOrbitAngles();
  buildGalaxyLayers();
  createPlanetSpheres();
  requestAnimationFrame(drawGalaxy);
  btnNow.click();
}

init();
