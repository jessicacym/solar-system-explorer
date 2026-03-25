// planets.js
// Visual configuration for each planet
// API data is merged with this config in main.js
// Source: Le Système Solaire API (https://api.le-systeme-solaire.net)

// orbitScale: visually adjusted — preserves real order (Mercury→Neptune),
// inner planets spaced apart so spheres don't overlap, outer planets spread outward.
// Gap between each orbit: ~0.11 for inner, compressed but distinct for outer.

const PLANET_CONFIG = [
  {
    id: "mercury",
    nameEN: "Mercury",
    nameCN: "水星",
    color: "#b5b5b5",
    glowColor: "rgba(181, 181, 181, 0.5)",
    visualRadius: 6,
    orbitScale: 0.14,
    speedMultiplier: 4.15,
    category: "inner",
    gradient: ["#b5b5b5", "#8a8a8a"],
    tagline: "The Swift Messenger",
    categoryLabel: "TERRESTRIAL",
    position: { top: "22%", left: "15%" },
    facts: [
      "Mercury completes an orbit in just 88 Earth days",
      "Mercury has no atmosphere and extreme temperature swings",
      "Mercury is the smallest planet in our solar system",
    ],
  },
  {
    id: "venus",
    nameEN: "Venus",
    nameCN: "金星",
    color: "#e8c87a",
    glowColor: "rgba(232, 200, 122, 0.5)",
    visualRadius: 9,
    orbitScale: 0.25,
    speedMultiplier: 1.62,
    category: "inner",
    gradient: ["#e8c87a", "#d4a840"],
    tagline: "Earth's Scorching Twin",
    categoryLabel: "TERRESTRIAL",
    position: { top: "15%", left: "33%" },
    facts: [
      "Venus rotates backwards compared to most planets",
      "A day on Venus is longer than its year",
      "Venus is the hottest planet in our solar system",
    ],
  },
  {
    id: "earth",
    nameEN: "Earth",
    nameCN: "地球",
    color: "#4a9eff",
    glowColor: "rgba(74, 158, 255, 0.5)",
    visualRadius: 10,
    orbitScale: 0.36,
    speedMultiplier: 1,
    category: "inner",
    gradient: ["#4a9eff", "#2060c0"],
    tagline: "The Blue Marble",
    categoryLabel: "TERRESTRIAL",
    position: { top: "15%", right: "33%" },
    facts: [
      "Earth is the only known planet to harbor life",
      "71% of Earth's surface is covered by water",
      "Earth's magnetic field protects us from solar wind",
    ],
  },
  {
    id: "mars",
    nameEN: "Mars",
    nameCN: "火星",
    color: "#e06030",
    glowColor: "rgba(224, 96, 48, 0.5)",
    visualRadius: 7,
    orbitScale: 0.47,
    speedMultiplier: 0.53,
    category: "inner",
    gradient: ["#e06030", "#a03820"],
    tagline: "The Red Planet",
    categoryLabel: "TERRESTRIAL",
    position: { top: "22%", right: "15%" },
    facts: [
      "Mars has the tallest volcano in the solar system — Olympus Mons",
      "Mars has two small moons: Phobos and Deimos",
      "A year on Mars lasts 687 Earth days",
    ],
  },
  {
    id: "jupiter",
    nameEN: "Jupiter",
    nameCN: "木星",
    color: "#c88b3a",
    glowColor: "rgba(200, 139, 58, 0.5)",
    visualRadius: 18,
    orbitScale: 0.62,
    speedMultiplier: 0.084,
    category: "gas-giant",
    gradient: ["#c88b3a", "#a06a20"],
    tagline: "King of the Planets",
    categoryLabel: "GAS GIANT",
    position: { top: "42%", left: "10%" },
    facts: [
      "Jupiter's Great Red Spot is a storm larger than Earth",
      "Jupiter has at least 95 known moons",
      "Jupiter is so massive it could fit 1,300 Earths inside",
    ],
  },
  {
    id: "saturn",
    nameEN: "Saturn",
    nameCN: "土星",
    color: "#e4d191",
    glowColor: "rgba(228, 209, 145, 0.5)",
    visualRadius: 15,
    orbitScale: 0.74,
    speedMultiplier: 0.034,
    hasRings: true,
    category: "gas-giant",
    gradient: ["#e4d191", "#c8a850"],
    tagline: "The Ringed Wonder",
    categoryLabel: "GAS GIANT",
    position: { top: "42%", right: "10%" },
    facts: [
      "Saturn's rings are made of ice and rock particles",
      "Saturn is less dense than water — it would float",
      "Saturn's moon Titan has a thick atmosphere and liquid lakes",
    ],
  },
  {
    id: "uranus",
    nameEN: "Uranus",
    nameCN: "天王星",
    color: "#7de8e8",
    glowColor: "rgba(125, 232, 232, 0.5)",
    visualRadius: 12,
    orbitScale: 0.87,
    speedMultiplier: 0.012,
    category: "ice-giant",
    gradient: ["#7de8e8", "#40b0b0"],
    tagline: "The Tilted Giant",
    categoryLabel: "ICE GIANT",
    position: { bottom: "18%", left: "28%" },
    facts: [
      "Uranus rotates on its side with a 98° axial tilt",
      "Uranus was the first planet discovered with a telescope",
      "Uranus has 13 known rings",
    ],
  },
  {
    id: "neptune",
    nameEN: "Neptune",
    nameCN: "海王星",
    color: "#3f54ba",
    glowColor: "rgba(63, 84, 186, 0.5)",
    visualRadius: 12,
    orbitScale: 0.97,
    speedMultiplier: 0.006,
    category: "ice-giant",
    gradient: ["#3f54ba", "#2a3880"],
    tagline: "The Distant Blue",
    categoryLabel: "ICE GIANT",
    position: { bottom: "18%", right: "28%" },
    facts: [
      "Neptune has the strongest winds in the solar system — up to 2,100 km/h",
      "Neptune takes 165 years to orbit the Sun",
      "Neptune was predicted mathematically before it was observed",
    ],
  },
];

