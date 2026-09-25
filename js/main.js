function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);
  return renderer;
}

const renderer = createRenderer();
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xfff3dc, CONFIG.fogNear, CONFIG.fogFar);
const camera = new THREE.PerspectiveCamera(CONFIG.thirdPersonFov, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.layers.enable(1);

const materials = createMaterials(createGradientMap(renderer));
const sky = createSky();
scene.add(sky.group);
const horizon = createHorizon();
scene.add(horizon.group);
const lights = createLights(scene);
const world = new World(scene, materials, createDecorAssets());
const input = new Input();
const player = new Player(materials);
scene.add(player.mesh);
const cameraRig = new CameraRig(camera, renderer.domElement);
const butterflies = new Butterflies(scene, materials);
const birds = new Birds(scene, materials);
const clouds = new Clouds(scene, materials.cloud);
const ripples = new Ripples(scene, 60);
const footprints = new Footprints(scene);
const dust = new DustPuffs(scene, materials);
const motes = new AirMotes(scene);
const leaves = new FallingLeaves(scene, materials);
const shafts = new LightShafts(scene);
const fish = new FishJumps(scene, materials);
const skyEvents = new SkyEvents(scene, materials);
const animals = new AnimalManager(scene, materials);
const smoke = new SmokePlumes(scene, materials);
const weather = new Weather(scene);
const tornado = new Tornado(scene, materials);
const timeOfDay = new TimeOfDay();
const audio = new AudioEngine();
const settings = new Settings('endless-meadow.settings');
const discoveries = new DiscoveryStore('endless-meadow.discoveries');
const hud = new Hud();
const journal = new Journal(discoveries, audio);
const aurora = new Aurora(sky.group);
const marker = new DiscoveryMarker(scene);
const frost = document.getElementById('frost');

world.onLandmarkLoad = (entry) => { if (entry.smoke) smoke.add(entry.lm.key, entry.smoke, entry.smoke.size); };
world.onLandmarkUnload = (entry) => smoke.remove(entry.lm.key);

let paused = true;
const menu = new PauseMenu(settings, {
  onResume: resume,
  onChange: applySettings,
  onReset: () => {
    discoveries.reset();
    journal.refresh();
    biomeTracker.current = null;
  },
  onClick: () => audio.click(),
});

function applySettings(values) {
  audio.setLevels({ master: values.master, ambient: values.ambient, sfx: values.sfx, muted: values.muted });
  cameraRig.sensitivity = CONFIG.mouseSensitivity * values.sensitivity;
  cameraRig.autoFollowEnabled = values.autoCamera;
  const preset = QUALITY_PRESETS[values.quality] || QUALITY_PRESETS.high;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (lights.sun.shadow.mapSize.x !== preset.shadowMapSize) lights.setShadowSize(preset.shadowMapSize);
  const shadowType = preset.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.type !== shadowType) {
    renderer.shadowMap.type = shadowType;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }
  CONFIG.detailRadius = preset.detailRadius;
  CONFIG.maxAnimals = preset.maxAnimals;
  for (const chunk of world.chunks.values()) world.applyDistanceSettings(chunk);
}

function pause() {
  if (paused) return;
  paused = true;
  input.clear();
  cameraRig.inputEnabled = false;
  cameraRig.releaseLock();
  journal.toggle(false);
  menu.open('pause');
  audio.setPaused(true);
}

function resume() {
  audio.start();
  applySettings(settings.values);
  paused = false;
  menu.close();
  cameraRig.inputEnabled = true;
  cameraRig.requestLock();
  audio.setPaused(false);
  clock.getDelta();
}

cameraRig.onUnlock = () => { if (!journal.isOpen) pause(); };
journal.onChange = (open) => {
  if (open) {
    input.clear();
    cameraRig.inputEnabled = false;
    cameraRig.releaseLock();
    audio.setPaused(true);
  } else if (!paused) {
    cameraRig.inputEnabled = true;
    cameraRig.requestLock();
    audio.setPaused(false);
    clock.getDelta();
  }
};
input.onEscape = () => {
  if (journal.isOpen) journal.toggle(false);
  else if (!menu.isOpen) pause();
  else if (performance.now() - menu.openedAt > 350) resume();
};
input.onToggleJournal = () => { if (!paused) journal.toggle(); };
input.onView = (first) => { if (!paused) cameraRig.setView(first); };
input.onPage = (direction) => journal.step(direction);
input.onMenuKey = (e) => menu.handleKey(e);
input.onJournalKey = (e) => !paused && journal.handleKey(e);
input.onRunChange = (running) => hud.setRunning(running);
document.getElementById('pause-button').addEventListener('click', (e) => {
  e.stopPropagation();
  pause();
});

