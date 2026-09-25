function createPaperTexture(draw, width = 64, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  return new THREE.CanvasTexture(canvas);
}

class Footprints {
  constructor(scene) {
    const geometry = new THREE.CircleGeometry(0.1, 9).scale(0.85, 1.7, 1).rotateX(-Math.PI / 2);
    this.items = [];
    this.next = 0;
    for (let i = 0; i < 90; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, age: 0 });
    }
  }

  spawn(x, z, facing, side, color) {
    const item = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    const ox = Math.cos(facing) * 0.12 * side;
    const oz = -Math.sin(facing) * 0.12 * side;
    item.mesh.position.set(x + ox, Terrain.heightAt(x + ox, z + oz) + 0.035, z + oz);
    item.mesh.rotation.y = facing;
    item.mesh.material.color.copy(color);
    item.mesh.visible = true;
    item.age = 0;
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.age += dt;
      item.mesh.material.opacity = 0.42 * (1 - smoothstep(14, 25, item.age));
      if (item.age > 25) item.mesh.visible = false;
    }
  }
}

class DustPuffs {
  constructor(scene, materials) {
    const geometry = flatShaded(new THREE.IcosahedronGeometry(0.22, 0));
    this.items = [];
    this.next = 0;
    for (let i = 0; i < 48; i++) {
      const mesh = new THREE.Mesh(geometry, materials.toon(0xffffff, { transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, age: 0, life: 1, velocity: new THREE.Vector3(), size: 1 });
    }
  }

  spawn(position, color, count = 3, strength = 1) {
    for (let n = 0; n < count; n++) {
      const item = this.items[this.next];
      this.next = (this.next + 1) % this.items.length;
      const a = Math.random() * Math.PI * 2;
      item.mesh.position.set(position.x + Math.cos(a) * 0.2, position.y + 0.1, position.z + Math.sin(a) * 0.2);
      item.velocity.set(Math.cos(a) * (0.6 + Math.random()) * strength, 0.5 + Math.random() * 0.8, Math.sin(a) * (0.6 + Math.random()) * strength);
      item.mesh.material.color.copy(color);
      item.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      item.life = 0.7 + Math.random() * 0.5;
      item.size = (0.6 + Math.random() * 0.6) * strength;
      item.age = 0;
      item.mesh.visible = true;
    }
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.age += dt;
      const t = item.age / item.life;
      if (t >= 1) {
        item.mesh.visible = false;
        continue;
      }
      item.velocity.multiplyScalar(Math.exp(-3 * dt));
      item.mesh.position.addScaledVector(item.velocity, dt);
      item.mesh.scale.setScalar(item.size * (0.6 + t * 1.4));
      item.mesh.material.opacity = (1 - t) * 0.55;
    }
  }
}

class AirMotes {
  constructor(scene) {
    this.pollen = this.makeField(scene, 160, 0xfff2cc, 0.07, THREE.NormalBlending);
    this.fireflies = this.makeField(scene, 60, 0xd8ff7a, 0.16, THREE.AdditiveBlending);
    this.time = 0;
  }

  makeField(scene, count, color, size, blending) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i++) seeds.push({ x: Math.random() * 30 - 15, y: Math.random() * 5, z: Math.random() * 30 - 15, p: Math.random() * 100 });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, vertexColors: true, transparent: true, depthWrite: false, blending }));
    points.frustumCulled = false;
    scene.add(points);
    return { points, positions, colors, seeds };
  }

  updateField(field, center, amount, dt, flicker) {
    field.points.visible = amount > 0.02;
    if (!field.points.visible) return;
    const t = this.time;
    field.seeds.forEach((s, i) => {
      const x = s.x + Math.sin(t * 0.3 + s.p) * 2;
      const z = s.z + Math.cos(t * 0.25 + s.p * 1.3) * 2;
      const wx = center.x + ((((x + 15) % 30) + 30) % 30) - 15;
      const wz = center.z + ((((z + 15) % 30) + 30) % 30) - 15;
      const ground = Math.max(Terrain.heightAt(wx, wz), CONFIG.waterLevel);
      field.positions.set([wx, ground + 0.4 + s.y * 0.5 + Math.sin(t * 0.8 + s.p) * 0.4, wz], i * 3);
      const glow = flicker ? Math.max(0, Math.sin(t * 2.2 + s.p * 3)) : 1;
      const v = flicker ? amount * glow : 1;
      field.colors.set([v, v, v], i * 3);
    });
    if (!flicker) field.points.material.opacity = amount * 0.8;
    field.points.geometry.attributes.position.needsUpdate = true;
    field.points.geometry.attributes.color.needsUpdate = true;
  }

  update(dt, center, env, biome) {
    this.time += dt;
    const lush = biome === BIOME.MEADOW || biome === BIOME.FOREST || biome === BIOME.SAVANNA;
    this.updateField(this.pollen, center, env.daylight * (1 - env.overcast) * (lush ? 1 : 0.4), dt, false);
    this.updateField(this.fireflies, center, env.night * (lush ? 1 : 0) * (1 - env.overcast * 0.7), dt, true);
  }
}

