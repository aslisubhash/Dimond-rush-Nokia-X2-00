import type { EntitySpec, EntityType } from './schema';

/** Collision / terrain tile kinds stored in the tile grid. */
export const enum Tile {
  Empty = 0,
  Solid = 1,
  OneWay = 2,
  Spikes = 3,
  Ladder = 4,
  Vine = 5,
  Ice = 6,
  Sand = 7,
  Quicksand = 8,
  Secret = 9,
}

export interface TileProps {
  solid: boolean;
  oneWay: boolean;
  climbable: boolean;
  hazard: boolean;
  /** Ground acceleration multiplier. */
  friction: number;
  /** Max ground speed multiplier. */
  speed: number;
}

const P = (p: Partial<TileProps>): TileProps => ({
  solid: false,
  oneWay: false,
  climbable: false,
  hazard: false,
  friction: 1,
  speed: 1,
  ...p,
});

export const TILE_PROPS: Record<number, TileProps> = {
  [Tile.Empty]: P({}),
  [Tile.Solid]: P({ solid: true }),
  [Tile.OneWay]: P({ oneWay: true }),
  [Tile.Spikes]: P({ hazard: true }),
  [Tile.Ladder]: P({ climbable: true }),
  [Tile.Vine]: P({ climbable: true }),
  [Tile.Ice]: P({ solid: true, friction: 0.12 }),
  [Tile.Sand]: P({ solid: true, friction: 0.8, speed: 0.62 }),
  [Tile.Quicksand]: P({ speed: 0.35 }),
  [Tile.Secret]: P({ solid: true }),
};

/** Characters that map directly to terrain tiles. */
export const TILE_CHARS: Record<string, Tile> = {
  ' ': Tile.Empty,
  '.': Tile.Empty,
  '#': Tile.Solid,
  '=': Tile.OneWay,
  '^': Tile.Spikes,
  H: Tile.Ladder,
  '|': Tile.Vine,
  I: Tile.Ice,
  s: Tile.Sand,
  q: Tile.Quicksand,
  '?': Tile.Secret,
};

/** Characters that denote fluid regions (flood-filled into bodies by the loader). */
export const FLUID_CHARS: Record<string, 'water' | 'lava'> = {
  '~': 'water',
  L: 'lava',
};

/** Default entity marks. Levels may override any of these via `marks`. */
export const DEFAULT_MARKS: Record<string, EntitySpec> = {
  c: { type: 'crystal' },
  o: { type: 'coin' },
  h: { type: 'heart' },
  K: { type: 'checkpoint' },
  X: { type: 'exit_gate' },
  B: { type: 'stone_block' },
  W: { type: 'crate' },
  R: { type: 'face_stone' },
  k: { type: 'key' },
  D: { type: 'locked_door' },
  C: { type: 'chest' },
  _: { type: 'pressure_plate' },
  '%': { type: 'crumbling_block' },
  i: { type: 'crumbling_block', props: { variant: 'thin_ice', delay: 0.7, respawn: false } },
  T: { type: 'torch', props: { lit: true, decor: true } },
  e: { type: 'enemy', props: { kind: 'walker' } },
  f: { type: 'enemy', props: { kind: 'flyer' } },
  g: { type: 'enemy', props: { kind: 'shooter' } },
};

/** Default footprint (in tiles) per entity type. */
export const DEFAULT_SIZE: Partial<Record<EntityType, [number, number]>> = {
  exit_gate: [2, 3],
  boss_gate: [1, 4],
  locked_door: [1, 3],
  secret_door: [1, 3],
  gate: [1, 3],
  temple_door: [1, 3],
  checkpoint: [1, 2],
  chest: [1, 1],
  moving_platform: [3, 1],
  falling_platform: [2, 1],
  rotating_platform: [2, 1],
  float_platform: [3, 1],
  wind_platform: [3, 1],
  bridge: [4, 1],
  lever: [1, 1],
  switch: [1, 1],
  torch: [1, 1],
  fire_source: [1, 1],
  crystal_node: [1, 2],
  face_stone: [1, 1],
  rolling_stone: [2, 2],
  magnet: [1, 1],
};

/** Entity types whose mark sits at the TOP-left of their footprint (zones, hanging things). */
export const TOP_ANCHORED: ReadonlySet<EntityType> = new Set<EntityType>([
  'water_body',
  'lava_body',
  'waterfall',
  'water_current',
  'sand_fall',
  'wind_source',
  'secret_zone',
  'hint',
  'trigger_zone',
  'shifting_sand',
  'icicle',
  'moving_platform',
  'falling_platform',
  'rotating_platform',
  'float_platform',
  'wind_platform',
  'bridge',
  'crumbling_block',
  'saw',
  'fire_wheel',
  'mirror',
  'light_source',
  'light_receiver',
  'laser',
  'clue',
  'boss',
]);
