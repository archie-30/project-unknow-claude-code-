const Terrain = (() => {
  const simplex = new THREE.SimplexNoise({ random: mulberry32(WORLD_SEED) });
  const cell = CONFIG.chunkSize / CONFIG.chunkSegments;
  const c = (hex) => new THREE.Color(hex);
  const groundPalette = {
    [BIOME.MEADOW]: [c(0x9fcc6b), c(0x7fba5c), c(0x8cc262)],
    [BIOME.FOREST]: [c(0x6ea856), c(0x5f9a4a), c(0x548c43)],
    [BIOME.TAIGA]: [c(0x7f9c5e), c(0x6f8e56), c(0x88a468)],
    [BIOME.SNOW]: [c(0xf2f5f8), c(0xe6eef4), c(0xf8f9f8)],
    [BIOME.SAVANNA]: [c(0xcdc36b), c(0xbdb35f), c(0xd6cc7c)],
    [BIOME.DESERT]: [c(0xecd49a), c(0xe2c687), c(0xf2dea8)],
  };
  const special = {
    seabed: c(0xc9b98a),
    beach: c(0xe8d9a2),
    dirt: c(0xb39a6b),
    rock: c(0xa29d95),
    coldRock: c(0x98a2a8),
    sandstone: c(0xcf9a66),
  };

  function noise(x, z) {
    return simplex.noise(x, z);
  }

  function fbm(x, z, octaves) {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += simplex.noise(x * freq, z * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  function sampleHeight(x, z) {
    const hills = smoothstep(-0.3, 0.6, simplex.noise(x * 0.0022 + 31.7, z * 0.0022 - 12.3));
    const broad = simplex.noise(x * 0.005, z * 0.005) * 7;
    const detail = fbm(x * 0.018, z * 0.018, 4) * (1.5 + 10 * hills);
    const ridge = 1 - Math.abs(simplex.noise(x * 0.009 + 50, z * 0.009 + 50));
    const lake = smoothstep(0.35, 0.7, simplex.noise(x * 0.0045 - 210, z * 0.0045 + 95)) * (1 - hills);
    return broad + detail + ridge * ridge * ridge * 28 * hills * hills - lake * 9;
  }

  function interpolate(h00, h10, h01, h11, fx, fz, out) {
    let dx;
    let dz;
    if (fx >= fz) {
      dx = h10 - h00;
      dz = h11 - h10;
    } else {
      dx = h11 - h01;
      dz = h01 - h00;
    }
    out.height = h00 + dx * fx + dz * fz;
    out.normalY = cell / Math.hypot(dx, cell, dz);
    return out;
  }

  function surfaceAt(x, z, out) {
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    const x0 = ix * cell;
    const z0 = iz * cell;
    const fx = x / cell - ix;
    const fz = z / cell - iz;
    const h00 = sampleHeight(x0, z0);
    const h11 = sampleHeight(x0 + cell, z0 + cell);
    const h10 = fx >= fz ? sampleHeight(x0 + cell, z0) : 0;
    const h01 = fx >= fz ? 0 : sampleHeight(x0, z0 + cell);
    return interpolate(h00, h10, h01, h11, fx, fz, out);
  }

  const scratch = { height: 0, normalY: 1 };

  function heightAt(x, z) {
    return surfaceAt(x, z, scratch).height;
  }

  function biomeAt(x, z, height) {
    const jitter = simplex.noise(x * 0.05, z * 0.05) * 0.05;
    const temp = simplex.noise(x * 0.0014 + 500, z * 0.0014 + 500) - Math.max(0, height - 8) * 0.02 + jitter;
    const moist = simplex.noise(x * 0.0017 - 700, z * 0.0017 + 300) - jitter;
    if (temp < -0.5) return BIOME.SNOW;
    if (temp < -0.22) return BIOME.TAIGA;
    if (temp > 0.3 && moist < -0.05) return BIOME.DESERT;
    if (temp > 0.12 && moist < 0.12) return BIOME.SAVANNA;
    if (moist > 0.18) return BIOME.FOREST;
    return BIOME.MEADOW;
  }

  function colorAt(x, z, height, normalY, out) {
    const biome = biomeAt(x, z, height);
    const grain = hash2(Math.floor(x * 4), Math.floor(z * 4), WORLD_SEED) / 4294967296 - 0.5;
    const arid = biome === BIOME.DESERT || biome === BIOME.SAVANNA;
    let strata = 0;
    if (height < CONFIG.waterLevel - 0.3) out.copy(special.seabed);
    else if (height < CONFIG.waterLevel + 0.7 && biome !== BIOME.SNOW) out.copy(special.beach);
    else if (normalY < 0.68) {
      out.copy(arid ? special.sandstone : biome === BIOME.SNOW ? special.coldRock : special.rock);
      strata = Math.floor(height / 1.3 + grain * 0.4) % 2 === 0 ? 0.05 : -0.04;
    } else if (normalY < 0.78 && !arid && biome !== BIOME.SNOW) out.copy(special.dirt);
    else {
      const patch = simplex.noise(x * 0.03 + 400, z * 0.03 - 400) + grain * 0.3;
      const colors = groundPalette[biome];
      out.copy(colors[patch > 0.35 ? 0 : patch < -0.35 ? 2 : 1]);
    }
    return out.offsetHSL(0, 0, grain * 0.07 + strata);
  }

  return { cell, noise, sampleHeight, interpolate, surfaceAt, heightAt, biomeAt, colorAt };
})();
