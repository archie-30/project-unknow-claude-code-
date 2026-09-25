const AnimalModels = (() => {
  const cache = new Map();
  function kit(materials) {
    const mat = (color) => {
      if (!cache.has(color)) cache.set(color, materials.toon(color));
      return cache.get(color);
    };
    const add = (parent, geometry, color, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(flatShaded(geometry), mat(color));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const pivot = (parent, x = 0, y = 0, z = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    };
    return { add, pivot };
  }

  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
  const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);
  const cyl = (rt, rb, h, s = 5) => new THREE.CylinderGeometry(rt, rb, h, s);

  function quadruped(materials, o) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, o.legLength + o.bodyHeight / 2, 0);
    add(body, box(o.bodyWidth, o.bodyHeight, o.bodyLength), o.color);
    add(body, box(o.bodyWidth * 0.9, o.bodyHeight * 0.35, o.bodyLength * 0.85), o.belly, 0, -o.bodyHeight * 0.36, 0);
    const neck = pivot(body, 0, o.bodyHeight * 0.3, o.bodyLength * 0.45);
    add(neck, box(o.bodyWidth * 0.45, o.neckLength, o.bodyWidth * 0.45).translate(0, o.neckLength / 2, 0), o.color).rotation.x = 0.45;
    const head = pivot(neck, 0, o.neckLength * 0.9, o.neckLength * 0.4);
    add(head, box(o.headSize * 0.8, o.headSize * 0.8, o.headSize * 1.2), o.color);
    add(head, box(o.headSize * 0.5, o.headSize * 0.45, o.headSize * 0.6), o.snout || o.belly, 0, -o.headSize * 0.12, o.headSize * 0.75);
    add(head, box(o.headSize * 0.12, o.headSize * 0.12, o.headSize * 0.05), 0x2b2b2b, o.headSize * 0.32, o.headSize * 0.15, o.headSize * 0.45);
    add(head, box(o.headSize * 0.12, o.headSize * 0.12, o.headSize * 0.05), 0x2b2b2b, -o.headSize * 0.32, o.headSize * 0.15, o.headSize * 0.45);
    for (const side of [1, -1]) {
      add(head, cone(o.headSize * 0.22, o.earLength, 4).rotateZ(-side * 0.5), o.ear || o.color, side * o.headSize * 0.35, o.headSize * 0.55, -o.headSize * 0.2);
      if (o.horns) add(head, cone(o.headSize * 0.07, o.horns, 4).rotateX(-0.5).rotateZ(-side * 0.2), o.hornColor || 0x3b3228, side * o.headSize * 0.2, o.headSize * 0.4 + o.horns * 0.4, -o.headSize * 0.25);
      if (o.antlers) {
        const antler = pivot(head, side * o.headSize * 0.22, o.headSize * 0.45, -o.headSize * 0.1);
        add(antler, cyl(0.02, 0.03, 0.4).translate(0, 0.2, 0), 0x8a6a4a).rotation.z = -side * 0.4;
        add(antler, cyl(0.015, 0.02, 0.22).translate(0, 0.11, 0), 0x8a6a4a, -side * 0.08, 0.2, 0.05).rotation.z = side * 0.5;
        add(antler, cyl(0.015, 0.02, 0.2).translate(0, 0.1, 0), 0x8a6a4a, -side * 0.14, 0.32, -0.02).rotation.z = -side * 0.9;
      }
    }
    const tail = pivot(body, 0, o.bodyHeight * 0.25, -o.bodyLength / 2);
    if (o.bushyTail) {
      add(tail, cone(o.bodyWidth * 0.32, o.tailLength, 6).rotateX(-Math.PI / 2 - 0.5).translate(0, -o.tailLength * 0.2, -o.tailLength * 0.45), o.color);
      add(tail, cone(o.bodyWidth * 0.16, o.tailLength * 0.3, 6).rotateX(-Math.PI / 2 - 0.5).translate(0, -o.tailLength * 0.42, -o.tailLength * 0.92), o.tailTip || 0xffffff);
    } else {
      add(tail, box(o.bodyWidth * 0.2, o.tailLength, o.bodyWidth * 0.12).translate(0, -o.tailLength / 2, 0), o.tailTip || o.color).rotation.x = 0.4;
    }
    const legs = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const hip = pivot(body, sx * o.bodyWidth * 0.32, -o.bodyHeight * 0.35, sz * o.bodyLength * 0.36);
      add(hip, box(o.legWidth, o.legLength, o.legWidth).translate(0, -o.legLength / 2, 0), o.leg || o.color);
      add(hip, box(o.legWidth * 1.1, o.legLength * 0.15, o.legWidth * 1.2).translate(0, -o.legLength * 0.95, 0.01), o.hoof || 0x3b3228);
      legs.push(hip);
    }
    return { root, body, neck, head, tail, legs, baseY: body.position.y };
  }

  function rabbit(materials) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, 0.2, 0);
    add(body, ico(0.18).scale(1, 0.85, 1.3), 0xb9a58a);
    add(body, ico(0.12).scale(1, 0.7, 1.1), 0xe9dfcf, 0, -0.06, 0.05);
    const head = pivot(body, 0, 0.13, 0.2);
    add(head, ico(0.11).scale(1, 0.95, 1.1), 0xb9a58a);
    add(head, box(0.025, 0.025, 0.01), 0x2b2b2b, 0.06, 0.03, 0.09);
    add(head, box(0.025, 0.025, 0.01), 0x2b2b2b, -0.06, 0.03, 0.09);
    add(head, ico(0.02), 0xd88a8a, 0, -0.01, 0.12);
    const ears = [];
    for (const side of [1, -1]) {
      const ear = pivot(head, side * 0.04, 0.08, -0.02);
      add(ear, box(0.05, 0.2, 0.02).translate(0, 0.1, 0), 0xb9a58a);
      add(ear, box(0.03, 0.15, 0.022).translate(0, 0.1, 0.002), 0xe8b8b0);
      ear.rotation.z = -side * 0.15;
      ears.push(ear);
    }
    const tail = pivot(body, 0, 0.04, -0.24);
    add(tail, ico(0.06), 0xffffff);
    const legs = [];
    for (const [sx, sz, len] of [[1, 1, 0.1], [-1, 1, 0.1], [1, -1, 0.14], [-1, -1, 0.14]]) {
      const hip = pivot(body, sx * 0.09, -0.08, sz * 0.12);
      add(hip, box(0.05, len, sz > 0 ? 0.05 : 0.14).translate(0, -len / 2, sz > 0 ? 0 : 0.03), 0xa8957a);
      legs.push(hip);
    }
    return { root, body, head, tail, legs, ears, baseY: 0.2 };
  }

  function squirrel(materials) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, 0.14, 0);
    add(body, ico(0.1).scale(1, 0.9, 1.4), 0xc46a3a);
    add(body, ico(0.07).scale(1, 0.8, 1.2), 0xf0dcc0, 0, -0.03, 0.04);
    const head = pivot(body, 0, 0.09, 0.13);
    add(head, ico(0.07), 0xc46a3a);
    add(head, box(0.018, 0.018, 0.01), 0x2b2b2b, 0.035, 0.015, 0.06);
    add(head, box(0.018, 0.018, 0.01), 0x2b2b2b, -0.035, 0.015, 0.06);
    add(head, cone(0.02, 0.05, 4), 0xc46a3a, 0.03, 0.07, -0.01);
    add(head, cone(0.02, 0.05, 4), 0xc46a3a, -0.03, 0.07, -0.01);
    const tail = pivot(body, 0, 0.04, -0.13);
    add(tail, ico(0.07).scale(0.8, 1, 0.8), 0xd07a48, 0, 0.06, -0.04);
    add(tail, ico(0.08).scale(0.8, 1.1, 0.8), 0xd07a48, 0, 0.17, -0.08);
    add(tail, ico(0.07).scale(0.8, 1, 0.8), 0xe09060, 0, 0.27, -0.03);
    const legs = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const hip = pivot(body, sx * 0.05, -0.06, sz * 0.07);
      add(hip, box(0.03, 0.08, 0.04).translate(0, -0.04, 0), 0xa85a30);
      legs.push(hip);
    }
    return { root, body, head, tail, legs, baseY: 0.14 };
  }

  function lizard(materials) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, 0.05, 0);
    add(body, box(0.09, 0.05, 0.26), 0xa7a65a);
    add(body, box(0.05, 0.02, 0.2), 0x7f8a44, 0, 0.03, 0);
    const head = pivot(body, 0, 0.005, 0.15);
    add(head, box(0.07, 0.04, 0.09), 0xa7a65a, 0, 0, 0.03);
    add(head, box(0.015, 0.015, 0.01), 0x2b2b2b, 0.03, 0.015, 0.05);
    add(head, box(0.015, 0.015, 0.01), 0x2b2b2b, -0.03, 0.015, 0.05);
    const tail = pivot(body, 0, 0, -0.13);
    add(tail, cone(0.035, 0.3, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.15), 0x9a9a52);
    const legs = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const hip = pivot(body, sx * 0.05, -0.01, sz * 0.08);
      add(hip, box(0.08, 0.018, 0.025).translate(sx * 0.04, -0.015, 0), 0x8f9048);
      legs.push(hip);
    }
    return { root, body, head, tail, legs, baseY: 0.05 };
  }

  function duck(materials) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, 0.05, 0);
    add(body, ico(0.16).scale(1, 0.72, 1.45), 0xb59a78);
    add(body, box(0.18, 0.06, 0.18), 0xefe6d6, 0, -0.02, 0.1);
    add(body, box(0.05, 0.03, 0.14), 0x4f7aa8, 0.15, 0.04, -0.04);
    add(body, box(0.05, 0.03, 0.14), 0x4f7aa8, -0.15, 0.04, -0.04);
    const tail = pivot(body, 0, 0.05, -0.22);
    add(tail, cone(0.05, 0.1, 4).rotateX(-2.2), 0x8a7458);
    const neck = pivot(body, 0, 0.08, 0.17);
    const head = pivot(neck, 0, 0.12, 0.02);
    add(head, ico(0.075), 0x3f7a4f);
    add(head, box(0.1, 0.02, 0.08), 0xf0a23a, 0, -0.01, 0.08);
    add(head, box(0.015, 0.015, 0.01), 0x1e1e1e, 0.05, 0.02, 0.04);
    add(head, box(0.015, 0.015, 0.01), 0x1e1e1e, -0.05, 0.02, 0.04);
    add(neck, box(0.07, 0.03, 0.07), 0xffffff, 0, 0.06, 0);
    return { root, body, head, neck, tail, legs: [], baseY: 0.05 };
  }

  function sparrow(materials) {
    const { add, pivot } = kit(materials);
    const root = new THREE.Group();
    const body = pivot(root, 0, 0.07, 0);
    add(body, ico(0.06).scale(1, 0.9, 1.4), 0xa07a52);
    add(body, ico(0.045).scale(1, 0.8, 1.2), 0xe8dcc6, 0, -0.02, 0.02);
    const head = pivot(body, 0, 0.05, 0.06);
    add(head, ico(0.04), 0x8a6444);
    add(head, cone(0.012, 0.035, 4).rotateX(Math.PI / 2), 0x3b3228, 0, -0.005, 0.045);
    const tail = pivot(body, 0, 0.01, -0.08);
    add(tail, box(0.04, 0.01, 0.07).translate(0, 0, -0.03), 0x6e5238);
    const wings = [];
    for (const side of [1, -1]) {
      const wing = pivot(body, side * 0.05, 0.02, 0);
      add(wing, Models.fromTriangles([[0, 0, 0.05], [0, 0, -0.05], [side * 0.12, 0, -0.02]]), 0x7a5a3c);
      wings.push(wing);
    }
    return { root, body, head, tail, legs: [], wings, baseY: 0.07 };
  }

  return {
    deer: (m) => quadruped(m, { bodyLength: 0.95, bodyHeight: 0.42, bodyWidth: 0.34, legLength: 0.75, legWidth: 0.08, neckLength: 0.42, headSize: 0.24, earLength: 0.16, color: 0xb5794c, belly: 0xe8d6b8, leg: 0xa36c44, antlers: true, tailLength: 0.1, tailTip: 0xffffff }),
    fox: (m) => quadruped(m, { bodyLength: 0.6, bodyHeight: 0.24, bodyWidth: 0.22, legLength: 0.28, legWidth: 0.06, neckLength: 0.18, headSize: 0.2, earLength: 0.14, color: 0xeef0f0, belly: 0xffffff, snout: 0xf6f6f2, leg: 0xdcdcdc, hoof: 0x6a6a6a, bushyTail: true, tailLength: 0.45, tailTip: 0xffffff }),
    antelope: (m) => quadruped(m, { bodyLength: 0.8, bodyHeight: 0.34, bodyWidth: 0.28, legLength: 0.7, legWidth: 0.06, neckLength: 0.36, headSize: 0.2, earLength: 0.13, color: 0xcaa06a, belly: 0xf3ead8, leg: 0xb88c58, horns: 0.42, tailLength: 0.12, tailTip: 0x3b3228 }),
    rabbit,
    squirrel,
    lizard,
    duck,
    sparrow,
  };
})();

