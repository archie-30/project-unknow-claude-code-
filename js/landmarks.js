const Landmarks = (() => {
  const cell = CONFIG.landmarkCellSize;
  const cache = new Map();
  const CLEAR_RADIUS = { [LANDMARK.PLANE]: 13, [LANDMARK.CABIN]: 10 };

  function suitsCabin(biome) {
    return biome === BIOME.FOREST || biome === BIOME.TAIGA || biome === BIOME.MEADOW || biome === BIOME.SNOW;
  }

  function flatEnough(x, z) {
    const h = Terrain.heightAt(x, z);
    if (h < CONFIG.waterLevel + 0.8) return false;
    let min = h;
    let max = h;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = Terrain.heightAt(x + Math.cos(a) * 7, z + Math.sin(a) * 7);
      min = Math.min(min, s);
      max = Math.max(max, s);
    }
    return max - min < 4.5;
  }

  function inCell(ci, cj) {
    const key = ci + ',' + cj;
    if (cache.has(key)) return cache.get(key);
    const rng = mulberry32(hash2(ci, cj, WORLD_SEED ^ 0x1a2d));
    const origin = ci === 0 && cj === 0;
    const neighbour = Math.abs(ci) + Math.abs(cj) === 1;
    let result = null;
    if (origin || neighbour || rng() < 0.75) {
      for (let attempt = 0; attempt < 24 && !result; attempt++) {
        let x;
        let z;
        if (origin) {
          const angle = rng() * Math.PI * 2;
          const distance = 70 + rng() * 30 + attempt * 6;
          x = Math.cos(angle) * distance;
          z = Math.sin(angle) * distance;
        } else {
          x = (ci + 0.3 + rng() * 0.4) * cell;
          z = (cj + 0.3 + rng() * 0.4) * cell;
          const home = inCell(0, 0);
          if (home && Math.hypot(home.x - x, home.z - z) < (neighbour ? 150 : 220)) continue;
        }
        if (!flatEnough(x, z)) continue;
        const biome = Terrain.biomeAt(x, z, Terrain.heightAt(x, z));
        let type = suitsCabin(biome) && rng() < 0.6 ? LANDMARK.CABIN : LANDMARK.PLANE;
        if (origin) type = suitsCabin(biome) ? LANDMARK.CABIN : LANDMARK.PLANE;
        if (neighbour) {
          const home = inCell(0, 0);
          const wanted = home && home.type === LANDMARK.CABIN ? LANDMARK.PLANE : LANDMARK.CABIN;
          if (wanted === LANDMARK.PLANE || suitsCabin(biome)) type = wanted;
        }
        result = { key, type, x, z, rotation: rng() * Math.PI * 2, clear: CLEAR_RADIUS[type], seed: hash2(ci, cj, WORLD_SEED ^ 0x77) };
      }
    }
    cache.set(key, result);
    return result;
  }

  function near(x, z, radius) {
    const out = [];
    const i0 = Math.floor((x - radius) / cell) - 1;
    const i1 = Math.floor((x + radius) / cell) + 1;
    const j0 = Math.floor((z - radius) / cell) - 1;
    const j1 = Math.floor((z + radius) / cell) + 1;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const lm = inCell(i, j);
        if (lm && Math.hypot(lm.x - x, lm.z - z) <= radius) out.push(lm);
      }
    }
    return out;
  }

  return { inCell, near };
})();

