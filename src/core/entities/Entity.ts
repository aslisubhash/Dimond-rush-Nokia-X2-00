import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction, LogicMode, PropValue, Props, EntityType } from '../levels/schema';
import type { SolidKind, SolidProvider } from '../physics/Collision';
import type { Rect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';

let nextUid = 1;

type Primitive = number | string | boolean | null;

/**
 * Base class of every interactive object. Entities communicate only through
 * signals (`active` → `requires` of others) and level events/actions.
 */
export abstract class Entity implements SolidProvider {
  readonly uid = nextUid++;
  readonly id: string;
  readonly type: EntityType;
  readonly props: Props;
  readonly requires: string[];
  readonly logic: LogicMode;
  readonly arena: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Output signal. */
  active = false;
  /** Input signal computed from `requires` by the logic system. */
  powered = false;
  /** Removed entities are skipped by update/render (collected pickups etc). */
  removed = false;
  /** Generic animation clock for views. */
  anim = 0;
  /** True once the player has interacted with it — the HUD may highlight it. */
  touched = false;
  private initial: Record<string, Primitive | Primitive[]> | null = null;

  constructor(def: EntityDef) {
    this.id = def.id;
    this.type = def.type;
    this.props = def.props;
    this.requires = def.requires;
    this.logic = def.logic;
    this.arena = def.arena;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h;
  }

  num(key: string, fallback: number): number {
    const v = this.props[key];
    return typeof v === 'number' ? v : fallback;
  }
  str(key: string, fallback: string): string {
    const v = this.props[key];
    return typeof v === 'string' ? v : fallback;
  }
  bool(key: string, fallback: boolean): boolean {
    const v = this.props[key];
    return typeof v === 'boolean' ? v : fallback;
  }
  list(key: string): PropValue | undefined {
    return this.props[key];
  }

  get cx(): number {
    return this.x + this.w / 2;
  }
  get cy(): number {
    return this.y + this.h / 2;
  }
  get rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Called once after all entities exist. */
  init(_world: WorldApi): void {}
  update(_world: WorldApi, _dt: number): void {}
  onPowerChanged(_world: WorldApi, _powered: boolean): void {}
  handleAction(_world: WorldApi, _action: LevelAction): void {}
  solidKind(): SolidKind | null {
    return null;
  }
  /** Interaction (E / Y / W). Return a text key for the prompt, or null if unavailable. */
  interactPrompt(_world: WorldApi): string | null {
    return null;
  }
  interact(_world: WorldApi): void {}
  /** Melee hit. Return true if the hit was consumed. */
  onAttack(_world: WorldApi): boolean {
    return false;
  }
  /** Called when the player respawns at a checkpoint. */
  onPlayerRespawn(_world: WorldApi): void {}
  /** Weight contributed to pressure plates when resting on them. */
  weight(): number {
    return 0;
  }
  /** Used by signal sources that can be reverted by sequence locks. */
  resetSignal(_world: WorldApi): void {}

  /** Snapshot primitive fields so the entity can be reset (arena restart, level reset). */
  captureInitial(): void {
    const snap: Record<string, Primitive | Primitive[]> = {};
    for (const [k, v] of Object.entries(this)) {
      if (k === 'initial') continue;
      if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') snap[k] = v;
      else if (Array.isArray(v) && v.every((e) => e === null || typeof e !== 'object')) snap[k] = [...(v as Primitive[])];
    }
    this.initial = snap;
  }

  restoreInitial(): void {
    if (!this.initial) return;
    const self = this as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(this.initial)) {
      if (k === 'uid' || k === 'id' || k === 'type') continue;
      self[k] = Array.isArray(v) ? [...v] : v;
    }
  }
}
