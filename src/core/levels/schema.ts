import type { WorldId } from '../types';

/**
 * Authoring format for levels. Positions in authored data are in TILE units;
 * the loader converts everything to logical pixels.
 */

export type EntityType =
  | 'stone_block'
  | 'crate'
  | 'face_stone'
  | 'rolling_stone'
  | 'magnet_stone'
  | 'ice_block'
  | 'pressure_plate'
  | 'switch'
  | 'lever'
  | 'torch'
  | 'crystal_node'
  | 'echo_stone'
  | 'sequence_lock'
  | 'trigger_zone'
  | 'timer'
  | 'key'
  | 'locked_door'
  | 'secret_door'
  | 'gate'
  | 'bridge'
  | 'boss_gate'
  | 'exit_gate'
  | 'temple_door'
  | 'chest'
  | 'crystal'
  | 'coin'
  | 'relic'
  | 'temple_key'
  | 'heart'
  | 'heart_vessel'
  | 'seal'
  | 'moving_platform'
  | 'falling_platform'
  | 'rotating_platform'
  | 'crumbling_block'
  | 'float_platform'
  | 'wind_platform'
  | 'shifting_sand'
  | 'water_body'
  | 'lava_body'
  | 'waterfall'
  | 'water_current'
  | 'sand_fall'
  | 'mirror'
  | 'light_source'
  | 'light_receiver'
  | 'laser'
  | 'magnet'
  | 'wind_source'
  | 'fire_source'
  | 'fire_jet'
  | 'spike_trap'
  | 'saw'
  | 'fire_wheel'
  | 'icicle'
  | 'checkpoint'
  | 'secret_zone'
  | 'hint'
  | 'clue'
  | 'enemy'
  | 'boss';

export type LogicMode = 'and' | 'or';

export type PropValue = string | number | boolean | number[] | string[] | [number, number][];
export type Props = Record<string, PropValue>;

/** A placed entity (authoring form). x/y/w/h in tiles. */
export interface EntitySpec {
  type: EntityType;
  id?: string;
  /** Tile position. For objects placed via a map mark this is filled in by the loader. */
  x?: number;
  y?: number;
  /** Footprint in tiles (defaults per type). */
  w?: number;
  h?: number;
  /** Signal sources that power this entity. */
  requires?: string[];
  logic?: LogicMode;
  /** Sugar: targets that should list this entity in their `requires`. */
  outputs?: string[];
  /** Entity is part of a boss arena and resets with the arena. */
  arena?: boolean;
  props?: Props;
}

export type LevelActionType =
  | 'OPEN_DOOR'
  | 'CLOSE_DOOR'
  | 'MOVE_PLATFORM'
  | 'ACTIVATE_LASER'
  | 'DISABLE_LASER'
  | 'RAISE_WATER'
  | 'LOWER_WATER'
  | 'SET_WATER'
  | 'SPAWN_ENEMY'
  | 'REMOVE_BARRIER'
  | 'TURN_ON_LIGHT'
  | 'TURN_OFF_LIGHT'
  | 'ROTATE_OBJECT'
  | 'CHANGE_LEVEL_STATE'
  | 'START'
  | 'STOP'
  | 'RESET'
  | 'SHAKE_CAMERA'
  | 'SHOW_TEXT'
  | 'REVEAL_SECRET';

export interface LevelAction {
  type: LevelActionType;
  target?: string;
  value?: number | string | boolean;
}

export type LevelEventType =
  | 'SWITCH_ON'
  | 'SWITCH_OFF'
  | 'PLATE_PRESSED'
  | 'PLATE_RELEASED'
  | 'STONE_MOVED'
  | 'WATER_LEVEL_CHANGED'
  | 'MIRROR_ROTATED'
  | 'CRYSTAL_ACTIVATED'
  | 'LIGHT_RECEIVED'
  | 'MAGNET_ENABLED'
  | 'TEMPERATURE_CHANGED'
  | 'WIND_ENABLED'
  | 'BOSS_DEFEATED'
  | 'BOSS_PHASE'
  | 'DOOR_OPENED'
  | 'SECRET_FOUND'
  | 'SEQUENCE_SOLVED'
  | 'SEQUENCE_FAILED'
  | 'ZONE_ENTERED'
  | 'CHECKPOINT'
  | 'ITEM_COLLECTED'
  | 'CHEST_OPENED'
  | 'ENEMY_KILLED'
  | 'SIGNAL_ON'
  | 'SIGNAL_OFF';

