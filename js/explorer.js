function createExplorer(materials) {
  const m = {
    skin: materials.toon(0xf0c29c),
    blush: materials.toon(0xe9a58a),
    shirt: materials.toon(0xe8dcb6),
    vest: materials.toon(0x7b8a5a),
    vestDark: materials.toon(0x68774b),
    pants: materials.toon(0x8f6e4c),
    patch: materials.toon(0x7a5c3e),
    boots: materials.toon(0x5a3f2c),
    sole: materials.toon(0x2f231a),
    hat: materials.toon(0xcfae72),
    band: materials.toon(0x6b4a2e),
    pack: materials.toon(0x6a8552),
    packDark: materials.toon(0x56703f),
    roll: materials.toon(0xb5503f),
    scarf: materials.toon(0xd9573f),
    dark: materials.toon(0x2b2522),
    white: materials.toon(0xffffff),
    leather: materials.toon(0x6a4a30),
    hair: materials.toon(0x5a3a24),
    metal: materials.toon(0xc9ccd1),
    brass: materials.toon(0xc8a14a),
  };
  const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.layers.set(1);
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, r = 0.04) => new THREE.RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 5, 12);
  const sph = (r) => new THREE.SphereGeometry(r, 18, 14);
  const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
  const tor = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 24, arc);
  const pivot = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };

  const root = new THREE.Group();
  const lean = pivot(root, 0, 0, 0);
  const body = pivot(lean, 0, 0.95, 0);
  add(body, rbox(0.34, 0.2, 0.22, 0.08), m.pants, 0, 0, 0);

  const torso = pivot(body, 0, 0.07, 0);
  add(torso, rbox(0.36, 0.5, 0.22, 0.1), m.shirt, 0, 0.25, 0);
  add(torso, rbox(0.13, 0.36, 0.245, 0.05), m.vest, 0.13, 0.21, 0).rotation.z = 0.04;
  add(torso, rbox(0.13, 0.36, 0.245, 0.05), m.vest, -0.13, 0.21, 0).rotation.z = -0.04;
  add(torso, rbox(0.38, 0.3, 0.1, 0.04), m.vest, 0, 0.23, -0.08);
  add(torso, rbox(0.08, 0.07, 0.02, 0.015), m.vestDark, 0.13, 0.28, 0.125);
  add(torso, rbox(0.08, 0.07, 0.02, 0.015), m.vestDark, -0.13, 0.28, 0.125);
  add(torso, rbox(0.07, 0.06, 0.02, 0.015), m.vestDark, 0.12, 0.13, 0.125);
  add(torso, rbox(0.08, 0.1, 0.03, 0.02), m.shirt, 0.06, 0.45, 0.1).rotation.z = -0.5;
  add(torso, rbox(0.08, 0.1, 0.03, 0.02), m.shirt, -0.06, 0.45, 0.1).rotation.z = 0.5;
  add(torso, cyl(0.19, 0.19, 0.055, 24), m.leather, 0, 0.04, 0).scale.set(1, 1, 0.66);
  add(torso, rbox(0.06, 0.05, 0.02, 0.01), m.brass, 0, 0.04, 0.13);
  add(torso, rbox(0.1, 0.1, 0.08, 0.03), m.leather, 0.19, 0.0, 0.05);
  add(torso, cyl(0.045, 0.05, 0.13, 14), m.metal, -0.2, 0.02, 0.02);
  add(torso, cyl(0.02, 0.02, 0.03, 10), m.dark, -0.2, 0.1, 0.02);
  add(torso, tor(0.13, 0.045).rotateX(Math.PI / 2), m.scarf, 0, 0.5, 0).scale.set(1, 1, 0.85);
  add(torso, rbox(0.03, 0.44, 0.02, 0.01), m.leather, 0.12, 0.27, 0.125);
  add(torso, rbox(0.03, 0.44, 0.02, 0.01), m.leather, -0.12, 0.27, 0.125);

  const scarfA = pivot(torso, 0.06, 0.48, 0.14);
  add(scarfA, rbox(0.08, 0.22, 0.03, 0.012), m.scarf, 0, -0.11, 0);
  const scarfB = pivot(torso, 0.12, 0.48, 0.13);
  add(scarfB, rbox(0.065, 0.16, 0.025, 0.01), m.scarf, 0, -0.08, 0);

  const pack = pivot(torso, 0, 0.48, -0.13);
  add(pack, rbox(0.32, 0.42, 0.17, 0.06), m.pack, 0, -0.21, -0.07);
  add(pack, rbox(0.33, 0.14, 0.18, 0.05), m.packDark, 0, -0.04, -0.07);
  add(pack, rbox(0.22, 0.14, 0.06, 0.03), m.packDark, 0, -0.32, -0.17);
  add(pack, rbox(0.04, 0.04, 0.02, 0.008), m.brass, 0, -0.1, -0.165);
  add(pack, rbox(0.04, 0.04, 0.02, 0.008), m.brass, 0, -0.3, -0.205);
  add(pack, cyl(0.085, 0.085, 0.42, 16).rotateZ(Math.PI / 2), m.roll, 0, 0.06, -0.07);
  add(pack, cyl(0.089, 0.089, 0.03, 16).rotateZ(Math.PI / 2), m.leather, 0.1, 0.06, -0.07);
  add(pack, cyl(0.089, 0.089, 0.03, 16).rotateZ(Math.PI / 2), m.leather, -0.1, 0.06, -0.07);

  const head = pivot(torso, 0, 0.56, 0);
  add(head, cyl(0.05, 0.055, 0.08, 14), m.skin, 0, 0.03, 0);
  const skull = add(head, sph(0.135), m.skin, 0, 0.19, 0.005);
  skull.scale.set(1, 1.04, 0.98);
  add(head, sph(0.14), m.hair, 0, 0.21, -0.03).scale.set(1.0, 0.85, 0.95);
  add(head, sph(0.03), m.skin, 0.132, 0.18, -0.01).scale.set(0.6, 1, 1);
  add(head, sph(0.03), m.skin, -0.132, 0.18, -0.01).scale.set(0.6, 1, 1);
  add(head, sph(0.022), m.dark, 0.048, 0.205, 0.118).scale.set(1, 1.25, 0.6);
  add(head, sph(0.022), m.dark, -0.048, 0.205, 0.118).scale.set(1, 1.25, 0.6);
  add(head, sph(0.007), m.white, 0.054, 0.215, 0.13);
  add(head, sph(0.007), m.white, -0.042, 0.215, 0.13);
  add(head, rbox(0.045, 0.012, 0.012, 0.005), m.hair, 0.05, 0.245, 0.118).rotation.z = -0.15;
  add(head, rbox(0.045, 0.012, 0.012, 0.005), m.hair, -0.05, 0.245, 0.118).rotation.z = 0.15;
  add(head, sph(0.026), m.skin, 0, 0.17, 0.135).scale.set(0.9, 1, 0.9);
  add(head, sph(0.022), m.blush, 0.075, 0.155, 0.105).scale.set(1, 0.6, 0.4);
  add(head, sph(0.022), m.blush, -0.075, 0.155, 0.105).scale.set(1, 0.6, 0.4);
  add(head, tor(0.022, 0.005, Math.PI).rotateZ(Math.PI), m.dark, 0, 0.13, 0.126);
  const hat = pivot(head, 0, 0.3, 0);
  const brim = add(hat, cyl(0.3, 0.31, 0.022, 32), m.hat, 0, 0, 0);
  brim.scale.set(1, 1, 0.92);
  add(hat, cyl(0.145, 0.17, 0.16, 28), m.hat, 0, 0.09, 0);
  add(hat, rbox(0.2, 0.03, 0.05, 0.012), m.hat, 0, 0.17, 0).scale.set(1, 1, 1);
  add(hat, cyl(0.173, 0.173, 0.045, 28), m.band, 0, 0.035, 0);

  const rig = { root, lean, body, torso, head, hat, pack, scarfA, scarfB };
  for (const side of [1, -1]) {
    const key = side === 1 ? 'L' : 'R';
    const shoulder = pivot(torso, 0.235 * side, 0.43, 0);
    add(shoulder, sph(0.07), m.shirt, 0, -0.01, 0);
    add(shoulder, cap(0.058, 0.17), m.shirt, 0, -0.13, 0);
    add(shoulder, tor(0.058, 0.018).rotateX(Math.PI / 2), m.shirt, 0, -0.24, 0);
    const elbow = pivot(shoulder, 0, -0.27, 0);
    add(elbow, cap(0.05, 0.15), m.skin, 0, -0.1, 0);
    add(elbow, cyl(0.055, 0.055, 0.04, 14), m.leather, 0, -0.16, 0);
    const hand = add(elbow, sph(0.055), m.skin, 0, -0.25, 0.01);
    hand.scale.set(0.85, 1.05, 0.9);
    add(elbow, cap(0.018, 0.03), m.skin, side * -0.035, -0.23, 0.045).rotation.x = 0.6;

    const hip = pivot(body, 0.095 * side, -0.05, 0);
    add(hip, cap(0.078, 0.28), m.pants, 0, -0.2, 0);
    add(hip, rbox(0.06, 0.1, 0.04, 0.015), m.patch, 0.07 * side, -0.2, 0.02);
    const knee = pivot(hip, 0, -0.42, 0);
    add(knee, sph(0.07), m.pants, 0, 0, 0);
    add(knee, cap(0.066, 0.2), m.pants, 0, -0.15, 0);
    const ankle = pivot(knee, 0, -0.36, 0);
    add(ankle, cyl(0.075, 0.072, 0.13, 18), m.boots, 0, 0.05, 0);
    add(ankle, tor(0.074, 0.012).rotateX(Math.PI / 2), m.leather, 0, 0.11, 0);
    add(ankle, rbox(0.15, 0.09, 0.26, 0.045), m.boots, 0, -0.035, 0.045);
    add(ankle, rbox(0.155, 0.03, 0.27, 0.012), m.sole, 0, -0.08, 0.045);
    add(ankle, rbox(0.06, 0.012, 0.08, 0.005), m.dark, 0, 0.012, 0.1);

    if (side === -1) {
      const lanternPivot = pivot(elbow, 0, -0.3, 0.02);
      const lantern = new THREE.Group();
      lanternPivot.add(lantern);
      const glass = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 });
      const piece = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = material !== glass;
        lantern.add(mesh);
        return mesh;
      };
      piece(tor(0.05, 0.007, Math.PI), m.dark, 0, -0.02, 0);
      piece(new THREE.ConeGeometry(0.075, 0.06, 16), m.dark, 0, -0.07, 0);
      piece(sph(0.015), m.brass, 0, -0.035, 0);
      piece(cyl(0.05, 0.05, 0.12, 16), glass, 0, -0.16, 0);
      piece(sph(0.022), new THREE.MeshBasicMaterial({ color: 0xfff4c8 }), 0, -0.165, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        piece(cyl(0.006, 0.006, 0.13, 6), m.dark, Math.cos(a) * 0.055, -0.16, Math.sin(a) * 0.055);
      }
      piece(cyl(0.07, 0.065, 0.03, 16), m.dark, 0, -0.235, 0);
      const light = new THREE.PointLight(0xffc877, 0, 14, 1.6);
      light.position.set(0, -0.16, 0);
      lanternPivot.add(light);
      lantern.visible = false;
      rig.lanternPivot = lanternPivot;
      rig.lantern = lantern;
      rig.lanternLight = light;
      rig.lanternGlass = glass;
    }
    rig['shoulder' + key] = shoulder;
    rig['elbow' + key] = elbow;
    rig['hip' + key] = hip;
    rig['knee' + key] = knee;
    rig['ankle' + key] = ankle;
  }

  root.scale.setScalar(0.92);
  return rig;
}

