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
  constructor(def: EntityDef) {
    super(def);
    const s = this.num('strength', 1400);
    const d = this.str('dir', 'right');
    this.ax = d === 'right' ? s : d === 'left' ? -s : 0;
    this.ay = d === 'down' ? s : d === 'up' ? -s : 0;
  }
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 0);
    let on: boolean;
    if (this.requires.length) on = this.bool('invert', false) ? !this.powered : this.powered;
    else if (period > 0) {
      const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
      on = t < this.num('on', period / 2);
      this.props['warn'] = !on && t > period - 0.8;
    } else on = true;
    if (on && !this.active) {
      world.fire('WIND_ENABLED', this.id);
      world.emit({ kind: 'sound', id: 'wind_gust', x: this.cx, y: this.cy, volume: 0.7 });
    }
    this.active = on;
    this.gust = Math.max(0, Math.min(1, this.gust + (on ? dt * 3 : -dt * 3)));
    this.anim += dt;
  }
  force(x: number, y: number): { ax: number; ay: number } | null {
    if (this.gust <= 0 || !pointInRect(x, y, this)) return null;
    return { ax: this.ax * this.gust, ay: this.ay * this.gust };
  }
}