class FallingLeaves {
  constructor(scene, materials) {
    const geometry = Models.leafGeometry(0.16, 0.07, 0.02);
    geometry.computeVertexNormals();
    const colors = [0xf0a23a, 0xe8902c, 0xd9b04a, 0x9cbf74, 0xc86a3a];
    this.items = [];
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(geometry, materials.toon(colors[i % colors.length], { side: THREE.DoubleSide }));
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, active: false, speed: 0, phase: Math.random() * 10 });
    }
    this.time = 0;
  }

  update(dt, center, amount, wind) {
    this.time += dt;
    for (const item of this.items) {
      const m = item.mesh;
      if (!item.active) {
        if (Math.random() < amount * dt * 0.8) {
          m.position.set(center.x + (Math.random() - 0.5) * 24, center.y + 6 + Math.random() * 5, center.z + (Math.random() - 0.5) * 24);
          item.speed = 0.6 + Math.random() * 0.5;
          item.active = true;
          m.visible = true;
        }
        continue;
      }
      const t = this.time + item.phase;
      m.position.x += (Math.sin(t * 1.3) * 0.8 + wind * 0.6) * dt;
      m.position.z += Math.cos(t * 1.1) * 0.6 * dt;
      m.position.y -= item.speed * dt;
      m.rotation.set(Math.sin(t * 2.1) * 1.2, t * 1.5, Math.cos(t * 1.7) * 0.9);
      if (m.position.y < Terrain.heightAt(m.position.x, m.position.z) + 0.05) {
        item.active = false;
        m.visible = false;
      }
    }
  }
}

class LightShafts {
  constructor(scene) {
    const texture = createPaperTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,245,210,0)');
      g.addColorStop(0.25, 'rgba(255,245,210,0.8)');
      g.addColorStop(0.8, 'rgba(255,245,210,0.5)');
      g.addColorStop(1, 'rgba(255,245,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(0,0,0,1)');
      side.addColorStop(0.3, 'rgba(0,0,0,0)');
      side.addColorStop(0.7, 'rgba(0,0,0,0)');
      side.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, w, h);
    }, 32, 128);
    const geometry = new THREE.PlaneGeometry(1.8, 16);
    this.items = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, offset: new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30), phase: Math.random() * 10 });
    }
    this.time = 0;
    this.xAxis = new THREE.Vector3();
    this.zAxis = new THREE.Vector3();
    this.base = new THREE.Vector3();
  }

  update(dt, center, camera, env, forestAmount) {
    this.time += dt;
    const strength = forestAmount * env.daylight * (1 - env.overcast) * 0.16;
    const dir = env.lightDirection;
    for (const item of this.items) {
      item.mesh.visible = strength > 0.005;
      if (!item.mesh.visible) continue;
      const rx = ((item.offset.x - center.x * 0.02) % 30 + 45) % 30 - 15;
      this.base.set(center.x + rx, 0, center.z + item.offset.z);
      this.base.y = Terrain.heightAt(this.base.x, this.base.z);
      this.base.addScaledVector(dir, 8);
      this.zAxis.copy(camera.position).sub(this.base);
      this.zAxis.addScaledVector(dir, -this.zAxis.dot(dir)).normalize();
      this.xAxis.crossVectors(dir, this.zAxis).normalize();
      item.mesh.matrix.makeBasis(this.xAxis, dir, this.zAxis).setPosition(this.base);
      item.mesh.matrixWorldNeedsUpdate = true;
      item.mesh.material.opacity = strength * (0.6 + 0.4 * Math.sin(this.time * 0.4 + item.phase));
    }
  }
}

class FishJumps {
  constructor(scene, materials) {
    const parts = [
      Models.part(new THREE.OctahedronGeometry(0.2, 0).scale(0.55, 0.7, 1.4), 0x8aa7b8, null, (x, y) => (y > 0 ? 1 : 0.8)),
      Models.part(Models.fromTriangles([[0, 0, -0.26], [0, 0.14, -0.42], [0, -0.14, -0.42]]), 0x7894a6),
      Models.part(Models.fromTriangles([[0, 0.1, 0.02], [0, 0.2, -0.1], [0, 0.1, -0.14]]), 0x7894a6),
    ];
    this.mesh = new THREE.Mesh(Models.merge(parts), materials.solid);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.timer = 6;
    this.active = null;
  }

