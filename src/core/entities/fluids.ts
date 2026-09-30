import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import { approach, overlaps, pointInRect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

/**
 * Fluid body occupying a rectangle. The surface can move between discrete `levels`
 * (absolute tile rows). Water gates, rising lava and cooling valves all drive this.
 */
export class FluidBody extends Entity {
  surfaceY: number;
  targetY: number;
  levels: number[];
  levelIndex: number;
  baseIndex: number;
  riseSpeed: number;
  rising = false;
  constructor(def: EntityDef) {
    super(def);
    const raw = this.props['levels'];
    this.levels = Array.isArray(raw) ? (raw as number[]).map((r) => r * TILE) : [def.y];
    this.levelIndex = this.baseIndex = Math.min(this.num('level', 0), this.levels.length - 1);
    this.surfaceY = this.targetY = this.levels[this.levelIndex] ?? def.y;
    this.riseSpeed = this.num('speed', 60);
    this.rising = this.bool('rising', false);
  }

  contains(x: number, y: number): boolean {
    return x >= this.x && x < this.x + this.w && y >= this.surfaceY && y < this.y + this.h;
  }

  setLevel(world: WorldApi, index: number): void {
    const i = Math.max(0, Math.min(this.levels.length - 1, index));
    if (i === this.levelIndex) return;
    const up = i > this.levelIndex;
    this.levelIndex = i;
    this.targetY = this.levels[i] ?? this.targetY;
    world.fire('WATER_LEVEL_CHANGED', this.id, i);
    world.emit({ kind: 'sound', id: this.type === 'lava_body' ? 'lava_rumble' : up ? 'water_rise' : 'water_drain', x: this.cx, y: this.surfaceY });
    world.emit({ kind: 'shake', intensity: 0.002, duration: 0.5 });
  }

  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (this.bool('risingOnPower', false)) {
      this.rising = powered;
      return;
    }
    this.setLevel(world, powered ? this.num('poweredLevel', this.levels.length - 1) : this.baseIndex);
  }

  override handleAction(world: WorldApi, action: LevelAction): void {
    switch (action.type) {
      case 'RAISE_WATER':
        this.setLevel(world, this.levelIndex + 1);
        break;
      case 'LOWER_WATER':
        this.setLevel(world, this.levelIndex - 1);
        break;
      case 'SET_WATER':
        this.setLevel(world, typeof action.value === 'number' ? action.value : 0);
        break;
      case 'START':
        this.rising = true;
        break;
      case 'STOP':
        this.rising = false;
        break;
      case 'RESET':
        this.restoreInitial();
        break;
      default:
        break;
    }
  }

  override update(world: WorldApi, dt: number): void {
    this.anim += dt;
    if (this.rising) {
      const top = this.num('maxRow', 0) * TILE;
      this.targetY = Math.max(top, this.targetY - this.riseSpeed * dt);
      this.surfaceY = this.targetY;
      if (Math.floor(world.time * 1.5) !== Math.floor((world.time - dt) * 1.5)) world.emit({ kind: 'sound', id: 'lava_rumble', volume: 0.35 });
    } else {
      this.surfaceY = approach(this.surfaceY, this.targetY, this.num('fillSpeed', 55) * dt);
    }
  }

  override onPlayerRespawn(world: WorldApi): void {
    if (!this.bool('resetOnDeath', false)) return;
    const below = world.player.y + world.player.h + this.num('resetGap', 7) * TILE;
    this.restoreInitial();
    this.surfaceY = this.targetY = Math.max(this.surfaceY, below);
    this.rising = this.bool('rising', false) || this.bool('keepRising', false);
  }
}

export class WaterBody extends FluidBody {
  /** Seconds the player has spent in this (icy) water. */
  chill = 0;
  override update(world: WorldApi, dt: number): void {
    super.update(world, dt);
    if (!this.bool('cold', false)) return;
    const p = world.player;
    const inside = !p.dead && this.contains(p.x + p.w / 2, p.y + p.h * 0.45);
    if (!inside) {
      this.chill = Math.max(0, this.chill - dt * 2);
      return;
    }
    const tick = this.num('coldTick', 2.5);
    const before = this.chill;
    this.chill += dt;
    if (Math.floor(before / tick) !== Math.floor(this.chill / tick)) {
      world.damagePlayer(1, p.x + p.w / 2, 'cold');
      world.emit({ kind: 'particles', preset: 'frost', x: p.x + p.w / 2, y: p.y + p.h / 2, count: 10 });
    } else if (Math.floor(before * 3) !== Math.floor(this.chill * 3)) {
      world.emit({ kind: 'particles', preset: 'frost', x: p.x + p.w / 2, y: p.y + 8, count: 1 });
    }
  }
}
export class LavaBody extends FluidBody {}

/** Vertical waterfall. Flowing pushes the player down and emits a signal (drives water wheels). */
export class Waterfall extends Entity {
  flow = 0;
  override init(): void {
    this.active = this.requires.length ? false : this.bool('on', true);
    this.flow = this.active ? 1 : 0;
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    const on = this.bool('invert', false) ? !powered : powered;
    if (on !== this.active) world.emit({ kind: 'sound', id: on ? 'waterfall_on' : 'waterfall_off', x: this.cx, y: this.cy });
    this.active = on;
  }
  override update(world: WorldApi, dt: number): void {
    this.flow = approach(this.flow, this.active ? 1 : 0, dt * 2);
    this.anim += dt;
    const force = this.num('force', 380);
    if (force > 0 && this.flow > 0.6 && overlaps(this, world.player) && !world.player.dead) {
      world.knockPlayer(null, Math.max(world.player.vy, force));
    }
  }
}

/** Underwater current: pushes swimmers and floating objects. Queried via windAt. */
export class WaterCurrent extends Entity {
  override init(): void {
    this.active = this.requires.length ? false : true;
  }
  override onPowerChanged(_world: WorldApi, powered: boolean): void {
    this.active = powered;
  }
  force(world: WorldApi, x: number, y: number): { ax: number; ay: number } | null {
    if (!this.active || !pointInRect(x, y, this) || !world.waterAt(x, y)) return null;
    const s = this.num('strength', 900);
    return { ax: this.num('dx', 1) * s, ay: this.num('dy', 0) * s };
  }
}

/** Periodic stream of falling sand. While pouring it knocks climbers down. */
export class SandFall extends Entity {
  flow = 0;
  override update(world: WorldApi, dt: number): void {
    const period = this.num('period', 4);
    const on = this.num('on', 2);
    const t = (((world.time + this.num('offset', 0)) % period) + period) % period;
    const warn = t > period - 0.6;
    this.active = this.requires.length ? this.powered : t < on;
    this.props['warn'] = warn;
    this.flow = approach(this.flow, this.active ? 1 : 0, dt * 5);
    this.anim += dt;
    if (this.flow > 0.5 && overlaps(this, world.player) && !world.player.dead) {
      world.knockPlayer(null, Math.max(world.player.vy, 420));
    }
  }
}
