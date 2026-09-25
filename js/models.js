const Models = (() => {
  function part(geometry, color, swayFn = null) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g.attributes.uv) g.deleteAttribute('uv');
    g.computeVertexNormals();
    const position = g.attributes.position;
    const col = new THREE.Color(color);
    const colors = new Float32Array(position.count * 3);
    const sway = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      sway[i] = swayFn ? swayFn(position.getY(i)) : 0;
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

  const canopySway = (y) => smoothstep(1.0, 4.5, y);
  const tipSway = (height) => (y) => clamp01(y / height);
  const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const cone = (r, h, seg) => new THREE.ConeGeometry(r, h, seg);
  const ico = (r) => new THREE.IcosahedronGeometry(r, 0);

  function pine(snowy) {
    const parts = [part(cyl(0.12, 0.18, 1.3, 6).translate(0, 0.65, 0), 0x7a5536)];
    const tiers = [[1.35, 1.7, 1.75, 0x3f7d4f], [1.05, 1.5, 2.65, 0x4a8a57], [0.72, 1.3, 3.5, 0x55975f]];
    tiers.forEach(([r, h, y, color], i) => {
      parts.push(part(cone(r, h, 7).rotateY(i * 0.45).translate(0, y, 0), color, canopySway));
      if (snowy) parts.push(part(cone(r * 0.72, h * 0.42, 7).rotateY(i * 0.45).translate(0, y + h * 0.3, 0), 0xf4f7f8, canopySway));
    });
    return merge(parts);
  }

  function broadleaf() {
    return merge([
      part(cyl(0.14, 0.22, 2.0, 6).translate(0, 1.0, 0), 0x7d5a3c),
      part(cyl(0.05, 0.08, 0.9, 5).rotateZ(-0.9).translate(0.42, 1.75, 0), 0x7d5a3c),
      part(ico(1.25).translate(0, 2.9, 0), 0x6fae50, canopySway),
      part(ico(0.95).translate(0.85, 2.5, 0.25), 0x7cba58, canopySway),
      part(ico(0.9).translate(-0.7, 2.6, -0.35), 0x65a24a, canopySway),
      part(ico(0.8).translate(0.15, 3.6, -0.2), 0x84c25e, canopySway),
    ]);
  }

  function birch() {
    const parts = [part(cyl(0.09, 0.13, 3.4, 6).translate(0, 1.7, 0), 0xeeeae0)];
    [0.5, 1.1, 1.6, 2.3, 2.9].forEach((y, i) => {
      parts.push(part(cyl(0.1 + (3.4 - y) * 0.012, 0.1 + (3.4 - y) * 0.012, 0.07, 6).rotateY(i).translate(0, y, 0), 0x3b3a36));
    });
    parts.push(part(ico(0.85).scale(1, 1.35, 1).translate(0, 3.5, 0), 0xa3cf55, canopySway));
    parts.push(part(ico(0.62).scale(1, 1.2, 1).translate(0.4, 2.9, 0.2), 0xb3d862, canopySway));
    parts.push(part(ico(0.55).scale(1, 1.2, 1).translate(-0.35, 3.0, -0.2), 0x98c64c, canopySway));
    return merge(parts);
  }

  function acacia() {
    return merge([
      part(cyl(0.1, 0.18, 2.6, 5).rotateZ(0.12).translate(-0.15, 1.3, 0), 0x6e5238),
      part(cyl(0.05, 0.08, 1.2, 5).rotateZ(-0.8).translate(0.35, 2.55, 0.1), 0x6e5238),
      part(cyl(0.05, 0.08, 1.1, 5).rotateZ(0.9).rotateY(1.2).translate(-0.4, 2.6, -0.3), 0x6e5238),
      part(cyl(2.0, 1.5, 0.45, 8).translate(0, 3.0, 0), 0x8fa04a, canopySway),
      part(cyl(1.3, 1.0, 0.35, 7).translate(0.9, 3.3, 0.35), 0x9fae55, canopySway),
      part(cyl(1.1, 0.9, 0.3, 7).translate(-0.9, 3.25, -0.4), 0x869a44, canopySway),
    ]);
  }

  function cactus() {
    const green = 0x5d9b4f;
    return merge([
      part(cyl(0.28, 0.32, 2.2, 7).translate(0, 1.1, 0), green),
      part(ico(0.29).scale(1, 0.7, 1).translate(0, 2.2, 0), 0x6aa85a),
      part(cyl(0.13, 0.13, 0.5, 6).rotateZ(Math.PI / 2).translate(0.42, 1.0, 0), green),
      part(cyl(0.14, 0.14, 0.8, 6).translate(0.65, 1.35, 0), green),
      part(cyl(0.12, 0.12, 0.4, 6).rotateZ(Math.PI / 2).translate(-0.38, 1.35, 0), green),
      part(cyl(0.13, 0.13, 0.6, 6).translate(-0.55, 1.6, 0), green),
      part(ico(0.1).translate(0, 2.42, 0), 0xf06a8a),
    ]);
  }

  function bush(berries) {
    const parts = [
      part(ico(0.62).translate(0, 0.5, 0), 0x5f9e48, tipSway(3)),
      part(ico(0.48).translate(0.48, 0.38, 0.12), 0x6aa84f, tipSway(3)),
      part(ico(0.44).translate(-0.4, 0.36, -0.2), 0x578f42, tipSway(3)),
      part(ico(0.38).translate(0.05, 0.35, 0.5), 0x64a24c, tipSway(3)),
    ];
    if (berries) {
      [[0.3, 0.85, 0.35], [-0.35, 0.7, 0.3], [0.55, 0.55, 0.4], [-0.1, 0.95, -0.3], [0.2, 0.6, -0.5], [-0.6, 0.5, 0.05]].forEach(([x, y, z]) => {
        parts.push(part(ico(0.08).translate(x, y, z), 0xd8363c, tipSway(3)));
      });
    }
    return merge(parts);
  }

  function deadBush() {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(part(cyl(0.02, 0.045, 0.8, 3).translate(0, 0.4, 0).rotateZ(0.5 + (i % 2) * 0.25).rotateY(a), 0x8b7355, tipSway(1.5)));
    }
    return merge(parts);
  }

  function grassTuft(color, height, blades) {
    const parts = [];
    const rng = mulberry32(99 + blades);
    for (let i = 0; i < blades; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 0.25;
      parts.push(part(
        cone(0.05, height * (0.7 + rng() * 0.5), 3).translate(0, height * 0.45, 0).rotateZ((rng() - 0.5) * 0.6).rotateX((rng() - 0.5) * 0.6).translate(Math.cos(a) * r, 0, Math.sin(a) * r),
        color,
        tipSway(height)
      ));
    }
    return merge(parts);
  }

  function fern() {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      parts.push(part(cone(0.12, 0.9, 3).scale(1, 1, 0.3).translate(0, 0.45, 0).rotateX(0.95).rotateY(a), i % 2 ? 0x4d8f3f : 0x5aa049, tipSway(0.8)));
    }
    return merge(parts);
  }

  function flowers(colors) {
    const parts = [];
    const rng = mulberry32(colors[0]);
    for (let i = 0; i < 7; i++) {
      const x = (rng() - 0.5) * 1.3;
      const z = (rng() - 0.5) * 1.3;
      const h = 0.25 + rng() * 0.2;
      parts.push(part(cyl(0.015, 0.02, h, 3).translate(x, h / 2, z), 0x5a9a3f, tipSway(0.5)));
      parts.push(part(new THREE.OctahedronGeometry(0.09, 0).scale(1, 0.5, 1).translate(x, h + 0.02, z), colors[i % colors.length], tipSway(0.5)));
      parts.push(part(new THREE.OctahedronGeometry(0.035, 0).translate(x, h + 0.06, z), 0xffe066, tipSway(0.5)));
    }
    return merge(parts);
  }

  function mushrooms() {
    const parts = [];
    [[0, 0, 1, 0xd8453b], [0.25, 0.15, 0.7, 0xd8453b], [-0.2, 0.2, 0.55, 0xb7784a]].forEach(([x, z, s, capColor]) => {
      parts.push(part(cyl(0.05 * s, 0.07 * s, 0.24 * s, 6).translate(x, 0.12 * s, z), 0xf1e6cf));
      parts.push(part(new THREE.SphereGeometry(0.17 * s, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.22 * s, z), capColor));
      if (capColor === 0xd8453b) {
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
      parts.push(part(cyl(0.015, 0.03, h, 3).translate(x, h / 2, z), 0x7a9a4a, tipSway(1.6)));
      if (i % 2 === 0) parts.push(part(cyl(0.045, 0.045, 0.22, 5).translate(x, h - 0.05, z), 0x6b4a2e, tipSway(1.6)));
    }
    return merge(parts);
  }

  function log() {
    return merge([
      part(cyl(0.3, 0.3, 3.0, 7).rotateZ(Math.PI / 2).translate(0, 0.28, 0), 0x7d5a3c),
      part(cyl(0.26, 0.26, 3.02, 7).rotateZ(Math.PI / 2).translate(0, 0.28, 0), 0xc9a878),
      part(cyl(0.06, 0.09, 0.5, 5).rotateX(-0.6).translate(0.6, 0.55, 0.15), 0x7d5a3c),
      part(new THREE.BoxGeometry(1.4, 0.06, 0.34).translate(-0.3, 0.57, 0), 0x6e9e45),
    ]);
  }

  function rock(snowy) {
    const parts = [part(jitterVertices(new THREE.DodecahedronGeometry(1, 0), 1234, 0.75, 1.2), 0xa7a39b)];
    if (snowy) parts.push(part(jitterVertices(ico(0.8), 55, 0.85, 1.1).scale(1, 0.35, 1).translate(0, 0.72, 0), 0xf4f7f8));
    return merge(parts);
  }

  function pebbles() {
    const rng = mulberry32(31);
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const s = 0.12 + rng() * 0.18;
      parts.push(part(jitterVertices(new THREE.DodecahedronGeometry(s, 0), 40 + i, 0.8, 1.2).scale(1, 0.6, 1).translate((rng() - 0.5) * 1.2, s * 0.3, (rng() - 0.5) * 1.2), 0x9d988f));
    }
    return merge(parts);
  }

  function cloud(seed) {
    const rng = mulberry32(seed);
    const parts = [];
    const count = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + rng() * 4;
      parts.push(part(ico(r).scale(1, 0.6, 1).translate((i - count / 2) * 4 + rng() * 2, rng() * 2, (rng() - 0.5) * 5), 0xffffff));
    }
    return merge(parts);
  }

  return { part, merge, pine, broadleaf, birch, acacia, cactus, bush, deadBush, grassTuft, fern, flowers, mushrooms, reeds, log, rock, pebbles, cloud };
})();

function createDecorAssets() {
  return {
    pine: Models.pine(false),
    snowPine: Models.pine(true),
    broadleaf: Models.broadleaf(),
    birch: Models.birch(),
    acacia: Models.acacia(),
    cactus: Models.cactus(),
    bush: Models.bush(false),
    berryBush: Models.bush(true),
    deadBush: Models.deadBush(),
    grass: Models.grassTuft(0x6fae4f, 0.6, 7),
    dryGrass: Models.grassTuft(0xc9b35b, 0.7, 8),
    fern: Models.fern(),
    flowersWarm: Models.flowers([0xe8443a, 0xffd23f, 0xffffff]),
    flowersCool: Models.flowers([0x9b6ade, 0xf28cb1, 0xffffff, 0x6ab0f3]),
    mushrooms: Models.mushrooms(),
    reeds: Models.reeds(),
    log: Models.log(),
    rock: Models.rock(false),
    snowRock: Models.rock(true),
    pebbles: Models.pebbles(),
  };
}

