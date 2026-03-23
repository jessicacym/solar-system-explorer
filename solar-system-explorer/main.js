// ═══════════════════════════════════════════
// main.js — Solar System Explorer (Homepage only)
// Spiral galaxy with planets bound to arms
// API: Le Système Solaire (https://api.le-systeme-solaire.net)
// VDES39915 Project 2 | 2026
// ═══════════════════════════════════════════

// ─── Constants ───────────────────────────
const PLANET_IDS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const SPIRAL_ARMS = 2;
const SPIRAL_TURNS = 3.2;

// ─── State ────────────────────────────────
let planetData = [];
let lastFetchTime = null;
let spiralRotation = 0;
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

// ─── Spiral maxR: fit all planets on screen ───
// The outermost planet (Neptune) has orbitScale=0.96.
// Its spiral position must stay within the viewport with margin.
// We compute maxR so that the furthest spiral point fits.
function getMaxR() {
  const W = canvas.width;
  const H = canvas.height;
  const margin = 100;
  return ((Math.min(W, H) / 2 - margin) / 0.96) * 1.5;
}

// ─── Color utility ───────────────────────
function pickColor(roll) {
  if (roll < 0.35) return [210 + Math.random() * 30, 60 + Math.random() * 30, 55 + Math.random() * 30];
  if (roll < 0.55) return [180 + Math.random() * 20, 60 + Math.random() * 30, 50 + Math.random() * 25];
  if (roll < 0.72) return [255 + Math.random() * 30, 45 + Math.random() * 40, 40 + Math.random() * 25];
  if (roll < 0.85) return [310 + Math.random() * 30, 50 + Math.random() * 40, 40 + Math.random() * 25];
  return [200 + Math.random() * 40, 8 + Math.random() * 12, 80 + Math.random() * 20];
}