const LandmarkBuilder = (() => {
  const P = Models.part;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);

  function boxCollider(list, lm, lx, lz, hx, hz, bottom, top, walkable, localRot = 0) {
    const c = Math.cos(lm.rotation);
    const s = Math.sin(lm.rotation);
    list.push({
      kind: 'box',
      x: lm.x + lx * c + lz * s,
      z: lm.z - lx * s + lz * c,
      hx, hz,
      rotation: lm.rotation + localRot,
      bottom, top, walkable,
    });
  }

  const RB = (w, h, d, r = 0.03) => new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const SMOOTH = (x, y, z, out) => out.set(x, y, z);

  function woodShade(y0, h) {
    return (x, y) => 0.82 + 0.18 * clamp01((y - y0) / h + 0.5);
  }

  function cabin(lm) {
    const c = Math.cos(lm.rotation);
    const s = Math.sin(lm.rotation);
    const corner = (lx, lz) => Terrain.heightAt(lm.x + lx * c + lz * s, lm.z - lx * s + lz * c);
    const samples = [[-3.2, -2.7], [3.2, -2.7], [-3.2, 4.2], [3.2, 4.2], [0, 0]].map(([x, z]) => corner(x, z));
    const floor = Math.max(...samples) + 0.25;
    const base = Math.min(...samples) - 0.6;
    const parts = [];
    const rng = mulberry32(lm.seed);
    const logColors = [0x8a6446, 0x9a7352, 0x7f5a3e, 0x916a4a];
    const W = 5.6;
    const D = 4.6;
    const H = 2.4;
    const r = 0.15;
    const logs = Math.round(H / (r * 2));

    parts.push(P(box(W + 0.5, floor - base, D + 0.5).translate(0, (base - floor) / 2 - 0.05, 0), 0x8f897e));
    for (let side = 0; side < 4; side++) {
      const along = side % 2 === 0 ? W + 0.5 : D + 0.5;
      const count = Math.round(along / 0.55);
      for (let i = 0; i < count; i++) {
        const t = -along / 2 + (i + 0.5) * (along / count);
        const w = 0.46 + rng() * 0.1;
        const h = 0.3 + rng() * 0.12;
        const g = RB(w, h, 0.2, 0.06).translate(0, -0.2 - rng() * 0.08, 0);
        const off = side < 2 ? (side === 0 ? D / 2 + 0.28 : -D / 2 - 0.28) : side === 2 ? W / 2 + 0.28 : -W / 2 - 0.28;
        if (side < 2) g.translate(t, 0, off); else g.rotateY(Math.PI / 2).translate(off, 0, t);
        parts.push(P(g, [0xa39d92, 0x958f84, 0xb0aa9e][i % 3], null, null, SMOOTH, 0.4));
      }
    }
    for (let i = 0; i < 12; i++) {
      parts.push(P(box(W + 0.1, 0.06, D / 12 - 0.02).translate(0, 0.02, -D / 2 + (i + 0.5) * (D / 12)), i % 2 ? 0xa98463 : 0x9b775a));
    }

    const logNormal = (axis, y, z0) => (x, py, z, out) => (axis === 'x' ? out.set(0, py - y, z - z0) : out.set(x - z0, py - y, 0));
    const wallLog = (length, axis, x, y, z, color) => {
      const radius = r * (0.95 + rng() * 0.1);
      const g = cyl(radius, radius, length, 12).rotateZ(Math.PI / 2);
      if (axis === 'z') g.rotateY(Math.PI / 2);
      parts.push(P(g.translate(x, y, z), color, null, null, logNormal(axis, y, axis === 'x' ? z : x), 0.85));
    };
    const logEnd = (x, y, z, axis) => {
      const g = cyl(r * 0.92, r * 0.92, 0.02, 12).rotateZ(Math.PI / 2);
      if (axis === 'z') g.rotateY(Math.PI / 2);
      parts.push(P(g.translate(x, y, z), 0xd9bd8c));
    };
    for (let i = 0; i < logs; i++) {
      const y = r + i * r * 2 + 0.07;
      const color = logColors[i % logColors.length];
      const zOdd = i % 2 === 0;
      wallLog(D + 0.6, 'z', -W / 2, y + (zOdd ? 0 : 0.02), 0, color);
      const windowRow = y > 0.9 && y < 1.7;
      if (windowRow) {
        wallLog(1.45, 'z', W / 2, y, -1.5, color);
        wallLog(1.45, 'z', W / 2, y, 1.5, color);
      } else {
        wallLog(D + 0.6, 'z', W / 2, y, 0, color);
      }
      wallLog(W + 0.6, 'x', 0, y + (zOdd ? 0.02 : 0), -D / 2, color);
      if (y < 2.0) {
        wallLog(W / 2 - 0.55, 'x', -(W / 4 + 0.28), y, D / 2, color);
        wallLog(W / 2 - 0.55, 'x', W / 4 + 0.28, y, D / 2, color);
      } else {
        wallLog(W + 0.6, 'x', 0, y, D / 2, color);
      }
      for (const sx of [-1, 1]) {
        logEnd(sx * (W / 2 + 0.3), y, -D / 2, 'x');
        logEnd(sx * (W / 2 + 0.3), y, D / 2, 'x');
        logEnd(-W / 2, y, sx * (D / 2 + 0.3), 'z');
      }
    }
    parts.push(P(box(0.08, 0.95, 1.55).translate(W / 2 + 0.02, 1.3, 0), 0x3f4a50));
    parts.push(P(box(0.1, 0.08, 1.7).translate(W / 2 + 0.06, 0.82, 0), 0x6e5238));
    parts.push(P(box(0.1, 0.08, 1.7).translate(W / 2 + 0.06, 1.78, 0), 0x6e5238));
    parts.push(P(box(0.1, 1.0, 0.07).translate(W / 2 + 0.06, 1.3, 0), 0x6e5238));
    parts.push(P(box(0.06, 0.9, 0.7).rotateY(0.9).translate(W / 2 + 0.4, 1.28, -1.05), 0x7f6a4c));
    parts.push(P(box(0.06, 0.9, 0.7).rotateZ(0.4).translate(W / 2 + 0.25, 1.2, 1.05), 0x7f6a4c));
    parts.push(P(box(1.2, 0.1, 0.16).translate(0, 2.05, D / 2 + 0.08), 0x6e5238));
    for (const x of [-0.58, 0.58]) parts.push(P(box(0.1, 2.0, 0.16).translate(x, 1.02, D / 2 + 0.08), 0x6e5238));

    const pitch = 0.55;
    const slope = (W / 2 + 0.6) / Math.cos(pitch);
    const roofY = H + 0.12 + Math.tan(pitch) * (W / 4 + 0.3);
    const shingles = (side, z0, z1, hole) => {
      const rows = 9;
      for (let row = 0; row < rows; row++) {
        const t = (row + 0.5) / rows;
        const count = Math.round((z1 - z0) / 0.42);
        for (let i = 0; i < count; i++) {
          const z = z0 + (i + 0.5 + (row % 2) * 0.5) * ((z1 - z0) / count);
          if (z > z1) continue;
          if (hole && row > 2 && row < 6 && z > hole[0] && z < hole[1]) continue;
          const along = (t - 0.5) * slope;
          const g = box(slope / rows + 0.06, 0.05, 0.4).translate(0, 0.02 + (row % 2) * 0.01, 0);
          g.rotateZ(-side * (pitch + 0.03)).translate(side * (W / 4 + 0.3) + side * along * Math.cos(pitch), roofY - along * Math.sin(pitch), z);
          parts.push(P(g, [0x6f5a4a, 0x7a6352, 0x665244, 0x836b58][(row + i) % 4]));
        }
      }
    };
    shingles(1, -D / 2 - 0.45, D / 2 + 0.45, null);
    shingles(-1, -D / 2 - 0.45, D / 2 + 0.45, [0.1, 1.3]);
    parts.push(P(cyl(0.1, 0.1, D + 1.0, 10).rotateX(Math.PI / 2).translate(0, H + 0.1 + Math.tan(pitch) * (W / 2 + 0.3) + 0.05, 0), 0x5e4a3c));
    parts.push(P(box(0.12, 0.12, D + 0.9).rotateZ(0.2).translate(-(W / 4 + 0.3), roofY + 0.05, 0.7).translate(0, 0, 0), 0x5e4a3c));
    [[1, 0.6, -1.2], [1, 0.35, 1.4], [-1, 0.7, -1.4]].forEach(([side, t, z]) => {
      const along = (t - 0.5) * slope;
      parts.push(P(new THREE.SphereGeometry(0.35, 10, 6).scale(1, 0.25, 1.2).translate(side * (W / 4 + 0.3) + side * along * Math.cos(pitch), roofY - along * Math.sin(pitch) + 0.08, z), 0x7fa862, null, null, SMOOTH, 0.8));
    });
    const gable = Models.fromTriangles([[-W / 2 - 0.2, H + 0.1, 0], [W / 2 + 0.2, H + 0.1, 0], [0, H + 0.1 + Math.tan(pitch) * (W / 2 + 0.3), 0]]);
    parts.push(P(gable.clone().translate(0, 0, D / 2 + 0.1), 0x8a6446));
    parts.push(P(gable.clone().translate(0, 0, -D / 2 - 0.1), 0x8a6446));
    for (let i = 0; i < 5; i++) parts.push(P(box(0.04, 0.9 - i * 0.16, 0.02).translate(-0.9 + i * 0.45, H + 0.55 - i * 0.02, D / 2 + 0.13), 0x6e5238));

    for (let layer = 0; layer < 11; layer++) {
      const y = 0.2 + layer * 0.34;
      const w = layer > 8 ? 0.5 : 0.62;
      for (let k = 0; k < 2; k++) {
        const g = RB(w * (0.9 + rng() * 0.15), 0.3, w / 2 - 0.02, 0.05).translate((k - 0.5) * 0.02, y, (k - 0.5) * (w / 2));
        parts.push(P(g.translate(-W / 2 - 0.12, 0, -1.2), [0xa39d92, 0x938d83, 0xb2ac9f][(layer + k) % 3], null, null, SMOOTH, 0.4));
      }
    }
    parts.push(P(box(0.7, 0.08, 0.7).translate(-W / 2 - 0.12, 0.2 + 11 * 0.34 - 0.1, -1.2), 0x7f7a72));

    parts.push(P(box(3.4, 0.1, 1.9).translate(0, -0.05, D / 2 + 1.05), 0xa98463));
    for (let i = 0; i < 8; i++) parts.push(P(box(0.02, 0.105, 1.9).translate(-1.7 + i * 0.44, -0.048, D / 2 + 1.05), 0x7f5a3e));
    parts.push(P(box(1.6, 0.14, 0.5).translate(0, -0.42, D / 2 + 2.2), 0x9a7856));
    parts.push(P(box(1.6, 0.14, 0.4).translate(0, -0.75, D / 2 + 2.55), 0x9a7856));
    for (const x of [-1.6, 1.6]) {
      parts.push(P(cyl(0.08, 0.1, 2.35, 10).translate(x, 1.1, D / 2 + 1.9), 0x7f5a3e, null, null, SMOOTH, 0.7));
      parts.push(P(box(0.06, 0.06, 1.8).translate(x, 0.75, D / 2 + 1.05), 0x7f5a3e));
    }
    parts.push(P(box(3.2, 0.06, 0.06).translate(0.6, 0.75, D / 2 + 1.95).rotateZ(0.02), 0x7f5a3e));
    parts.push(P(box(3.8, 0.1, 2.4).rotateX(0.18).translate(0, 2.3, D / 2 + 1.1), 0x6f5a4a));
    parts.push(P(box(1.3, 0.06, 0.35).translate(1.2, 0.45, D / 2 + 0.35), 0x8a6446));
    for (const x of [0.65, 1.75]) parts.push(P(box(0.06, 0.45, 0.3).translate(x, 0.22, D / 2 + 0.35), 0x7f5a3e));
    parts.push(P(cyl(0.26, 0.24, 0.7, 14).translate(-1.3, 0.35, D / 2 + 1.5), 0x7a5a3e, null, null, SMOOTH, 0.8));
    parts.push(P(cyl(0.27, 0.27, 0.05, 14).translate(-1.3, 0.2, D / 2 + 1.5), 0x3b3530));
    parts.push(P(cyl(0.27, 0.27, 0.05, 14).translate(-1.3, 0.55, D / 2 + 1.5), 0x3b3530));
    parts.push(P(cyl(0.02, 0.02, 1.3, 6).rotateZ(0.35).translate(-0.9, 0.62, D / 2 + 0.25), 0x8a6446));
    parts.push(P(cyl(0.1, 0.05, 0.3, 8).rotateZ(0.35).translate(-0.72, 0.08, D / 2 + 0.25), 0xc9b36b));

    parts.push(P(box(1.8, 0.02, 1.2).translate(0.2, 0.08, 0.2), 0xa4473a));
    parts.push(P(box(1.2, 0.06, 0.7).translate(1.4, 0.8, -1.2), 0x8a6446));
    for (const [x, z] of [[0.9, -0.95], [1.9, -0.95], [0.9, -1.45], [1.9, -1.45]]) parts.push(P(box(0.06, 0.78, 0.06).translate(x, 0.39, z), 0x7f5a3e));
    parts.push(P(box(0.45, 0.05, 0.45).rotateZ(1.4).translate(0.5, 0.22, -0.3), 0x8a6446));
    parts.push(P(cyl(0.06, 0.05, 0.12, 10).translate(1.3, 0.89, -1.2), 0xd9d5cc));
    parts.push(P(box(1.9, 0.35, 0.95).translate(-1.7, 0.25, -1.65), 0x7f5a3e));
    parts.push(P(box(1.8, 0.14, 0.9).translate(-1.7, 0.48, -1.65), 0xd9573f));
    parts.push(P(box(0.4, 0.12, 0.7).translate(-2.4, 0.6, -1.65), 0xefe6d6));
    parts.push(P(cyl(0.32, 0.36, 0.7, 14).translate(-2.3, 0.4, 0.9), 0x3b3530, null, null, SMOOTH, 0.8));
    parts.push(P(cyl(0.08, 0.08, 1.9, 10).translate(-2.3, 1.7, 0.9), 0x3b3530, null, null, SMOOTH, 0.8));
    parts.push(P(box(0.9, 0.05, 0.25).translate(0, 1.5, -D / 2 + 0.25), 0x8a6446));
    [[-0.3, 0x7fa0b0], [-0.05, 0xc8a14a], [0.25, 0x9cbf74]].forEach(([x, color]) => parts.push(P(cyl(0.06, 0.06, 0.18, 10).translate(x, 1.62, -D / 2 + 0.25), color, null, null, SMOOTH, 0.8)));

    for (let i = 0; i < 9; i++) {
      const a = -0.8 + i * 0.32;
      const fx = Math.sin(a) * 8.2;
      const fz = Math.cos(a) * 8.2 - 1;
      const lean = i === 3 ? 1.2 : i === 6 ? -0.9 : (i % 2) * 0.12;
      parts.push(P(cyl(0.07, 0.08, 1.1, 7).translate(0, 0.55, 0).rotateZ(lean).translate(fx, corner(fx, fz) - floor, fz), 0x8f7a60, null, null, SMOOTH, 0.7));
      if (i < 8 && i !== 3 && i !== 5) {
        const nx = Math.sin(a + 0.32) * 8.2;
        const nz = Math.cos(a + 0.32) * 8.2 - 1;
        const len = Math.hypot(nx - fx, nz - fz);
        for (const hgt of [0.45, 0.85]) parts.push(P(box(len, 0.07, 0.05).rotateY(-Math.atan2(nz - fz, nx - fx)).translate((fx + nx) / 2, corner(fx, fz) - floor + hgt, (fz + nz) / 2), 0x9a8468));
      }
    }

    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const z = -1.2 + i * 0.34 + row * 0.17;
        parts.push(P(cyl(0.16, 0.16, 1.1, 10).rotateX(Math.PI / 2).translate(W / 2 + 0.7, 0.18 + row * 0.3, z), i % 2 ? 0x9a7352 : 0x8a6446, null, null, SMOOTH, 0.6));
        parts.push(P(cyl(0.15, 0.15, 1.12, 10).rotateX(Math.PI / 2).translate(W / 2 + 0.7, 0.18 + row * 0.3, z), 0xd9bd8c));
      }
    }
    parts.push(P(cyl(0.3, 0.34, 0.5, 12).translate(W / 2 + 1.6, 0.25, 1.4), 0x8a6446, null, null, SMOOTH, 0.7));
    parts.push(P(cyl(0.29, 0.29, 0.02, 12).translate(W / 2 + 1.6, 0.51, 1.4), 0xd9bd8c));
    parts.push(P(box(0.05, 0.6, 0.05).rotateZ(0.3).translate(W / 2 + 1.55, 0.75, 1.4), 0x8a6446));
    parts.push(P(box(0.02, 0.14, 0.2).rotateZ(0.3).translate(W / 2 + 1.48, 0.52, 1.4), 0x9aa0a6));

    const vine = [];
    Models.scatterLeaves(vine, { center: new THREE.Vector3(W / 2 + 0.25, 1.4, 1.7), radius: 1.1, count: 42, colors: [...PAPER.leaf, ...PAPER.blossom, ...PAPER.blossom], seed: lm.seed & 0xffff, squash: 1.2, droop: 0.1, size: 0.3, swayFn: null, core: false });
    Models.scatterLeaves(vine, { center: new THREE.Vector3(W / 2 + 0.2, 2.3, 0.3), radius: 0.8, count: 26, colors: [...PAPER.leaf, ...PAPER.blossom], seed: (lm.seed & 0xffff) + 5, size: 0.3, swayFn: null, core: false });
    Models.scatterLeaves(vine, { center: new THREE.Vector3(-1.6, 0.9, D / 2 + 0.25), radius: 0.9, count: 30, colors: [...PAPER.leaf, ...PAPER.blossom, ...PAPER.blossom], seed: (lm.seed & 0xffff) + 9, size: 0.3, swayFn: null, core: false });
    parts.push(...vine);

    const doorParts = [];
    for (let i = 0; i < 5; i++) doorParts.push(P(box(0.19, 1.9, 0.07).translate(0.1 + i * 0.2, 0.95, 0), i % 2 ? 0x6e5238 : 0x7a5c40));
    doorParts.push(P(box(0.95, 0.1, 0.09).translate(0.5, 0.45, 0.02), 0x5e4632));
    doorParts.push(P(box(0.95, 0.1, 0.09).translate(0.5, 1.5, 0.02), 0x5e4632));
    for (const y of [0.45, 1.5]) doorParts.push(P(box(0.3, 0.05, 0.1).translate(0.15, y, 0.03), 0x3b3530));
    doorParts.push(P(new THREE.SphereGeometry(0.04, 8, 6).translate(0.88, 1.0, 0.07), 0xc8a14a));
    const doorGeometry = Models.merge(doorParts);

    const colliders = [];
    boxCollider(colliders, lm, -W / 2, 0, 0.22, D / 2 + 0.2, floor - 1, floor + H, false);
    boxCollider(colliders, lm, W / 2, 0, 0.22, D / 2 + 0.2, floor - 1, floor + H, false);
    boxCollider(colliders, lm, 0, -D / 2, W / 2 + 0.2, 0.22, floor - 1, floor + H, false);
    boxCollider(colliders, lm, -(W / 4 + 0.28), D / 2, W / 4 - 0.25, 0.22, floor - 1, floor + H, false);
    boxCollider(colliders, lm, W / 4 + 0.28, D / 2, W / 4 - 0.25, 0.22, floor - 1, floor + H, false);
    boxCollider(colliders, lm, 0, 0, W / 2, D / 2, base, floor + 0.07, true);
    boxCollider(colliders, lm, 0, D / 2 + 1.05, 1.7, 0.95, base, floor + 0.02, true);
    boxCollider(colliders, lm, 0, D / 2 + 2.2, 0.8, 0.3, base, floor - 0.38, true);
    boxCollider(colliders, lm, -W / 2 - 0.1, -1.2, 0.34, 0.34, floor - 1, floor + 4, false);
    boxCollider(colliders, lm, W / 2 + 0.7, -0.7, 0.2, 0.7, floor - 1, floor + 0.8, true);
    boxCollider(colliders, lm, 1.4, -1.2, 0.6, 0.35, floor - 1, floor + 0.85, false);
    boxCollider(colliders, lm, -1.7, -1.65, 0.95, 0.5, floor - 1, floor + 0.55, true);

    return { geometry: Models.merge(parts), extras: [{ geometry: doorGeometry, position: [-0.5, 0, D / 2], rotationY: -1.1 }], floor, colliders, smoke: { x: -W / 2 - 0.12, y: 4.1, z: -1.2, size: 0.45 } };
  }

  function plane(lm) {
    const ground = Terrain.heightAt(lm.x, lm.z);
    const parts = [];
    const cream = 0xefe6d6;
    const red = 0xc8583f;
    const glassColor = 0x4a6070;
    const body = [];
    const profile = [[0.0, -3.9], [0.35, -3.7], [0.55, -3.1], [0.72, -2.0], [0.86, -0.8], [0.92, 0.6], [0.9, 2.0], [0.82, 3.0], [0.74, 3.6], [0.0, 3.62]]
      .map(([r, z]) => new THREE.Vector2(r, z));
    const hull = new THREE.LatheGeometry(profile, 24).rotateX(Math.PI / 2);
    body.push(P(hull, cream, null, (x, y) => 0.82 + 0.18 * clamp01(y / 0.9 * 0.5 + 0.5), SMOOTH, 0.9));
    for (const z of [-2.6, -1.2, 0.2, 1.6, 2.8]) body.push(P(new THREE.TorusGeometry(0.9 - Math.abs(z) * 0.03, 0.012, 4, 24).translate(0, 0, z), 0xb9b2a6));
    body.push(P(new THREE.CylinderGeometry(0.925, 0.925, 0.45, 24, 1, true).rotateX(Math.PI / 2).translate(0, 0, 1.15), red, null, null, SMOOTH, 0.9));
    body.push(P(new THREE.CylinderGeometry(0.86, 0.86, 0.12, 24, 1, true).rotateX(Math.PI / 2).translate(0, 0, -1.6), red, null, null, SMOOTH, 0.9));
    body.push(P(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.6, 1.3).translate(0, 0.62, 2.0), glassColor, null, null, SMOOTH, 0.9));
    for (let i = 0; i < 5; i++) {
      for (const sx of [1, -1]) body.push(P(new THREE.SphereGeometry(0.13, 10, 8).scale(0.25, 1, 1.2).translate(sx * 0.9, 0.22, 0.9 - i * 0.8), glassColor, null, null, SMOOTH, 0.9));
    }
    body.push(P(new THREE.CylinderGeometry(0.72, 0.74, 0.6, 24).rotateX(Math.PI / 2).translate(0, 0, 3.85), 0x8a8680, null, null, SMOOTH, 0.9));
    for (const z of [3.65, 3.85, 4.05]) body.push(P(new THREE.TorusGeometry(0.73, 0.02, 4, 24).translate(0, 0, z), 0x5e5a56));
    body.push(P(new THREE.ConeGeometry(0.28, 0.5, 16).rotateX(Math.PI / 2).translate(0, 0, 4.4), 0xc8a14a, null, null, SMOOTH, 0.9));
    [[0.2, 0.6], [2.3, -1.2], [4.3, 0.4]].forEach(([a, bend]) => {
      body.push(P(RB(0.2, 1.25, 0.05, 0.02).translate(0, 0.62, 0).rotateX(bend * 0.45).rotateZ(a).translate(0, 0, 4.55), 0x5e5a56));
    });
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -0.85);
    wingShape.lineTo(4.6, -0.55);
    wingShape.quadraticCurveTo(5.1, -0.2, 4.6, 0.2);
    wingShape.lineTo(0, 0.85);
    const wing = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 2, curveSegments: 8 });
    wing.rotateX(Math.PI / 2).translate(0.5, -0.1, 0.6);
    body.push(P(wing, cream));
    body.push(P(RB(0.8, 0.16, 1.0, 0.05).translate(4.8, -0.12, 0.6), red));
    body.push(P(box(3.6, 0.02, 0.04).translate(2.9, -0.02, 0.05), 0x9a948a));
    body.push(P(box(1.0, 0.13, 1.5).translate(-1.0, -0.14, 0.6), cream));
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(-1.8, 0);
    finShape.lineTo(-2.1, 1.7);
    finShape.quadraticCurveTo(-1.6, 1.9, -1.3, 1.5);
    finShape.lineTo(0, 0);
    const fin = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
    fin.rotateY(Math.PI / 2).translate(-0.04, 0.35, -2.1);
    body.push(P(fin, red));
    const stab = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 6 });
    stab.scale(0.34, 0.5, 1).rotateX(Math.PI / 2);
    body.push(P(stab.clone().translate(0.2, 0.25, -3.4), cream));
    body.push(P(stab.clone().scale(-1, 1, 1).translate(-0.2, 0.25, -3.4), cream));
    for (const sx of [1.1, -1.1]) {
      body.push(P(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 8).translate(sx, -0.55, 1.2).rotateZ(sx * 0.15), 0x5e5a56));
    }
    body.push(P(new THREE.TorusGeometry(0.28, 0.1, 8, 16).rotateY(Math.PI / 2).translate(1.2, -0.95, 1.2), 0x2f2c2a, null, null, SMOOTH, 0.8));
    body.push(P(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12).rotateZ(Math.PI / 2).translate(1.2, -0.95, 1.2), 0x9a948a));
    const bodyGeometry = Models.merge(body);
    bodyGeometry.rotateZ(0.16);
    bodyGeometry.rotateX(-0.2);
    bodyGeometry.translate(0, 0.75, 0);
    parts.push(bodyGeometry);

    const brokenWing = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 2, curveSegments: 8 });
    brokenWing.rotateX(Math.PI / 2).translate(-2.3, 0, 0);
    const brokenParts = [P(brokenWing, cream), P(RB(0.8, 0.16, 1.0, 0.05).translate(2.4, -0.02, 0), red), P(box(0.5, 0.3, 0.4).translate(-2.3, 0.05, 0), 0x6e6a64)];
    const bw = Models.merge(brokenParts);
    bw.rotateZ(0.12).rotateY(0.9).translate(-5.2, 0.28, -2.2);
    parts.push(bw);

    const rng = mulberry32(lm.seed);
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2;
      const d = 3.5 + rng() * 7;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = Terrain.heightAt(lm.x + x, lm.z + z) - ground;
      parts.push(P(RB(0.3 + rng() * 0.7, 0.05, 0.3 + rng() * 0.5, 0.02).rotateY(rng() * 3).rotateX((rng() - 0.5) * 0.6).translate(x, y + 0.06, z), i % 3 ? cream : 0x8a8680));
    }
    parts.push(P(new THREE.TorusGeometry(0.28, 0.1, 8, 16).rotateX(0.2).translate(2.4, 0.3, -2.8), 0x2f2c2a, null, null, SMOOTH, 0.8));
    parts.push(P(RB(0.6, 0.7, 0.6, 0.08).rotateY(0.6).translate(-2.6, 0.35, 2.8), 0x8a6a4a));
    parts.push(P(RB(0.55, 0.12, 0.55, 0.05).rotateY(0.6).translate(-2.6, 0.72, 2.8), 0xa4473a));
    parts.push(P(RB(0.7, 0.45, 0.25, 0.06).rotateY(1.9).translate(3.2, 0.2, 3.4), 0x7a5c40));
    parts.push(P(box(0.25, 0.04, 0.04).rotateY(1.9).translate(3.2, 0.44, 3.4), 0x3b3530));

    const scorch = [];
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2;
      const a1 = ((i + 1) / 18) * Math.PI * 2;
      const r0 = 4.5 + rng() * 1.8;
      const r1 = 4.5 + rng() * 1.8;
      scorch.push([0, 0.04, 2], [Math.cos(a1) * r1, 0.04, 2 + Math.sin(a1) * r1], [Math.cos(a0) * r0, 0.04, 2 + Math.sin(a0) * r0]);
    }
    const scorchGeometry = Models.fromTriangles(scorch);
    const pos = scorchGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, Terrain.heightAt(lm.x + pos.getX(i), lm.z + pos.getZ(i)) - ground + 0.05);
    parts.push(P(scorchGeometry, 0x5a5048, null, (x, y, z) => 0.8 + 0.2 * clamp01(Math.hypot(x, z - 2) / 6), (x, y, z, out) => out.set(0, 1, 0), 1));

    const colliders = [];
    const fuselageTop = ground + 1.6;
    boxCollider(colliders, lm, 0, 1.2, 0.9, 2.4, ground - 1, fuselageTop, true);
    boxCollider(colliders, lm, 0, -2.6, 0.8, 1.6, ground - 1, fuselageTop + 0.15, true);
    boxCollider(colliders, lm, 0, 3.5, 0.7, 1.0, ground - 1, ground + 0.9, true);
    boxCollider(colliders, lm, 3.1, 0.6, 2.4, 0.8, ground - 1, ground + 0.95, true);
    boxCollider(colliders, lm, 0, -5.3, 0.25, 0.8, ground - 1, ground + 3, false);
    boxCollider(colliders, lm, -5.2, -2.2, 2.2, 0.8, ground - 1, ground + 0.4, true, 0.9);

    return { geometry: Models.merge(parts), extras: [], floor: ground, colliders, smoke: { x: 0, y: 0.9, z: 4.4, size: 1 } };
  }

  function build(lm) {
    return lm.type === LANDMARK.CABIN ? cabin(lm) : plane(lm);
  }

  return { build };
})();