player.spawn(0, 0);
world.loadAll(player.position);
cameraRig.snapTo(player.position);
cameraRig.yaw = 0.6;
applySettings(settings.values);
menu.open('start');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const biomeTracker = { timer: 0, current: null, candidate: null, candidateTime: 0 };

function discover(cat, id) {
  if (!discoveries.add(cat, id)) return false;
  const info = cat === 'landmark' ? LANDMARK_INFO[id] : cat === 'species' ? SPECIES_INFO[id] : BIOME_INFO[id];
  const sub = cat === 'landmark' ? '發現地標' : cat === 'species' ? '發現新物種' : '發現新的生態域';
  hud.show(sub, info.name, true);
  journal.notify();
  audio.chime([784, 988, 1175]);
  return true;
}

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
    const isNew = discoveries.add('biome', biome);
    hud.setBiome(BIOME_INFO[biome], isNew);
    if (isNew) {
      journal.notify();
      audio.chime([784, 988, 1175]);
    }
  }
}

const landmarkVisits = new Map();
let discoveryTimer = 0;
let waterNearby = 0;

function updateDiscoveries(dt) {
  discoveryTimer -= dt;
  if (discoveryTimer > 0) return;
  discoveryTimer = 0.4;
  const p = player.position;
  for (const lm of Landmarks.near(p.x, p.z, CONFIG.landmarkDiscoverDistance)) {
    if (!discover('landmark', lm.type)) {
      const last = landmarkVisits.get(lm.key) || -Infinity;
      if (elapsed - last > 120) hud.show('地標', LANDMARK_INFO[lm.type].name, false);
    }
    landmarkVisits.set(lm.key, elapsed);
  }
  animals.forEachVisible(camera, CONFIG.speciesDiscoverDistance, (animal) => {
    if (discover('species', animal.species)) marker.show(animal.rig.root, SPECIES_INFO[animal.species].name, animal.species === SPECIES.DEER || animal.species === SPECIES.ANTELOPE ? 2.4 : 1);
  });
  const butterfly = butterflies.items.find((item) => item.active && item.group.visible && item.distance < 7);
  if (butterfly && discover('species', SPECIES.BUTTERFLY)) marker.show(butterfly.group, SPECIES_INFO[SPECIES.BUTTERFLY].name, 0.6);

  let wet = 0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (Terrain.heightAt(p.x + Math.cos(a) * 12, p.z + Math.sin(a) * 12) < CONFIG.waterLevel) wet++;
  }
  waterNearby = wet / 8;
}

const SURFACE_COLORS = {
  sand: { print: new THREE.Color(0xbfa06a), dust: new THREE.Color(0xe8d6ac) },
  snow: { print: new THREE.Color(0xaebccb), dust: new THREE.Color(0xffffff) },
  dry: { print: new THREE.Color(0xa89a6a), dust: new THREE.Color(0xdccb96) },
  grass: { print: new THREE.Color(0x7a6a4a), dust: new THREE.Color(0xcdb994) },
  rock: { print: new THREE.Color(0x777777), dust: new THREE.Color(0xc9c3b8) },
  wood: { print: new THREE.Color(0x6e5238), dust: new THREE.Color(0xcab796) },
  water: { print: new THREE.Color(0xffffff), dust: new THREE.Color(0xffffff) },
};

function surfaceUnderPlayer() {
  const p = player.position;
  const surface = { height: 0, normalY: 1 };
  Terrain.surfaceAt(p.x, p.z, surface);
  if (surface.height < CONFIG.waterLevel && p.y < CONFIG.waterLevel + 0.1) return 'water';
  if (p.y > surface.height + 0.3) return Landmarks.near(p.x, p.z, 12).some((lm) => lm.type === LANDMARK.CABIN) ? 'wood' : 'rock';
  const biome = biomeTracker.current;
  if (surface.height < CONFIG.waterLevel + 0.7 && biome !== BIOME.SNOW) return 'sand';
  if (surface.normalY < 0.68) return 'rock';
  if (biome === BIOME.SNOW) return 'snow';
  if (biome === BIOME.DESERT) return 'sand';
  if (biome === BIOME.SAVANNA) return 'dry';
  return 'grass';
}

