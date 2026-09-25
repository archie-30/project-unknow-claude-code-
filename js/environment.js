function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color(0x6fb8e8) },
    uHorizon: { value: new THREE.Color(0xfff0d4) },
    uBottom: { value: new THREE.Color(0xf3ead8) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(0xffe3b0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uNight: { value: 0 },
    uOvercast: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uMoonDir;
      uniform float uNight;
      uniform float uOvercast;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0
          ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.85, h), 0.6))
          : mix(uHorizon, uBottom, smoothstep(0.0, -0.25, h));
        float sd = dot(d, uSunDir);
        float clear = 1.0 - uOvercast * 0.8;
        col += uSunColor * (pow(max(sd, 0.0), 10.0) * 0.28 + pow(max(sd, 0.0), 90.0) * 0.35) * clear;
        float disc = smoothstep(0.99905, 0.99925, sd);
        col = mix(col, vec3(1.0, 0.97, 0.9), disc * clear);
        float md = dot(d, uMoonDir);
        float moon = smoothstep(0.99935, 0.9995, md) * (1.0 - smoothstep(0.99935, 0.9995, dot(d, normalize(uMoonDir + vec3(0.012, 0.01, 0.0)))));
        col = mix(col, vec3(0.96, 0.95, 0.88), moon * uNight * clear);
        col += pow(max(md, 0.0), 60.0) * 0.12 * uNight * clear;
        col *= 0.985 + 0.015 * hash(floor(d.xz * 300.0 + d.y * 97.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), material);
  dome.renderOrder = -3;
  dome.frustumCulled = false;
  group.add(dome);

  const starCount = 900;
  const starPositions = new Float32Array(starCount * 3);
  const rng = mulberry32(7);
  for (let i = 0; i < starCount; i++) {
    const a = rng() * Math.PI * 2;
    const y = 0.08 + rng() * 0.92;
    const r = Math.sqrt(1 - y * y);
    starPositions.set([Math.cos(a) * r * 850, y * 850, Math.sin(a) * r * 850], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xfff8e8, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.renderOrder = -2.5;
  stars.frustumCulled = false;
  group.add(stars);

  return {
    group,
    uniforms,
    update(env) {
      uniforms.uTop.value.copy(env.skyTop);
      uniforms.uHorizon.value.copy(env.skyHorizon);
      uniforms.uBottom.value.copy(env.skyHorizon).lerp(env.hemiGround, 0.25);
      uniforms.uSunDir.value.copy(env.sunDirection);
      uniforms.uMoonDir.value.copy(env.moonDirection);
      uniforms.uSunColor.value.copy(env.sunColor);
      uniforms.uNight.value = env.night;
      uniforms.uOvercast.value = env.overcast;
      stars.material.opacity = env.night * (1 - env.overcast) * 0.95;
      stars.visible = stars.material.opacity > 0.01;
    },
  };
}

function createHorizon() {
  const simplex = new THREE.SimplexNoise({ random: mulberry32(WORLD_SEED ^ 0x40a1) });
  const group = new THREE.Group();
  const layers = [];
  const specs = [
    { radius: 700, base: 26, amp: 70, freq: 1.3, tint: 0x9fb2c2, strength: 0.28 },
    { radius: 600, base: 14, amp: 52, freq: 2.1, tint: 0x8aa39a, strength: 0.42 },
    { radius: 510, base: 4, amp: 34, freq: 3.2, tint: 0x7f9a78, strength: 0.58 },
  ];
  specs.forEach((spec, k) => {
    const segments = 180;
    const positions = [];
    const colors = [];
    const heightAt = (a) => {
      const x = Math.cos(a) * spec.freq;
      const z = Math.sin(a) * spec.freq;
      const n = simplex.noise(x + k * 10, z) * 0.6 + simplex.noise(x * 2.3 + 40, z * 2.3) * 0.3 + simplex.noise(x * 5, z * 5 - 9) * 0.1;
      return spec.base + Math.max(0, n * 0.5 + 0.5) * spec.amp;
    };
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const h0 = heightAt(a0);
      const h1 = heightAt(a1);
      const p = (a, h) => [Math.cos(a) * spec.radius, h, Math.sin(a) * spec.radius];
      const top0 = p(a0, h0), top1 = p(a1, h1), bot0 = p(a0, -140), bot1 = p(a1, -140);
      positions.push(...top0, ...bot0, ...top1, ...top1, ...bot0, ...bot1);
      const light = [1.06, 1.06, 1.06];
      const dark = [0.9, 0.9, 0.9];
      colors.push(...light, ...dark, ...light, ...light, ...dark, ...dark);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -2 + k * 0.1;
    mesh.frustumCulled = false;
    group.add(mesh);
    layers.push({ mesh, spec, tint: new THREE.Color(spec.tint) });
  });
  const color = new THREE.Color();
  return {
    group,
    update(env, cameraPosition) {
      group.position.set(cameraPosition.x, cameraPosition.y - 24, cameraPosition.z);
      for (const layer of layers) {
        color.copy(layer.tint).multiply(env.hemiSky).multiplyScalar(1.15);
        layer.mesh.material.color.copy(env.skyHorizon).lerp(color, layer.spec.strength * (1 - env.fog * 0.8));
      }
    },
  };
}

function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xcfe6f5, 0xb8a98a, 0.55);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe0a3, 0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.shadowMapSize, CONFIG.shadowMapSize);
  const cam = sun.shadow.camera;
  cam.left = -CONFIG.shadowExtent;
  cam.right = CONFIG.shadowExtent;
  cam.top = CONFIG.shadowExtent;
  cam.bottom = -CONFIG.shadowExtent;
  cam.near = 1;
  cam.far = 240;
  cam.layers.enable(1);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const snapped = new THREE.Vector3();

  return {
    sun,
    hemi,
    ambient,
    setShadowSize(size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    },
    update(env, center, glare = 1) {
      const dir = env.lightDirection;
      right.crossVectors(UP, dir).normalize();
      up.crossVectors(dir, right);
      const texel = (CONFIG.shadowExtent * 2) / sun.shadow.mapSize.x;
      const r = Math.round(center.dot(right) / texel) * texel;
      const u = Math.round(center.dot(up) / texel) * texel;
      const d = center.dot(dir);
      snapped.copy(right).multiplyScalar(r).addScaledVector(up, u).addScaledVector(dir, d);
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).addScaledVector(dir, 110);
      sun.color.copy(env.lightColor);
      sun.intensity = env.lightIntensity * glare;
      hemi.color.copy(env.hemiSky);
      hemi.groundColor.copy(env.hemiGround);
      hemi.intensity = env.hemiIntensity * (0.4 + 0.6 * glare);
      ambient.intensity = env.ambientIntensity;
    },
  };
}

