const PAPER = {
  leafDark: 0x5f8550,
  leaf: [0x6f9a58, 0x7fa862, 0x8db46b, 0x9cbf74],
  birch: [0xa9c46a, 0xb8cf78, 0x9dbb5f],
  pine: [0x4f7a52, 0x5b885a, 0x6a9664],
  olive: [0x8e9a52, 0x9ea85e, 0x86924c],
  blossom: [0xf0a23a, 0xf6b44d, 0xe8902c, 0xf7c46a],
  bark: 0x7d5c40,
  barkLight: 0x9a7552,
  birchBark: 0xf0ece2,
  cream: 0xf3ead8,
  stone: 0xbdb8ae,
  snow: 0xc2cdd3,
};

const Models = (() => {
  const Z = new THREE.Vector3(0, 0, 1);
  const tmpQ = new THREE.Quaternion();
  const tmpRoll = new THREE.Quaternion();
  const tmpM = new THREE.Matrix4();
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);

  const tmpN = new THREE.Vector3();
  const UP_NORMAL = (x, y, z, out) => out.set(0, 1, 0);

  function part(geometry, color, swayFn = null, shadeFn = null, normalFn = null, normalBlend = 0.8) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g.attributes.uv) g.deleteAttribute('uv');
    g.computeVertexNormals();
    const position = g.attributes.position;
    if (normalFn) {
      const normal = g.attributes.normal;
      for (let i = 0; i < position.count; i++) {
        normalFn(position.getX(i), position.getY(i), position.getZ(i), tmpN);
        tmpN.normalize().multiplyScalar(normalBlend);
        tmpN.x += normal.getX(i) * (1 - normalBlend);
        tmpN.y += normal.getY(i) * (1 - normalBlend);
        tmpN.z += normal.getZ(i) * (1 - normalBlend);
        tmpN.normalize();
        normal.setXYZ(i, tmpN.x, tmpN.y, tmpN.z);
      }
    }
    const base = new THREE.Color(color);
    const colors = new Float32Array(position.count * 3);
    const sway = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const shade = shadeFn ? shadeFn(x, y, z) : 1;
      colors[i * 3] = base.r * shade;
      colors[i * 3 + 1] = base.g * shade;
      colors[i * 3 + 2] = base.b * shade;
      sway[i] = swayFn ? swayFn(y) : 0;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('sway', new THREE.BufferAttribute(sway, 1));
    return g;
  }

  function merge(parts) {
    const out = new THREE.BufferGeometry();
    const total = parts.reduce((sum, p) => sum + p.attributes.position.count, 0);
    for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['sway', 1]]) {
      const array = new Float32Array(total * size);
      let offset = 0;
      for (const p of parts) {
        array.set(p.attributes[name].array, offset);
        offset += p.attributes[name].array.length;
      }
      out.setAttribute(name, new THREE.BufferAttribute(array, size));
    }
    return out;
  }

  function fromTriangles(points) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    return g;
  }

  function leafGeometry(length, width, fold) {
    const L = length;
    const B = [0, 0, 0];
    const M = [0, 0, 0.5 * L];
    const T = [0, 0, L];
    const L1 = [-width, fold, 0.32 * L];
    const L2 = [-0.62 * width, fold * 0.8, 0.72 * L];
    const R1 = [width, fold, 0.32 * L];
    const R2 = [0.62 * width, fold * 0.8, 0.72 * L];
    return fromTriangles([B, L1, M, L1, L2, M, L2, T, M, B, M, R1, R1, M, R2, R2, M, T]);
  }

  function orient(geometry, position, direction, roll, scale = 1) {
    tmpQ.setFromUnitVectors(Z, direction);
    tmpRoll.setFromAxisAngle(direction, roll);
    tmpQ.premultiply(tmpRoll);
    geometry.applyMatrix4(tmpM.compose(position, tmpQ, ONE.clone().multiplyScalar(scale)));
    return geometry;
  }

  function scatterLeaves(parts, options) {
    const {
      center, radius, count, colors, seed, squash = 1, droop = 0.3, size = 0.6, width = 0.33,
      swayFn = canopySway, core = true, coreColor = PAPER.leafDark,
    } = options;
    const rng = mulberry32(seed);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const radial = (x, y, z, out) => out.set(x - center.x, (y - center.y) / Math.max(squash, 0.3) + radius * 0.35, z - center.z);
    if (core) {
      parts.push(part(
        new THREE.IcosahedronGeometry(radius * 0.72, 1).scale(1, squash, 1).translate(center.x, center.y, center.z),
        coreColor, swayFn, (x, y) => 0.8 + 0.2 * clamp01((y - center.y) / radius + 0.5), radial, 0.9
      ));
    }
    for (let i = 0; i < count; i++) {
      const v = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - v * v);
      const theta = golden * i;
      tmpDir.set(Math.cos(theta) * r, v, Math.sin(theta) * r);
      const reach = radius * (0.72 + rng() * 0.32);
      tmpPos.set(center.x + tmpDir.x * reach, center.y + tmpDir.y * reach * squash, center.z + tmpDir.z * reach);
      const light = 0.72 + 0.28 * (tmpDir.y * 0.5 + 0.5);
      tmpDir.y = tmpDir.y * squash - droop;
      tmpDir.normalize();
      const leafSize = size * (0.8 + rng() * 0.45);
      const geometry = orient(leafGeometry(leafSize, leafSize * width * 1.6, leafSize * 0.14), tmpPos, tmpDir, rng() * Math.PI * 2);
      const color = colors[Math.floor(rng() * colors.length)];
      const tint = light * (0.94 + rng() * 0.1);
      parts.push(part(geometry, color, swayFn, () => tint, radial, 0.85));
    }
  }

  function paperFlower(parts, x, y, z, petalColor, size, swayFn, seed, petals = 5) {
    const rng = mulberry32(seed);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + rng() * 0.3;
      const dir = new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize();
      parts.push(part(orient(leafGeometry(size, size * 0.45, size * 0.1), new THREE.Vector3(x, y, z), dir, 0), petalColor, swayFn));
    }
    parts.push(part(new THREE.OctahedronGeometry(size * 0.28, 0).translate(x, y + size * 0.08, z), 0xf7d36b, swayFn));
  }

  const canopySway = (y) => smoothstep(1.0, 4.5, y);
  const tipSway = (height) => (y) => clamp01(y / height);
  const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
  const trunkShade = (h) => (x, y) => 0.78 + 0.22 * clamp01(y / h);
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function fringeCone(radius, height, segments, seed) {
    const rng = mulberry32(seed);
    const tris = [];
    const apex = [0, height, 0];
    const ring = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const notch = i % 2 === 0 ? 1 : 0.8;
      const drop = i % 2 === 0 ? 0 : height * 0.12;
      const r = radius * notch * (0.94 + rng() * 0.12);
      ring.push([Math.cos(a) * r, drop, Math.sin(a) * r]);
    }
    for (let i = 0; i < segments; i++) tris.push(apex, ring[(i + 1) % segments], ring[i]);
    return fromTriangles(tris);
  }

  function pine(snowy) {
    const parts = [part(cyl(0.11, 0.18, 1.4, 6).translate(0, 0.7, 0), PAPER.bark, null, trunkShade(1.4))];
    const tiers = [[1.45, 1.8, 1.05], [1.15, 1.6, 1.85], [0.85, 1.45, 2.6], [0.5, 1.2, 3.35]];
    tiers.forEach(([r, h, y], i) => {
      const color = PAPER.pine[Math.min(i, PAPER.pine.length - 1)];
      const coneNormal = (x, py, z, out) => out.set(x, r * 0.55, z);
      parts.push(part(fringeCone(r, h, 18, 20 + i).rotateY(i * 0.4).translate(0, y, 0), color, canopySway, (x, py) => 0.72 + 0.28 * clamp01((py - y) / h + 0.15), coneNormal, 0.75));
      if (snowy) parts.push(part(fringeCone(r * 0.62, h * 0.42, 14, 40 + i).rotateY(i * 0.4).translate(0, y + h * 0.58, 0), PAPER.snow, canopySway, null, coneNormal, 0.75));
    });
    return merge(parts);
  }

  function broadleaf(blossom = false) {
    const parts = [
      part(cyl(0.13, 0.22, 2.1, 6).translate(0, 1.05, 0), PAPER.bark, null, trunkShade(2.1)),
      part(cyl(0.05, 0.08, 0.9, 5).rotateZ(-0.9).translate(0.42, 1.75, 0), PAPER.bark),
      part(cyl(0.04, 0.07, 0.8, 5).rotateZ(0.8).rotateY(1.1).translate(-0.3, 1.9, -0.3), PAPER.bark),
    ];
    const colors = blossom ? [...PAPER.leaf, ...PAPER.blossom, ...PAPER.blossom] : PAPER.leaf;
    const clusters = [[v3(0, 2.95, 0), 1.2, 44], [v3(0.85, 2.5, 0.25), 0.9, 28], [v3(-0.75, 2.6, -0.35), 0.85, 26], [v3(0.1, 3.6, -0.15), 0.8, 24]];
    clusters.forEach(([center, radius, count], i) => scatterLeaves(parts, { center, radius, count: Math.round(count * 1.2), colors, seed: 11 + i * 7 + (blossom ? 100 : 0), size: 0.5 }));
    return merge(parts);
  }

  function birch() {
    const parts = [part(cyl(0.08, 0.12, 3.5, 7).translate(0, 1.75, 0), PAPER.birchBark, null, trunkShade(3.5))];
    [0.5, 1.1, 1.6, 2.3, 2.9].forEach((y, i) => {
      const r = 0.092 + (3.5 - y) * 0.011;
      parts.push(part(cyl(r, r, 0.06, 7).rotateY(i).translate(0, y, 0), 0x4a4640));
    });
    [[v3(0, 3.55, 0), 0.85, 30], [v3(0.35, 2.95, 0.2), 0.62, 20], [v3(-0.32, 3.05, -0.2), 0.55, 18]].forEach(([center, radius, count], i) => {
      scatterLeaves(parts, { center, radius, count, colors: PAPER.birch, seed: 60 + i, squash: 1.35, size: 0.45, coreColor: 0x8faa55 });
    });
    return merge(parts);
  }

  function acacia() {
    const parts = [
      part(cyl(0.1, 0.18, 2.6, 6).rotateZ(0.12).translate(-0.15, 1.3, 0), PAPER.bark, null, trunkShade(2.6)),
      part(cyl(0.05, 0.08, 1.2, 5).rotateZ(-0.8).translate(0.35, 2.55, 0.1), PAPER.bark),
      part(cyl(0.05, 0.08, 1.1, 5).rotateZ(0.9).rotateY(1.2).translate(-0.4, 2.6, -0.3), PAPER.bark),
    ];
    [[v3(0, 3.05, 0), 1.9, 46], [v3(0.95, 3.3, 0.35), 1.2, 26], [v3(-0.95, 3.25, -0.4), 1.1, 22]].forEach(([center, radius, count], i) => {
      scatterLeaves(parts, { center, radius, count, colors: PAPER.olive, seed: 80 + i, squash: 0.28, droop: 0.05, size: 0.55, coreColor: 0x7a8646 });
    });
    return merge(parts);
  }

  function cactus() {
    const green = 0x76a067;
    const shade = (x, y) => 0.82 + 0.18 * clamp01(y / 2.4);
    return merge([
      part(cyl(0.28, 0.32, 2.2, 8).translate(0, 1.1, 0), green, null, shade),
      part(ico(0.29).scale(1, 0.7, 1).translate(0, 2.2, 0), 0x86ad74),
      part(cyl(0.13, 0.13, 0.5, 7).rotateZ(Math.PI / 2).translate(0.42, 1.0, 0), green),
      part(cyl(0.14, 0.14, 0.8, 7).translate(0.65, 1.35, 0), green, null, shade),
      part(cyl(0.12, 0.12, 0.4, 7).rotateZ(Math.PI / 2).translate(-0.38, 1.35, 0), green),
      part(cyl(0.13, 0.13, 0.6, 7).translate(-0.55, 1.6, 0), green, null, shade),
      ...(() => { const p = []; paperFlower(p, 0, 2.38, 0, 0xf07a8a, 0.16, null, 5); return p; })(),
    ]);
  }

  function bush(kind) {
    const parts = [];
    const colors = kind === 'blossom' ? [...PAPER.leaf, ...PAPER.blossom] : PAPER.leaf;
    [[v3(0, 0.5, 0), 0.62, 26], [v3(0.45, 0.4, 0.12), 0.46, 16], [v3(-0.4, 0.38, -0.2), 0.44, 14]].forEach(([center, radius, count], i) => {
      scatterLeaves(parts, { center, radius, count, colors, seed: 120 + i + (kind === 'blossom' ? 20 : 0), size: 0.42, droop: 0.15, swayFn: tipSway(3) });
    });
    if (kind === 'berry') {
      [[0.3, 0.85, 0.35], [-0.35, 0.7, 0.3], [0.55, 0.55, 0.4], [-0.1, 0.95, -0.3], [0.2, 0.6, -0.5], [-0.6, 0.5, 0.05]].forEach(([x, y, z]) => {
        parts.push(part(ico(0.08).translate(x, y, z), 0xc84a3c, tipSway(3)));
      });
    }
    return merge(parts);
  }

  function deadBush() {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(part(cyl(0.02, 0.045, 0.8, 3).translate(0, 0.4, 0).rotateZ(0.5 + (i % 2) * 0.25).rotateY(a), 0x9a8062, tipSway(1.5)));
    }
    return merge(parts);
  }

  function grassTuft(colors, height, blades) {
    const parts = [];
    const rng = mulberry32(99 + blades);
    for (let i = 0; i < blades; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 0.22;
      const h = height * (0.7 + rng() * 0.5);
      const dir = new THREE.Vector3((rng() - 0.5) * 0.5, 1, (rng() - 0.5) * 0.5).normalize();
      const blade = orient(leafGeometry(h, 0.05, 0.02), new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), dir, rng() * Math.PI);
      parts.push(part(blade, colors[i % colors.length], tipSway(height), (x, y) => 0.75 + 0.25 * clamp01(y / height), UP_NORMAL, 0.85));
    }
    return merge(parts);
  }

  function fern() {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), 0.75, Math.sin(a)).normalize();
      parts.push(part(orient(leafGeometry(0.95, 0.16, 0.05), new THREE.Vector3(0, 0.05, 0), dir, 0), i % 2 ? 0x5d8a4c : 0x6c9a58, tipSway(0.8), (x, y) => 0.8 + 0.2 * clamp01(y / 0.6), UP_NORMAL, 0.7));
    }
    return merge(parts);
  }

  function flowers(colors, seed) {
    const parts = [];
    const rng = mulberry32(seed);
    for (let i = 0; i < 6; i++) {
      const x = (rng() - 0.5) * 1.3;
      const z = (rng() - 0.5) * 1.3;
      const h = 0.25 + rng() * 0.22;
      parts.push(part(cyl(0.012, 0.018, h, 3).translate(x, h / 2, z), 0x6f9a58, tipSway(0.5)));
      parts.push(part(orient(leafGeometry(0.16, 0.06, 0.02), new THREE.Vector3(x, h * 0.4, z), new THREE.Vector3(rng() - 0.5, 0.6, rng() - 0.5).normalize(), 0), 0x7fa862, tipSway(0.5)));
      paperFlower(parts, x, h, z, colors[i % colors.length], 0.1, tipSway(0.5), seed + i);
    }
    return merge(parts);
  }

  function mushrooms() {
    const parts = [];
    [[0, 0, 1, 0xd0584a], [0.25, 0.15, 0.7, 0xd0584a], [-0.2, 0.2, 0.55, 0xb88a5e]].forEach(([x, z, s, capColor]) => {
      parts.push(part(cyl(0.05 * s, 0.07 * s, 0.24 * s, 6).translate(x, 0.12 * s, z), PAPER.cream));
      parts.push(part(new THREE.SphereGeometry(0.17 * s, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.22 * s, z), capColor));
      if (capColor === 0xd0584a) {
        parts.push(part(ico(0.025 * s).translate(x + 0.06 * s, 0.36 * s, z), 0xffffff));
        parts.push(part(ico(0.02 * s).translate(x - 0.05 * s, 0.34 * s, z + 0.06 * s), 0xffffff));
      }
    });
    return merge(parts);
  }

  function reeds() {
    const parts = [];
    const rng = mulberry32(7);
    for (let i = 0; i < 7; i++) {
      const x = (rng() - 0.5) * 0.7;
      const z = (rng() - 0.5) * 0.7;
      const h = 1.0 + rng() * 0.6;
      parts.push(part(orient(leafGeometry(h, 0.04, 0.015), new THREE.Vector3(x, 0, z), new THREE.Vector3((rng() - 0.5) * 0.2, 1, (rng() - 0.5) * 0.2).normalize(), rng() * 3), 0x8aa05e, tipSway(1.6)));
      if (i % 2 === 0) parts.push(part(cyl(0.045, 0.045, 0.22, 6).translate(x, h - 0.05, z), 0x7a5a3a, tipSway(1.6)));
    }
    return merge(parts);
  }

  function log() {
    return merge([
      part(cyl(0.3, 0.3, 3.0, 8).rotateZ(Math.PI / 2).translate(0, 0.28, 0), PAPER.bark, null, (x, y) => 0.8 + 0.2 * clamp01(y / 0.56)),
      part(cyl(0.26, 0.26, 3.02, 8).rotateZ(Math.PI / 2).translate(0, 0.28, 0), 0xd9bd8c),
      part(cyl(0.06, 0.09, 0.5, 5).rotateX(-0.6).translate(0.6, 0.55, 0.15), PAPER.bark),
      part(new THREE.BoxGeometry(1.4, 0.05, 0.34).translate(-0.3, 0.57, 0), 0x7fa862),
    ]);
  }

  function rock(snowy) {
    const shade = (x, y) => 0.78 + 0.22 * clamp01(y * 0.5 + 0.5);
    const round = (x, y, z, out) => out.set(x, y + 0.3, z);
    const parts = [part(jitterVertices(new THREE.DodecahedronGeometry(1, 1), 1234, 0.82, 1.12), PAPER.stone, null, shade, round, 0.7)];
    if (snowy) parts.push(part(jitterVertices(new THREE.IcosahedronGeometry(0.8, 1), 55, 0.88, 1.08).scale(1, 0.35, 1).translate(0, 0.72, 0), PAPER.snow, null, null, round, 0.7));
    return merge(parts);
  }

  function pebbles() {
    const rng = mulberry32(31);
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const s = 0.12 + rng() * 0.18;
      parts.push(part(jitterVertices(new THREE.DodecahedronGeometry(s, 0), 40 + i, 0.8, 1.2).scale(1, 0.6, 1).translate((rng() - 0.5) * 1.2, s * 0.3, (rng() - 0.5) * 1.2), 0xaea99f));
    }
    return merge(parts);
  }

  function cloud(seed) {
    const rng = mulberry32(seed);
    const parts = [];
    const count = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + rng() * 4;
      const cx = (i - count / 2) * 4 + rng() * 2;
      const cy = rng() * 2;
      parts.push(part(ico(r).scale(1, 0.55, 1).translate(cx, cy, (rng() - 0.5) * 5), 0xffffff, null, (x, y) => 0.86 + 0.14 * clamp01((y - cy) / r + 0.5)));
    }
    parts.push(part(new THREE.CylinderGeometry(count * 2.6, count * 2.4, 0.6, 12).translate(0, -1.6, 0), 0xf2f0ea));
    return merge(parts);
  }

  return {
    part, merge, fromTriangles, leafGeometry, orient, scatterLeaves, paperFlower,
    pine, broadleaf, birch, acacia, cactus, bush, deadBush, grassTuft, fern, flowers, mushrooms, reeds, log, rock, pebbles, cloud,
  };
})();

function createDecorAssets() {
  return {
    pine: Models.pine(false),
    snowPine: Models.pine(true),
    broadleaf: Models.broadleaf(false),
    blossomTree: Models.broadleaf(true),
    birch: Models.birch(),
    acacia: Models.acacia(),
    cactus: Models.cactus(),
    bush: Models.bush('plain'),
    berryBush: Models.bush('berry'),
    blossomBush: Models.bush('blossom'),
    deadBush: Models.deadBush(),
    grass: Models.grassTuft([0x7fa862, 0x8db46b, 0x6f9a58], 0.6, 8),
    dryGrass: Models.grassTuft([0xc9b36b, 0xd6c07a, 0xb9a45e], 0.7, 9),
    fern: Models.fern(),
    flowersWarm: Models.flowers([0xf0a23a, 0xf3ead8, 0xe8765a], 3),
    flowersCool: Models.flowers([0xb79ad6, 0xf2c94c, 0xf3ead8, 0xe99aa8], 9),
    mushrooms: Models.mushrooms(),
    reeds: Models.reeds(),
    log: Models.log(),
    rock: Models.rock(false),
    snowRock: Models.rock(true),
    pebbles: Models.pebbles(),
  };
}