class SmokePlumes {
  constructor(scene, materials) {
    this.scene = scene;
    this.geometry = flatShaded(new THREE.IcosahedronGeometry(0.6, 0));
    this.material = materials.toon(0xb9b5ae, { transparent: true, opacity: 0.6, depthWrite: false });
    this.emitters = new Map();
  }

  add(key, position, size = 1) {
    if (this.emitters.has(key)) return;
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      puffs.push({ mesh, age: (i / 16) * 7, seed: Math.random() * 10 });
    }
    this.emitters.set(key, { position: position.clone(), puffs, size });
  }

  remove(key) {
    const emitter = this.emitters.get(key);
    if (!emitter) return;
    for (const puff of emitter.puffs) {
      this.scene.remove(puff.mesh);
      puff.mesh.material.dispose();
    }
    this.emitters.delete(key);
  }

  update(dt, wind) {
    for (const emitter of this.emitters.values()) {
      for (const puff of emitter.puffs) {
        puff.age += dt;
        if (puff.age > 7) puff.age -= 7;
        const t = puff.age / 7;
        const m = puff.mesh;
        m.visible = true;
        m.position.set(
          emitter.position.x + t * 6 * wind + Math.sin(puff.seed + t * 5) * 0.6,
          emitter.position.y + t * 26 * emitter.size,
          emitter.position.z + t * 2 * wind + Math.cos(puff.seed + t * 4) * 0.6
        );
        m.scale.setScalar((0.6 + t * 4.2) * emitter.size);
        m.rotation.set(puff.seed + t, puff.seed * 2 + t * 0.5, 0);
        m.material.opacity = Math.min(1, t * 6) * (1 - t) * 0.55;
      }
    }
  }
}
