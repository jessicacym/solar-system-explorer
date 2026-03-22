// ═══════════════════════════════════════════
// main.js — Solar System Explorer
// API: Le Système Solaire (https://api.le-systeme-solaire.net)
// VDES39915 Project 2 | Yummy 2026
// ═══════════════════════════════════════════

// ─── Constants ───────────────────────────
const API_BASE = "https://api.le-systeme-solaire.net/rest/bodies/";
const PLANET_IDS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const REFRESH_INTERVAL_MS = 60000; // 60 seconds

// ─── State ────────────────────────────────
let planetData = [];          // merged API + config data
let selectedPlanet = null;    // currently selected planet id
let animSpeed = 1;            // time multiplier from slider
let activeFilter = "all";     // "all" | "inner" | "outer"
let searchQuery = "";         // from search input
let lastFetchTime = null;     // timestamp of last API fetch
let animTime = 0;             // accumulated animation time (seconds)
let lastTimestamp = null;     // for requestAnimationFrame delta

// ─── DOM Refs ─────────────────────────────
const canvas    = document.getElementById("solar-canvas");
const ctx       = canvas.getContext("2d");
const panelEmpty = document.getElementById("panel-empty");
const planetCard = document.getElementById("planet-card");
const refreshLabel = document.getElementById("refresh-label");
const speedSlider  = document.getElementById("speed-slider");
const speedDisplay = document.getElementById("speed-display");
const searchInput  = document.getElementById("planet-search");

