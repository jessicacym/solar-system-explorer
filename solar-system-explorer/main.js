// ═══════════════════════════════════════════
// main.js — Solar System Explorer
// BlueYard-inspired immersive galaxy with spiral particle cloud
// API: Le Système Solaire (https://api.le-systeme-solaire.net)
// VDES39915 Project 2 | 2026
// ═══════════════════════════════════════════

// ─── Constants ───────────────────────────
const API_BASE = "https://api.le-systeme-solaire.net/rest/bodies/";
const PLANET_IDS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const REFRESH_INTERVAL_MS = 60000;
const SPIRAL_ARMS = 2;
const SPIRAL_TURNS = 3.2;

// ─── State ────────────────────────────────
let planetData = [];
let lastFetchTime = null;
let spiralRotation = 0;
let selectedPlanet = null;
let currentSection = 0;

// Pre-rendered layers (offscreen canvases for performance)
let nebulaLayer = null;   // The dense spiral cloud
let bgLayer = null;       // Background star field + colored dust
let nebulaData = [];      // Particle positions for rotation

// Active particle spheres (keyed by planetId)
let activeParticleSpheres = {};
let detailParticleSphere = null;

// ─── DOM Refs ─────────────────────────────
const canvas = document.getElementById("galaxy-canvas");
const ctx = canvas.getContext("2d");
const refreshLabel = document.getElementById("refresh-label");
const spheresContainer = document.getElementById("planet-spheres");
const scrollContainer = document.getElementById("scroll-container");
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

// ─── Color utility ───────────────────────
function pickColor(roll) {
  if (roll < 0.35) return [210 + Math.random() * 30, 60 + Math.random() * 30, 55 + Math.random() * 30]; // blue
  if (roll < 0.55) return [180 + Math.random() * 20, 60 + Math.random() * 30, 50 + Math.random() * 25]; // teal
  if (roll < 0.72) return [255 + Math.random() * 30, 45 + Math.random() * 40, 40 + Math.random() * 25]; // purple
  if (roll < 0.85) return [310 + Math.random() * 30, 50 + Math.random() * 40, 40 + Math.random() * 25]; // magenta
  return [200 + Math.random() * 40, 8 + Math.random() * 12, 80 + Math.random() * 20]; // white star
}

// ─── Build galaxy layers (offscreen) ─────
function buildGalaxyLayers() {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) * 0.44;
  const yScale = 0.48;

  // ── 1. Background layer (stars + scattered colored dust) ──
  const bgC = document.createElement("canvas");
  bgC.width = W; bgC.height = H;
  const bgCtx = bgC.getContext("2d");

  // Tiny white stars
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

  // Scattered colorful dust (pink, teal, purple) — larger, softer blobs
  bgCtx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const [h, s, l] = pickColor(Math.random() * 0.85 + 0.15); // skip white for dust
    const r = Math.random() * 4 + 1.5;
    const grad = bgCtx.createRadialGradient(x, y, 0, x, y, r * 2);
    grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${Math.random() * 0.25 + 0.08})`);
    grad.addColorStop(1, "transparent");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  }
  bgCtx.globalCompositeOperation = "source-over";
  bgLayer = bgC;

  // ── 2. Nebula spiral layer (pre-rendered on a large square, rotated at draw time) ──
  const nebulaSize = Math.ceil(maxR * 2.6);
  const nC = document.createElement("canvas");
  nC.width = nebulaSize; nC.height = nebulaSize;
  const nCtx = nC.getContext("2d");
  const ncx = nebulaSize / 2;
  const ncy = nebulaSize / 2;

  // Use additive blending for the luminous glow stacking
  nCtx.globalCompositeOperation = "lighter";

  const TOTAL = 18000;
  nebulaData = [];

  for (let i = 0; i < TOTAL; i++) {
    const arm = Math.floor(Math.random() * SPIRAL_ARMS);
    const t = Math.random();
    const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
    const theta = t * SPIRAL_TURNS * Math.PI * 2 + armOffset;
    const r = t * maxR;

    // Scatter — wider near the outer edge, tighter near center
    const scatterW = maxR * 0.25 * (0.2 + t * 0.8);
    const perpAngle = theta + Math.PI / 2;
    const scatter = (Math.random() - 0.5) * scatterW;

    let px = r * Math.cos(theta) + scatter * Math.cos(perpAngle);
    let py = (r * Math.sin(theta) + scatter * Math.sin(perpAngle)) * yScale;

    // Dark center void: suppress particles close to the core
    const dist = Math.sqrt(px * px + py * py);
    const voidR = maxR * 0.07;
    if (dist < voidR && Math.random() > dist / voidR * 0.4) continue;

    const [h, s, l] = pickColor(Math.random());
    const size = Math.random() * 2.2 + 0.4;
    // Brighter core particles, dimmer edges
    const densityFade = 1 - t * 0.3;
    const alpha = (Math.random() * 0.55 + 0.15) * densityFade;

    // Draw soft glow blob (not hard circle)
    const sx = ncx + px;
    const sy = ncy + py;
    const glowR = size * 2.5;
    const grad = nCtx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${alpha})`);
    grad.addColorStop(0.4, `hsla(${h},${s}%,${l}%,${alpha * 0.4})`);
    grad.addColorStop(1, "transparent");
    nCtx.fillStyle = grad;
    nCtx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);

    // Also draw a hard bright core for some particles (star effect)
    if (Math.random() < 0.3) {
      nCtx.beginPath();
      nCtx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
      nCtx.fillStyle = `hsla(${h},${s}%,${Math.min(100, l + 20)}%,${alpha * 0.8})`;
      nCtx.fill();
    }
  }

  // Draw the dark void overlay on the nebula texture
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

  ctx.clearRect(0, 0, W, H);

  // 1. Background stars + dust (static)
  if (bgLayer) {
    ctx.drawImage(bgLayer, 0, 0);
  }

  // 2. Ambient nebula glow (multiple layered radial gradients)
  const glowR = Math.min(W, H) * 0.4;
  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g1.addColorStop(0, "rgba(40, 80, 180, 0.08)");
  g1.addColorStop(0.3, "rgba(60, 40, 140, 0.05)");
  g1.addColorStop(0.6, "rgba(40, 160, 160, 0.03)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  // 3. Rotating spiral nebula (pre-rendered texture)
  if (nebulaLayer) {
    spiralRotation += 0.00012;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spiralRotation);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(nebulaLayer, -nebulaLayer.width / 2, -nebulaLayer.height / 2);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // 4. Center void darkening (on top of everything)
  const voidR = Math.min(W, H) * 0.05;
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, voidR * 3);
  vg.addColorStop(0, "rgba(9, 11, 17, 0.85)");
  vg.addColorStop(0.35, "rgba(9, 11, 17, 0.45)");
  vg.addColorStop(1, "transparent");
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.arc(cx, cy, voidR * 3, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(drawGalaxy);
}