class ExplorerAnimator {
  constructor(rig) {
    this.rig = rig;
    this.phase = 0;
    this.time = 0;
    this.previousSpeed = 0;
    this.bob = new Spring(0);
    this.lean = new Spring(0);
    this.roll = new Spring(0);
    this.pack = new Spring(0);
    this.scarf = new Spring(0);
    this.hat = new Spring(0);
    this.lookTimer = 3;
    this.lookTarget = 0;
    this.air = 0;
    this.swim = 0;
    this.lastStep = 0;
    this.onStep = null;
    this.gait = 0;
    this.headTurn = 0;
  }

  joint(object, axis, target, dt, k) {
    object.rotation[axis] = damp(object.rotation[axis], target, k, dt);
  }

  update(dt, s) {
    const r = this.rig;
    this.time += dt;
    const acceleration = clamp((s.speed - this.previousSpeed) / Math.max(dt, 1e-4), -30, 30);
    this.previousSpeed = s.speed;

    const gait = smoothstep(0.15, 1.6, s.speed);
    const run = smoothstep(CONFIG.walkSpeed * 0.9, CONFIG.runSpeed * 0.95, s.speed);
    const cycleLength = lerp(2.5, 3.7, run);
    this.phase += s.swimming ? dt * (2.4 + s.speed * 0.75) : (s.speed * dt / cycleLength) * Math.PI * 2;
    this.air = damp(this.air, !s.grounded && !s.swimming ? 1 : 0, 12, dt);
    this.swim = damp(this.swim, s.swimming ? 1 : 0, 6, dt);
    if (s.landImpact > 0) this.bob.velocity -= Math.min(4.5, s.landImpact * 0.32);

    this.gait = gait;
    const stepIndex = Math.floor(this.phase / Math.PI);
    if (stepIndex !== this.lastStep) {
      this.lastStep = stepIndex;
      if (this.onStep && s.grounded && !s.swimming && gait > 0.3) this.onStep(stepIndex % 2 === 0 ? 1 : -1, run);
    }

    const p = this.phase;
    const sn = Math.sin(p);
    const cs = Math.cos(p);

    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookTimer = 2.5 + Math.random() * 4;
      this.lookTarget = Math.random() < 0.45 ? 0 : (Math.random() - 0.5) * 1.2;
    }
    const idle = 1 - gait;
    const breath = Math.sin(this.time * 1.7);
    const sway = Math.sin(this.time * 0.55);