// ─── Build galaxy layers (offscreen) ─────
function buildGalaxyLayers() {
  const W = canvas.width;
  const H = canvas.height;
  const maxR = getMaxR();
  const yScale = 0.48;

  // 1. Background layer
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

  // 2. Nebula spiral layer
  const nebulaSize = Math.ceil(maxR * 2.6);
  const nC = document.createElement("canvas");
  nC.width = nebulaSize; nC.height = nebulaSize;
  const nCtx = nC.getContext("2d");
  const ncx = nebulaSize / 2;
  const ncy = nebulaSize / 2;

  nCtx.globalCompositeOperation = "lighter";
  const TOTAL = 18000;

  for (let i = 0; i < TOTAL; i++) {
    const arm = Math.floor(Math.random() * SPIRAL_ARMS);
    const t = Math.random();
    const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
    const theta = t * SPIRAL_TURNS * Math.PI * 2 + armOffset;
    const r = t * maxR;

    const scatterW = maxR * 0.25 * (0.2 + t * 0.8);
    const perpAngle = theta + Math.PI / 2;
    const scatter = (Math.random() - 0.5) * scatterW;

    let px = r * Math.cos(theta) + scatter * Math.cos(perpAngle);
    let py = (r * Math.sin(theta) + scatter * Math.sin(perpAngle)) * yScale;

    const dist = Math.sqrt(px * px + py * py);
    const voidR = maxR * 0.07;
    if (dist < voidR && Math.random() > dist / voidR * 0.4) continue;

    const [h, s, l] = pickColor(Math.random());
    const size = Math.random() * 2.2 + 0.4;
    const densityFade = 1 - t * 0.3;
    const alpha = (Math.random() * 0.55 + 0.15) * densityFade;

    const sx = ncx + px;
    const sy = ncy + py;
    const glowR = size * 2.5;
    const grad = nCtx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${alpha})`);
    grad.addColorStop(0.4, `hsla(${h},${s}%,${l}%,${alpha * 0.4})`);
    grad.addColorStop(1, "transparent");
    nCtx.fillStyle = grad;
    nCtx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);

    if (Math.random() < 0.3) {
      nCtx.beginPath();
      nCtx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
      nCtx.fillStyle = `hsla(${h},${s}%,${Math.min(100, l + 20)}%,${alpha * 0.8})`;
      nCtx.fill();
    }
  }

  nCtx.globalCompositeOperation = "destination-out";
  const voidGrad = nCtx.createRadialGradient(ncx, ncy, 0, ncx, ncy, maxR * 0.12);
  voidGrad.addColorStop(0, "rgba(0,0,0,0.92)");
  voidGrad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  voidGrad.addColorStop(1, "transparent");
  nCtx.fillStyle = voidGrad;
  nCtx.fillRect(0, 0, nebulaSize, nebulaSize);
  nCtx.globalCompositeOperation = "source-over";

  nebulaLayer = nC;
}

// ─── Draw Galaxy (per-frame) ─────────────
function drawGalaxy(time) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  // Semi-transparent clear for motion trail / diffusion effect
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

  if (nebulaLayer) {
    spiralRotation += 0.00024;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spiralRotation);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(nebulaLayer, -nebulaLayer.width / 2, -nebulaLayer.height / 2);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  const voidR = Math.min(W, H) * 0.05;
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, voidR * 3);
  vg.addColorStop(0, "rgba(9, 11, 17, 0.85)");
  vg.addColorStop(0.35, "rgba(9, 11, 17, 0.45)");
  vg.addColorStop(1, "transparent");
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.arc(cx, cy, voidR * 3, 0, Math.PI * 2);
  ctx.fill();

  updatePlanetSpiralPositions();
  requestAnimationFrame(drawGalaxy);
}

// ─── Spiral position calculator ──────────
function getSpiralScreenPos(t, rotation) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = getMaxR();
  const yScale = 0.48;

  const theta = t * SPIRAL_TURNS * Math.PI * 2;
  const r = t * maxR;
  const px = r * Math.cos(theta);
  const py = (r * Math.sin(theta)) * yScale;

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;

  return { x: cx + rx, y: cy + ry };
}

// ─── Update planet positions each frame ───
function updatePlanetSpiralPositions() {
  PLANET_CONFIG.forEach(config => {
    const el = spheresContainer.querySelector(`[data-planet="${config.id}"]`);
    if (!el) return;
    const pos = getSpiralScreenPos(config.orbitScale, spiralRotation);
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
  });
}

// ─── Planet Spheres (bound to spiral arms) ───
function createPlanetSpheres() {
  spheresContainer.innerHTML = "";
  Object.values(activeParticleSpheres).forEach(s => s.destroy());
  activeParticleSpheres = {};

  PLANET_CONFIG.forEach(config => {
    const sphere = document.createElement("div");
    sphere.className = "planet-sphere";
    sphere.dataset.planet = config.id;

    const pos = getSpiralScreenPos(config.orbitScale, spiralRotation);
    sphere.style.left = pos.x + "px";
    sphere.style.top = pos.y + "px";

    const subtitle = document.createElement("span");
    subtitle.className = "sphere-subtitle";
    subtitle.textContent = config.categoryLabel;
    sphere.appendChild(subtitle);

    const name = document.createElement("span");
    name.className = "sphere-name";
    name.textContent = config.nameEN;
    sphere.appendChild(name);

    const ballWrap = document.createElement("div");
    ballWrap.className = "sphere-ball-wrap";

    const sphereSize = 105;
    const { canvas: pCanvas, sphere: pSphere } = createPlanetParticleSphere(config.id, sphereSize, {
      particleCount: 600,
      particleSize: 0.9,
      glowIntensity: 0.5,
    });
    pCanvas.classList.add("sphere-ball");

    ballWrap.appendChild(pCanvas);
    sphere.appendChild(ballWrap);

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

// ─── Detail Panel ─────────────────────────
function openDetailPanel(planet) {
  selectedPlanet = planet.id;

  if (detailParticleSphere) {
    detailParticleSphere.destroy();
    detailParticleSphere = null;
  }

  const detailDotContainer = document.getElementById("detail-dot");
  detailDotContainer.innerHTML = "";
  const detailSize = 96;
  const { canvas: detailCanvas, sphere: dSphere } = createPlanetParticleSphere(planet.id, detailSize, {
    particleCount: 500,
    particleSize: 0.8,
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
    <div class="detail-item">
      <span class="detail-item-label">Orbital Period</span>
      <span class="detail-item-value">${UNITS.formatPeriod(planet.orbitalPeriod)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Rotation Period</span>
      <span class="detail-item-value">${planet.rotationPeriod ? planet.rotationPeriod.toFixed(2) + " hours" : "N/A"}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Mean Radius</span>
      <span class="detail-item-value">${planet.radiusKm ? UNITS.formatNumber(planet.radiusKm) + " km" : "N/A"}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Mass</span>
      <span class="detail-item-value">${UNITS.formatMass(planet.massValue, planet.massExponent)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Avg Temperature</span>
      <span class="detail-item-value">${planet.tempK ? UNITS.kelvinToCelsius(planet.tempK) + "°C (" + planet.tempK + " K)" : "N/A"}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Surface Gravity</span>
      <span class="detail-item-value">${planet.gravity ? planet.gravity + " m/s²" : "N/A"}</span>
    </div>
    <div class="detail-item">
      <span class="detail-item-label">Known Moons</span>
      <span class="detail-item-value">${planet.moonCount !== undefined ? planet.moonCount + " moon" + (planet.moonCount !== 1 ? "s" : "") : "N/A"}</span>
    </div>
  `;

  detailPanel.hidden = false;
  detailPanel.offsetHeight;
  detailPanel.classList.add("open");
}

