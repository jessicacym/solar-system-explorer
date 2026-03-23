// api/horizons.js
// ═══════════════════════════════════════════
// Vercel Serverless Function — NASA Horizons Proxy
// Frontend calls: /api/horizons?...
// This function runs on Vercel's server, forwards
// the request to NASA, and returns the result with
// CORS headers — no browser CORS block.
//
// VDES39915 Project 2 | Solar System Explorer
// ═══════════════════════════════════════════

export default async function handler(req, res) {
  // Allow browser requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // —— Build NASA Horizons URL from forwarded query params ——
  const params = new URLSearchParams(req.query);
  const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;

  // —— Fetch from NASA (server-to-server, no CORS block) ——
  try {
    const nasaResponse = await fetch(nasaUrl);
    const text = await nasaResponse.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(nasaResponse.status).send(text);
  } catch (err) {
    return res.status(502).json({
      error: "Failed to reach NASA Horizons",
      detail: err.message,
    });
  }
}