    const hipAmp = lerp(0.55, 0.9, run) * gait;
    const kneeAmp = lerp(0.95, 1.75, run);
    const armAmp = lerp(0.5, 1.05, run) * gait;
    const swingL = Math.max(0, cs);
    const swingR = Math.max(0, -cs);
    const g = {
      hipL: -sn * hipAmp,
      hipR: sn * hipAmp,
      kneeL: (Math.pow(swingL, 1.4) * kneeAmp + swingR * 0.12) * gait + 0.06,
      kneeR: (Math.pow(swingR, 1.4) * kneeAmp + swingL * 0.12) * gait + 0.06,
      shoulderL: sn * armAmp + breath * 0.03 * idle,
      shoulderR: -sn * armAmp - breath * 0.03 * idle,
      armOutL: 0.08 + run * 0.1,
      armOutR: -0.08 - run * 0.1,
      pelvisYaw: -sn * lerp(0.1, 0.16, run) * gait,
      torsoYaw: sn * lerp(0.16, 0.24, run) * gait,
      pelvisRoll: cs * 0.04 * gait * (1 - run * 0.5) + sway * 0.025 * idle,
      lean: lerp(0.04, 0.3, run) * gait + clamp(acceleration * 0.012, -0.12, 0.18) + breath * 0.012 * idle,
      bob: cs * cs * lerp(0.035, 0.07, run) * gait - run * 0.05 * gait,
      headYaw: this.lookTarget * idle,
    };
    g.elbowL = -(0.15 + lerp(0.2, 1.3, run) * gait) - Math.max(0, -g.shoulderL) * 0.35;
    g.elbowR = -(0.15 + lerp(0.2, 1.3, run) * gait) - Math.max(0, -g.shoulderR) * 0.35;
    g.ankleL = -(g.hipL + g.kneeL) * 0.75 + Math.max(0, g.hipL) * 0.5 * gait;
    g.ankleR = -(g.hipR + g.kneeR) * 0.75 + Math.max(0, g.hipR) * 0.5 * gait;

