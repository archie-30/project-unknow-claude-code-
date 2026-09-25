function createSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#5fb9e8');
  gradient.addColorStop(0.28, '#9ad6f1');
  gradient.addColorStop(0.44, '#d8eef0');
  gradient.addColorStop(0.5, '#fff3dc');
  gradient.addColorStop(1, '#fff3dc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const group = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  group.add(dome);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const g = glowCanvas.getContext('2d');
  const radial = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  radial.addColorStop(0, 'rgba(255, 252, 235, 1)');
  radial.addColorStop(0.18, 'rgba(255, 246, 210, 1)');
  radial.addColorStop(0.24, 'rgba(255, 236, 180, 0.55)');
  radial.addColorStop(0.6, 'rgba(255, 226, 160, 0.12)');
  radial.addColorStop(1, 'rgba(255, 226, 160, 0)');
  g.fillStyle = radial;
  g.fillRect(0, 0, 128, 128);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), fog: false, depthWrite: false, transparent: true }));
  sun.position.copy(SUN_DIRECTION).multiplyScalar(700);
  sun.scale.set(220, 220, 1);
  sun.renderOrder = -1;
  group.add(sun);
  return group;
}

function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xbfe4ff, 0.42);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe0a3, 0.78);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.shadowMapSize, CONFIG.shadowMapSize);
  const cam = sun.shadow.camera;
  cam.left = -CONFIG.shadowExtent;
  cam.right = CONFIG.shadowExtent;
  cam.top = CONFIG.shadowExtent;
  cam.bottom = -CONFIG.shadowExtent;
  cam.near = 1;
  cam.far = 220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const right = new THREE.Vector3().crossVectors(UP, SUN_DIRECTION).normalize();
  const up = new THREE.Vector3().crossVectors(SUN_DIRECTION, right);
  const texel = (CONFIG.shadowExtent * 2) / CONFIG.shadowMapSize;
  const snapped = new THREE.Vector3();

  function follow(center) {
    const r = Math.round(center.dot(right) / texel) * texel;
    const u = Math.round(center.dot(up) / texel) * texel;
    const d = center.dot(SUN_DIRECTION);
    snapped.copy(right).multiplyScalar(r).addScaledVector(up, u).addScaledVector(SUN_DIRECTION, d);
    sun.target.position.copy(snapped);
    sun.position.copy(snapped).addScaledVector(SUN_DIRECTION, 100);
  }

  return { follow };
}


class Clouds {
  constructor(scene, material) {
    const geometries = [11, 23, 37].map((seed) => Models.cloud(seed));
    const rng = mulberry32(WORLD_SEED ^ 0xc10d);
    this.items = [];
    for (let i = 0; i < CONFIG.cloudCount; i++) {
      const mesh = new THREE.Mesh(geometries[i % geometries.length], material);
      mesh.position.set((rng() - 0.5) * 460, 75 + rng() * 30, (rng() - 0.5) * 460);
      mesh.rotation.y = rng() * Math.PI * 2;
      const s = 0.8 + rng() * 0.9;
      mesh.scale.set(s, s, s);
      scene.add(mesh);
      this.items.push(mesh);
    }
  }

  update(dt, center) {
    for (const mesh of this.items) {
      mesh.position.x += dt * 2.5;
      mesh.position.z += dt * 0.8;
      const rx = mesh.position.x - center.x;
      const rz = mesh.position.z - center.z;
      if (rx > 230) mesh.position.x -= 460;
      if (rx < -230) mesh.position.x += 460;
      if (rz > 230) mesh.position.z -= 460;
      if (rz < -230) mesh.position.z += 460;
    }
  }
}

