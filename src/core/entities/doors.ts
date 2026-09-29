import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import type { SolidKind } from '../physics/Collision';
import { approach, overlaps } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

/**
 * Door family: locked doors, secret doors, bar gates, crystal bridges, boss gates, temple doors.
 * `open` animates 0..1. Doors are solid while mostly closed; bridges are solid while open.
 */
export class Gate extends Entity {
  open = 0;
  targetOpen = 0;
  invert: boolean;
  speed: number;
  locked: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.invert = this.bool('invert', false);
    this.speed = this.num('speed', def.type === 'bridge' ? 4 : 1.6);
    this.locked = def.type === 'locked_door' || def.type === 'temple_door';
    const startOpen = this.bool('open', def.type === 'boss_gate');
    this.open = this.targetOpen = startOpen ? 1 : 0;
    if (this.invert && def.requires.length) this.open = this.targetOpen = 1;
  }

  override solidKind(): SolidKind | null {
    if (this.type === 'bridge') return this.open > 0.5 ? 'top' : null;
    return this.open < 0.85 ? 'full' : null;
  }

  override get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (this.locked && this.type === 'locked_door' && !this.requires.length) return;
    this.setOpen(world, this.invert ? !powered : powered);
  }

  setOpen(world: WorldApi, open: boolean): void {
    const t = open ? 1 : 0;
    if (t === this.targetOpen) return;
    this.targetOpen = t;
    if (open) {
      this.locked = false;
      world.fire('DOOR_OPENED', this.id);
    }
    const sound = this.type === 'bridge' ? (open ? 'bridge_form' : 'bridge_fade') : this.type === 'secret_door' ? 'secret_door' : 'door';
    world.emit({ kind: 'sound', id: sound, x: this.cx, y: this.cy });
    if (this.type !== 'bridge') world.emit({ kind: 'shake', intensity: 0.002, duration: 0.3 });
  }

  override interactPrompt(world: WorldApi): string | null {
    if (!this.locked || this.targetOpen === 1) return null;
    if (this.type === 'temple_door') return world.flags.get('templeKey') ? 'prompt.useTempleKey' : 'prompt.needTempleKey';
    if (this.type === 'locked_door' && !this.requires.length) return world.player.keys > 0 ? 'prompt.unlock' : 'prompt.locked';
    return null;
  }

  override interact(world: WorldApi): void {
    if (!this.locked) return;
    if (this.type === 'temple_door') {
      if (!world.flags.get('templeKey')) {
        world.emit({ kind: 'sound', id: 'locked' });
        return;
      }
      this.touched = true;
      this.setOpen(world, true);
      return;
    }
    if (world.player.keys > 0) {
      world.collect('key', this.id, -1);
      this.touched = true;
      world.emit({ kind: 'sound', id: 'unlock', x: this.cx, y: this.cy });
      this.setOpen(world, true);
    } else world.emit({ kind: 'sound', id: 'locked' });
  }

  override handleAction(world: WorldApi, action: LevelAction): void {
    switch (action.type) {
      case 'OPEN_DOOR':
      case 'REMOVE_BARRIER':
        this.setOpen(world, true);
        break;
      case 'CLOSE_DOOR':
        this.setOpen(world, false);
        break;
      case 'RESET':
        this.restoreInitial();
        break;
      default:
        break;
    }
  }

  override onPlayerRespawn(): void {
    if (this.bool('resetOnDeath', false)) this.restoreInitial();
  }

  override update(world: WorldApi, dt: number): void {
    const before = this.open;
    this.open = approach(this.open, this.targetOpen, this.speed * dt);
    if (this.type !== 'bridge' && before < this.open && Math.floor(before * 10) !== Math.floor(this.open * 10)) {
      world.emit({ kind: 'particles', preset: 'dust', x: this.cx, y: this.y + this.h, count: 2 });
    }
  }
}

/** Level exit portal. Completing requires the gate to be powered when it has requirements. */
export class ExitGate extends Entity {
  override init(): void {
    this.active = this.requires.length === 0;
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (powered && !this.active) {
      world.emit({ kind: 'sound', id: 'exit_open', x: this.cx, y: this.cy });
      world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 20, color: 0xffe28a });
    }
    this.active = powered;
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    if (action.type === 'OPEN_DOOR') this.active = true;
  }
  /** Center portal area the player must step into. */
  playerInside(world: WorldApi): boolean {
    const p = world.player;
    return this.active && overlaps({ x: this.x + 12, y: this.y + 16, w: this.w - 24, h: this.h - 16 }, p);
  }
}
