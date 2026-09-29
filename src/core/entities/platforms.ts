import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import type { SolidKind } from '../physics/Collision';
import { approach, overlaps } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';
import type { Carrier, StepReactive } from './traits';

/** Shared behaviour for moving solids: carry riders and shove the player out of the way. */
abstract class MovingSolid extends Entity implements Carrier {
  carryDx = 0;
  carryDy = 0;
  kind: SolidKind = 'top';
  friction = 1;

  override solidKind(): SolidKind | null {
    return this.removed ? null : this.kind;
  }
  surfaceFriction(): number {
    return this.friction;
  }

  protected moveTo(world: WorldApi, nx: number, ny: number): void {
    const dx = nx - this.x;
    const dy = ny - this.y;
    this.x = nx;
    this.y = ny;
    this.carryDx = dx;
    this.carryDy = dy;
    if (this.kind === 'full' && (dx || dy)) this.shovePlayer(world, dx, dy);
  }

  /** A full solid moving into the player pushes them; if they are pinned, they get crushed. */
  private shovePlayer(world: WorldApi, dx: number, dy: number): void {
    const p = world.player as unknown as { x: number; y: number; w: number; h: number; dead: boolean };
    if (p.dead || !overlaps(this, p)) return;
    const col = world.collision;
    if (dx > 0) col.moveX(p, this.x + this.w - p.x + 0.01, this);
    else if (dx < 0) col.moveX(p, this.x - (p.x + p.w) - 0.01, this);
    if (dy < 0 && p.y + p.h > this.y && p.y < this.y) col.moveY(p, this.y - (p.y + p.h), this);
    else if (dy > 0 && p.y < this.y + this.h && p.y + p.h > this.y + this.h) col.moveY(p, this.y + this.h - p.y, this);
  }
}

/**
 * Platform following a waypoint path (tile offsets from its start).
 * drive: always | powered (moves while powered) | toggle (powered → end, unpowered → start) | wind.
 */
export class MovingPlatform extends MovingSolid {
  points: { x: number; y: number }[] = [];
  segLen: number[] = [];
  total = 0;
  s = 0;
  dir = 1;
  pause = 0;
  speed: number;
  mode: string;
  drive: string;
  target = 0;

  constructor(def: EntityDef) {
    super(def);
    this.speed = this.num('speed', 80);
    this.mode = this.str('mode', 'pingpong');
    this.drive = this.str('drive', def.requires.length ? 'toggle' : 'always');
    this.kind = this.str('solid', 'top') === 'full' ? 'full' : 'top';
    this.friction = this.bool('ice', false) ? 0.15 : 1;
    const raw = this.props['path'];
    const path = Array.isArray(raw) ? (raw as [number, number][]) : [];
    this.points = [{ x: def.x, y: def.y }, ...path.map(([dx, dy]) => ({ x: def.x + dx * TILE, y: def.y + dy * TILE }))];
    if (this.mode === 'loop' && this.points.length > 2) this.points.push({ ...this.points[0]! });
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      this.segLen.push(l);
      this.total += l;
    }
    this.s = this.num('start', 0) * this.total;
    if (this.drive === 'toggle') this.s = 0;
    const p = this.posAt(this.s);
    this.x = p.x;
    this.y = p.y;
  }

  posAt(s: number): { x: number; y: number } {
    let rem = s;
    for (let i = 0; i < this.segLen.length; i++) {
      const l = this.segLen[i]!;
      if (rem <= l || i === this.segLen.length - 1) {
        const a = this.points[i]!;
        const b = this.points[i + 1]!;
        const t = l > 0 ? Math.min(1, rem / l) : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      rem -= l;
    }
    return this.points[0] ?? { x: this.x, y: this.y };
  }

  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (this.drive === 'toggle') {
      this.target = powered ? this.total : 0;
      world.emit({ kind: 'sound', id: 'platform_start', x: this.cx, y: this.cy });
    }
  }

  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'MOVE_PLATFORM') {
      this.drive = 'toggle';
      this.target = this.target > 0 ? 0 : this.total;
      world.emit({ kind: 'sound', id: 'platform_start', x: this.cx, y: this.cy });
    } else if (action.type === 'START') this.drive = 'always';
    else if (action.type === 'STOP') this.drive = 'stopped';
    else if (action.type === 'RESET') this.restoreInitial();
  }

  protected windPush(world: WorldApi): number {
    const w = world.windAt(this.cx, this.cy - 8);
    const a = this.points[0]!;
    const b = this.points[this.points.length - 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return (w.ax * (b.x - a.x) + w.ay * (b.y - a.y)) / len;
  }

  override update(world: WorldApi, dt: number): void {
    this.carryDx = 0;
    this.carryDy = 0;
    if (this.total <= 0) return;
    let ns = this.s;
    if (this.drive === 'always' || (this.drive === 'powered' && this.powered)) {
      if (this.pause > 0) {
        this.pause -= dt;
      } else {
        ns += this.dir * this.speed * dt;
        if (this.mode === 'loop') {
          ns = ((ns % this.total) + this.total) % this.total;
        } else if (ns >= this.total) {
          ns = this.total;
          this.dir = -1;
          this.pause = this.num('pause', 0.6);
        } else if (ns <= 0) {
          ns = 0;
          this.dir = 1;
          this.pause = this.num('pause', 0.6);
        }
      }
    } else if (this.drive === 'toggle') {
      ns = approach(ns, this.target, this.speed * dt);
    } else if (this.drive === 'wind') {
      const push = this.windPush(world);
      ns = push > 50 ? approach(ns, this.total, this.speed * dt) : approach(ns, 0, this.speed * 0.5 * dt);
    }
    this.s = ns;
    const p = this.posAt(ns);
    this.moveTo(world, p.x, p.y);
    this.anim += Math.abs(this.carryDx) + Math.abs(this.carryDy);
  }
}

