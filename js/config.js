const GAME_VERSION = 'v1.0.00';

const CONFIG = {
  chunkSize: 48,
  chunkSegments: 32,
  loadRadius: 3,
  unloadRadius: 5,
  detailRadius: 2,
  chunksPerFrame: 1,
  lookAheadSeconds: 1.5,
  decorSpacing: 4,
  groundCoverSpacing: 2,
  shadowChunkRadius: 1,
  shadowExtent: 36,
  shadowMapSize: 2048,
  fogNear: 60,
  fogFar: 140,
  waterLevel: -3.5,
  swimDepth: 1.25,
  swimSpeedFactor: 0.5,
  physicsStep: 1 / 120,
  gravity: 28,
  walkSpeed: 4.2,
  runSpeed: 8.5,
  groundAccel: 38,
  airAccel: 12,
  jumpSpeed: 9,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  groundSnap: 0.35,
  stepUp: 0.5,
  playerRadius: 0.35,
  camFocusHeight: 1.5,
  camMinDistance: 2.5,
  camMaxDistance: 14,
  camMinPitch: -0.3,
  camMaxPitch: 1.35,
  camClearance: 0.45,
  mouseSensitivity: 0.0022,
  autoCameraDelay: 1.0,
  autoCameraStrength: 1.8,
  autoCameraPitch: 0.28,
  butterflyCount: 18,
  cloudCount: 16,
  biomeCheckInterval: 0.2,
  biomeStableTime: 0.6,
};

const SUN_DIRECTION = new THREE.Vector3(0.55, 0.72, 0.4).normalize();
const UP = new THREE.Vector3(0, 1, 0);

const BIOME = { MEADOW: 0, FOREST: 1, TAIGA: 2, SNOW: 3, SAVANNA: 4, DESERT: 5 };

const BIOME_INFO = [
  { id: BIOME.MEADOW, name: '草原', text: '微風吹過花海，蝴蝶在陽光下追逐。' },
  { id: BIOME.FOREST, name: '森林', text: '闊葉樹與白樺交錯，林下藏著紅帽蘑菇。' },
  { id: BIOME.TAIGA, name: '針葉林', text: '寒冷山坡上層層疊疊的松樹與岩石。' },
  { id: BIOME.SNOW, name: '雪原', text: '白雪覆蓋的山頂與雪松，只有風聲作伴。' },
  { id: BIOME.SAVANNA, name: '莽原', text: '乾黃長草與傘狀金合歡，鳥群在遠方盤旋。' },
  { id: BIOME.DESERT, name: '沙漠', text: '起伏沙丘與仙人掌，熱浪讓地平線晃動。' },
];