function closeDetailPanel() {
  detailPanel.classList.remove("open");
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

// ─── NASA JPL Horizons API ───
// Primary URL; if CORS blocks it, try public proxies as fallback
const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const CORS_PROXIES = [
  "",                                          // Direct (works in some browsers/contexts)
  "https://corsproxy.io/?",                    // Popular CORS proxy
  "https://api.allorigins.win/raw?url=",       // allorigins
];

async function fetchWithCorsRetry(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const fetchUrl = proxy ? proxy + encodeURIComponent(url) : url;
      const resp = await fetch(fetchUrl);
      if (!resp.ok) continue;
      return await resp.json();
    } catch (e) {
      continue; // Try next proxy
    }
  }
  throw new Error("All fetch attempts failed (CORS)");
}
const HORIZONS_CODES = {
  mercury: "199", venus: "299", earth: "399",
  mars: "499", jupiter: "599", saturn: "699",
  uranus: "799", neptune: "899",
};

// Fetch RA, DEC, AZ, ALT, and distance for one planet from a given observer
async function fetchHorizonsData(planetId, lat, lon, elev, datetime) {
  if (planetId === "earth") {
    return { ra: "—", dec: "—", az: "—", alt: "—", distEarthAU: 0, distEarthKm: 0 };
  }
  const code = HORIZONS_CODES[planetId];
  const startTime = datetime; // e.g. "2026-03-23 06:17"
  // Compute stop time = start + 1 day
  const startDate = new Date(datetime.replace(" ", "T") + "Z");
  const stopDate = new Date(startDate.getTime() + 86400000);
  const stopTime = stopDate.toISOString().slice(0, 10);

  // QUANTITIES: 1=RA/DEC, 4=AZ/EL, 20=range(delta)
  const elevKm = (elev / 1000).toFixed(3);
  const url = `${HORIZONS_API}?format=json`
    + `&COMMAND='${code}'`
    + `&CENTER='coord@399'`
    + `&COORD_TYPE='GEODETIC'`
    + `&SITE_COORD='${lon},${lat},${elevKm}'`
    + `&EPHEM_TYPE='OBSERVER'`
    + `&START_TIME='${startTime}'`
    + `&STOP_TIME='${stopTime}'`
    + `&STEP_SIZE='1 d'`
    + `&QUANTITIES='1,4,20'`
    + `&MAKE_EPHEM='YES'`;

  const data = await fetchWithCorsRetry(url);
  const text = data.result;
  const soe = text.indexOf("$$SOE");
  const eoe = text.indexOf("$$EOE");
  if (soe === -1) throw new Error("No ephemeris data for " + planetId);

  const line = text.substring(soe + 5, eoe).trim().split("\n")[0].trim();
  // Parse: Date HR:MN  RA(h m s) DEC(d m s) AZ EL delta deldot
  const parts = line.split(/\s+/);
  // parts[0]=date, [1]=time, [2..4]=RA(h m s), [5..7]=DEC(d m s), [8]=AZ, [9]=EL, [10]=delta, [11]=deldot
  const ra = `${parts[2]} ${parts[3]} ${parts[4]}`;
  const dec = `${parts[5]} ${parts[6]} ${parts[7]}`;
  const az = parseFloat(parts[8]).toFixed(4) + "°";
  const alt = parseFloat(parts[9]).toFixed(4) + "°";
  const deltaAU = parseFloat(parts[10]);

  return {
    ra, dec, az, alt,
    distEarthAU: deltaAU.toFixed(5),
    distEarthKm: Math.round(deltaAU * 149597870.7),
  };
}