// Category definitions
const CATEGORIES = [
  {
    id: "inner-planets",
    title: "Inner Planets",
    question: "What secrets do the terrestrial worlds hold?",
    subtitle: "The rocky worlds closest to our Sun",
    gradient: ["#b5b5b5", "#e8c87a"],
    planetIds: ["mercury", "venus", "earth", "mars"],
  },
  {
    id: "gas-giants",
    title: "Gas Giants",
    question: "What if entire worlds were made of storms and clouds?",
    subtitle: "Massive worlds of hydrogen and helium",
    gradient: ["#c88b3a", "#e4d191"],
    planetIds: ["jupiter", "saturn"],
  },
  {
    id: "ice-giants",
    title: "Ice Giants",
    question: "What lies at the frozen edge of our solar system?",
    subtitle: "The cold, distant giants beyond Saturn",
    gradient: ["#7de8e8", "#3f54ba"],
    planetIds: ["uranus", "neptune"],
  },
];

// Static fallback data (used when API is unavailable)
const PLANET_STATIC_DATA = {
  mercury:  { semimajorAxis: 57909227, sideralOrbit: 87.97, sideralRotation: 1407.6, meanRadius: 2439.7, mass: { massValue: 3.30, massExponent: 23 }, avgTemp: 440, gravity: 3.7, moons: null },
  venus:    { semimajorAxis: 108209475, sideralOrbit: 224.7, sideralRotation: -5832.5, meanRadius: 6051.8, mass: { massValue: 4.87, massExponent: 24 }, avgTemp: 737, gravity: 8.87, moons: null },
  earth:    { semimajorAxis: 149598262, sideralOrbit: 365.26, sideralRotation: 23.93, meanRadius: 6371.0, mass: { massValue: 5.97, massExponent: 24 }, avgTemp: 288, gravity: 9.8, moons: [{name:"Moon"}] },
  mars:     { semimajorAxis: 227943824, sideralOrbit: 686.97, sideralRotation: 24.62, meanRadius: 3389.5, mass: { massValue: 6.42, massExponent: 23 }, avgTemp: 210, gravity: 3.71, moons: [{name:"Phobos"},{name:"Deimos"}] },
  jupiter:  { semimajorAxis: 778340821, sideralOrbit: 4332.59, sideralRotation: 9.93, meanRadius: 69911, mass: { massValue: 1.90, massExponent: 27 }, avgTemp: 165, gravity: 24.79, moons: new Array(95) },
  saturn:   { semimajorAxis: 1426666422, sideralOrbit: 10759.22, sideralRotation: 10.66, meanRadius: 58232, mass: { massValue: 5.68, massExponent: 26 }, avgTemp: 134, gravity: 10.44, moons: new Array(146) },
  uranus:   { semimajorAxis: 2870658186, sideralOrbit: 30688.5, sideralRotation: -17.24, meanRadius: 25362, mass: { massValue: 8.68, massExponent: 25 }, avgTemp: 76, gravity: 8.87, moons: new Array(28) },
  neptune:  { semimajorAxis: 4498396441, sideralOrbit: 60182, sideralRotation: 16.11, meanRadius: 24622, mass: { massValue: 1.02, massExponent: 26 }, avgTemp: 72, gravity: 11.15, moons: new Array(16) },
};

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