const ANIMAL_TYPES = {
  [SPECIES.RABBIT]: { build: 'rabbit', biomes: [BIOME.MEADOW, BIOME.SAVANNA], group: [1, 2], walk: 1.3, flee: 7.5, fleeDistance: 7, gait: 'hop', weight: 3 },
  [SPECIES.DEER]: { build: 'deer', biomes: [BIOME.FOREST, BIOME.MEADOW], group: [1, 3], walk: 1.3, flee: 9, fleeDistance: 12, gait: 'walk', weight: 2 },
  [SPECIES.SQUIRREL]: { build: 'squirrel', biomes: [BIOME.TAIGA, BIOME.FOREST], group: [1, 2], walk: 1.6, flee: 6, fleeDistance: 5, gait: 'hop', weight: 3 },
  [SPECIES.FOX]: { build: 'fox', biomes: [BIOME.SNOW, BIOME.TAIGA], group: [1, 1], walk: 1.8, flee: 8, fleeDistance: 9, gait: 'walk', weight: 2 },
  [SPECIES.ANTELOPE]: { build: 'antelope', biomes: [BIOME.SAVANNA], group: [3, 5], walk: 1.5, flee: 10, fleeDistance: 14, gait: 'walk', weight: 3 },
  [SPECIES.LIZARD]: { build: 'lizard', biomes: [BIOME.DESERT, BIOME.SAVANNA], group: [1, 2], walk: 0.9, flee: 6, fleeDistance: 4, gait: 'scurry', weight: 3 },
  [SPECIES.DUCK]: { build: 'duck', water: true, group: [2, 4], walk: 0.7, flee: 1.8, fleeDistance: 7, gait: 'swim', weight: 3 },
  [SPECIES.SPARROW]: { build: 'sparrow', biomes: [BIOME.MEADOW, BIOME.FOREST, BIOME.SAVANNA], group: [3, 6], walk: 0.4, flee: 0, fleeDistance: 7, gait: 'bird', weight: 3 },
};

