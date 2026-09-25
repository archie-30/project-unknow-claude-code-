const DECOR_TYPES = {
  pine: { asset: 'pine', scale: [0.8, 1.4], trunk: 0.22, tree: true },
  snowPine: { asset: 'snowPine', scale: [0.8, 1.4], trunk: 0.22, tree: true },
  broadleaf: { asset: 'broadleaf', scale: [0.8, 1.3], trunk: 0.26, tree: true },
  blossomTree: { asset: 'blossomTree', scale: [0.8, 1.2], trunk: 0.26, tree: true },
  birch: { asset: 'birch', scale: [0.85, 1.25], trunk: 0.17, tree: true },
  acacia: { asset: 'acacia', scale: [0.9, 1.3], trunk: 0.2, tree: true },
  cactus: { asset: 'cactus', scale: [0.8, 1.3], trunk: 0.34 },
  bush: { asset: 'bush', scale: [0.7, 1.3] },
  berryBush: { asset: 'berryBush', scale: [0.7, 1.2] },
  blossomBush: { asset: 'blossomBush', scale: [0.7, 1.3] },
  deadBush: { asset: 'deadBush', scale: [0.7, 1.3], detail: true },
  grass: { asset: 'grass', scale: [0.8, 1.4], detail: true },
  dryGrass: { asset: 'dryGrass', scale: [0.8, 1.4], detail: true },
  fern: { asset: 'fern', scale: [0.8, 1.3], detail: true },
  flowersWarm: { asset: 'flowersWarm', scale: [0.8, 1.2], detail: true },
  flowersCool: { asset: 'flowersCool', scale: [0.8, 1.2], detail: true },
  mushrooms: { asset: 'mushrooms', scale: [0.8, 1.5], detail: true },
  reeds: { asset: 'reeds', scale: [0.8, 1.3], detail: true },
  pebbles: { asset: 'pebbles', scale: [0.8, 1.3], detail: true },
  log: { asset: 'log', scale: [0.8, 1.2], log: true },
  rock: { asset: 'rock', scale: [0.4, 1.1], rock: true },
  boulder: { asset: 'rock', scale: [1.6, 2.8], rock: true },
  snowRock: { asset: 'snowRock', scale: [0.5, 1.8], rock: true, tint: [0.95, 1.0, 1.06] },
  sandRock: { asset: 'rock', scale: [0.5, 1.6], rock: true, tint: [1.2, 0.96, 0.74] },
};

const BIOME_DECOR = {
  [BIOME.OCEAN]: [['pebbles', 0.05], ['rock', 0.02], ['dryGrass', 0.04]],
  [BIOME.MEADOW]: [['grass', 0.26], ['flowersWarm', 0.09], ['flowersCool', 0.08], ['bush', 0.03], ['berryBush', 0.02], ['blossomBush', 0.03], ['broadleaf', 0.025], ['blossomTree', 0.02], ['birch', 0.02], ['rock', 0.02], ['boulder', 0.006], ['pebbles', 0.03]],
  [BIOME.FOREST]: [['broadleaf', 0.18], ['blossomTree', 0.03], ['birch', 0.07], ['pine', 0.03], ['bush', 0.06], ['blossomBush', 0.015], ['berryBush', 0.03], ['mushrooms', 0.06], ['fern', 0.16], ['log', 0.02], ['rock', 0.025]],
  [BIOME.TAIGA]: [['pine', 0.24], ['rock', 0.05], ['boulder', 0.012], ['bush', 0.03], ['fern', 0.06], ['grass', 0.08], ['log', 0.02], ['mushrooms', 0.025]],
  [BIOME.SNOW]: [['snowPine', 0.1], ['snowRock', 0.06], ['pebbles', 0.02]],
  [BIOME.SAVANNA]: [['dryGrass', 0.3], ['acacia', 0.035], ['deadBush', 0.05], ['rock', 0.025], ['boulder', 0.008], ['pebbles', 0.03]],
  [BIOME.DESERT]: [['cactus', 0.05], ['deadBush', 0.035], ['sandRock', 0.04], ['boulder', 0.006], ['pebbles', 0.04]],
};


const GROUND_COVER = {
  [BIOME.OCEAN]: [['pebbles', 0.02]],
  [BIOME.MEADOW]: [['grass', 0.42], ['flowersWarm', 0.05], ['flowersCool', 0.05]],
  [BIOME.FOREST]: [['fern', 0.22], ['grass', 0.18], ['mushrooms', 0.015]],
  [BIOME.TAIGA]: [['grass', 0.16], ['fern', 0.08]],
  [BIOME.SNOW]: [['pebbles', 0.015]],
  [BIOME.SAVANNA]: [['dryGrass', 0.45]],
  [BIOME.DESERT]: [['dryGrass', 0.03], ['pebbles', 0.02]],
};