class Clouds {
  constructor(scene, material) {
    const geometries = [11, 23, 37, 51].map((seed) => Models.cloud(seed));
    const rng = mulberry32(WORLD_SEED ^ 0xc10d);
    this.material = material;
    this.items = [];
    for (let i = 0; i < CONFIG.cloudCount; i++) {
      const mesh = new THREE.Mesh(geometries[i % geometries.length], material);
      mesh.position.set((rng() - 0.5) * 460, 80 + rng() * 30, (rng() - 0.5) * 460);
      mesh.rotation.y = rng() * Math.PI * 2;
      const s = 0.8 + rng() * 0.9;
      mesh.scale.set(s, s, s);
      mesh.userData.threshold = rng();
      scene.add(mesh);
      this.items.push(mesh);
    }
  }

  update(dt, center, env) {
    const drift = 2 + env.wind * 2.5;
    const coverage = 0.55 + env.overcast * 0.45;
    this.material.color.copy(env.cloudColor);
    for (const mesh of this.items) {
      mesh.visible = mesh.userData.threshold < coverage;
      mesh.position.x += dt * drift;
      mesh.position.z += dt * drift * 0.3;
      const rx = mesh.position.x - center.x;
      const rz = mesh.position.z - center.z;
      if (rx > 230) mesh.position.x -= 460;
      if (rx < -230) mesh.position.x += 460;
      if (rz > 230) mesh.position.z -= 460;
      if (rz < -230) mesh.position.z += 460;
    }
  }
}
