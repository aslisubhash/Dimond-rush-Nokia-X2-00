import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import { TILE } from '../constants';
import { pointInRect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

/**
 * Magnet emitter. Attracts or repels magnet stones in its lane.
 * Players toggle polarity by interacting when `switchable`.
 */
export class Magnet extends Entity {
  dirX: number;
  dirY: number;
  range: number;
  attract: boolean;
  enabled: boolean;
  constructor(def: EntityDef) {
    super(def);
    const d = this.str('dir', 'right');
    this.dirX = d === 'right' ? 1 : d === 'left' ? -1 : 0;
    this.dirY = d === 'down' ? 1 : d === 'up' ? -1 : 0;
    this.range = this.num('range', 8) * TILE;
    this.attract = this.str('mode', 'attract') === 'attract';
    this.enabled = this.bool('on', def.requires.length === 0);
  }
  override interactPrompt(): string | null {
    return this.bool('switchable', true) ? 'prompt.magnet' : null;
  }
  override interact(world: WorldApi): void {
    this.touched = true;
    if (!this.enabled) {
      this.enabled = true;
    } else this.attract = !this.attract;
    world.fire('MAGNET_ENABLED', this.id, this.attract ? 1 : -1);
    world.emit({ kind: 'sound', id: 'magnet', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 8, color: this.attract ? 0x4da3ff : 0xff5a5a });
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    this.enabled = powered;
    if (powered) world.fire('MAGNET_ENABLED', this.id, 1);
    world.emit({ kind: 'sound', id: 'magnet', x: this.cx, y: this.cy });
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'START') this.enabled = true;
    if (action.type === 'STOP') this.enabled = false;
    if (action.type === 'ROTATE_OBJECT') this.attract = !this.attract;
  }
  override update(_world: WorldApi, dt: number): void {
    this.active = this.enabled;
    this.anim += dt;
  }
}

/** Wind zone. Always on, periodic (`period`/`on`), or driven by power. */
export class WindSource extends Entity {
  ax: number;
  ay: number;
  gust = 0;
  /** Tiles of rock upwind that fully shelter a point (0 = no sheltering). */
  shelter: number;
  private world: WorldApi | null = null;
  constructor(def: EntityDef) {
    super(def);
    const s = this.num('strength', 1400);
    const d = this.str('dir', 'right');
    this.ax = d === 'right' ? s : d === 'left' ? -s : 0;
    this.ay = d === 'down' ? s : d === 'up' ? -s : 0;
    this.shelter = this.num('shelter', 0);
  }
  override init(world: WorldApi): void {
    this.world = world;
  }
  /** True when solid rock lies within `shelter` tiles upwind of the point. */
  sheltered(x: number, y: number): boolean {
    const w = this.world;
    if (!this.shelter || !w || this.ax === 0) return false;
    const step = this.ax < 0 ? 1 : -1; // wind blowing left comes from the right
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    for (let i = 1; i <= this.shelter; i++) {
      const cx = tx + step * i;
      if (w.map.isSolid(cx, ty)) return true;
      const px = cx * TILE + TILE / 2;
      const py = ty * TILE + TILE / 2;
      for (const s of w.collision.solids) if (s.solidKind() === 'full' && px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h) return true;
    }
    return false;
  }
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 0);
    let on: boolean;
    on = this.requires.length ? (this.bool('invert', false) ? !this.powered : this.powered) : true;
    if (on && period > 0) {
      // Gusting: blows only during the `on` part of each period (also when powered).
      const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
      on = t < this.num('on', period / 2);
      this.props['warn'] = !on && t > period - 0.8;
    }
    if (on && !this.active) {
      world.fire('WIND_ENABLED', this.id);
      world.emit({ kind: 'sound', id: 'wind_gust', x: this.cx, y: this.cy, volume: 0.7 });
    }
    this.active = on;
    this.gust = Math.max(0, Math.min(1, this.gust + (on ? dt * 3 : -dt * 3)));
    this.anim += dt;
  }
  force(x: number, y: number): { ax: number; ay: number } | null {
    if (this.gust <= 0 || !pointInRect(x, y, this) || this.sheltered(x, y)) return null;
    return { ax: this.ax * this.gust, ay: this.ay * this.gust };
  }
}
