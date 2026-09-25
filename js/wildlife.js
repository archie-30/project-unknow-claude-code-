class Butterflies {
  constructor(scene, materials) {
    const wing = new THREE.PlaneGeometry(0.2, 0.15).rotateX(-Math.PI / 2).translate(0.1, 0, 0);
    const body = flatShaded(new THREE.BoxGeometry(0.03, 0.03, 0.14));
    const bodyMaterial = materials.toon(0x2e2a26);
    const wingMaterials = [0xffd23f, 0xff8c42, 0xffffff, 0x8ecae6, 0xe56b9f].map((color) => materials.toon(color, { side: THREE.DoubleSide }));
    const rng = mulberry32(WORLD_SEED ^ 0xb077);
    this.items = [];
    for (let i = 0; i < CONFIG.butterflyCount; i++) {
      const group = new THREE.Group();
      const wingMaterial = wingMaterials[i % wingMaterials.length];
      const left = new THREE.Mesh(wing, wingMaterial);
      const right = new THREE.Mesh(wing, wingMaterial);
      right.scale.x = -1;
      group.add(left, right, new THREE.Mesh(body, bodyMaterial));
      group.visible = false;
      scene.add(group);
      this.items.push({ group, left, right, anchor: new THREE.Vector3(), phase: rng() * 100, speed: 0.7 + rng() * 0.6, active: false, rng });
    }
  }

  respawn(item, center) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const angle = item.rng() * Math.PI * 2;
      const distance = 6 + item.rng() * 30;
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;
      const h = Terrain.heightAt(x, z);
      if (h < CONFIG.waterLevel + 0.5) continue;
      const biome = Terrain.biomeAt(x, z, h);
      if (biome === BIOME.MEADOW || biome === BIOME.FOREST || biome === BIOME.SAVANNA) {
        item.anchor.set(x, h, z);
        item.active = true;
        item.group.visible = true;
        return;
      }
    }
    item.active = false;
    item.group.visible = false;
  }

  update(time, dt, center) {
    for (const item of this.items) {
      const dx = item.anchor.x - center.x;
      const dz = item.anchor.z - center.z;
      if (!item.active || dx * dx + dz * dz > 45 * 45) {
        this.respawn(item, center);
        if (!item.active) continue;
      }
      const awayX = item.group.position.x - center.x;
      const awayZ = item.group.position.z - center.z;
      const near = Math.hypot(awayX, awayZ);
      item.distance = near;
      if (near < 4) {
        item.anchor.x += (awayX / (near + 0.01)) * dt * 6;
        item.anchor.z += (awayZ / (near + 0.01)) * dt * 6;
        item.boost = 1;
      }
      item.boost = Math.max(0, (item.boost || 0) - dt * 0.5);
      const t = time * item.speed + item.phase;
      item.anchor.x += Math.sin(t * 0.13) * dt * 0.6;
      item.anchor.z += Math.cos(t * 0.11) * dt * 0.6;
      const x = item.anchor.x + Math.sin(t * 0.7) * 2.2 + Math.sin(t * 1.9) * 0.5;
      const z = item.anchor.z + Math.cos(t * 0.6) * 2.2 + Math.cos(t * 1.7) * 0.4;
      const ground = Math.max(Terrain.heightAt(x, z), CONFIG.waterLevel);
      const y = ground + 0.8 + Math.sin(t * 2.3) * 0.35 + item.boost * 1.5;
      const g = item.group;
      const heading = Math.atan2(x - g.position.x, z - g.position.z);
      if (Number.isFinite(heading)) g.rotation.y = heading;
      g.position.set(x, y, z);
      const flap = 0.15 + (Math.sin(time * 22 + item.phase) * 0.5 + 0.5) * 1.15;
      item.left.rotation.z = flap;
      item.right.rotation.z = -flap;
    }
  }
}

class Birds {
  constructor(scene, materials) {
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.18, 0.9, 0, -0.1], 3));
    wing.computeVertexNormals();
    const material = materials.toon(0x4a5560, { side: THREE.DoubleSide });
    const bodyGeometry = flatShaded(new THREE.ConeGeometry(0.09, 0.6, 4).rotateX(Math.PI / 2));
    this.flocks = [];
    const rng = mulberry32(WORLD_SEED ^ 0xb1d5);
    for (let f = 0; f < 2; f++) {
      const flock = { center: new THREE.Vector3(), height: 30, radius: 20 + rng() * 15, speed: 0.25 + rng() * 0.15, angle: rng() * 6, birds: [], placed: false, rng };
      for (let i = 0; i < 5; i++) {
        const group = new THREE.Group();
        const left = new THREE.Mesh(wing, material);
        const right = new THREE.Mesh(wing, material);
        right.scale.x = -1;
        group.add(left, right, new THREE.Mesh(bodyGeometry, material));
        scene.add(group);
        flock.birds.push({ group, left, right, offset: new THREE.Vector3((rng() - 0.5) * 6, (rng() - 0.5) * 2, (rng() - 0.5) * 6), phase: rng() * 10 });
      }
      this.flocks.push(flock);
    }
  }

  update(time, dt, center) {
    for (const flock of this.flocks) {
      const dx = flock.center.x - center.x;
      const dz = flock.center.z - center.z;
      if (!flock.placed || dx * dx + dz * dz > 110 * 110) {
        const angle = flock.rng() * Math.PI * 2;
        const distance = 30 + flock.rng() * 40;
        flock.center.set(center.x + Math.cos(angle) * distance, 0, center.z + Math.sin(angle) * distance);
        flock.height = Math.max(Terrain.heightAt(flock.center.x, flock.center.z), CONFIG.waterLevel) + 24 + flock.rng() * 12;
        flock.placed = true;
      }
      flock.angle += flock.speed * dt;
      const cx = flock.center.x + Math.cos(flock.angle) * flock.radius;
      const cz = flock.center.z + Math.sin(flock.angle) * flock.radius;
      const heading = Math.atan2(-Math.sin(flock.angle), Math.cos(flock.angle));
      for (const bird of flock.birds) {
        const g = bird.group;
        g.position.set(cx + bird.offset.x, flock.height + bird.offset.y + Math.sin(time * 0.8 + bird.phase) * 0.6, cz + bird.offset.z);
        g.rotation.y = heading;
        g.rotation.z = -0.25;
        const flap = Math.sin(time * 7 + bird.phase) * 0.55;
        bird.left.rotation.z = flap;
        bird.right.rotation.z = -flap;
      }
    }
  }
}

