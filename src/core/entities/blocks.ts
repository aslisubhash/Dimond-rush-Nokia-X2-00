import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import type { MoveResult, SolidKind } from '../physics/Collision';
import { approach, overlaps } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';
import { isCarrier, type Carrier, type Pushable } from './traits';

const GRAVITY = 1900;
const MAX_FALL = 850;

/** Solid movable object with gravity, buoyancy, pushing and platform riding. */
export class PhysicsBlock extends Entity implements Pushable, Carrier {
  pullable = true;
  vx = 0;
  vy = 0;
  grounded = false;
  carryDx = 0;
  carryDy = 0;
  homeX: number;
  homeY: number;
  floats = false;
  heavy = true;
  /** Rolling objects keep horizontal momentum until blocked. */
  rolls = false;
  rollSpeed = 250;
  pushedThisStep = false;
  protected groundRef: unknown = null;
  protected readonly res: MoveResult = { hitX: false, hitY: false, blockerX: null, blockerY: null };

  constructor(def: EntityDef) {
    super(def);
    this.homeX = def.x;
    this.homeY = def.y;
  }

  override solidKind(): SolidKind | null {
    return this.removed ? null : 'full';
  }

  override weight(): number {
    return this.heavy ? 2 : 1;
  }

  tryPush(world: WorldApi, dx: number): number {
    if (!this.grounded && !world.waterAt(this.cx, this.cy)) return 0;
    this.pushedThisStep = true;
    this.touched = true;
    if (this.rolls) {
      const dir = Math.sign(dx);
      if (Math.abs(this.vx) < 1) {
        this.vx = dir * this.rollSpeed;
        world.emit({ kind: 'sound', id: 'stone_roll', x: this.cx, y: this.cy });
        world.fire('STONE_MOVED', this.id);
      }
      return 0;
    }
    const moved = world.collision.moveX(this, dx, this);
    if (moved !== 0 && Math.floor(this.anim * 6) !== Math.floor((this.anim + Math.abs(moved) / 60) * 6)) {
      world.emit({ kind: 'particles', preset: 'dust', x: this.cx, y: this.y + this.h, count: 1 });
    }
    if (moved !== 0) {
      this.anim += Math.abs(moved) / 60;
      if (Math.floor(this.anim * 3) % 2 === 0) world.emit({ kind: 'sound', id: 'stone_push', volume: 0.35 });
      world.fire('STONE_MOVED', this.id);
    }
    return moved;
  }

  override update(world: WorldApi, dt: number): void {
    if (this.removed) return;
    const startX = this.x;
    const startY = this.y;
    if (this.grounded && isCarrier(this.groundRef)) {
      const c = this.groundRef;
      if (c.carryDx) world.collision.moveX(this, c.carryDx, this);
      if (c.carryDy) {
        if (c.carryDy < 0) world.collision.moveY(this, c.carryDy, this);
        else this.y += c.carryDy;
      }
    }

    this.applyForces(world, dt);

    const water = world.waterAt(this.cx, this.y + this.h * 0.5);
    if (water && this.floats) {
      const target = water.surfaceY - this.h * 0.35;
      this.vy = approach(this.vy, (target - this.y) * 6, 1600 * dt);
    } else if (water) {
      this.vy = Math.min(this.vy + GRAVITY * 0.35 * dt, 160);
    } else {
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    }

    const r = this.res;
    r.hitX = r.hitY = false;
    r.blockerX = r.blockerY = null;
    if (this.rolls && this.vx !== 0) {
      world.collision.moveX(this, this.vx * dt, this, r);
      this.snapIntoGap(world, dt);
      this.crushActors(world);
      if (r.hitX) {
        world.emit({ kind: 'sound', id: 'stone_hit', x: this.cx, y: this.cy });
        world.emit({ kind: 'shake', intensity: 0.004, duration: 0.12 });
        world.emit({ kind: 'particles', preset: 'dust', x: this.vx > 0 ? this.x + this.w : this.x, y: this.cy, count: 8 });
        this.vx = 0;
        this.x = Math.round(this.x);
      } else this.anim += (this.vx * dt) / (this.w * 0.5);
    } else if (!this.rolls) {
      this.vx = approach(this.vx, 0, 1200 * dt);
      if (this.vx !== 0) world.collision.moveX(this, this.vx * dt, this, r);
    }
    const fallSpeed = this.vy;
    world.collision.moveY(this, this.vy * dt, this, r);
    const g = world.collision.groundBelow(this, this);
    const wasGrounded = this.grounded;
    this.grounded = !!g;
    this.groundRef = g?.solid ?? null;
    if (this.grounded) {
      if (!wasGrounded && fallSpeed > 300 && this.heavy) {
        world.emit({ kind: 'sound', id: 'stone_land', x: this.cx, y: this.cy });
        world.emit({ kind: 'shake', intensity: 0.005, duration: 0.15 });
        world.emit({ kind: 'particles', preset: 'dust', x: this.cx, y: this.y + this.h, count: 10 });
      }
      if (this.vy > 0) this.vy = 0;
    } else if (r.hitY) this.vy = 0;

    if (world.lavaAt(this.cx, this.y + this.h - 2)) {
      world.emit({ kind: 'particles', preset: 'lava_spark', x: this.cx, y: this.y + this.h, count: 16 });
      world.emit({ kind: 'sound', id: 'sizzle', x: this.cx, y: this.cy });
      this.returnHome();
    }
    if (this.y > world.level.heightPx + 64) this.returnHome();

    this.carryDx = this.x - startX;
    this.carryDy = this.y - startY;
    this.pushedThisStep = false;
  }

