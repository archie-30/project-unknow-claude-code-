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
      for (let attempt = 0; attempt < 10 && !result; attempt++) {
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
          if (home && Math.hypot(home.x - x, home.z - z) < 220) continue;
        }
        if (!flatEnough(x, z)) continue;
        const biome = Terrain.biomeAt(x, z, Terrain.heightAt(x, z));
        let type = suitsCabin(biome) && rng() < 0.5 ? LANDMARK.CABIN : LANDMARK.PLANE;
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

  function cabin(lm) {
    const c = Math.cos(lm.rotation);
    const s = Math.sin(lm.rotation);
    const corner = (lx, lz) => Terrain.heightAt(lm.x + lx * c + lz * s, lm.z - lx * s + lz * c);
    const samples = [[-3.2, -2.7], [3.2, -2.7], [-3.2, 4.2], [3.2, 4.2], [0, 0]].map(([x, z]) => corner(x, z));
    const floor = Math.max(...samples) + 0.25;
    const base = Math.min(...samples) - 0.6;
    const parts = [];
    const logColors = [0x8a6446, 0x9a7352, 0x7f5a3e];
    const W = 5.6;
    const D = 4.6;
    const H = 2.4;
    const r = 0.15;
    const logs = Math.round(H / (r * 2));

    parts.push(P(box(W + 0.6, floor - base, D + 0.6).translate(0, (base - floor) / 2, 0), 0x9b958a, null, (x, y) => 0.8 + 0.2 * clamp01(1 + y / 2)));
    parts.push(P(box(W + 0.2, 0.1, D + 0.2).translate(0, 0.02, 0), 0xa98463));

    const wallLog = (length, axis, x, y, z, color) => {
      const g = cyl(r, r, length, 7).rotateZ(Math.PI / 2);
      if (axis === 'z') g.rotateY(Math.PI / 2);
      parts.push(P(g.translate(x, y, z), color, null, (px, py) => 0.85 + 0.15 * clamp01((py - y) / r * 0.5 + 0.5)));
    };
    for (let i = 0; i < logs; i++) {
      const y = r + i * r * 2 + 0.07;
      const color = logColors[i % logColors.length];
      wallLog(D + 0.5, 'z', -W / 2, y, 0, color);
      const windowRow = y > 0.9 && y < 1.7;
      if (windowRow) {
        wallLog(1.5, 'z', W / 2, y, -1.45, color);
        wallLog(1.5, 'z', W / 2, y, 1.45, color);
      } else {
        wallLog(D + 0.5, 'z', W / 2, y, 0, color);
      }
      wallLog(W + 0.5, 'x', 0, y, -D / 2, color);
      if (y < 2.0) {
        wallLog(W / 2 - 0.55, 'x', -(W / 4 + 0.28), y, D / 2, color);
        wallLog(W / 2 - 0.55, 'x', W / 4 + 0.28, y, D / 2, color);
      } else {
        wallLog(W + 0.5, 'x', 0, y, D / 2, color);
      }
    }
    parts.push(P(box(0.12, 0.9, 1.5).translate(W / 2 + 0.02, 1.3, 0), 0x6e5238));
    parts.push(P(box(0.14, 0.08, 1.6).translate(W / 2 + 0.05, 0.85, 0), 0x6e5238));

    const pitch = 0.55;
    const slope = (W / 2 + 0.5) / Math.cos(pitch);
    const roofY = H + 0.1 + Math.tan(pitch) * (W / 4 + 0.25);
    const roofPanel = (side, z, length, color) => {
      parts.push(P(box(slope, 0.12, length).translate(0, 0, 0).rotateZ(-side * pitch).translate(side * (W / 4 + 0.25), roofY, z), color, null, () => 0.9));
    };
    roofPanel(1, 0, D + 0.9, 0x6f5a4a);
    roofPanel(-1, -1.4, 2.1, 0x7a6352);
    roofPanel(-1, 1.85, 1.2, 0x7a6352);
    for (let i = 0; i < 7; i++) {
      parts.push(P(box(slope + 0.02, 0.03, 0.08).rotateZ(-pitch).translate(W / 4 + 0.25, roofY + 0.08, -D / 2 + i * 0.75), 0x5e4a3c));
    }
    const gable = Models.fromTriangles([[-W / 2 - 0.2, H + 0.1, 0], [W / 2 + 0.2, H + 0.1, 0], [0, H + 0.1 + Math.tan(pitch) * (W / 2 + 0.3), 0]]);
    parts.push(P(gable.clone().translate(0, 0, D / 2 + 0.1), 0x8a6446));
    parts.push(P(gable.clone().translate(0, 0, -D / 2 - 0.1), 0x8a6446));

    for (let i = 0; i < 6; i++) {
      const w = 0.62 - (i % 2) * 0.06;
      parts.push(P(box(w, 0.42, w).translate(-W / 2 - 0.1, 0.3 + i * 0.44, -1.2), i % 2 ? 0xa39d92 : 0x938d83, null, () => 0.9 + (i % 3) * 0.04));
    }
    parts.push(P(box(0.56, 0.9, 0.56).translate(-W / 2 - 0.1, H + 1.5, -1.2), 0x938d83));

    parts.push(P(box(3.4, 0.14, 1.9).translate(0, -0.05, D / 2 + 1.05), 0xa98463));
    parts.push(P(box(1.6, 0.14, 0.6).translate(0, -0.45, D / 2 + 2.2), 0x9a7856));
    for (const x of [-1.6, 1.6]) parts.push(P(cyl(0.08, 0.1, 2.3, 6).translate(x, 1.1, D / 2 + 1.9), 0x7f5a3e));
    parts.push(P(box(3.8, 0.1, 2.3).rotateX(0.18).translate(0, 2.3, D / 2 + 1.1), 0x6f5a4a));

    for (let i = 0; i < 9; i++) {
      const a = -0.8 + i * 0.32;
      const fx = Math.sin(a) * 8.2;
      const fz = Math.cos(a) * 8.2 - 1;
      const lean = i === 3 ? 1.2 : i === 6 ? -0.9 : (i % 2) * 0.12;
      parts.push(P(box(0.14, 1.1, 0.14).translate(0, 0.55, 0).rotateZ(lean).translate(fx, corner(fx, fz) - floor, fz), 0x8f7a60));
      if (i < 8 && i !== 3 && i !== 5) {
        const nx = Math.sin(a + 0.32) * 8.2;
        const nz = Math.cos(a + 0.32) * 8.2 - 1;
        const len = Math.hypot(nx - fx, nz - fz);
        parts.push(P(box(len, 0.08, 0.06).rotateY(-Math.atan2(nz - fz, nx - fx)).translate((fx + nx) / 2, corner(fx, fz) - floor + 0.75, (fz + nz) / 2), 0x9a8468));
      }
    }

    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        parts.push(P(cyl(0.16, 0.16, 1.1, 7).rotateX(Math.PI / 2).translate(W / 2 + 0.7, 0.18 + row * 0.3, -1.2 + i * 0.34 + row * 0.17), i % 2 ? 0x9a7352 : 0x8a6446));
      }
    }
    parts.push(P(cyl(0.3, 0.26, 0.8, 9).translate(-2.1, 0.4, D / 2 + 1.4), 0x7a5a3e));

    const vine = [];
    Models.scatterLeaves(vine, { center: new THREE.Vector3(W / 2 + 0.25, 1.4, 1.7), radius: 1.1, count: 34, colors: [...PAPER.leaf, ...PAPER.blossom, ...PAPER.blossom], seed: lm.seed & 0xffff, squash: 1.2, droop: 0.1, size: 0.34, swayFn: null, core: false });
    Models.scatterLeaves(vine, { center: new THREE.Vector3(W / 2 + 0.2, 2.3, 0.3), radius: 0.8, count: 22, colors: [...PAPER.leaf, ...PAPER.blossom], seed: (lm.seed & 0xffff) + 5, size: 0.32, swayFn: null, core: false });
    Models.scatterLeaves(vine, { center: new THREE.Vector3(-1.6, 0.9, D / 2 + 0.25), radius: 0.9, count: 24, colors: [...PAPER.leaf, ...PAPER.blossom, ...PAPER.blossom], seed: (lm.seed & 0xffff) + 9, size: 0.32, swayFn: null, core: false });
    parts.push(...vine);

    const door = P(box(1.0, 1.9, 0.08).translate(0.5, 0.95, 0), 0x6e5238);
    const doorGeometry = Models.merge([door, P(box(0.08, 0.08, 0.1).translate(0.85, 1.0, 0.05), 0xc9ccd1)]);

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

    return { geometry: Models.merge(parts), extras: [{ geometry: doorGeometry, position: [-0.5, 0, D / 2], rotationY: -1.1 }], floor, colliders, smoke: null };
  }

  function plane(lm) {
    const ground = Terrain.heightAt(lm.x, lm.z);
    const parts = [];
    const cream = 0xefe6d6;
    const red = 0xc8583f;
    const fuselageTilt = -0.2;
    const roll = 0.16;
    const body = [];
    body.push(P(cyl(0.9, 0.75, 7, 10).rotateX(Math.PI / 2), cream, null, (x, y) => 0.8 + 0.2 * clamp01(y / 0.9 * 0.5 + 0.5)));
    body.push(P(cyl(0.93, 0.9, 0.5, 10).rotateX(Math.PI / 2).translate(0, 0, 1.2), red));
    body.push(P(cyl(0.78, 0.5, 2.4, 10).rotateX(Math.PI / 2).translate(0, 0.1, -4.6), cream, null, (x, y) => 0.8 + 0.2 * clamp01(y / 0.8 * 0.5 + 0.5)));
    body.push(P(new THREE.ConeGeometry(0.72, 1.2, 10).rotateX(Math.PI / 2).translate(0, 0, 4.1), 0xb9b2a6));
    body.push(P(box(1.0, 0.4, 1.3).translate(0, 0.78, 2.1), 0x3f5566));
    for (let i = 0; i < 5; i++) {
      body.push(P(box(0.05, 0.26, 0.34).translate(0.9, 0.25, 1.2 - i * 0.9), 0x3f5566));
      body.push(P(box(0.05, 0.26, 0.34).translate(-0.9, 0.25, 1.2 - i * 0.9), 0x3f5566));
    }
    body.push(P(Models.fromTriangles([[0, 0.5, -3.8], [0, 2.4, -6.0], [0, 0.5, -5.8]]), red));
    body.push(P(Models.fromTriangles([[0, 0.5, -3.8], [0, 0.5, -5.8], [0, 2.4, -6.0]]), red));
    body.push(P(box(3.2, 0.08, 0.9).translate(0, 0.35, -5.3), cream));
    body.push(P(box(4.8, 0.14, 1.6).translate(3.1, -0.15, 0.6).rotateZ(-0.06), cream));
    body.push(P(box(0.9, 0.16, 1.62).translate(4.6, -0.12, 0.6), red));
    body.push(P(box(1.2, 0.14, 1.6).translate(-1.4, -0.15, 0.6), cream));
    body.push(P(new THREE.OctahedronGeometry(0.3, 0).translate(0, 0, 4.75), 0x6e6a64));
    [[0.2, 0.6], [2.2, -1.1], [4.2, 0.35]].forEach(([a, bend]) => {
      body.push(P(box(0.18, 1.3, 0.05).translate(0, 0.62, 0).rotateX(bend * 0.4).rotateZ(a).translate(0, 0, 4.8), 0x5e5a56));
    });
    const bodyGeometry = Models.merge(body);
    bodyGeometry.rotateZ(roll);
    bodyGeometry.rotateX(fuselageTilt);
    bodyGeometry.translate(0, 0.75, 0);
    parts.push(bodyGeometry);

    const brokenWing = Models.merge([
      P(box(4.4, 0.14, 1.6), cream),
      P(box(0.9, 0.16, 1.62).translate(-1.8, 0, 0), red),
      P(box(0.4, 0.3, 0.3).translate(2.1, 0.1, 0.2), 0x6e6a64),
    ]);
    brokenWing.rotateZ(0.12).rotateY(0.9).translate(-5.2, 0.25, -2.2);
    parts.push(brokenWing);

    const rng = mulberry32(lm.seed);
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2;
      const d = 3.5 + rng() * 7;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = Terrain.heightAt(lm.x + x, lm.z + z) - ground;
      parts.push(P(box(0.3 + rng() * 0.7, 0.05, 0.3 + rng() * 0.5).rotateY(rng() * 3).rotateX((rng() - 0.5) * 0.6).translate(x, y + 0.06, z), i % 3 ? cream : 0x8a8680));
    }
    parts.push(P(cyl(0.34, 0.34, 0.2, 10).rotateZ(Math.PI / 2).translate(2.4, 0.3, -2.8), 0x3b3a38));
    parts.push(P(box(0.6, 0.7, 0.6).rotateY(0.6).translate(-2.6, 0.35, 2.8), 0x8a6a4a));

    const scorch = [];
    for (let i = 0; i < 14; i++) {
      const a0 = (i / 14) * Math.PI * 2;
      const a1 = ((i + 1) / 14) * Math.PI * 2;
      const r0 = 4.5 + rng() * 1.8;
      const r1 = 4.5 + rng() * 1.8;
      scorch.push([0, 0.04, 2], [Math.cos(a1) * r1, 0.04, 2 + Math.sin(a1) * r1], [Math.cos(a0) * r0, 0.04, 2 + Math.sin(a0) * r0]);
    }
    const scorchGeometry = Models.fromTriangles(scorch);
    const pos = scorchGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, Terrain.heightAt(lm.x + pos.getX(i), lm.z + pos.getZ(i)) - ground + 0.05);
    parts.push(P(scorchGeometry, 0x5a5048));

    const colliders = [];
    const fuselageTop = ground + 1.6;
    boxCollider(colliders, lm, 0, 1.2, 0.9, 2.4, ground - 1, fuselageTop, true);
    boxCollider(colliders, lm, 0, -2.6, 0.8, 1.6, ground - 1, fuselageTop + 0.15, true);
    boxCollider(colliders, lm, 0, 3.5, 0.7, 1.0, ground - 1, ground + 0.9, true);
    boxCollider(colliders, lm, 3.1, 0.6, 2.4, 0.8, ground - 1, ground + 0.95, true);
    boxCollider(colliders, lm, 0, -5.3, 0.25, 0.8, ground - 1, ground + 3, false);
    boxCollider(colliders, lm, -5.2, -2.2, 2.2, 0.8, ground - 1, ground + 0.4, true, 0.9);

    return { geometry: Models.merge(parts), extras: [], floor: ground, colliders, smoke: { x: 0, y: 0.9, z: 4.4 } };
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

  add(key, position) {
    if (this.emitters.has(key)) return;
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      puffs.push({ mesh, age: (i / 16) * 7, seed: Math.random() * 10 });
    }
    this.emitters.set(key, { position: position.clone(), puffs });
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
          emitter.position.y + t * 26,
          emitter.position.z + t * 2 * wind + Math.cos(puff.seed + t * 4) * 0.6
        );
        m.scale.setScalar(0.6 + t * 4.2);
        m.rotation.set(puff.seed + t, puff.seed * 2 + t * 0.5, 0);
        m.material.opacity = Math.min(1, t * 6) * (1 - t) * 0.55;
      }
    }
  }
}