  update(dt, center, ripples, onJump) {
    if (this.active) {
      const a = this.active;
      a.t += dt / a.duration;
      if (a.t >= 1) {
        ripples.spawn(a.to.x, a.to.z, 0.7, 1.4);
        this.active = null;
        this.mesh.visible = false;
      } else {
        const x = lerp(a.from.x, a.to.x, a.t);
        const z = lerp(a.from.z, a.to.z, a.t);
        const y = CONFIG.waterLevel + Math.sin(a.t * Math.PI) * a.height - 0.1;
        this.mesh.position.set(x, y, z);
        this.mesh.rotation.set(-Math.cos(a.t * Math.PI) * 0.9, a.heading, 0);
      }
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 5 + Math.random() * 9;
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 7 + Math.random() * 22;
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;
      if (Terrain.heightAt(x, z) > CONFIG.waterLevel - 1.2) continue;
      const heading = Math.random() * Math.PI * 2;
      const from = new THREE.Vector3(x, 0, z);
      const to = new THREE.Vector3(x + Math.sin(heading) * 2.2, 0, z + Math.cos(heading) * 2.2);
      this.active = { from, to, t: 0, duration: 1.0, height: 1.1 + Math.random() * 0.5, heading };
      this.mesh.visible = true;
      ripples.spawn(x, z, 0.8, 1.4);
      if (onJump) onJump(from, distance);
      return;
    }
  }
}

class SkyEvents {
  constructor(scene, materials) {
    this.scene = scene;
    const streakTexture = createPaperTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.85, 'rgba(255,250,230,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.35, w, h * 0.3);
    }, 128, 16);
    this.star = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.6), new THREE.MeshBasicMaterial({ map: streakTexture, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.star.visible = false;
    this.star.renderOrder = -1;
    scene.add(this.star);
    this.starTimer = 12;
    this.starState = null;

    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, 0, 0, -0.3, 1.4, 0, -0.15], 3));
    wing.computeVertexNormals();
    const material = materials.toon(0x4f5660, { side: THREE.DoubleSide });
    this.flock = new THREE.Group();
    this.birds = [];
    for (let i = 0; i < 17; i++) {
      const g = new THREE.Group();
      const left = new THREE.Mesh(wing, material);
      const right = new THREE.Mesh(wing, material);
      right.scale.x = -1;
      g.add(left, right, new THREE.Mesh(flatShaded(new THREE.ConeGeometry(0.14, 0.9, 4).rotateX(Math.PI / 2)), material));
      const row = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      g.position.set(i === 0 ? 0 : side * row * 2.4, (Math.random() - 0.5) * 1.2, -row * 2.2);
      this.flock.add(g);
      this.birds.push({ g, left, right, phase: Math.random() * 10 });
    }
    this.flock.visible = false;
    scene.add(this.flock);
    this.flockTimer = 90 + Math.random() * 120;
    this.flockState = null;
    this.time = 0;
  }

  update(dt, center, env, onFlock) {
    this.time += dt;
    this.starTimer -= dt;
    if (!this.starState && this.starTimer <= 0 && env.night > 0.8 && env.overcast < 0.4) {
      this.starTimer = 15 + Math.random() * 35;
      const a = Math.random() * Math.PI * 2;
      this.starState = { t: 0, a, elevation: 0.45 + Math.random() * 0.35 };
    }
    if (this.starState) {
      const s = this.starState;
      s.t += dt / 1.3;
      const r = 620;
      const a = s.a + s.t * 0.35;
      this.star.position.set(center.x + Math.cos(a) * r, center.y + r * s.elevation - s.t * 90, center.z + Math.sin(a) * r);
      this.star.lookAt(center.x, center.y, center.z);
      this.star.rotateZ(-0.5);
      this.star.material.opacity = Math.sin(Math.min(1, s.t) * Math.PI);
      this.star.visible = true;
      if (s.t >= 1) {
        this.starState = null;
        this.star.visible = false;
      }
    }

    this.flockTimer -= dt;
    if (!this.flockState && this.flockTimer <= 0 && env.daylight > 0.7 && env.overcast < 0.6) {
      this.flockTimer = 150 + Math.random() * 180;
      const heading = Math.random() * Math.PI * 2;
      this.flockState = { t: 0, heading, start: new THREE.Vector3(center.x - Math.sin(heading) * 220, center.y + 50, center.z - Math.cos(heading) * 220) };
      if (onFlock) onFlock();
    }
    if (this.flockState) {
      const f = this.flockState;
      f.t += dt;
      this.flock.visible = true;
      this.flock.position.set(f.start.x + Math.sin(f.heading) * f.t * 14, f.start.y, f.start.z + Math.cos(f.heading) * f.t * 14);
      this.flock.rotation.y = f.heading;
      for (const b of this.birds) {
        const flap = Math.sin(this.time * 5 + b.phase) * 0.6;
        b.left.rotation.z = flap;
        b.right.rotation.z = -flap;
      }
      if (f.t > 32) {
        this.flockState = null;
        this.flock.visible = false;
      }
    }
  }
}
