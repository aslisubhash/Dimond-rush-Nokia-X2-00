import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import { dist, overlaps, type Rect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

function hurtIfCircle(world: WorldApi, x: number, y: number, r: number, cause: string): void {
  const p = world.player;
  if (p.dead) return;
  const nx = Math.max(p.x, Math.min(x, p.x + p.w));
  const ny = Math.max(p.y, Math.min(y, p.y + p.h));
  if (dist(nx, ny, x, y) < r) world.damagePlayer(1, x, cause);
}

/** Retractable spikes on a fixed cycle (predictable timing). */
export class SpikeTrap extends Entity {
  out = 1;
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 0);
    let up = true;
    if (period > 0) {
      const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
      up = t < this.num('on', period / 2);
    }
    if (this.requires.length) up = !this.powered;
    const before = this.out;
    this.out = Math.max(0, Math.min(1, this.out + (up ? dt * 10 : -dt * 4)));
    if (before < 0.5 && this.out >= 0.5) world.emit({ kind: 'sound', id: 'spikes_out', x: this.cx, y: this.cy, volume: 0.5 });
    this.active = this.out > 0.5;
    if (this.active) {
      const hb: Rect = { x: this.x + 3, y: this.y + this.h - 14, w: this.w - 6, h: 14 };
      if (overlaps(hb, world.player)) world.damagePlayer(1, this.cx, 'spikes');
    }
  }
}

/** Saw blade moving back and forth along a path. */
export class Saw extends Entity {
  ox: number;
  oy: number;
  radius: number;
  constructor(def: EntityDef) {
    super(def);
    this.radius = this.num('radius', 0.8) * TILE;
    this.ox = def.x + TILE / 2;
    this.oy = def.y + TILE / 2;
  }
  override update(world: WorldApi, dt: number): void {
    const [dx, dy] = (this.props['path'] as number[] | undefined) ?? [4, 0];
    const period = this.num('period', 3);
    const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
    const k = 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2);
    const cx = this.ox + (dx ?? 0) * TILE * k;
    const cy = this.oy + (dy ?? 0) * TILE * k;
    this.x = cx - this.radius;
    this.y = cy - this.radius;
    this.w = this.h = this.radius * 2;
    this.anim += dt * 14;
    hurtIfCircle(world, cx, cy, this.radius * 0.85, 'saw');
  }
}

/** Chain of fireballs rotating around a pivot. */
export class FireWheel extends Entity {
  angle: number;
  constructor(def: EntityDef) {
    super(def);
    this.angle = (this.num('phase', 0) * Math.PI) / 180;
  }
  get arms(): number {
    return this.num('arms', 1);
  }
  get length(): number {
    return this.num('length', 4);
  }
  /** Fireball positions (world space). */
  balls(out: { x: number; y: number }[]): { x: number; y: number }[] {
    out.length = 0;
    const cx = this.x + TILE / 2;
    const cy = this.y + TILE / 2;
    for (let a = 0; a < this.arms; a++) {
      const ang = this.angle + (a * Math.PI * 2) / this.arms;
      for (let i = 1; i <= this.length; i++) {
        out.push({ x: cx + Math.cos(ang) * i * 14, y: cy + Math.sin(ang) * i * 14 });
      }
    }
    return out;
  }
  private tmp: { x: number; y: number }[] = [];
  override update(world: WorldApi, dt: number): void {
    if (this.requires.length && this.powered) return; // powered = extinguished
    this.angle += this.num('speed', 1.6) * dt;
    for (const b of this.balls(this.tmp)) hurtIfCircle(world, b.x, b.y, 9, 'fire');
  }
}

/** Periodic flame jet (Fire Shafts). Warns with sparks before firing. */
export class FireJet extends Entity {
  flame = 0;
  warn = false;
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 3);
    const on = this.num('on', 1.2);
    const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
    let firing = t < on;
    if (this.requires.length) firing = firing && !this.powered;
    this.warn = !firing && t > period - 0.7;
    const before = this.flame;
    this.flame = Math.max(0, Math.min(1, this.flame + (firing ? dt * 8 : -dt * 5)));
    if (before === 0 && this.flame > 0) world.emit({ kind: 'sound', id: 'fire_jet', x: this.cx, y: this.cy, volume: 0.6 });
    this.active = this.flame > 0.4;
    if (this.active) {
      const len = this.num('length', 4) * TILE * this.flame;
      const dir = this.str('dir', 'up');
      let r: Rect;
      if (dir === 'up') r = { x: this.x + 6, y: this.y - len, w: this.w - 12, h: len };
      else if (dir === 'down') r = { x: this.x + 6, y: this.y + this.h, w: this.w - 12, h: len };
      else if (dir === 'left') r = { x: this.x - len, y: this.y + 6, w: len, h: this.h - 12 };
      else r = { x: this.x + this.w, y: this.y + 6, w: len, h: this.h - 12 };
      if (overlaps(r, world.player)) world.damagePlayer(1, this.cx, 'fire');
      if (Math.floor(world.time * 20) % 2 === 0) {
        world.emit({ kind: 'particles', preset: 'fire', x: r.x + r.w / 2, y: r.y + r.h / 2, count: 1 });
      }
    }
  }
}

