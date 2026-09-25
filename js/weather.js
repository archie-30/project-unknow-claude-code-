const WEATHER_STATES = {
  clear: { overcast: 0, precip: 0, wind: 1, fog: 0, weight: 40 },
  cloudy: { overcast: 0.55, precip: 0, wind: 1.3, fog: 0.05, weight: 20 },
  rain: { overcast: 0.85, precip: 1, wind: 1.6, fog: 0.2, weight: 20 },
  fog: { overcast: 0.4, precip: 0, wind: 0.6, fog: 1, weight: 8 },
  windy: { overcast: 0.2, precip: 0, wind: 2.6, fog: 0, weight: 12 },
};

class Weather {
  constructor(scene) {
    this.scene = scene;
    this.state = 'clear';
    this.timer = 120;
    this.rng = mulberry32(WORLD_SEED ^ 0x3ea7);
    this.overcast = 0;
    this.precip = 0;
    this.wind = 1;
    this.fog = 0;
    this.rain = 0;
    this.snow = 0;
    this.dust = 0;
    this.rainbow = 0;
    this.rainbowTimer = 0;
    this.lastRainPeak = 0;
    this.buildRain();
    this.buildSnow();
    this.buildDust();
    this.buildRainbow();
  }

  buildRain() {
    this.rainCount = 700;
    this.rainPositions = new Float32Array(this.rainCount * 6);
    this.rainSeeds = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) this.rainSeeds.set([this.rng() * 44 - 22, this.rng() * 28, this.rng() * 44 - 22], i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.55, depthWrite: false }));
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);
  }

  buildPoints(count, color, size) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) seeds.set([this.rng() * 50 - 25, this.rng() * 24, this.rng() * 50 - 25], i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false }));
    points.frustumCulled = false;
    this.scene.add(points);
    return { points, positions, seeds, count };
  }

  buildSnow() {
    this.snowField = this.buildPoints(900, 0xffffff, 0.14);
  }

  buildDust() {
    this.dustField = this.buildPoints(700, 0xd9bc8e, 0.12);
  }

  buildRainbow() {
    this.rainbowGroup = new THREE.Group();
    const colors = [0xe8766a, 0xf0a868, 0xf2d27a, 0x9cc68a, 0x86b4d6, 0x9d90cf];
    colors.forEach((color, i) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(300 - i * 7, 3.4, 3, 64, Math.PI),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, fog: false, depthWrite: false, side: THREE.DoubleSide })
      );
      mesh.renderOrder = -1.5;
      this.rainbowGroup.add(mesh);
    });
    this.rainbowGroup.visible = false;
    this.scene.add(this.rainbowGroup);
  }

  pickNext() {
    const entries = Object.entries(WEATHER_STATES).filter(([name]) => name !== this.state);
    const total = entries.reduce((sum, [, s]) => sum + s.weight, 0);
    let roll = this.rng() * total;
    for (const [name, spec] of entries) {
      roll -= spec.weight;
      if (roll <= 0) return name;
    }
    return 'clear';
  }

  setState(name) {
    this.state = name;
    this.timer = CONFIG.weatherMinDuration + this.rng() * (CONFIG.weatherMaxDuration - CONFIG.weatherMinDuration);
  }

  update(dt, cameraPosition, biome, env) {
    this.timer -= dt;
    if (this.timer <= 0) this.setState(this.pickNext());
    const target = WEATHER_STATES[this.state];
    const k = 1 - Math.exp(-dt / 12);
    this.overcast += (target.overcast - this.overcast) * k;
    this.precip += (target.precip - this.precip) * k;
    this.wind += (target.wind - this.wind) * k;
    this.fog += (target.fog - this.fog) * k;

    const cold = biome === BIOME.SNOW || biome === BIOME.TAIGA;
    const dry = biome === BIOME.DESERT || biome === BIOME.SAVANNA;
    const blend = 1 - Math.exp(-dt / 3);
    this.rain += ((!cold && !dry ? this.precip : 0) - this.rain) * blend;
    this.snow += ((cold ? this.precip : 0) - this.snow) * blend;
    this.dust += ((dry ? Math.max(this.precip, smoothstep(1.8, 2.6, this.wind)) : 0) - this.dust) * blend;

    this.lastRainPeak = Math.max(this.lastRainPeak * Math.exp(-dt / 60), this.rain);
    if (this.state !== 'rain' && this.lastRainPeak > 0.6 && this.rain < 0.15 && env && env.daylight > 0.7 && this.rainbowTimer <= 0) {
      this.rainbowTimer = 70;
      this.lastRainPeak = 0;
      this.rainbowDirection = Math.atan2(-env.sunDirection.z, -env.sunDirection.x);
    }
    this.rainbowTimer = Math.max(0, this.rainbowTimer - dt);
    this.rainbow = this.rainbowTimer > 0 ? Math.min(1, (70 - this.rainbowTimer) / 8, this.rainbowTimer / 12) : 0;

    this.updateRain(dt, cameraPosition);
    this.updateField(this.snowField, this.snow, dt, cameraPosition, (s, t) => [s[0] + Math.sin(t * 0.7 + s[1]) * 0.8 + t * this.wind * 0.6, s[1] - t * 1.6, s[2] + Math.cos(t * 0.5 + s[0]) * 0.8]);
    this.updateField(this.dustField, this.dust, dt, cameraPosition, (s, t) => [s[0] + t * (8 + this.wind * 5), s[1] * 0.35 + Math.sin(t * 2 + s[2]) * 0.4, s[2] + Math.sin(t * 0.8 + s[0]) * 1.5]);
    this.updateRainbow(cameraPosition);
  }

  updateRain(dt, cameraPosition) {
    const visible = Math.floor(this.rainCount * this.rain);
    this.rainLines.visible = visible > 0;
    if (!visible) return;
    this.time = (this.time || 0) + dt;
    const lean = 0.08 * this.wind;
    for (let i = 0; i < visible; i++) {
      const sx = this.rainSeeds[i * 3];
      const sy = this.rainSeeds[i * 3 + 1];
      const sz = this.rainSeeds[i * 3 + 2];
      const fall = ((sy - this.time * 22) % 28 + 28) % 28;
      const x = cameraPosition.x + sx + fall * lean * 3;
      const y = cameraPosition.y - 8 + fall;
      const z = cameraPosition.z + sz;
      this.rainPositions.set([x, y, z, x - lean * 0.8, y - 0.8, z], i * 6);
    }
    this.rainLines.geometry.setDrawRange(0, visible * 2);
    this.rainLines.geometry.attributes.position.needsUpdate = true;
  }

  updateField(field, amount, dt, cameraPosition, motion) {
    const visible = Math.floor(field.count * amount);
    field.points.visible = visible > 0;
    if (!visible) return;
    field.time = (field.time || 0) + dt;
    const s = [0, 0, 0];
    for (let i = 0; i < visible; i++) {
      s[0] = field.seeds[i * 3];
      s[1] = field.seeds[i * 3 + 1];
      s[2] = field.seeds[i * 3 + 2];
      const [x, y, z] = motion(s, field.time);
      field.positions[i * 3] = cameraPosition.x + (((x + 25) % 50) + 50) % 50 - 25;
      field.positions[i * 3 + 1] = cameraPosition.y - 6 + (((y % 24) + 24) % 24);
      field.positions[i * 3 + 2] = cameraPosition.z + (((z + 25) % 50) + 50) % 50 - 25;
    }
    field.points.geometry.setDrawRange(0, visible);
    field.points.geometry.attributes.position.needsUpdate = true;
  }

  updateRainbow(cameraPosition) {
    this.rainbowGroup.visible = this.rainbow > 0.01;
    if (!this.rainbowGroup.visible) return;
    const a = this.rainbowDirection;
    this.rainbowGroup.position.set(cameraPosition.x + Math.cos(a) * 520, cameraPosition.y - 60, cameraPosition.z + Math.sin(a) * 520);
    this.rainbowGroup.rotation.set(0, -a + Math.PI / 2, 0);
    for (const mesh of this.rainbowGroup.children) mesh.material.opacity = this.rainbow * 0.55;
  }
}
