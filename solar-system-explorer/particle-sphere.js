// ═══════════════════════════════════════════
// particle-sphere.js — 3D Rotating Particle Sphere
// Creates the glowing particle globe effect for each planet
// ═══════════════════════════════════════════

class ParticleSphere {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts
   * @param {string[]} opts.colors - Array of hex colors for particles
   * @param {number} [opts.particleCount=1200] - Number of particles
   * @param {number} [opts.radius=0.38] - Sphere radius as fraction of canvas size
   * @param {number} [opts.rotationSpeed=0.003] - Rotation speed (radians/frame)
   * @param {number} [opts.particleSize=1.2] - Base particle size in px
   * @param {number} [opts.glowIntensity=0.6] - Glow strength 0-1
   * @param {boolean} [opts.autoRotate=true]
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.colors = opts.colors || ["#ffffff"];
    this.particleCount = opts.particleCount || 1200;
    this.radiusFrac = opts.radius || 0.38;
    this.rotationSpeed = opts.rotationSpeed || 0.003;
    this.baseParticleSize = opts.particleSize || 1.2;
    this.glowIntensity = opts.glowIntensity || 0.6;
    this.autoRotate = opts.autoRotate !== false;

    this.angleY = 0;
    this.angleX = 0.35; // Slight tilt for 3D perspective
    this.particles = [];
    this.animId = null;
    this.running = false;

    this._initParticles();
  }

  _hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  _lerpColor(rgb1, rgb2, t) {
    return [
      Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t),
      Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t),
      Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t),
    ];
  }

  _initParticles() {
    this.particles = [];
    const rgbColors = this.colors.map((c) => this._hexToRgb(c));

    for (let i = 0; i < this.particleCount; i++) {
      // Fibonacci sphere distribution for even coverage
      const phi = Math.acos(1 - (2 * (i + 0.5)) / this.particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      // Add slight random offset for organic look
      const jitter = 0.04;
      const px =
        Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * jitter;
      const py =
        Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * jitter;
      const pz = Math.cos(phi) + (Math.random() - 0.5) * jitter;

      // Normalize back to sphere surface
      const len = Math.sqrt(px * px + py * py + pz * pz);

      // Pick color — blend between the palette colors based on position
      const colorT = Math.random();
      let rgb;
      if (rgbColors.length === 1) {
        rgb = rgbColors[0];
      } else {
        const idx = colorT * (rgbColors.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.min(lo + 1, rgbColors.length - 1);
        rgb = this._lerpColor(rgbColors[lo], rgbColors[hi], idx - lo);
      }

      // Add slight random variation to color
      rgb = [
        Math.min(255, Math.max(0, rgb[0] + (Math.random() - 0.5) * 40)),
        Math.min(255, Math.max(0, rgb[1] + (Math.random() - 0.5) * 40)),
        Math.min(255, Math.max(0, rgb[2] + (Math.random() - 0.5) * 40)),
      ];

      this.particles.push({
        x: px / len,
        y: py / len,
        z: pz / len,
        rgb,
        size: this.baseParticleSize * (0.5 + Math.random() * 1.0),
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
  }

  _project(x, y, z) {
    // Rotate around Y axis
    const cosY = Math.cos(this.angleY);
    const sinY = Math.sin(this.angleY);
    let rx = x * cosY - z * sinY;
    let rz = x * sinY + z * cosY;
    let ry = y;

    // Rotate around X axis (tilt)
    const cosX = Math.cos(this.angleX);
    const sinX = Math.sin(this.angleX);
    const ry2 = ry * cosX - rz * sinX;
    const rz2 = ry * sinX + rz * cosX;

    // Perspective projection
    const perspective = 3.5;
    const scale = perspective / (perspective + rz2);

    return {
      sx: rx * scale,
      sy: ry2 * scale,
      z: rz2,
      scale,
    };
  }

  render() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * this.radiusFrac;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, W, H);

    if (this.autoRotate) {
      this.angleY += this.rotationSpeed;
    }

    // Sort particles by z-depth for correct layering (back-to-front)
    const projected = this.particles.map((p) => {
      const proj = this._project(p.x, p.y, p.z);
      return { ...p, ...proj };
    });
    projected.sort((a, b) => a.z - b.z);

    // Draw particles
    ctx.globalCompositeOperation = "lighter";

    for (const p of projected) {
      const screenX = cx + p.sx * radius;
      const screenY = cy + p.sy * radius;

      // Depth-based alpha: front particles brighter, back particles dimmer
      const depthAlpha = 0.15 + (p.z + 1) * 0.425; // z ranges from -1 to 1
      const alpha = depthAlpha * p.brightness;
      const size = p.size * p.scale;

      const [r, g, b] = p.rgb;

      // Glow effect
      if (this.glowIntensity > 0 && size > 0.6) {
        const glowR = size * 3;
        const grad = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          glowR,
        );
        grad.addColorStop(
          0,
          `rgba(${r},${g},${b},${alpha * this.glowIntensity * 0.5})`,
        );
        grad.addColorStop(
          0.5,
          `rgba(${r},${g},${b},${alpha * this.glowIntensity * 0.15})`,
        );
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(screenX - glowR, screenY - glowR, glowR * 2, glowR * 2);
      }

      // Core particle
      ctx.beginPath();
      ctx.arc(screenX, screenY, Math.max(0.3, size), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  destroy() {
    this.stop();
    this.particles = [];
  }
}

// ─── Planet Particle Color Palettes ──────────
// Each planet gets a unique multi-color palette for its particle sphere
const PLANET_PARTICLE_PALETTES = {
  mercury: ["#b5b5b5", "#8a8a8a", "#d0cfc8", "#706f6a"],
  venus: ["#e8c87a", "#d4a840", "#f0dca0", "#c89830"],
  earth: ["#4a9eff", "#2060c0", "#60d0a0", "#3080e0"],
  mars: ["#e06030", "#a03820", "#e88060", "#c04020"],
  jupiter: ["#c88b3a", "#a06a20", "#e4c080", "#d09040"],
  saturn: ["#e4d191", "#c8a850", "#f0e0b0", "#b89840"],
  uranus: ["#7de8e8", "#40b0b0", "#a0f0f0", "#60d0d8"],
  neptune: ["#3f54ba", "#2a3880", "#6080e0", "#5060c0"],
};

/**
 * Create a particle sphere canvas element for a given planet
 * @param {string} planetId
 * @param {number} size - Canvas pixel size (square)
 * @param {Object} [overrides] - Override ParticleSphere options
 * @returns {{ canvas: HTMLCanvasElement, sphere: ParticleSphere }}
 */
function createPlanetParticleSphere(planetId, size, overrides = {}) {
  const canvas = document.createElement("canvas");
  // Use 2x resolution for retina sharpness
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  canvas.className = "particle-sphere-canvas";

  const palette = PLANET_PARTICLE_PALETTES[planetId] || ["#ffffff"];

  // Scale particle count and size with canvas size
  const countScale = Math.max(0.3, size / 80);
  const sizeScale = Math.max(0.4, (size * dpr) / 120);

  const sphere = new ParticleSphere(canvas, {
    colors: palette,
    particleCount: Math.round(800 * countScale),
    radius: 0.36,
    rotationSpeed: 0.004 + Math.random() * 0.002,
    particleSize: 1.0 * sizeScale,
    glowIntensity: 0.55,
    ...overrides,
  });

  return { canvas, sphere };
}