player.animator.onStep = (side, run) => {
  const surface = surfaceUnderPlayer();
  audio.footstep(surface, run > 0.5);
  const colors = SURFACE_COLORS[surface];
  if (surface === 'sand' || surface === 'snow') footprints.spawn(player.position.x, player.position.z, player.facing, side, colors.print);
  if (run > 0.5 && surface !== 'water' && surface !== 'wood') dust.spawn(player.position, colors.dust, 2, 0.7);
};

let rippleTimer = 0;
let rainRippleBudget = 0;

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
    audio.splash(player.splash);
    player.splash = 0;
  }
  rainRippleBudget += weather.rain * dt * 14;
  while (rainRippleBudget >= 1) {
    rainRippleBudget -= 1;
    const x = p.x + (Math.random() - 0.5) * 30;
    const z = p.z + (Math.random() - 0.5) * 30;
    if (Terrain.heightAt(x, z) < CONFIG.waterLevel - 0.1) ripples.spawn(x, z, 0.25, 0.9);
  }
  ripples.update(dt);
}

const clock = new THREE.Clock();
let accumulator = 0;
let elapsed = 0;
let forestAmount = 0;
const cameraTarget = new THREE.Vector3();

const telescopeUi = document.getElementById('telescope');
let telescopeWasOn = false;

function updateTelescope(dt) {
  cameraRig.telescope = input.keys.has('KeyV') && cameraRig.firstPerson;
  const scoping = cameraRig.scope > 0.05;
  input.suppressMove = scoping;
  if (scoping) {
    const turn = (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0);
    const tilt = (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0);
    cameraRig.yaw -= turn * dt * 0.5;
    cameraRig.pitch = clamp(cameraRig.pitch + tilt * dt * 0.35, -1.3, CONFIG.camMaxPitch);
    const heading = ((Math.round((-cameraRig.yaw + Math.PI) * 180 / Math.PI) % 360) + 360) % 360;
    telescopeUi.querySelector('.scope-heading').textContent = `${['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(heading / 45) % 8]} ${heading}°`;
  }
  const on = cameraRig.telescope && cameraRig.view > 0.95;
  if (on !== telescopeWasOn) {
    telescopeUi.classList.toggle('active', on);
    audio.tone({ from: on ? 520 : 420, to: on ? 780 : 300, duration: 0.12, gain: 0.05 });
    telescopeWasOn = on;
  }
}