// ─── Build planet data from static + Horizons live data ───
async function fetchAllData(lat, lon, elev, zone, datetime) {
  // 1. Static physical data (always available)
  planetData = PLANET_IDS.map((id, i) => {
    const config = PLANET_CONFIG[i];
    const d = PLANET_STATIC_DATA[id] || {};
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
    positionData[PLANET_IDS[i]] = { ra: r.ra, dec: r.dec, az: r.az, alt: r.alt };
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

// Form submit — calculate positions
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const lat = parseFloat(document.getElementById("obs-lat").value);
  const lon = parseFloat(document.getElementById("obs-lon").value);
  const elev = parseInt(document.getElementById("obs-elev").value);
  const zone = parseInt(document.getElementById("obs-zone").value);
  const datetimeRaw = document.getElementById("obs-datetime").value;
  // Convert to ISO 8601: yyyy-MM-ddThh:mm:ss
  const datetime = datetimeRaw.length === 16 ? datetimeRaw + ":00" : datetimeRaw;

  observerSettings = { lat, lon, elev, zone, datetime };

  settingsStatus.textContent = "Calculating positions...";
  settingsStatus.className = "settings-status";
  btnCalculate.disabled = true;
  btnCalculate.textContent = "Loading...";

  try {
    // Fetch all data from NASA Horizons
    await fetchAllData(lat, lon, elev, zone, datetime);

    const hasPositions = Object.keys(positionData).length > 0;
    settingsStatus.textContent = hasPositions
      ? "Done! Real-time positions loaded."
      : "Positions unavailable (CORS). Showing physical data only.";
    settingsStatus.className = hasPositions ? "settings-status success" : "settings-status";

    // Hide overlay, show planets (always proceed even if positions failed)
    setTimeout(() => {
      settingsOverlay.classList.add("hidden");
      spheresContainer.style.display = "";
      recalcBtn.style.display = "";
    }, 500);
  } catch (err) {
    // Even on total failure, show with static data
    settingsStatus.textContent = "API error — showing cached data. " + err.message;
    settingsStatus.className = "settings-status error";
    setTimeout(() => {
      settingsOverlay.classList.add("hidden");
      spheresContainer.style.display = "";
      recalcBtn.style.display = "";
    }, 1500);
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
  buildGalaxyLayers();
  createPlanetSpheres();
  requestAnimationFrame(drawGalaxy);
  // Pre-fill "Now" on load
  btnNow.click();
}

init();