/** Brazier / heat source. Lit braziers melt ice, warm the player and light dark rooms. */
export class FireSource extends Entity {
  constructor(def: EntityDef) {
    super(def);
    this.active = this.bool('lit', false);
  }
  override interactPrompt(): string | null {
    if (!this.bool('interactive', true)) return null;
    return this.active ? (this.bool('canDouse', false) ? 'prompt.douse' : null) : 'prompt.lightFire';
  }
  override interact(world: WorldApi): void {
    if (this.active && !this.bool('canDouse', false)) return;
    this.set(world, !this.active);
    this.touched = true;
  }
  set(world: WorldApi, lit: boolean): void {
    if (this.active === lit) return;
    this.active = lit;
    world.fire('TEMPERATURE_CHANGED', this.id, lit ? 1 : 0);
    world.emit({ kind: 'sound', id: lit ? 'torch_light' : 'extinguish', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: lit ? 'fire' : 'smoke', x: this.cx, y: this.y, count: 14 });
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    this.set(world, powered);
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'TURN_ON_LIGHT' || action.type === 'START') this.set(world, true);
    if (action.type === 'TURN_OFF_LIGHT' || action.type === 'STOP') this.set(world, false);
  }
  override resetSignal(world: WorldApi): void {
    this.set(world, false);
  }
  override update(world: WorldApi, dt: number): void {
    this.anim += dt;
    if (this.active && this.bool('hurts', false)) {
      const r = { x: this.x + 4, y: this.y - 10, w: this.w - 8, h: 14 };
      if (overlaps(r, world.player)) world.damagePlayer(1, this.cx, 'fire');
    }
  }
}

/** Hanging icicle / stalactite. Falls when the player passes beneath, shatters, regrows. */
export class Icicle extends Entity {
  state: 'hang' | 'shake' | 'fall' | 'gone' = 'hang';
  timer = 0;
  vy = 0;
  homeY: number;
  constructor(def: EntityDef) {
    super(def);
    this.homeY = def.y;
    this.x = def.x + 6;
    this.w = def.w - 12;
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'START' && this.state === 'hang') this.drop(world);
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (powered && this.state === 'hang') this.drop(world);
  }
  drop(world: WorldApi): void {
    this.state = 'shake';
    this.timer = this.num('delay', 0.35);
    world.emit({ kind: 'sound', id: 'ice_crack', x: this.cx, y: this.cy, volume: 0.6 });
  }
  override update(world: WorldApi, dt: number): void {
    const p = world.player;
    if (this.state === 'hang') {
      const trig = this.bool('triggered', true) && !this.requires.length;
      if (trig && !p.dead && p.y > this.y && p.x + p.w > this.x - 20 && p.x < this.x + this.w + 20 && p.y - this.y < this.num('reach', 8) * TILE) this.drop(world);
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'fall';
        this.vy = 0;
      }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 2000 * dt, 900);
      this.y += this.vy * dt;
      if (overlaps(this, p) && !p.dead) world.damagePlayer(1, this.cx, 'icicle');
      if (world.map.isSolidAt(this.cx, this.y + this.h) || this.y > world.level.heightPx) {
        this.state = 'gone';
        this.timer = this.num('regrow', 3.5);
        const stone = this.str('variant', 'ice') === 'stone';
        world.emit({ kind: 'particles', preset: stone ? 'dust' : 'ice_shard', x: this.cx, y: this.y + this.h, count: 14 });
        world.emit({ kind: 'sound', id: stone ? 'stone_land' : 'ice_break', x: this.cx, y: this.cy });
        world.fire('SIGNAL_ON', this.id);
        this.active = true;
        this.props['landX'] = this.cx;
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      this.active = false;
      if (this.timer <= 0 && this.num('regrow', 3.5) > 0) {
        this.state = 'hang';
        this.y = this.homeY;
      }
    }
  }
  override onPlayerRespawn(): void {
    this.state = 'hang';
    this.y = this.homeY;
    this.vy = 0;
  }
}