export interface TriggerSpec {
  on: LevelEventType;
  source?: string;
  actions: LevelAction[];
  once?: boolean;
  /** Re-arm this trigger when the player respawns (chase sequences). */
  rearm?: boolean;
}

export type SecretType = 'false_wall' | 'water' | 'environmental' | 'timing' | 'chain';

/** Required metadata for every secret: WHY / CLUE / ACTION / REWARD. */
export interface SecretSpec {
  id: string;
  type: SecretType;
  /** Why the secret exists in the fiction. */
  why: string;
  /** What visual/audio clue tells the player. */
  clue: string;
  /** What action reveals it. */
  discoveryMethod: string;
  requiredMechanic: string;
  /** Reward id — must reference a chest/pickup that exists in the secret area. */
  reward: string;
  /** Secret zone rectangle in tiles [x, y, w, h]. Entering it marks the secret found. */
  room: [number, number, number, number];
  difficulty: 1 | 2 | 3;
}

export type BossCondition =
  | { signal: string }
  | { time: number }
  | { hits: number }
  | { allSignals: string[] };

export interface BossPhaseSpec {
  id: string;
  /** Attack pattern key understood by the boss kind. */
  pattern: string;
  /** Actions run when entering the phase. */
  enter?: LevelAction[];
  /** Rising edge of this signal stuns the boss and exposes the weak point. */
  stunOn?: string;
  stunDuration?: number;
  /** Weak point is exposed for the whole phase (no stun required). */
  exposed?: boolean;
  /** Condition to advance to the next phase. */
  until: BossCondition;
  /** Text key announced when the phase starts. */
  textKey?: string;
  /** Actions run when a stun ends (re-arms the arena puzzle). */
  afterStun?: LevelAction[];
  /** Entity ids the boss flashes in order as an in-world hint (e.g. crystal order). */
  hint?: string[];
}

export interface BossSpec {
  kind: 'serpent' | 'sand_king' | 'crystal_titan' | 'fire_dragon' | 'ice_dragon' | 'sky_deity';
  nameKey: string;
  /** Boss anchor position in tiles. */
  x: number;
  y: number;
  /** Arena rectangle in tiles [x, y, w, h]; camera locks here. */
  arena: [number, number, number, number];
  /** Tile the player must cross to begin the fight. */
  startX: number;
  phases: BossPhaseSpec[];
  /** Entity ids that close when the fight starts and open on victory. */
  gates?: string[];
  /** Kind-specific tuning (tile coordinates for perches, slump points …). */
  params?: Record<string, number>;
  /** Actions run once the boss is defeated (reveal seal chest, open exit …). */
  onDefeat?: LevelAction[];
}

export interface HintSpec {
  rect: [number, number, number, number];
  textKey: string;
}

export interface BackdropSpec {
  /** Rows at the top of the level with open sky instead of temple back-wall. */
  openSkyRows?: number;
  /** 0 = fully lit, 1 = pitch black. */
  darkness?: number;
  /** Player lantern radius in pixels when darkness > 0. */
  lanternRadius?: number;
  /** Optional weather effect. */
  weather?: 'none' | 'leaves' | 'sand' | 'embers' | 'snow' | 'blizzard' | 'motes' | 'clouds';
  /** Show light shafts from above. */
  lightShafts?: boolean;
}

export interface LevelSpec {
  id: string;
  name: string;
  nameKey?: string;
  world: WorldId;
  /** 1..8 within the world. */
  index: number;
  mechanics: string[];
  /** Short designer statement of the level's teaching purpose. */
  purpose: string;
  map: string[];
  /** Per-level character → entity overrides. */
  marks?: Record<string, EntitySpec>;
  entities?: EntitySpec[];
  triggers?: TriggerSpec[];
  secrets: SecretSpec[];
  hints?: HintSpec[];
  boss?: BossSpec;
  backdrop?: BackdropSpec;
  /** Target time in seconds used for results rating. */
  parTime: number;
  /** Optional one-line intro shown when the level starts. */
  introKey?: string;
}