    const falling = smoothstep(3, -6, s.verticalSpeed);
    const flail = Math.sin(this.time * 11) * 0.12 * falling;
    const a = {
      hipL: lerp(-0.85, -0.35, falling), hipR: lerp(0.35, 0.1, falling),
      kneeL: lerp(1.25, 0.45, falling), kneeR: lerp(0.55, 0.25, falling),
      ankleL: 0.2, ankleR: 0.35,
      shoulderL: lerp(-0.7, -1.25, falling) + flail, shoulderR: lerp(0.45, -1.0, falling) - flail,
      armOutL: lerp(0.4, 0.75, falling), armOutR: lerp(-0.4, -0.75, falling),
      elbowL: -0.55, elbowR: -0.35,
      pelvisYaw: 0, torsoYaw: 0, pelvisRoll: 0, lean: lerp(0.18, 0.02, falling), bob: 0, headYaw: 0,
    };

    const w = {
      hipL: 0.25 + Math.sin(p * 1.2) * 0.25, hipR: 0.25 - Math.sin(p * 1.2) * 0.25,
      kneeL: 0.6 + Math.cos(p * 1.2) * 0.35, kneeR: 0.6 - Math.cos(p * 1.2) * 0.35,
      ankleL: 0.5, ankleR: 0.5,
      shoulderL: -0.45 + sn * 0.3, shoulderR: -0.45 - sn * 0.3,
      armOutL: 0.95 + cs * 0.3, armOutR: -0.95 - cs * 0.3,
      elbowL: -0.55, elbowR: -0.55,
      pelvisYaw: 0, torsoYaw: 0, pelvisRoll: Math.sin(this.time * 1.3) * 0.04, lean: 0.08, bob: Math.sin(p) * 0.04, headYaw: 0,
    };

