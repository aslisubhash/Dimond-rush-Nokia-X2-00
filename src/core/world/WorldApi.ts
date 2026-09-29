import type { CompiledLevel } from '../levels/LevelLoader';
import type { LevelEventType, LevelAction } from '../levels/schema';
import type { CollisionWorld } from '../physics/Collision';
import type { TileMap } from '../physics/TileMap';
import type { OutEvent, Facing } from '../types';
import type { Rect } from '../util/math';
import type { Entity } from '../entities/Entity';

/** Read-mostly view of the player that entities are allowed to use. */
export interface PlayerView extends Rect {
  vx: number;
  vy: number;
  facing: Facing;
  grounded: boolean;
  groundRef: unknown;
  dead: boolean;
  health: number;
  maxHealth: number;
  /** Current melee hitbox, or null when not attacking. */
  attackBox: Rect | null;
  attackSerial: number;
  keys: number;
  crouching: boolean;
  swimming: boolean;
}

export interface ProjectileSpec {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: string;
  gravity?: number;
  life?: number;
  damage?: number;
  /** Passes through walls (spectral/celestial). */
  ghost?: boolean;
}

export interface FluidQuery {
  surfaceY: number;
  entity: Entity;
}

export interface WorldApi {
  readonly time: number;
  readonly map: TileMap;
  readonly collision: CollisionWorld;
  readonly level: CompiledLevel;
  readonly player: PlayerView;
  readonly entities: readonly Entity[];
  getEntity(id: string): Entity | undefined;
  emit(e: OutEvent): void;
  fire(type: LevelEventType, source: string, value?: number): void;
  runAction(action: LevelAction, sourceId?: string): void;
  waterAt(x: number, y: number): FluidQuery | null;
  lavaAt(x: number, y: number): FluidQuery | null;
  spawnProjectile(p: ProjectileSpec): void;
  damagePlayer(amount: number, fromX: number, cause: string): void;
  killPlayer(cause: string): void;
  /** Override player velocity (null keeps the current component). Knocks climbers off. */
  knockPlayer(vx: number | null, vy: number | null): void;
  collect(kind: 'crystal' | 'coin' | 'relic' | 'temple_key' | 'heart_vessel' | 'seal' | 'key' | 'heart' | 'cosmetic', id: string, amount?: number): void;
  setCheckpoint(id: string, x: number, y: number): void;
  markSecretFound(secretId: string): void;
  showHint(textKey: string | null): void;
  /** Wind force (px/s²) acting at a point. */
  windAt(x: number, y: number): { ax: number; ay: number };
  /** Positions of active heat sources for melting / warmth. */
  isHot(x: number, y: number, radius: number): boolean;
  /** Is the player standing in a lit area (for darkness levels)? */
  flags: Map<string, number | string | boolean>;
  invulnerable: boolean;
}