/** Shakes when stepped on, falls, then respawns. */
export class FallingPlatform extends MovingSolid implements StepReactive {
  state: 'idle' | 'shaking' | 'falling' | 'gone' = 'idle';
  timer = 0;
  vy = 0;
  homeX: number;
  homeY: number;
  constructor(def: EntityDef) {
    super(def);
    this.homeX = def.x;
    this.homeY = def.y;
    this.h = Math.min(this.h, 20);
  }
  override solidKind(): SolidKind | null {
    return this.state === 'gone' ? null : 'top';
  }
  onStepped(world: WorldApi): void {
    if (this.state !== 'idle') return;
    this.state = 'shaking';
    this.timer = this.num('delay', 0.45);
    world.emit({ kind: 'sound', id: 'crumble_warn', x: this.cx, y: this.cy });
  }
  override update(world: WorldApi, dt: number): void {
    this.carryDx = 0;
    this.carryDy = 0;
    if (this.state === 'shaking') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'falling';
        this.vy = 0;
        this.timer = this.num('respawn', 2.8);
        world.emit({ kind: 'particles', preset: 'dust', x: this.cx, y: this.y + this.h, count: 8 });
      }
    } else if (this.state === 'falling') {
      this.vy = Math.min(this.vy + 1500 * dt, 700);
      this.moveTo(world, this.x, this.y + this.vy * dt);
      this.timer -= dt;
      if (this.timer <= 0 || this.y > world.level.heightPx + 64) {
        this.state = 'gone';
        this.timer = 0.6;
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
    }
  }
  reset(): void {
    this.state = 'idle';
    this.x = this.homeX;
    this.y = this.homeY;
    this.vy = 0;
  }
  override onPlayerRespawn(): void {
    this.reset();
  }
}

/**
 * Platform orbiting an anchor. `stepped` rings rotate by `stepAngle` each ROTATE_OBJECT action
 * or power toggle instead of spinning continuously.
 */
export class RotatingPlatform extends MovingSolid {
  anchorX: number;
  anchorY: number;
  radius: number;
  angle: number;
  targetAngle: number;
  speed: number;
  stepped: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.anchorX = def.x + TILE / 2;
    this.anchorY = def.y + TILE / 2;
    this.radius = this.num('radius', 3) * TILE;
    this.angle = (this.num('phase', 0) * Math.PI) / 180;
    this.targetAngle = this.angle;
    this.speed = this.num('speed', 0.8);
    this.stepped = this.bool('stepped', false);
    this.h = 16;
    this.place();
  }
  private place(): void {
    this.x = this.anchorX + Math.cos(this.angle) * this.radius - this.w / 2;
    this.y = this.anchorY + Math.sin(this.angle) * this.radius - this.h / 2;
  }
  override onPowerChanged(): void {
    if (this.stepped) this.targetAngle += (this.num('stepAngle', 90) * Math.PI) / 180;
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'ROTATE_OBJECT') {
      this.targetAngle += (this.num('stepAngle', 90) * Math.PI) / 180;
      world.emit({ kind: 'sound', id: 'ring_rotate', x: this.anchorX, y: this.anchorY });
    }
  }
  override update(world: WorldApi, dt: number): void {
    const ox = this.x;
    const oy = this.y;
    if (this.stepped) this.angle = approach(this.angle, this.targetAngle, 1.6 * dt);
    else if (!this.requires.length || this.powered) this.angle += this.speed * dt;
    this.place();
    const nx = this.x;
    const ny = this.y;
    this.x = ox;
    this.y = oy;
    this.moveTo(world, nx, ny);
  }
}

