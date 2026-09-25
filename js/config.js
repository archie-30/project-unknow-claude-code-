const GAME_VERSION = 'v2.1.01';

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
  eyeHeight: 1.62,
  firstPersonFov: 72,
  thirdPersonFov: 60,
  viewTransitionTime: 0.7,
  mouseSensitivity: 0.0022,
  autoCameraDelay: 1.0,
  autoCameraStrength: 1.8,
  autoCameraPitch: 0.28,
  butterflyCount: 18,
  cloudCount: 18,
  biomeCheckInterval: 0.2,
  biomeStableTime: 0.6,
  dayLength: 720,
  startTimeOfDay: 0.36,
  weatherMinDuration: 90,
  weatherMaxDuration: 220,
  landmarkCellSize: 360,
  landmarkDiscoverDistance: 16,
  speciesDiscoverDistance: 16,
  animalSpawnInterval: 1.2,
  maxAnimals: 14,
};

const SUN_DIRECTION = new THREE.Vector3(0.55, 0.72, 0.4).normalize();
const UP = new THREE.Vector3(0, 1, 0);

const BIOME = { MEADOW: 0, FOREST: 1, TAIGA: 2, SNOW: 3, SAVANNA: 4, DESERT: 5, LAKE: 6 };

const BIOME_INFO = [
  { id: BIOME.MEADOW, name: '草原', text: '微風吹過花海，蝴蝶在陽光下追逐。' },
  { id: BIOME.FOREST, name: '森林', text: '闊葉樹與白樺交錯，林下藏著紅帽蘑菇。' },
  { id: BIOME.TAIGA, name: '針葉林', text: '寒冷山坡上層層疊疊的松樹與岩石。' },
  { id: BIOME.SNOW, name: '雪原', text: '白雪覆蓋的山頂與雪松，只有風聲作伴。' },
  { id: BIOME.SAVANNA, name: '莽原', text: '乾黃長草與傘狀金合歡，鳥群在遠方盤旋。' },
  { id: BIOME.DESERT, name: '沙漠', text: '起伏沙丘與仙人掌，熱浪讓地平線晃動。' },
  { id: BIOME.LAKE, name: '湖泊', text: '平靜的大湖映著天空，蘆葦在岸邊輕輕搖晃。' },
];

const LANDMARK = { PLANE: 0, CABIN: 1 };

const LANDMARK_INFO = [
  { id: LANDMARK.PLANE, name: '墜落的飛機', text: '機身插進泥土，引擎還冒著細細的煙。駕駛去了哪裡？' },
  { id: LANDMARK.CABIN, name: '荒廢的小木屋', text: '屋頂破了個洞，門半掩著，牆上爬滿橘色的花。' },
];

const SPECIES = { RABBIT: 0, DEER: 1, SQUIRREL: 2, FOX: 3, ANTELOPE: 4, LIZARD: 5, DUCK: 6, FISH: 7, SPARROW: 8, BUTTERFLY: 9 };

const SPECIES_INFO = [
  { id: SPECIES.RABBIT, name: '野兔', text: '草原上的膽小鬼，一靠近就蹦蹦跳跳地逃走。' },
  { id: SPECIES.DEER, name: '鹿', text: '在林間低頭吃草，耳朵一動就消失在樹後。' },
  { id: SPECIES.SQUIRREL, name: '松鼠', text: '拖著蓬鬆大尾巴，在松樹下忙著找松果。' },
  { id: SPECIES.FOX, name: '雪狐', text: '雪原上的白色身影，腳步輕得聽不見。' },
  { id: SPECIES.ANTELOPE, name: '羚羊', text: '成群在莽原上遊走，受驚時跑得飛快。' },
  { id: SPECIES.LIZARD, name: '蜥蜴', text: '趴在熱沙上曬太陽，一眨眼就竄走了。' },
  { id: SPECIES.DUCK, name: '野鴨', text: '在湖面悠閒地漂著，偶爾把頭埋進水裡。' },
  { id: SPECIES.FISH, name: '湖魚', text: '偶爾躍出水面，留下一圈圈漣漪。' },
  { id: SPECIES.SPARROW, name: '麻雀', text: '成群在地上啄食，稍微靠近就一哄而散。' },
  { id: SPECIES.BUTTERFLY, name: '蝴蝶', text: '在花叢間飛舞，彩色翅膀像紙片一樣輕。' },
];
