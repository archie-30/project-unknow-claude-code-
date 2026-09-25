class Tornado {
  constructor(scene, materials) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.rings = [];
    const colors = [0xcfc6b4, 0xbdb3a0, 0xd9d1c0, 0xb4aa98];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const radius = lerp(0.6, 7.5, t * t);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.05, radius, 2.2, 14, 1, true),
        materials.toon(colors[i % colors.length], { transparent: true, opacity: lerp(0.75, 0.45, t), side: THREE.DoubleSide, depthWrite: false })
      );
      mesh.position.y = i * 1.9 + 1;
      this.group.add(mesh);
      this.rings.push({ mesh, speed: 2 + (1 - t) * 3 + Math.random(), phase: Math.random() * 6 });
    }
    const debrisGeometry = flatShaded(new THREE.BoxGeometry(0.25, 0.04, 0.18));
    const debrisMaterial = materials.toon(0x9a8a6a, { side: THREE.DoubleSide });
    const leafMaterial = materials.toon(0x7fa862, { side: THREE.DoubleSide });
    this.debris = [];
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(debrisGeometry, i % 3 ? debrisMaterial : leafMaterial);
      this.group.add(mesh);
      this.debris.push({ mesh, angle: Math.random() * 6.28, height: Math.random() * 28, speed: 2 + Math.random() * 2 });
    }
    this.base = new THREE.Mesh(new THREE.TorusGeometry(4, 0.8, 4, 20), materials.toon(0xd9c9a8, { transparent: true, opacity: 0.5, depthWrite: false }));
    this.base.rotation.x = Math.PI / 2;
    this.base.position.y = 0.4;
    this.group.add(this.base);
    this.active = false;
    this.timer = 90 + Math.random() * 120;
    this.position = new THREE.Vector3();
    this.heading = 0;
    this.life = 0;
    this.strength = 0;
    this.capture = null;
    this.cooldown = 0;
    this.time = 0;
  }

  get distanceLevel() {
    return this.lastDistance === undefined ? 0 : clamp01(1 - this.lastDistance / 90) * this.strength;
  }

  spawn(center) {
    const angle = Math.random() * Math.PI * 2;
    this.position.set(center.x + Math.cos(angle) * 70, 0, center.z + Math.sin(angle) * 70);
    this.heading = Math.atan2(center.x - this.position.x, center.z - this.position.z);
    this.life = 75;
    this.active = true;
    this.group.visible = true;
  }

  update(dt, player, biome, weather, onCapture, onRelease) {
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const open = biome === BIOME.MEADOW || biome === BIOME.SAVANNA || biome === BIOME.DESERT;
    if (!this.active) {
      this.strength = 0;
      this.timer -= dt * (open ? 1 + (weather.wind > 1.4 ? 2 : 0) + (weather.rain > 0.3 ? 1.5 : 0) : 0);
      if (this.timer <= 0) {
        this.timer = 150 + Math.random() * 200;
        this.spawn(player.position);
      }
      return false;
    }
    this.life -= dt;
    this.strength = damp(this.strength, this.life > 6 ? 1 : 0, 1.2, dt);
    const toPlayer = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z);
    this.heading += wrapAngle(toPlayer - this.heading) * dt * 0.25 + Math.sin(this.time * 0.4) * dt * 0.5;
    this.position.x += Math.sin(this.heading) * 2.6 * dt;
    this.position.z += Math.cos(this.heading) * 2.6 * dt;
    this.position.y = Math.max(Terrain.heightAt(this.position.x, this.position.z), CONFIG.waterLevel);
    this.group.position.copy(this.position);
    this.group.scale.setScalar(Math.max(0.01, this.strength));
    this.rings.forEach((ring, i) => {
      ring.mesh.rotation.y += ring.speed * dt;
      ring.mesh.position.x = Math.sin(this.time * 0.9 + i * 0.35) * i * 0.12;
      ring.mesh.position.z = Math.cos(this.time * 0.7 + i * 0.3) * i * 0.1;
    });
    for (const d of this.debris) {
      d.angle += d.speed * dt;
      d.height = (d.height + dt * 3) % 28;
      const r = lerp(1.2, 7, (d.height / 28) ** 2) + 0.8;
      d.mesh.position.set(Math.cos(d.angle) * r, d.height, Math.sin(d.angle) * r);
      d.mesh.rotation.set(this.time * 3 + d.angle, d.angle, this.time * 2);
    }
    this.base.rotation.z += dt * 2;
    this.lastDistance = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);

    if (this.capture) {
      const c = this.capture;
      c.t += dt;
      c.angle += dt * 4.2;
      const height = Math.min(22, c.t * 7.5);
      player.position.set(this.position.x + Math.cos(c.angle) * 2.6, this.position.y + 0.5 + height, this.position.z + Math.sin(c.angle) * 2.6);
      player.previousPosition.copy(player.position);
      player.velocity.set(-Math.sin(c.angle) * 11, 7.5, Math.cos(c.angle) * 11);
      player.grounded = false;
      if (c.t > 3.4) {
        this.capture = null;
        this.cooldown = 10;
        player.velocity.set(Math.cos(c.angle) * 9 - Math.sin(c.angle) * 5, 4, Math.sin(c.angle) * 9 + Math.cos(c.angle) * 5);
        if (onRelease) onRelease();
      }
      return true;
    }
    if (this.strength > 0.6 && this.cooldown <= 0 && this.lastDistance < 4.5 && player.position.y < this.position.y + 6) {
      this.capture = { t: 0, angle: Math.atan2(player.position.z - this.position.z, player.position.x - this.position.x) };
      if (onCapture) onCapture();
      return true;
    }
    if (this.life <= 0 && this.strength < 0.02) {
      this.active = false;
      this.group.visible = false;
    }
    return false;
  }
}

class Aurora {
  constructor(parent) {
    this.uniforms = { uTime: { value: 0 }, uStrength: { value: 0 } };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.x * 0.012 + uTime * 0.3) * 40.0 + sin(p.x * 0.03 - uTime * 0.5) * 12.0;
          p.y += sin(p.x * 0.02 + uTime * 0.2) * 8.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float band = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
          float rays = 0.55 + 0.45 * sin(vUv.x * 90.0 + uTime * 1.3) * sin(vUv.x * 37.0 - uTime * 0.7);
          vec3 green = vec3(0.35, 1.0, 0.65);
          vec3 violet = vec3(0.65, 0.4, 1.0);
          vec3 color = mix(green, violet, smoothstep(0.35, 0.9, vUv.y));
          float edge = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
          gl_FragColor = vec4(color, band * rays * edge * uStrength * 0.55);
        }`,
    });
    this.group = new THREE.Group();
    [[0, 150, -380, 0.1], [120, 175, -330, -0.35], [-160, 165, -350, 0.3]].forEach(([x, y, z, r]) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(520, 90, 60, 1), material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(0.35, r, 0);
      mesh.renderOrder = -1.9;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    });
    this.group.visible = false;
    parent.add(this.group);
    this.level = 0;
  }

  update(dt, env, biome) {
    const cold = biome === BIOME.SNOW || biome === BIOME.TAIGA ? 1 : 0;
    this.level = damp(this.level, cold * env.night * (1 - env.overcast), 0.4, dt);
    this.uniforms.uTime.value += dt;
    this.uniforms.uStrength.value = this.level;
    this.group.visible = this.level > 0.01;
  }
}
