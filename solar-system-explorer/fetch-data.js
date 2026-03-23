// fetch-data.js — Pre-fetch Le Système Solaire API data to local JSON
// Run: node fetch-data.js
// This downloads planet data and saves to planets-api.json
// The HTML page will load this file directly (no CORS issues)

const https = require("https");
const fs = require("fs");

const API_KEY = "da7fc255-d3c3-44ec-be23-13a722b2c5d9";
const API_URL =
  "https://api.le-systeme-solaire.net/rest/bodies?filter[]=isPlanet,eq,true";
const OUTPUT = "planets-api.json";

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { Authorization: `Bearer ${API_KEY}` } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirect = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return resolve(fetch(redirect));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data)));
      },
    );
    req.on("error", reject);
  });
}

async function main() {
  console.log("Fetching planet data from Le Système Solaire API...");
  const data = await fetch(API_URL);
  const planets = data.bodies || [];

  // Build a clean keyed object
  const result = {
    _fetchedAt: new Date().toISOString(),
    _source: "https://api.le-systeme-solaire.net",
    planets: {},
  };

  for (const p of planets) {
    const id = p.englishName.toLowerCase();
    result.planets[id] = {
      englishName: p.englishName,
      semimajorAxis: p.semimajorAxis,
      sideralOrbit: p.sideralOrbit,
      sideralRotation: p.sideralRotation,
      meanRadius: p.meanRadius,
      mass: p.mass,
      avgTemp: p.avgTemp,
      gravity: p.gravity,
      moons: p.moons,
      density: p.density,
      escape: p.escape,
      eccentricity: p.eccentricity,
      inclination: p.inclination,
      discoveredBy: p.discoveredBy,
      discoveryDate: p.discoveryDate,
    };
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`Saved ${planets.length} planets to ${OUTPUT}`);
  console.log(`Fetched at: ${result._fetchedAt}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