// ─── Planet Spheres (positioned around viewport edges, BlueYard-style) ───
function createPlanetSpheres() {
  spheresContainer.innerHTML = "";
  // Destroy old particle spheres
  Object.values(activeParticleSpheres).forEach(s => s.destroy());
  activeParticleSpheres = {};

  PLANET_CONFIG.forEach(config => {
    const sphere = document.createElement("div");
    sphere.className = "planet-sphere";
    sphere.dataset.planet = config.id;

    // Position from config
    const pos = config.position;
    if (pos.top) sphere.style.top = pos.top;
    if (pos.bottom) sphere.style.bottom = pos.bottom;
    if (pos.left) sphere.style.left = pos.left;
    if (pos.right) sphere.style.right = pos.right;

    // Subtitle (category label)
    const subtitle = document.createElement("span");
    subtitle.className = "sphere-subtitle";
    subtitle.textContent = config.categoryLabel;
    sphere.appendChild(subtitle);

    // Planet name
    const name = document.createElement("span");
    name.className = "sphere-name";
    name.textContent = config.nameEN;
    sphere.appendChild(name);

    // Particle sphere canvas (replaces the old CSS gradient ball)
    const ballWrap = document.createElement("div");
    ballWrap.className = "sphere-ball-wrap";

    const sphereSize = 70;
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

    // Start the particle animation
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

// ─── Scroll Handling ──────────────────────
scrollContainer.addEventListener("scroll", () => {
  const scrollTop = scrollContainer.scrollTop;
  const sectionHeight = window.innerHeight;
  currentSection = Math.round(scrollTop / sectionHeight);

  // Fade galaxy elements based on scroll
  const galaxyOpacity = Math.max(0, 1 - scrollTop / sectionHeight * 0.8);
  const showGalaxy = currentSection <= 1;

  spheresContainer.style.opacity = showGalaxy ? galaxyOpacity : 0;
  spheresContainer.style.pointerEvents = showGalaxy ? "" : "none";

  // Canvas fade for category sections
  canvas.style.opacity = currentSection >= 2 ? 0.3 : 1;

  // Update nav active state
  document.querySelectorAll(".nav-links a").forEach(a => a.classList.remove("active"));
  const activeLink = document.querySelector(`.nav-links a[data-section="${currentSection}"]`);
  if (activeLink) activeLink.classList.add("active");
});

// Nav link clicks
document.querySelectorAll(".nav-links a[data-section], .about-links a[data-section]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const idx = parseInt(a.dataset.section);
    scrollContainer.scrollTo({ top: idx * window.innerHeight, behavior: "smooth" });
  });
});