/** Crumbles shortly after being stepped on. Thin ice and collapsing floors don't come back until respawn. */
export class CrumblingBlock extends Entity implements StepReactive {
  state: 'solid' | 'cracking' | 'gone' = 'solid';
  timer = 0;
  override solidKind(): SolidKind | null {
    return this.state === 'gone' ? null : 'full';
  }
  surfaceFriction(): number {
    return this.str('variant', 'stone') === 'thin_ice' ? 0.2 : 1;
  }
  onStepped(world: WorldApi): void {
    if (this.state !== 'solid') return;
    this.state = 'cracking';
    this.timer = this.num('delay', 0.4);
    world.emit({ kind: 'sound', id: this.str('variant', 'stone') === 'thin_ice' ? 'ice_crack' : 'crumble_warn', x: this.cx, y: this.cy });
  }
  override update(world: WorldApi, dt: number): void {
    if (this.state === 'cracking') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'gone';
        this.timer = this.num('respawnTime', 3.5);
        const ice = this.str('variant', 'stone') === 'thin_ice';
        world.emit({ kind: 'particles', preset: ice ? 'ice_shard' : 'dust', x: this.cx, y: this.cy, count: 12 });
        world.emit({ kind: 'sound', id: ice ? 'ice_break' : 'crumble', x: this.cx, y: this.cy });
      }
    } else if (this.state === 'gone' && this.bool('respawn', true)) {
      this.timer -= dt;
      if (this.timer <= 0 && !overlaps(this, world.player)) this.state = 'solid';
    }
  }
  /** START collapses the block, optionally as part of a wave travelling along the floor. */
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type !== 'START' || this.state !== 'solid') return;
    const from = this.num('waveFrom', -1);
    this.state = 'cracking';
    this.timer = this.num('delay', 0.4) + (from >= 0 ? Math.max(0, this.x / TILE - from) * this.num('waveStep', 0.12) : 0);
    world.emit({ kind: 'sound', id: 'crumble_warn', x: this.cx, y: this.cy, volume: 0.4 });
  }

  override onPlayerRespawn(): void {
    this.state = 'solid';
  }
}

/** Buoyant platform that rides the surface of the water body beneath it. */
export class FloatPlatform extends MovingSolid {
  restY: number;
  constructor(def: EntityDef) {
    super(def);
    this.h = 16;
    this.restY = def.y + def.h - 16;
    this.y = this.restY;
  }
  override update(world: WorldApi, dt: number): void {
    // Find the surface of any water body under the platform's center column.
    let surface: number | null = null;
    for (const e of world.entities) {
      if (e.type !== 'water_body') continue;
      if (this.cx < e.x || this.cx > e.x + e.w) continue;
      const s = (e as unknown as { surfaceY: number }).surfaceY;
      if (s < e.y + e.h - 2) surface = surface === null ? s : Math.min(surface, s);
    }
    let target = surface !== null ? surface - this.h * 0.6 : this.restY;
    const bob = surface !== null ? Math.sin(world.time * 2 + this.x * 0.01) * 1.5 : 0;
    target += bob;
    const ny = approach(this.y, Math.min(target, this.restY), 140 * dt);
    // Don't pass through ceilings.
    const probe = { x: this.x, y: ny, w: this.w, h: this.h };
    if (ny < this.y && world.collision.overlapsSolid(probe, this)) {
      this.carryDx = 0;
      this.carryDy = 0;
      return;
    }
    this.moveTo(world, this.x, ny);
  }
}

/** Sand column whose height oscillates (Shifting Sands) or follows power. */
export class ShiftingSand extends MovingSolid {
  bottom: number;
  low: number;
  high: number;
  constructor(def: EntityDef) {
    super(def);
    this.kind = 'full';
    this.friction = 0.8;
    this.bottom = def.y + def.h;
    this.low = this.num('low', 1) * TILE;
    this.high = this.num('high', def.h / TILE) * TILE;
    this.h = this.bool('drainOnPower', false) ? this.high : this.low;
    this.y = this.bottom - this.h;
  }
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 6);
    let target: number;
    if (this.requires.length) {
      const t = this.bool('drainOnPower', false) ? (this.powered ? 0 : 1) : this.powered ? 1 : 0;
      target = this.low + (this.high - this.low) * t;
    } else {
      // Rise → hold high → fall → hold low, each a quarter of the period (smoothstep ramps).
      const ph = ((((world.time + this.num('offset', 0)) % period) + period) % period) / period;
      const ramp = (u: number): number => u * u * (3 - 2 * u);
      const k = ph < 0.25 ? ramp(ph / 0.25) : ph < 0.5 ? 1 : ph < 0.75 ? 1 - ramp((ph - 0.5) / 0.25) : 0;
      target = this.low + (this.high - this.low) * k;
    }
    const nh = this.requires.length ? approach(this.h, target, 90 * dt) : target;
    const oldY = this.y;
    this.h = nh;
    this.y = this.bottom - nh;
    this.carryDx = 0;
    this.carryDy = this.y - oldY;
    const dy = this.carryDy;
    if (Math.abs(dy) > 0.01 && Math.floor(world.time * 6) !== Math.floor((world.time - dt) * 6)) {
      world.emit({ kind: 'particles', preset: 'sand', x: this.cx, y: this.y, count: 2 });
    }
  }
}