function simulate(dt) {
  elapsed += dt;
  updateTelescope(dt);
  shaderTime.value = elapsed;
  accumulator += dt;
  const currentBiome = biomeTracker.current === null ? BIOME.MEADOW : biomeTracker.current;
  const wasTornado = tornado.active;
  const caught = tornado.update(dt, player, currentBiome, weather, () => {
    hud.show('小心', '被龍捲風捲走了！', false);
    audio.flutter();
  });
  if (!wasTornado && tornado.active) hud.show('天氣', '遠方出現龍捲風', false);
  player.slowFactor = 1 - 0.3 * (weather.blizzard || 0);
  if (caught) {
    accumulator = 0;
  } else {
    while (accumulator >= CONFIG.physicsStep) {
      player.fixedUpdate(CONFIG.physicsStep, input, cameraRig.yaw, world);
      accumulator -= CONFIG.physicsStep;
    }
  }
  if (player.jumped) {
    audio.jump();
    player.jumped = false;
  }
  if (player.landImpact > 6) {
    audio.land(player.landImpact);
    const surface = surfaceUnderPlayer();
    dust.spawn(player.position, SURFACE_COLORS[surface].dust, 5, 1 + player.landImpact / 20);
  }
  player.nightLevel = timeOfDay.env.night;
  player.render(accumulator / CONFIG.physicsStep, dt);
  world.update(player.position, player.velocity);

  const biome = biomeTracker.current === null ? BIOME.MEADOW : biomeTracker.current;
  glare = damp(glare, biome === BIOME.SNOW ? 0.74 : biome === BIOME.DESERT ? 0.84 : biome === BIOME.SAVANNA || biome === BIOME.LAKE ? 0.93 : 1, 0.6, dt);
  forestAmount = damp(forestAmount, biome === BIOME.FOREST ? 1 : biome === BIOME.TAIGA ? 0.5 : 0, 0.8, dt);
  weather.update(dt, camera.position, biome, timeOfDay.env);
  const env = timeOfDay.update(dt, weather);
  aurora.update(dt, env, biome);
  const blizzardOn = (weather.blizzard || 0) > 0.5;
  if (blizzardOn && !weather.blizzardAnnounced) hud.show('天氣', '暴風雪', false);
  weather.blizzardAnnounced = blizzardOn;
  frost.style.opacity = (weather.blizzard || 0).toFixed(2);
  shaderWind.value = weather.wind;
  shaderPlayer.value.copy(player.renderPosition);

  const pos = player.renderPosition;
  butterflies.update(elapsed, dt, pos);
  const daytimeLife = env.daylight > 0.35 && weather.rain < 0.5;
  butterflies.items.forEach((item) => { if (!daytimeLife) item.group.visible = false; });
  birds.update(elapsed, dt, pos);
  birds.flocks.forEach((flock) => flock.birds.forEach((b) => { b.group.visible = env.daylight > 0.3; }));
  clouds.update(dt, pos, env);
  animals.update(dt, player.position, elapsed);
  for (const animal of animals.animals) {
    if (animal.justFlew) {
      animal.justFlew = false;
      audio.flutter();
    }
  }
  fish.update(dt, pos, ripples, (from, distance) => {
    audio.distantSplash(distance);
    if (distance < 26 && discover('species', SPECIES.FISH)) marker.show(fish.mesh, SPECIES_INFO[SPECIES.FISH].name, 0.8);
  });
  skyEvents.update(dt, pos, env);
  motes.update(dt, pos, env, biome);
  leaves.update(dt, pos, forestAmount * (0.6 + weather.wind * 0.5) + smoothstep(1.8, 2.6, weather.wind) * 0.4, weather.wind);
  smoke.update(dt, weather.wind);
  footprints.update(dt);
  dust.update(dt);
  updateRipples(dt);
  updateBiome(dt);
  updateDiscoveries(dt);
  audio.update(dt, { tornado: tornado.distanceLevel, blizzard: weather.blizzard || 0, biome, night: env.night, daylight: env.daylight, wind: weather.wind, rain: weather.rain, dust: weather.dust, waterNearby, altitude: player.position.y });
  return env;
}

const blizzardFog = new THREE.Color();
let glare = 1;

function applyEnvironment(env) {
  sky.update(env);
  horizon.update(env, camera.position);
  lights.update(env, player.renderPosition, glare);
  scene.fog.color.copy(env.fogColor);
  const gale = weather.blizzard || 0;
  scene.fog.color.lerp(blizzardFog.setRGB(0.74, 0.79, 0.84).multiplyScalar(0.35 + 0.65 * env.daylight), gale * 0.85);
  scene.fog.near = lerp(lerp(lerp(CONFIG.fogNear, 14, env.fog), 10, env.dust), 4, gale);
  scene.fog.far = lerp(lerp(lerp(CONFIG.fogFar, 75, env.fog), 55, env.dust), 40, gale);
  renderer.setClearColor(scene.fog.color);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  let env = timeOfDay.env;
  if (!paused && !journal.isOpen) env = simulate(dt);
  else if (!env.skyTop.getHex()) env = timeOfDay.update(0, weather);
  const bob = cameraRig.firstPerson ? Math.sin(player.animator.phase * 2) * 0.012 * player.animator.gait : 0;
  cameraTarget.copy(player.renderPosition);
  const frozen = paused || journal.isOpen;
  cameraRig.update(frozen ? 0 : dt, cameraTarget, frozen ? UP.clone().multiplyScalar(0) : player.velocity, bob, player.swimming);
  applyEnvironment(env);
  marker.update(frozen ? 0 : dt, camera);
  shafts.update(paused ? 0 : dt, player.renderPosition, camera, env, forestAmount);
  sky.group.position.copy(camera.position);
  camera.updateMatrixWorld();
  world.cull(camera);
  renderer.render(scene, camera);
}
frame();