    const t = {};
    for (const key of Object.keys(g)) {
      const ground = g[key];
      const blended = lerp(ground, a[key], this.air);
      t[key] = lerp(blended, w[key], this.swim);
    }

    const crouch = Math.max(0, -this.bob.value);
    const k = 18;
    this.joint(r.hipL, 'x', t.hipL - crouch * 2.2, dt, k);
    this.joint(r.hipR, 'x', t.hipR - crouch * 2.2, dt, k);
    this.joint(r.kneeL, 'x', t.kneeL + crouch * 4.2, dt, k);
    this.joint(r.kneeR, 'x', t.kneeR + crouch * 4.2, dt, k);
    this.joint(r.ankleL, 'x', t.ankleL - crouch * 2, dt, k);
    this.joint(r.ankleR, 'x', t.ankleR - crouch * 2, dt, k);
    this.joint(r.shoulderL, 'x', t.shoulderL, dt, k);
    this.joint(r.shoulderR, 'x', t.shoulderR, dt, k);
    this.joint(r.shoulderL, 'z', t.armOutL, dt, k);
    this.joint(r.shoulderR, 'z', t.armOutR, dt, k);
    this.joint(r.elbowL, 'x', t.elbowL, dt, k);
    this.joint(r.elbowR, 'x', t.elbowR, dt, k);
    this.joint(r.body, 'y', t.pelvisYaw, dt, k);
    this.joint(r.body, 'z', t.pelvisRoll, dt, k);
    this.joint(r.torso, 'y', t.torsoYaw, dt, k);

    const lean = this.lean.update(t.lean + crouch * 1.5, dt, 2.2, 0.6);
    r.torso.rotation.x = lean;
    this.joint(r.head, 'x', -lean * 0.65 - crouch * 0.5, dt, 10);
    this.headTurn = damp(this.headTurn, clamp(s.turnRate * 0.18, -0.45, 0.45) * (1 - this.swim), 6, dt);
    this.joint(r.head, 'y', -t.torsoYaw * 0.85 + t.headYaw + this.headTurn, dt, 5);

    const bob = this.bob.update(t.bob, dt, 3.4, 0.42);
    r.body.position.y = 0.95 + bob;