  /** Rolling objects that pass over a gap exactly their width drop into it. */
  private snapIntoGap(world: WorldApi, dt: number): void {
    if (!this.grounded || this.w > TILE) return;
    const tx = Math.round(this.x / TILE);
    if (Math.abs(this.x - tx * TILE) > Math.abs(this.vx * dt) + 0.01) return;
    const below = Math.floor((this.y + this.h + 1) / TILE);
    const p = world.map.props(tx, below);
    if (p.solid || p.oneWay) return;
    // Only a true one-tile slot (ground on both sides) captures the stone; ledge edges don't.
    const l = world.map.props(tx - 1, below);
    const r = world.map.props(tx + 1, below);
    if (!(l.solid || l.oneWay) || !(r.solid || r.oneWay)) return;
    for (const s of world.collision.solids) {
      if (s !== this && s.solidKind() && s.x < (tx + 1) * TILE - 1 && s.x + s.w > tx * TILE + 1 && Math.abs(s.y - (this.y + this.h)) < 2) return;
    }
    this.x = tx * TILE;
    this.vx = 0;
    this.grounded = false;
    world.emit({ kind: 'sound', id: 'stone_hit', x: this.cx, y: this.cy, volume: 0.6 });
  }

  /** Heavy rolling objects crush enemies in their path. */
  private crushActors(world: WorldApi): void {
    if (Math.abs(this.vx) < 50) return;
    for (const e of world.entities) {
      const c = e as unknown as { crush?: (w: WorldApi) => void; alive?: boolean };
      if (typeof c.crush === 'function' && c.alive && overlaps(this, e)) c.crush(world);
    }
  }

  protected applyForces(world: WorldApi, dt: number): void {
    if (!this.heavy) {
      const wind = world.windAt(this.cx, this.cy);
      if (wind.ax) this.vx += wind.ax * 0.6 * dt;
    }
  }

  returnHome(): void {
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0;
    this.vy = 0;
  }

  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'RESET') this.returnHome();
  }
}

export class StoneBlock extends PhysicsBlock {
  constructor(def: EntityDef) {
    super(def);
    this.pullable = this.bool('pullable', true);
  }
}

export class Crate extends PhysicsBlock {
  constructor(def: EntityDef) {
    super(def);
    this.floats = true;
    this.heavy = false;
  }
}

/** Round carved stone head that rolls when pushed until it hits something. */
export class FaceStone extends PhysicsBlock {
  constructor(def: EntityDef) {
    super(def);
    this.rolls = true;
    this.pullable = false;
    this.rollSpeed = this.num('speed', 260);
  }
}

/** Ice block: slides like a face stone and melts near active heat. */
export class IceBlock extends PhysicsBlock {
  melt = 0;
  constructor(def: EntityDef) {
    super(def);
    this.rolls = this.bool('slides', true);
    this.pullable = false;
    this.heavy = true;
  }
  override update(world: WorldApi, dt: number): void {
    if (this.removed) return;
    super.update(world, dt);
    if (world.isHot(this.cx, this.cy, this.num('meltRadius', 3) * TILE)) {
      if (this.melt === 0) {
        world.fire('TEMPERATURE_CHANGED', this.id, 1);
        world.emit({ kind: 'sound', id: 'melt', x: this.cx, y: this.cy });
      }
      this.melt += dt / 1.4;
      if (Math.floor(world.time * 30) % 4 === 0) world.emit({ kind: 'particles', preset: 'steam', x: this.cx, y: this.y, count: 1 });
      if (this.melt >= 1) {
        this.removed = true;
        this.active = true;
        world.emit({ kind: 'particles', preset: 'water_splash', x: this.cx, y: this.cy, count: 18 });
      }
    }
  }
  surfaceFriction(): number {
    return 0.15;
  }
}