class Animal {
  constructor(species, rig, x, z) {
    this.species = species;
    this.type = ANIMAL_TYPES[species];
    this.rig = rig;
    this.position = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3();
    this.heading = Math.random() * Math.PI * 2;
    this.targetHeading = this.heading;
    this.speed = 0;
    this.targetSpeed = 0;
    this.state = 'idle';
    this.timer = 1 + Math.random() * 3;
    this.fleeTimer = 0;
    this.phase = Math.random() * 10;
    this.graze = 0;
    this.dead = false;
    this.flyTime = 0;
    this.spooked = false;
    this.position.y = this.groundAt(x, z);
    rig.root.position.copy(this.position);
  }

  groundAt(x, z) {
    return this.type.water ? CONFIG.waterLevel : Terrain.heightAt(x, z);
  }

  canStand(x, z) {
    const h = Terrain.heightAt(x, z);
    if (this.type.water) return h < CONFIG.waterLevel - 0.35;
    return h > CONFIG.waterLevel + 0.2;
  }

  update(dt, player, time) {
    const dx = this.position.x - player.x;
    const dz = this.position.z - player.z;
    const distance = Math.hypot(dx, dz);
    const t = this.type;

    if (t.gait === 'bird') return this.updateBird(dt, dx, dz, distance, time);

    if (distance < t.fleeDistance) {
      this.fleeTimer = 2.5 + Math.random();
      this.targetHeading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.6;
      this.spooked = true;
    }
    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      this.state = 'flee';
      this.targetSpeed = t.flee;
      if (Math.random() < dt * 1.5) this.targetHeading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.8;
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'walk' || Math.random() < 0.4) {
          this.state = 'idle';
          this.timer = 2 + Math.random() * 4;
          this.targetSpeed = 0;
        } else {
          this.state = 'walk';
          this.timer = 2 + Math.random() * 4;
          this.targetHeading = this.heading + (Math.random() - 0.5) * 2.4;
          this.targetSpeed = t.walk;
        }
      }
    }

    this.heading += wrapAngle(this.targetHeading - this.heading) * (1 - Math.exp(-6 * dt));
    this.speed = damp(this.speed, this.targetSpeed, this.state === 'flee' ? 6 : 3, dt);
    const nx = this.position.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.position.z + Math.cos(this.heading) * this.speed * dt;
    if (this.canStand(nx, nz)) {
      this.position.x = nx;
      this.position.z = nz;
    } else {
      this.targetHeading = this.heading + Math.PI * (0.6 + Math.random() * 0.8);
      this.speed *= 0.3;
    }
    this.position.y = this.groundAt(this.position.x, this.position.z);
    this.animate(dt, time);
  }

  updateBird(dt, dx, dz, distance, time) {
    const r = this.rig;
    if (this.state !== 'fly' && distance < this.type.fleeDistance) {
      this.state = 'fly';
      this.spooked = true;
      this.justFlew = true;
      const away = Math.atan2(dx, dz) + (Math.random() - 0.5) * 1.2;
      this.velocity.set(Math.sin(away) * 5, 4 + Math.random() * 2, Math.cos(away) * 5);
      this.heading = away;
    }
    if (this.state === 'fly') {
      this.flyTime += dt;
      this.velocity.y += 1.2 * dt;
      this.position.addScaledVector(this.velocity, dt);
      const flap = Math.sin(time * 26 + this.phase) * 1.1;
      r.wings[0].rotation.z = flap;
      r.wings[1].rotation.z = -flap;
      r.body.rotation.x = -0.4;
      if (this.flyTime > 7) this.dead = true;
    } else {
      this.timer -= dt;
      const peck = Math.max(0, Math.sin(time * 9 + this.phase)) * (Math.sin(time * 0.7 + this.phase) > 0 ? 1 : 0);
      r.head.rotation.x = peck * 0.9;
      r.body.rotation.x = peck * 0.3;
      if (this.timer <= 0) {
        this.timer = 0.8 + Math.random() * 2;
        this.heading += (Math.random() - 0.5) * 2;
        const hop = 0.25;
        const nx = this.position.x + Math.sin(this.heading) * hop;
        const nz = this.position.z + Math.cos(this.heading) * hop;
        if (this.canStand(nx, nz)) {
          this.position.x = nx;
          this.position.z = nz;
        }
      }
      this.position.y = Terrain.heightAt(this.position.x, this.position.z);
      r.wings[0].rotation.z = 0.1;
      r.wings[1].rotation.z = -0.1;
    }
    r.root.position.copy(this.position);
    r.root.rotation.y = this.heading;
  }

  animate(dt, time) {
    const r = this.rig;
    const t = this.type;
    const moving = this.speed > 0.15;
    this.phase += dt * (t.gait === 'hop' ? 2.2 : t.gait === 'scurry' ? 5 : 1.9) * Math.max(this.speed, moving ? 1 : 0);
    const s = Math.sin(this.phase);
    r.root.position.copy(this.position);
    r.root.rotation.y = this.heading;
    this.graze = damp(this.graze, this.state === 'idle' && t.gait === 'walk' ? 1 : 0, 2, dt);

    if (t.gait === 'walk') {
      const amp = Math.min(0.75, this.speed * 0.16);
      r.legs[0].rotation.x = s * amp;
      r.legs[3].rotation.x = s * amp;
      r.legs[1].rotation.x = -s * amp;
      r.legs[2].rotation.x = -s * amp;
      r.body.position.y = r.baseY + Math.abs(Math.cos(this.phase)) * 0.03 * Math.min(1, this.speed / 3);
      r.neck.rotation.x = damp(r.neck.rotation.x, this.graze * 1.1 + Math.sin(time * 3 + this.phase) * 0.08 * this.graze, 4, dt);
      r.tail.rotation.x = 0.3 + Math.sin(time * 6 + this.phase) * 0.25;
    } else if (t.gait === 'hop') {
      const hop = moving ? Math.max(0, Math.sin(this.phase)) : 0;
      r.body.position.y = r.baseY + hop * (this.state === 'flee' ? 0.28 : 0.14);
      r.body.rotation.x = moving ? -Math.cos(this.phase) * 0.25 : 0;
      r.legs.forEach((leg, i) => { leg.rotation.x = moving ? (i < 2 ? -1 : 1) * hop * 0.8 : 0; });
      if (r.ears) r.ears.forEach((ear, i) => { ear.rotation.x = moving ? -0.6 * hop : Math.sin(time * 1.3 + i) * 0.1; });
      if (!moving) r.head.rotation.x = Math.max(0, Math.sin(time * 1.1 + this.phase)) * 0.35;
      r.tail.rotation.x = Math.sin(time * 5 + this.phase) * 0.15;
    } else if (t.gait === 'scurry') {
      r.body.rotation.y = moving ? Math.sin(this.phase * 2) * 0.35 : 0;
      r.tail.rotation.y = moving ? -Math.sin(this.phase * 2) * 0.5 : Math.sin(time * 0.8) * 0.1;
      r.legs.forEach((leg, i) => { leg.rotation.y = moving ? (i % 3 === 0 ? 1 : -1) * s * 0.6 : 0; });
      r.head.rotation.x = moving ? 0 : Math.sin(time * 1.6 + this.phase) * 0.1 - 0.1;
    } else if (t.gait === 'swim') {
      r.body.position.y = r.baseY + Math.sin(time * 2 + this.phase) * 0.02;
      r.body.rotation.z = Math.sin(time * 1.4 + this.phase) * 0.05;
      const dive = this.state === 'idle' ? Math.max(0, Math.sin(time * 0.6 + this.phase) - 0.7) * 3 : 0;
      r.neck.rotation.x = dive * 1.2;
      r.tail.rotation.x = Math.sin(time * 3 + this.phase) * 0.1;
    }
  }
}