// ─── API Fetch ────────────────────────────
async function fetchPlanetData() {
  try {
    refreshLabel.textContent = "Fetching...";

    // Fetch all 8 planets in parallel
    const responses = await Promise.all(
      PLANET_IDS.map(id => fetch(`${API_BASE}${id}`).then(r => r.json()))
    );

    // Merge API response with visual config from planets.js
    planetData = responses.map((apiData, i) => {
      const config = PLANET_CONFIG[i];
      return {
        ...config,
        // API fields
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
    console.log("✅ Planet data fetched:", planetData);

  } catch (err) {
    console.error("❌ API fetch failed:", err);
    refreshLabel.textContent = "Fetch failed — retrying...";
  }
}

// ─── Refresh label update ─────────────────
function updateRefreshLabel() {
  if (!lastFetchTime) return;
  const sec = Math.floor((Date.now() - lastFetchTime) / 1000);
  refreshLabel.textContent = `Updated ${sec}s ago`;
}

// Update label every second
setInterval(updateRefreshLabel, 1000);

// Auto re-fetch every 60s
setInterval(fetchPlanetData, REFRESH_INTERVAL_MS);

// ─── Canvas Resize ────────────────────────
function resizeCanvas() {
  const section = canvas.parentElement;
  canvas.width  = section.clientWidth;
  canvas.height = section.clientHeight;
}

window.addEventListener("resize", resizeCanvas);

// ─── Canvas Draw ──────────────────────────
function draw(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaMs = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Advance simulated time (real seconds * speed)
  animTime += (deltaMs / 1000) * animSpeed;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxOrbit = Math.min(W, H) * 0.46;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // ── Sun ──
  const sunRadius = 18;
  const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunRadius * 2.5);
  sunGrad.addColorStop(0,   "rgba(255, 220, 80, 1)");
  sunGrad.addColorStop(0.4, "rgba(255, 160, 30, 0.8)");
  sunGrad.addColorStop(1,   "rgba(255, 100, 0, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, sunRadius * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = sunGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe066";
  ctx.shadowColor = "#ff8800";
  ctx.shadowBlur  = 30;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (planetData.length === 0) {
    // Loading state
    ctx.fillStyle = "rgba(0, 212, 255, 0.4)";
    ctx.font = "14px 'Orbitron', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Loading planetary data...", cx, cy + 60);
    requestAnimationFrame(draw);
    return;
  }

  // ── Planets ──
  planetData.forEach(planet => {
    // Filter logic
    const isInner = ["mercury","venus","earth","mars"].includes(planet.id);
    if (activeFilter === "inner" && !isInner) return;
    if (activeFilter === "outer" && isInner) return;

    // Search highlight
    const isSearchMatch = searchQuery &&
      (planet.nameEN.toLowerCase().includes(searchQuery) ||
       planet.nameCN.includes(searchQuery));

    const orbitR = planet.orbitScale * maxOrbit;

    // ── Orbit ring ──
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = isSearchMatch
      ? "rgba(0, 212, 255, 0.4)"
      : "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = isSearchMatch ? 1.5 : 0.8;
    ctx.stroke();

    // ── Planet position ──
    // Angular speed: 2π / orbitalPeriod (days), scaled to animation time
    const angularSpeed = planet.orbitalPeriod > 0
      ? (2 * Math.PI) / planet.orbitalPeriod
      : 0;
    // animTime is in seconds; convert to "sim days" (1 real second = 10 sim days for visibility)
    const simDays = animTime * 10;
    const angle = angularSpeed * simDays;

    const px = cx + orbitR * Math.cos(angle);
    const py = cy + orbitR * Math.sin(angle);

    const isSelected = planet.id === selectedPlanet;
    const r = planet.visualRadius;

    // Glow
    const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
    glow.addColorStop(0, planet.glowColor);
    glow.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(px, py, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Planet body
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    if (isSelected) {
      ctx.shadowColor = planet.color;
      ctx.shadowBlur  = 20;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Saturn rings
    if (planet.hasRings) {
      ctx.beginPath();
      ctx.ellipse(px, py, r * 2.2, r * 0.5, angle + 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(228, 209, 145, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Selected ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(px, py, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Label (always shown)
    ctx.fillStyle = isSelected
      ? "rgba(0, 212, 255, 0.95)"
      : "rgba(200, 220, 240, 0.55)";
    ctx.font = `${isSelected ? "600 " : ""}11px 'Orbitron', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(planet.nameEN.toUpperCase(), px, py - r - 8);

    // Store current position for click detection
    planet._px = px;
    planet._py = py;
    planet._r  = r;
  });

  requestAnimationFrame(draw);
}

// ─── Click Detection ──────────────────────
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const hit = planetData.find(p => {
    if (!p._px) return false;
    const dx = mx - p._px;
    const dy = my - p._py;
    return Math.sqrt(dx*dx + dy*dy) < p._r + 12; // generous hit area
  });

  if (hit) {
    selectedPlanet = hit.id;
    showPlanetCard(hit);
  }
});

// Cursor change on hover
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const hit = planetData.find(p => {
    if (!p._px) return false;
    const dx = mx - p._px;
    const dy = my - p._py;
    return Math.sqrt(dx*dx + dy*dy) < p._r + 12;
  });

  canvas.style.cursor = hit ? "pointer" : "crosshair";
});

// ─── Data Card ────────────────────────────
function showPlanetCard(planet) {
  panelEmpty.hidden = true;
  planetCard.hidden = false;

  // Force animation replay
  planetCard.style.animation = "none";
  planetCard.offsetHeight; // reflow
  planetCard.style.animation = "";

  // Header
  document.getElementById("card-dot").style.backgroundColor = planet.color;
  document.getElementById("card-dot").style.boxShadow = `0 0 12px ${planet.color}`;
  document.getElementById("card-name").textContent    = planet.nameEN;
  document.getElementById("card-name-cn").textContent = planet.nameCN;

  // Data fields
  document.getElementById("d-distance").textContent =
    `${planet.distanceAU} AU  (${UNITS.formatNumber(planet.distanceKm)} km)`;
  document.getElementById("d-orbit").textContent =
    UNITS.formatPeriod(planet.orbitalPeriod);
  document.getElementById("d-rotation").textContent =
    planet.rotationPeriod ? `${planet.rotationPeriod.toFixed(2)} hours` : "N/A";
  document.getElementById("d-radius").textContent =
    planet.radiusKm ? `${UNITS.formatNumber(planet.radiusKm)} km` : "N/A";
  document.getElementById("d-mass").textContent =
    UNITS.formatMass(planet.massValue, planet.massExponent);
  document.getElementById("d-temp").textContent =
    planet.tempK
      ? `${UNITS.kelvinToCelsius(planet.tempK)}°C  (${planet.tempK} K)`
      : "N/A";
  document.getElementById("d-gravity").textContent =
    planet.gravity ? `${planet.gravity} m/s²` : "N/A";
  document.getElementById("d-moons").textContent =
    `${planet.moonCount} known moon${planet.moonCount !== 1 ? "s" : ""}`;
}

// ─── Controls ─────────────────────────────
speedSlider.addEventListener("input", () => {
  animSpeed = parseFloat(speedSlider.value);
  speedDisplay.textContent = `${animSpeed.toFixed(1)}×`;
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
  });
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.toLowerCase().trim();
});

// ─── Init ─────────────────────────────────
async function init() {
  resizeCanvas();
  await fetchPlanetData();
  requestAnimationFrame(draw);
}

init();