document.getElementById("nav-logo").addEventListener("click", (e) => {
  e.preventDefault();
  scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
});

// ─── Detail Panel ─────────────────────────
function openDetailPanel(planet) {
  selectedPlanet = planet.id;

  // Destroy previous detail particle sphere
  if (detailParticleSphere) {
    detailParticleSphere.destroy();
    detailParticleSphere = null;
  }

  // Create particle sphere for detail panel header
  const detailDotContainer = document.getElementById("detail-dot");
  detailDotContainer.innerHTML = "";
  const detailSize = 48;
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

  const grid = document.getElementById("detail-grid");
  grid.innerHTML = `
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
  // Trigger reflow then add class for animation
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

// Close panel when clicking outside
document.addEventListener("click", (e) => {
  if (detailPanel.classList.contains("open") &&
      !detailPanel.contains(e.target) &&
      !e.target.closest(".planet-sphere") &&
      !e.target.closest(".cat-planet-item")) {
    closeDetailPanel();
  }
});

// ─── Category Section Planets ─────────────
function renderCategoryPlanets() {
  const mapping = {
    "inner-planets": "cat-planets-inner",
    "gas-giants": "cat-planets-gas",
    "ice-giants": "cat-planets-ice",
  };

  CATEGORIES.forEach(cat => {
    const container = document.getElementById(mapping[cat.id]);
    if (!container) return;
    container.innerHTML = "";

    cat.planetIds.forEach(planetId => {
      const planet = planetData.find(p => p.id === planetId);
      if (!planet) return;

      const item = document.createElement("div");
      item.className = "cat-planet-item";

      // Create particle sphere for category dot
      const dotSize = 44;
      const { canvas: dotCanvas, sphere: dotSphere } = createPlanetParticleSphere(planetId, dotSize, {
        particleCount: 400,
        particleSize: 0.7,
        glowIntensity: 0.45,
      });
      dotCanvas.classList.add("cat-planet-dot");

      const info = document.createElement("div");
      info.className = "cat-planet-info";
      info.innerHTML = `
        <span class="cat-planet-name">${planet.nameEN}</span>
        <span class="cat-planet-sub">${planet.distanceAU} AU · ${UNITS.formatPeriod(planet.orbitalPeriod)}</span>
      `;

      item.appendChild(dotCanvas);
      item.appendChild(info);
      item.addEventListener("click", () => openDetailPanel(planet));
      container.appendChild(item);

      dotSphere.start();
      // Store with a prefixed key so they don't conflict with galaxy spheres
      activeParticleSpheres["cat-" + planetId] = dotSphere;
    });
  });
}

// ─── API Fetch ────────────────────────────
async function fetchPlanetData() {
  try {
    refreshLabel.textContent = "Fetching...";

    const responses = await Promise.all(
      PLANET_IDS.map(id => fetch(`${API_BASE}${id}`).then(r => r.json()))
    );

    planetData = responses.map((apiData, i) => {
      const config = PLANET_CONFIG[i];
      return {
        ...config,
        distanceKm:     apiData.semimajorAxis || 0,
        distanceAU:     UNITS.kmToAU(apiData.semimajorAxis),
        orbitalPeriod:  apiData.sideralOrbit  || 0,
        rotationPeriod: apiData.sideralRotation || 0,
        radiusKm:       apiData.meanRadius    || 0,
        massValue:      apiData.mass?.massValue,
        massExponent:   apiData.mass?.massExponent,
        tempK:          apiData.avgTemp       || null,
        gravity:        apiData.gravity       || null,
        moonCount:      apiData.moons?.length || 0,
      };
    });

    lastFetchTime = Date.now();
    updateRefreshLabel();
    console.log("Planet data fetched:", planetData);

  } catch (err) {
    console.error("API fetch failed:", err);
    refreshLabel.textContent = "Fetch failed — retrying...";
  }
}

function updateRefreshLabel() {
  if (!lastFetchTime) return;
  const sec = Math.floor((Date.now() - lastFetchTime) / 1000);
  refreshLabel.textContent = `Updated ${sec}s ago`;
}

setInterval(updateRefreshLabel, 1000);
setInterval(async () => {
  await fetchPlanetData();
  renderCategoryPlanets();
}, REFRESH_INTERVAL_MS);

// ─── Init ─────────────────────────────────
async function init() {
  buildGalaxyLayers();
  createPlanetSpheres();
  requestAnimationFrame(drawGalaxy);

  await fetchPlanetData();
  renderCategoryPlanets();
}

init();
