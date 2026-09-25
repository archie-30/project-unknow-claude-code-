function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, z, seed) {
  let h = Math.imul(seed ^ x, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ z, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return h >>> 0;
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

class Spring {
  constructor(value = 0) {
    this.value = value;
    this.velocity = 0;
  }

  update(target, dt, frequency, dampingRatio) {
    const omega = Math.PI * 2 * frequency;
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      const accel = omega * omega * (target - this.value) - 2 * dampingRatio * omega * this.velocity;
      this.velocity += accel * step;
      this.value += this.velocity * step;
      remaining -= step;
    }
    return this.value;
  }
}

function readSeed() {
  const value = parseInt(new URLSearchParams(location.search).get('seed'), 10);
  return Number.isFinite(value) ? value >>> 0 : (Math.random() * 0xffffffff) >>> 0;
}

const WORLD_SEED = readSeed();