class AnimalManager {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.animals = [];
    this.spawnTimer = 0.5;
    this.rng = mulberry32(WORLD_SEED ^ 0xa417);
  }

  pickSpecies(biome, inWater) {
    const options = Object.entries(ANIMAL_TYPES).filter(([, t]) => (inWater ? t.water : !t.water && t.biomes.includes(biome)));
    if (!options.length) return null;
    const total = options.reduce((sum, [, t]) => sum + t.weight, 0);
    let roll = this.rng() * total;
    for (const [id, t] of options) {
      roll -= t.weight;
      if (roll <= 0) return Number(id);
    }
    return Number(options[0][0]);
  }

  spawnNear(center) {
    const angle = this.rng() * Math.PI * 2;
    const distance = 32 + this.rng() * 34;
    const x = center.x + Math.cos(angle) * distance;
    const z = center.z + Math.sin(angle) * distance;
    const h = Terrain.heightAt(x, z);
    const inWater = h < CONFIG.waterLevel - 0.5;
    if (!inWater && h < CONFIG.waterLevel + 0.3) return;
    const species = this.pickSpecies(Terrain.biomeAt(x, z, h), inWater);
    if (species === null) return;
    const type = ANIMAL_TYPES[species];
    const count = type.group[0] + Math.floor(this.rng() * (type.group[1] - type.group[0] + 1));
    for (let i = 0; i < count; i++) {
      const ax = x + (this.rng() - 0.5) * 4;
      const az = z + (this.rng() - 0.5) * 4;
      const rig = AnimalModels[type.build](this.materials);
      const animal = new Animal(species, rig, ax, az);
      if (!animal.canStand(ax, az)) continue;
      this.scene.add(rig.root);
      this.animals.push(animal);
    }
  }

  remove(animal) {
    this.scene.remove(animal.rig.root);
    animal.rig.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  update(dt, playerPosition, time) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = CONFIG.animalSpawnInterval;
      if (this.animals.length < CONFIG.maxAnimals) this.spawnNear(playerPosition);
    }
    for (const animal of this.animals) animal.update(dt, playerPosition, time);
    this.animals = this.animals.filter((animal) => {
      const far = Math.hypot(animal.position.x - playerPosition.x, animal.position.z - playerPosition.z) > 95;
      if (far || animal.dead) {
        this.remove(animal);
        return false;
      }
      return true;
    });
  }

  forEachVisible(camera, maxDistance, callback) {
    const forward = camera.getWorldDirection(new THREE.Vector3());
    for (const animal of this.animals) {
      const toX = animal.position.x - camera.position.x;
      const toY = animal.position.y - camera.position.y;
      const toZ = animal.position.z - camera.position.z;
      const distance = Math.hypot(toX, toY, toZ);
      if (distance > maxDistance) continue;
      if ((toX * forward.x + toY * forward.y + toZ * forward.z) / distance < 0.35) continue;
      callback(animal);
    }
  }
}