    r.lean.rotation.z = 0;
    const lp = s.lantern || 0;
    if (lp > 0.001) {
      const reach = Math.sin(clamp01(lp / 0.55) * Math.PI) * (lp < 0.55 ? 1 : 0);
      const hold = smoothstep(0.45, 1, lp);
      r.shoulderR.rotation.x = lerp(lerp(r.shoulderR.rotation.x, 2.3, reach), -0.5 + Math.sin(this.phase) * 0.12 * gait, hold);
      r.shoulderR.rotation.z = lerp(lerp(r.shoulderR.rotation.z, -0.25, reach), -0.18, hold);
      r.elbowR.rotation.x = lerp(lerp(r.elbowR.rotation.x, -1.2, reach), -0.55, hold);
      this.lanternSwing = this.lanternSwing || new Spring(0);
      const swing = this.lanternSwing.update(-this.bob.velocity * 0.6 + Math.sin(this.phase) * 0.18 * gait, dt, 1.4, 0.18);
      r.lanternPivot.rotation.x = -(r.shoulderR.rotation.x + r.elbowR.rotation.x + (r.torso.rotation.x || 0)) + swing;
      r.lanternPivot.rotation.z = -r.shoulderR.rotation.z + Math.sin(this.time * 1.3) * 0.05;
    }
    r.lantern.visible = lp > 0.42;
    r.lantern.scale.setScalar(lerp(0.6, 1, smoothstep(0.42, 0.7, lp)));
    this.crawl = damp(this.crawl || 0, s.swimming && s.speed > 0.6 ? 1 : 0, 3.5, dt);
    const c = this.crawl;
    r.lean.rotation.x = c * 1.42;
    r.lean.position.set(0, c * 0.95, -c * 0.8);
    if (c > 0.01) {
      const stroke = (object, target) => {
        object.rotation.x = wrapAngle(object.rotation.x + wrapAngle(target - object.rotation.x) * c);
      };
      const thetaL = Math.PI + p;
      const thetaR = p;
      stroke(r.shoulderL, thetaL);
      stroke(r.shoulderR, thetaR);
      r.shoulderL.rotation.z = lerp(r.shoulderL.rotation.z, 0.12, c);
      r.shoulderR.rotation.z = lerp(r.shoulderR.rotation.z, -0.12, c);
      r.elbowL.rotation.x = lerp(r.elbowL.rotation.x, -0.1 - 1.3 * Math.max(0, Math.sin(thetaL)), c);
      r.elbowR.rotation.x = lerp(r.elbowR.rotation.x, -0.1 - 1.3 * Math.max(0, Math.sin(thetaR)), c);
      const kick = Math.sin(p * 3);
      r.hipL.rotation.x = lerp(r.hipL.rotation.x, kick * 0.32, c);
      r.hipR.rotation.x = lerp(r.hipR.rotation.x, -kick * 0.32, c);
      r.kneeL.rotation.x = lerp(r.kneeL.rotation.x, 0.15 + Math.max(0, -kick) * 0.3, c);
      r.kneeR.rotation.x = lerp(r.kneeR.rotation.x, 0.15 + Math.max(0, kick) * 0.3, c);
      r.ankleL.rotation.x = lerp(r.ankleL.rotation.x, 1.1, c);
      r.ankleR.rotation.x = lerp(r.ankleR.rotation.x, 1.1, c);
      r.torso.rotation.x *= 1 - c;
      r.torso.rotation.y = lerp(r.torso.rotation.y, Math.sin(p) * 0.45, c);
      r.body.rotation.y = lerp(r.body.rotation.y, Math.sin(p) * 0.2, c);
      const breathe = Math.sin(p) > 0.55 ? 0.9 : 0;
      r.head.rotation.x = lerp(r.head.rotation.x, -0.55, c);
      r.head.rotation.y = lerp(r.head.rotation.y, breathe, c * 0.9);
      r.body.position.y = lerp(r.body.position.y, 0.95, c);
    }

    if (this.crawl > 0.5) r.lantern.visible = false;
    r.lanternLight.intensity = smoothstep(0.55, 1, lp) * (this.crawl > 0.5 ? 0.6 : 1.4) * (s.lanternFlicker || 1);
    this.pack.update(clamp(-this.bob.velocity * 0.35 + run * 0.08, -0.3, 0.35), dt, 2.8, 0.28);
    r.pack.rotation.x = this.pack.value;
    this.scarf.update(0.15 + run * 0.55 + Math.max(0, -this.bob.velocity) * 0.3, dt, 2.2, 0.3);
    r.scarfA.rotation.x = -this.scarf.value;
    r.scarfB.rotation.x = -this.scarf.value * 1.2;
    r.scarfA.rotation.z = sn * 0.15 * gait;
    r.scarfB.rotation.z = -sn * 0.12 * gait;
    this.hat.update(clamp(this.bob.velocity * 0.12, -0.12, 0.12), dt, 3.5, 0.35);
    r.hat.rotation.x = this.hat.value;
  }
}
