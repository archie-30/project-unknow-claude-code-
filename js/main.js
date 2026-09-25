function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.prepend(renderer.domElement);
  return renderer;
}

const renderer = createRenderer();
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xfff3dc, CONFIG.fogNear, CONFIG.fogFar);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);

const materials = createMaterials(createGradientMap(renderer));
const sky = createSky();
scene.add(sky);
const sunlight = createLights(scene);
const world = new World(scene, materials, createDecorAssets());
const input = new Input();
const player = new Player(materials);
scene.add(player.mesh);
const cameraRig = new CameraRig(camera, renderer.domElement, document.getElementById('hint'));
const butterflies = new Butterflies(scene, materials);
const birds = new Birds(scene, materials);
const clouds = new Clouds(scene, materials.cloud);
const ripples = new Ripples(scene);
const discoveries = new DiscoveryStore('endless-meadow.biomes');
const hud = new Hud();
const journal = new Journal(discoveries);
input.onToggleJournal = () => journal.toggle();

player.spawn(0, 0);
world.loadAll(player.position);
cameraRig.snapTo(player.position);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const biomeTracker = { timer: 0, current: null, candidate: null, candidateTime: 0 };

function updateBiome(dt) {
  biomeTracker.timer += dt;
  if (biomeTracker.timer < CONFIG.biomeCheckInterval) return;
  const step = biomeTracker.timer;
  biomeTracker.timer = 0;
  const p = player.position;
  const biome = Terrain.biomeAt(p.x, p.z, Terrain.heightAt(p.x, p.z));
  if (biome === biomeTracker.current) {
    biomeTracker.candidate = null;
    return;
  }
  if (biome !== biomeTracker.candidate) {
    biomeTracker.candidate = biome;
    biomeTracker.candidateTime = 0;
  }
  biomeTracker.candidateTime += step;
  if (biomeTracker.current === null || biomeTracker.candidateTime >= CONFIG.biomeStableTime) {
    biomeTracker.current = biome;
    biomeTracker.candidate = null;
    const isNew = discoveries.add(biome);
    hud.showBiome(BIOME_INFO[biome], isNew);
    if (isNew) journal.markDiscovered(biome);
  }
}

let rippleTimer = 0;

function updateRipples(dt) {
  const p = player.renderPosition;
  const inWater = Terrain.heightAt(p.x, p.z) < CONFIG.waterLevel - 0.05 && p.y < CONFIG.waterLevel + 0.1;
  const speed = player.horizontalSpeed;
  if (inWater) {
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      const moving = speed > 0.5;
      ripples.spawn(p.x, p.z, moving ? 0.9 : 0.6, moving ? 1.5 : 2.2);
      rippleTimer = moving ? lerp(0.34, 0.16, clamp01(speed / CONFIG.runSpeed)) : 1.1;
    }
  } else {
    rippleTimer = 0;
  }
  if (player.splash > 0) {
    ripples.spawn(p.x, p.z, 1.2 * player.splash, 1.8);
    ripples.spawn(p.x, p.z, 0.7 * player.splash, 1.3);
    player.splash = 0;
  }
  ripples.update(dt);
}

const clock = new THREE.Clock();
let accumulator = 0;
let elapsed = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  shaderTime.value = elapsed;
  accumulator += dt;
  while (accumulator >= CONFIG.physicsStep) {
    player.fixedUpdate(CONFIG.physicsStep, input, cameraRig.yaw, world);
    accumulator -= CONFIG.physicsStep;
  }
  player.render(accumulator / CONFIG.physicsStep, dt);
  world.update(player.position, player.velocity);
  cameraRig.update(dt, player.renderPosition, player.velocity);
  sunlight.follow(player.renderPosition);
  butterflies.update(elapsed, dt, player.renderPosition);
  birds.update(elapsed, dt, player.renderPosition);
  clouds.update(dt, player.renderPosition);
  updateRipples(dt);
  updateBiome(dt);
  sky.position.copy(camera.position);
  camera.updateMatrixWorld();
  world.cull(camera);
  renderer.render(scene, camera);
}
frame();