/** Magnetic stone: pulled or pushed by active magnets aligned with it. */
export class MagnetStone extends PhysicsBlock {
  polarity: 1 | -1;
  magnetized = false;
  constructor(def: EntityDef) {
    super(def);
    this.polarity = this.str('polarity', 'N') === 'N' ? 1 : -1;
  }
  protected override applyForces(world: WorldApi, dt: number): void {
    this.magnetized = false;
    for (const e of world.entities) {
      if (e.type !== 'magnet' || !e.active) continue;
      const m = e as unknown as { dirX: number; dirY: number; range: number; attract: boolean };
      const range = m.range;
      if (m.dirY === 0) {
        // Horizontal magnet: stone must share rows with the magnet.
        if (this.y + this.h <= e.y + 2 || this.y >= e.y + e.h - 2) continue;
        const dx = this.cx - e.cx;
        if (Math.sign(dx) !== m.dirX || Math.abs(dx) > range) continue;
        const toward = -Math.sign(dx);
        const dir = m.attract ? toward : -toward;
        this.vx = dir * 140;
        this.magnetized = true;
      } else {
        if (this.x + this.w <= e.x + 2 || this.x >= e.x + e.w - 2) continue;
        const dy = this.cy - e.cy;
        if (Math.sign(dy) !== m.dirY || Math.abs(dy) > range) continue;
        const toward = -Math.sign(dy);
        const dir = m.attract ? toward : -toward;
        // Vertical magnetism overrides gravity.
        this.vy = dir * 120 - GRAVITY * dt;
        this.magnetized = true;
      }
    }
    if (this.magnetized && Math.floor(world.time * 8) !== Math.floor((world.time - dt) * 8)) {
      world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 1, color: 0xff5a5a });
    }
  }
}

/** Boulder hazard that rolls when released, crushing enemies and hurting the player. */
export class RollingStone extends PhysicsBlock {
  released = false;
  dir: number;
  constructor(def: EntityDef) {
    super(def);
    this.rolls = true;
    this.pullable = false;
    this.dir = this.num('dir', 1);
    this.rollSpeed = this.num('speed', 230);
    this.released = this.bool('released', false);
  }
  override tryPush(): number {
    return 0;
  }
  override onPowerChanged(_world: WorldApi, powered: boolean): void {
    if (powered) this.released = true;
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'START') this.released = true;
    else super.handleAction(world, action);
  }
  override update(world: WorldApi, dt: number): void {
    if (this.removed) return;
    if (this.released && this.vx === 0 && this.grounded && this.x === this.homeX && this.y === this.homeY) {
      this.vx = this.dir * this.rollSpeed;
      world.emit({ kind: 'sound', id: 'boulder', x: this.cx, y: this.cy });
    }
    const wasRolling = this.vx !== 0;
    super.update(world, dt);
    if (wasRolling) {
      if (overlaps(this.rect, world.player) && !world.player.dead) world.damagePlayer(1, this.cx, 'boulder');
      if (this.vx === 0) {
        // Smash cracked walls it hits.
        const tx = Math.floor((this.dir > 0 ? this.x + this.w + 4 : this.x - 4) / TILE);
        const ty = Math.floor(this.cy / TILE);
        const opened = world.map.openSecret(tx, ty);
        if (opened.length) {
          world.emit({ kind: 'particles', preset: 'secret_found', x: tx * TILE + 16, y: ty * TILE + 16, count: 24 });
          world.emit({ kind: 'sound', id: 'wall_break' });
        }
        this.removed = this.bool('shatters', true);
        if (this.removed) world.emit({ kind: 'particles', preset: 'dust', x: this.cx, y: this.cy, count: 24 });
      }
    }
  }
  override onPlayerRespawn(): void {
    if (this.bool('resetOnDeath', true)) {
      this.removed = false;
      this.released = this.bool('released', false);
      this.returnHome();
    }
  }
}
