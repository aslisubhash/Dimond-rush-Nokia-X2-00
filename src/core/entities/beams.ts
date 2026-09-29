import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

export type BeamDir = 0 | 1 | 2 | 3; // right, down, left, up
export const DIR_VEC: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function parseDir(s: string): BeamDir {
  switch (s) {
    case 'down':
      return 1;
    case 'left':
      return 2;
    case 'up':
      return 3;
    default:
      return 0;
  }
}

/** Anything that emits a beam each step. */
export interface BeamEmitter {
  emitting(): boolean;
  beamDir(): BeamDir;
  beamKind(): 'light' | 'laser';
}

export function isBeamEmitter(e: unknown): e is BeamEmitter & Entity {
  return !!e && typeof (e as BeamEmitter).emitting === 'function';
}

/** Two-way mirror. '/' turns right→up, '\' turns right→down. */
export class Mirror extends Entity {
  /** 0 = '/', 1 = '\' */
  orient: 0 | 1;
  fixed: boolean;
  spin = 0;
  constructor(def: EntityDef) {
    super(def);
    this.orient = this.str('orient', '/') === '/' ? 0 : 1;
    this.fixed = this.bool('fixed', false);
  }
  reflect(d: BeamDir): BeamDir {
    // '/' : right(0)->up(3), up(3)->right(0), left(2)->down(1), down(1)->left(2)
    if (this.orient === 0) return ([3, 2, 1, 0] as const)[d];
    // '\' : right(0)->down(1), down(1)->right(0), left(2)->up(3), up(3)->left(2)
    return ([1, 0, 3, 2] as const)[d];
  }
  override interactPrompt(): string | null {
    return this.fixed ? null : 'prompt.rotateMirror';
  }
  override interact(world: WorldApi): void {
    this.rotate(world);
  }
  override onAttack(world: WorldApi): boolean {
    if (this.fixed) return false;
    this.rotate(world);
    return true;
  }
  rotate(world: WorldApi): void {
    this.orient = this.orient === 0 ? 1 : 0;
    this.touched = true;
    this.spin = 1;
    world.fire('MIRROR_ROTATED', this.id, this.orient);
    world.emit({ kind: 'sound', id: 'mirror', x: this.cx, y: this.cy });
  }
  override onPowerChanged(world: WorldApi): void {
    // Powered mirrors flip each time their input changes (ring mechanisms).
    this.rotate(world);
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'ROTATE_OBJECT') this.rotate(world);
    else if (action.type === 'RESET') this.restoreInitial();
  }
  override update(_world: WorldApi, dt: number): void {
    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 4);
  }
}

/** Sun aperture: emits a light beam when powered (or always when unwired). */
export class LightSource extends Entity implements BeamEmitter {
  dir: BeamDir;
  on: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.dir = parseDir(this.str('dir', 'right'));
    this.on = this.bool('on', def.requires.length === 0);
  }
  emitting(): boolean {
    return this.on && !this.removed;
  }
  beamDir(): BeamDir {
    return this.dir;
  }
  beamKind(): 'light' | 'laser' {
    return 'light';
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    this.on = powered;
    world.emit({ kind: 'sound', id: powered ? 'light_on' : 'light_off', x: this.cx, y: this.cy });
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'TURN_ON_LIGHT') this.on = true;
    if (action.type === 'TURN_OFF_LIGHT') this.on = false;
  }
  override update(): void {
    this.active = this.on;
  }
}

/** Laser emitter — damages the player. Can be disabled by power, actions or a duty cycle. */
export class Laser extends Entity implements BeamEmitter {
  dir: BeamDir;
  enabled: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.dir = parseDir(this.str('dir', 'right'));
    this.enabled = this.bool('on', true);
  }
  emitting(): boolean {
    if (!this.enabled || this.removed) return false;
    return this.active;
  }
  beamDir(): BeamDir {
    return this.dir;
  }
  beamKind(): 'light' | 'laser' {
    return 'laser';
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    // By default power DISABLES a laser (switch turns off the grid).
    this.enabled = this.bool('powerEnables', false) ? powered : !powered;
    world.emit({ kind: 'sound', id: this.enabled ? 'laser_on' : 'laser_off', x: this.cx, y: this.cy });
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'ACTIVATE_LASER') this.enabled = true;
    if (action.type === 'DISABLE_LASER') this.enabled = false;
    if (action.type === 'RESET') this.restoreInitial();
  }
  override update(world: WorldApi): void {
    const period = this.num('period', 0);
    if (period > 0) {
      const on = this.num('on', period / 2);
      const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
      this.active = t < on;
      this.props['warn'] = !this.active && t > period - 0.5;
    } else this.active = true;
  }
}

/** Target crystal / sun disk. Active while a light beam hits it (optionally latched). */
export class LightReceiver extends Entity {
  lit = false;
  latch: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.latch = this.bool('latch', false);
  }
  override update(world: WorldApi): void {
    if (this.lit && !this.active) {
      this.active = true;
      this.touched = true;
      world.fire('LIGHT_RECEIVED', this.id);
      world.emit({ kind: 'sound', id: 'light_receive', x: this.cx, y: this.cy });
      world.emit({ kind: 'particles', preset: 'light_beam', x: this.cx, y: this.cy, count: 16 });
    } else if (!this.lit && this.active && !this.latch) this.active = false;
    this.lit = false;
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'RESET') {
      this.active = false;
      this.lit = false;
    }
  }
}
