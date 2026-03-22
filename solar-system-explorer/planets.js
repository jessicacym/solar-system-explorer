// planets.js
// Visual configuration for each planet
// API data is merged with this config in main.js
// Source: Le Système Solaire API (https://api.le-systeme-solaire.net)

const PLANET_CONFIG = [
  {
    id: "mercury",
    nameEN: "Mercury",
    nameCN: "水星",
    color: "#b5b5b5",
    glowColor: "rgba(181, 181, 181, 0.4)",
    visualRadius: 4,        // px on canvas (not to scale — for visibility)
    orbitScale: 0.28,       // relative orbit radius on canvas
    speedMultiplier: 1,     // animation speed relative to real orbital period
  },
  {
    id: "venus",
    nameEN: "Venus",
    nameCN: "金星",
    color: "#e8c87a",
    glowColor: "rgba(232, 200, 122, 0.4)",
    visualRadius: 7,
    orbitScale: 0.38,
    speedMultiplier: 1,
  },
  {
    id: "earth",
    nameEN: "Earth",
    nameCN: "地球",
    color: "#4a9eff",
    glowColor: "rgba(74, 158, 255, 0.4)",
    visualRadius: 7,
    orbitScale: 0.50,
    speedMultiplier: 1,
  },
  {
    id: "mars",
    nameEN: "Mars",
    nameCN: "火星",
    color: "#e06030",
    glowColor: "rgba(224, 96, 48, 0.4)",
    visualRadius: 5,
    orbitScale: 0.62,
    speedMultiplier: 1,
  },
  {
    id: "jupiter",
    nameEN: "Jupiter",
    nameCN: "木星",
    color: "#c88b3a",
    glowColor: "rgba(200, 139, 58, 0.4)",
    visualRadius: 14,
    orbitScale: 0.72,
    speedMultiplier: 1,
  },
  {
    id: "saturn",
    nameEN: "Saturn",
    nameCN: "土星",
    color: "#e4d191",
    glowColor: "rgba(228, 209, 145, 0.4)",
    visualRadius: 12,
    orbitScale: 0.81,
    speedMultiplier: 1,
    hasRings: true,         // render Saturn's rings
  },
  {
    id: "uranus",
    nameEN: "Uranus",
    nameCN: "天王星",
    color: "#7de8e8",
    glowColor: "rgba(125, 232, 232, 0.4)",
    visualRadius: 9,
    orbitScale: 0.89,
    speedMultiplier: 1,
  },
  {
    id: "neptune",
    nameEN: "Neptune",
    nameCN: "海王星",
    color: "#3f54ba",
    glowColor: "rgba(63, 84, 186, 0.4)",
    visualRadius: 9,
    orbitScale: 0.96,
    speedMultiplier: 1,
  },
];

// Unit conversion helpers
const UNITS = {
  kmToAU: (km) => (km / 149597870.7).toFixed(3),
  kelvinToCelsius: (k) => k ? (k - 273.15).toFixed(1) : "N/A",
  formatMass: (value, exponent) =>
    value ? `${value.toFixed(2)} × 10^${exponent} kg` : "N/A",
  formatNumber: (n) =>
    n ? n.toLocaleString() : "N/A",
  formatPeriod: (days) => {
    if (!days) return "N/A";
    if (Math.abs(days) > 365) return `${(days / 365.25).toFixed(2)} years`;
    return `${days.toFixed(2)} days`;
  },
};
