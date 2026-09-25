const Terrain = (() => {
  const simplex = new THREE.SimplexNoise({ random: mulberry32(WORLD_SEED) });
  const cell = CONFIG.chunkSize / CONFIG.chunkSegments;
  const c = (hex) => new THREE.Color(hex);
  const groundPalette = {
    [BIOME.MEADOW]: [c(0xa9c27f), c(0x93b36e), c(0x9fbb76)],
    [BIOME.FOREST]: [c(0x7fa062), c(0x729558), c(0x6a8c52)],
    [BIOME.TAIGA]: [c(0x8e9f6e), c(0x809366), c(0x97a878)],
    [BIOME.SNOW]: [c(0xd9dcdb), c(0xcfd4d6), c(0xdfdfda)],
    [BIOME.OCEAN]: [c(0xecdfb8), c(0xe6d6aa), c(0xf0e4c4)],
    [BIOME.SAVANNA]: [c(0xd4c48a), c(0xc7b77c), c(0xdccd96)],
    [BIOME.DESERT]: [c(0xecd8a8), c(0xe3cb95), c(0xf1e1b8)],
  };
  const special = {
    seabed: c(0xcdbd92),
    beach: c(0xecdfb8),
    dirt: c(0xb89f7c),
    rock: c(0xb3aca1),
    coldRock: c(0xa6aaac),
    sandstone: c(0xd3a578),
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

  function oceanMask(x, z) {
    return smoothstep(0.28, 0.58, simplex.noise(x * 0.0011 + 300, z * 0.0011 - 800));
  }

  function sampleHeight(x, z) {
    const ocean = oceanMask(x, z);
    const land = landHeight(x, z);
    if (ocean <= 0) return land;
    const seabed = -24 + simplex.noise(x * 0.01, z * 0.01) * 3;
    const coast = Math.min(land, CONFIG.waterLevel + 1.5 + (land - CONFIG.waterLevel) * 0.25);
    return ocean < 0.5 ? lerp(land, coast, ocean * 2) : lerp(coast, seabed, (ocean - 0.5) * 2);
  }

  function landHeight(x, z) {
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
    if (height < CONFIG.waterLevel + 0.5 && oceanMask(x, z) > 0.45) return BIOME.OCEAN;
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
    else if ((height < CONFIG.waterLevel + 0.7 || (biome === BIOME.OCEAN || oceanMask(x, z) > 0.3) && height < CONFIG.waterLevel + 2.2) && biome !== BIOME.SNOW) out.copy(special.beach);
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

  return { cell, oceanMask, noise, sampleHeight, interpolate, surfaceAt, heightAt, biomeAt, colorAt };
})();
