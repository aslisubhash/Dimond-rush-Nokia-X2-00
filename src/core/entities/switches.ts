import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import { overlaps, pointInRect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

/** Pressed by weight resting on it (player = 1, stone = 2). */
export class PressurePlate extends Entity {
  weightRequired: number;
  latch: boolean;
  load = 0;
  private warned = false;
  constructor(def: EntityDef) {
    super(def);
    this.weightRequired = this.num('weightRequired', 1);
    this.latch = this.bool('latch', false);
    // Plates are a thin slab at the bottom of their tile.
    this.y = this.y + this.h - 8;
    this.h = 8;
  }
  override update(world: WorldApi): void {
    let load = 0;
    const zone = { x: this.x + 4, y: this.y - 6, w: this.w - 8, h: this.h + 6 };
    const p = world.player;
    if (!p.dead && p.grounded && overlaps(zone, p)) load += 1;
    for (const e of world.entities) {
      if (e.removed || e === this) continue;
      const wgt = e.weight();
      if (wgt > 0 && overlaps(zone, e) && e.y + e.h <= this.y + this.h + 1) load += wgt;
    }
    this.load = load;
    const pressed = load >= this.weightRequired;
    if (!pressed && load > 0 && !this.warned && this.weightRequired > 1) {
      this.warned = true;
      world.emit({ kind: 'toast', textKey: 'toast.plateHeavy' });
      world.emit({ kind: 'sound', id: 'plate_up', x: this.cx, y: this.cy, volume: 0.5 });
    }
    if (pressed && !this.active) {
      this.active = true;
      this.touched = true;
      world.fire('PLATE_PRESSED', this.id);
      world.emit({ kind: 'sound', id: 'plate_down', x: this.cx, y: this.cy });
    } else if (!pressed && this.active && !this.latch) {
      this.active = false;
      world.fire('PLATE_RELEASED', this.id);
      world.emit({ kind: 'sound', id: 'plate_up', x: this.cx, y: this.cy, volume: 0.6 });
    }
  }
}

/**
 * Toggle switch / lever / glyph tablet. Optional `timer` makes it spring back (timing secrets).
 * `oneShot` switches cannot be turned off again.
 */
export class Switch extends Entity {
  timer: number;
  remaining = 0;
  oneShot: boolean;
  byAttack: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.timer = this.num('timer', 0);
    this.oneShot = this.bool('oneShot', false);
    this.byAttack = this.bool('byAttack', true);
    this.active = this.bool('on', false);
  }
  override interactPrompt(): string | null {
    if (this.oneShot && this.active) return null;
    if (this.requires.length && !this.powered) return null;
    return this.type === 'lever' ? 'prompt.pullLever' : 'prompt.pressSwitch';
  }
  override interact(world: WorldApi): void {
    this.toggle(world);
  }
  override onAttack(world: WorldApi): boolean {
    if (!this.byAttack || this.type === 'lever') return false;
    if (this.requires.length && !this.powered) return false;
    this.toggle(world);
    return true;
  }
  toggle(world: WorldApi): void {
    if (this.oneShot && this.active) return;
    this.touched = true;
    this.set(world, !this.active);
  }
  set(world: WorldApi, on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    this.remaining = on ? this.timer : 0;
    world.fire(on ? 'SWITCH_ON' : 'SWITCH_OFF', this.id);
    world.emit({ kind: 'sound', id: this.type === 'lever' ? 'lever' : 'switch', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 6, color: on ? 0xffd166 : 0x8899aa });
  }
  override update(world: WorldApi, dt: number): void {
    if (this.remaining > 0) {
      const before = this.remaining;
      this.remaining -= dt;
      if (Math.ceil(before * 2) !== Math.ceil(this.remaining * 2)) world.emit({ kind: 'sound', id: 'tick', volume: 0.5 });
      if (this.remaining <= 0) this.set(world, false);
    }
  }
  override resetSignal(world: WorldApi): void {
    this.set(world, false);
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'RESET') this.set(world, false);
  }
}

/**
 * Wall torch / brazier. Decorative torches are always lit; puzzle torches are lit by interaction.
 * `flame` (1..3) is the height hint used in ordering puzzles.
 */
export class Torch extends Entity {
  decor: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.decor = this.bool('decor', false);
    this.active = this.bool('lit', false);
  }
  get flame(): number {
    return this.num('flame', 2);
  }
  override interactPrompt(): string | null {
    if (this.decor || this.active) return null;
    return 'prompt.lightTorch';
  }
  override interact(world: WorldApi): void {
    if (this.decor || this.active) return;
    this.active = true;
    this.touched = true;
    world.fire('SWITCH_ON', this.id);
    world.emit({ kind: 'sound', id: 'torch_light', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: 'fire', x: this.cx, y: this.y + 6, count: 12 });
  }
  override resetSignal(world: WorldApi): void {
    if (this.decor || !this.active) return;
    this.active = false;
    world.emit({ kind: 'particles', preset: 'smoke', x: this.cx, y: this.y + 6, count: 10 });
    world.emit({ kind: 'sound', id: 'extinguish', x: this.cx, y: this.cy });
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'TURN_ON_LIGHT') this.active = true;
    else if (action.type === 'TURN_OFF_LIGHT' || action.type === 'RESET') this.resetSignal(world);
  }
}

/**
 * Energy crystal pylon. Activated by striking it, by light beams, or by power.
 * `duration` > 0 makes it temporary (crystal bridge); `emit` direction makes it relay light.
 */
export class CrystalNode extends Entity {
  duration: number;
  remaining = 0;
  lit = false;
  mode: string;
  constructor(def: EntityDef) {
    super(def);
    this.duration = this.num('duration', 0);
    this.mode = this.str('mode', 'strike'); // strike | light | power
    this.active = this.bool('on', false);
  }
  override interactPrompt(): string | null {
    if (this.mode !== 'strike' || (this.active && !this.duration)) return null;
    if (this.requires.length && !this.powered) return null;
    return 'prompt.strikeCrystal';
  }
  override interact(world: WorldApi): void {
    this.strike(world);
  }
  override onAttack(world: WorldApi): boolean {
    if (this.mode !== 'strike') return false;
    this.strike(world);
    return true;
  }
  strike(world: WorldApi): void {
    if (this.requires.length && !this.powered) {
      world.emit({ kind: 'sound', id: 'crystal_dull', x: this.cx, y: this.cy });
      return;
    }
    this.touched = true;
    if (this.bool('toggle', false) && this.active) {
      this.deactivate(world);
      return;
    }
    this.activate(world);
  }
  activate(world: WorldApi): void {
    this.remaining = this.duration;
    if (this.active) return;
    this.active = true;
    world.fire('CRYSTAL_ACTIVATED', this.id);
    const pitch = this.props['pitch'];
    world.emit({ kind: 'sound', id: typeof pitch === 'number' ? `chime_${pitch}` : 'crystal_chime', x: this.cx, y: this.cy, volume: 0.9 });
    world.emit({ kind: 'particles', preset: 'crystal_pickup', x: this.cx, y: this.cy, count: 14, color: this.num('color', 0xb65cff) });
  }
  deactivate(world: WorldApi): void {
    if (!this.active) return;
    this.active = false;
    world.emit({ kind: 'sound', id: 'crystal_fade', x: this.cx, y: this.cy, volume: 0.6 });
  }
  override onPowerChanged(world: WorldApi, powered: boolean): void {
    if (this.mode === 'power') {
      if (powered) this.activate(world);
      else this.deactivate(world);
    }
  }
  override update(world: WorldApi, dt: number): void {
    if (this.mode === 'light') {
      if (this.lit) this.activate(world);
      else if (!this.bool('latch', false)) this.deactivate(world);
    }
    if (this.remaining > 0) {
      const before = this.remaining;
      this.remaining -= dt;
      if (this.remaining < 1.5 && Math.ceil(before * 4) !== Math.ceil(this.remaining * 4)) world.emit({ kind: 'sound', id: 'tick', volume: 0.35 });
      if (this.remaining <= 0) this.deactivate(world);
    }
    this.lit = false;
  }
  override resetSignal(world: WorldApi): void {
    this.deactivate(world);
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'RESET' || action.type === 'TURN_OFF_LIGHT') this.deactivate(world);
    if (action.type === 'TURN_ON_LIGHT') this.activate(world);
  }
}

/**
 * Echo stone: when struck it replays a melody (sound + visual ripples) naming the order of
 * chime crystals. It is a clue source, not a switch.
 */
export class EchoStone extends Entity {
  playing = -1;
  private t = 0;
  get melody(): string[] {
    const m = this.props['melody'];
    return Array.isArray(m) ? (m as string[]) : [];
  }
  override interactPrompt(): string | null {
    return 'prompt.listen';
  }
  override interact(world: WorldApi): void {
    this.play(world);
  }
  override onAttack(world: WorldApi): boolean {
    this.play(world);
    return true;
  }
  play(world: WorldApi): void {
    this.touched = true;
    this.playing = 0;
    this.t = 0;
    world.emit({ kind: 'sound', id: 'echo_hum', x: this.cx, y: this.cy });
  }
  override update(world: WorldApi, dt: number): void {
    if (this.playing < 0) return;
    this.t += dt;
    const step = 0.7;
    const idx = Math.floor(this.t / step) - 1;
    if (idx >= 0 && idx < this.melody.length && idx >= this.playing) {
      this.playing = idx + 1;
      const target = world.getEntity(this.melody[idx] ?? '');
      if (target) {
        const pitch = target.num('pitch', idx);
        world.emit({ kind: 'sound', id: `chime_${pitch}`, x: target.cx, y: target.cy });
        world.emit({ kind: 'particles', preset: 'echo', x: target.cx, y: target.cy, count: 1 });
        target.anim = 1; // views flash the chime
      }
    }
    if (this.t > step * (this.melody.length + 1)) this.playing = -1;
  }
}

/**
 * Chain secret / ordering puzzle. Sources in `order` must activate in that order.
 * A wrong activation resets all sources (`resetSignal`).
 */
export class SequenceLock extends Entity {
  progress = 0;
  /** Disabled locks only track their sources (boss phases enable them with START). */
  enabled = true;
  private prev: boolean[] = [];
  constructor(def: EntityDef) {
    super(def);
    this.enabled = this.bool('enabled', true);
  }
  get order(): string[] {
    const o = this.props['order'];
    return Array.isArray(o) ? (o as string[]) : [];
  }
  override init(world: WorldApi): void {
    this.prev = this.order.map((id) => !!world.getEntity(id)?.active);
  }
  override update(world: WorldApi): void {
    if (this.active && this.bool('latch', true)) return;
    const order = this.order;
    // Sources may repeat in the order (melodies): evaluate each distinct source once per step.
    for (let i = 0; i < order.length; i++) {
      const id = order[i] ?? '';
      if (order.indexOf(id) !== i) continue;
      const now = !!world.getEntity(id)?.active;
      const was = this.prev[i] ?? false;
      this.prev[i] = now;
      if (!now || was || !this.enabled) continue;
      if (order[this.progress] === id) {
        this.progress++;
        world.emit({ kind: 'sound', id: `chime_${Math.min(this.progress - 1, 5)}`, volume: 0.7 });
        if (this.progress >= order.length) {
          this.active = true;
          world.fire('SEQUENCE_SOLVED', this.id);
          world.emit({ kind: 'sound', id: 'puzzle_solved' });
        }
      } else {
        this.fail(world);
        return;
      }
    }
  }
  fail(world: WorldApi): void {
    this.progress = 0;
    world.fire('SEQUENCE_FAILED', this.id);
    world.emit({ kind: 'sound', id: 'wrong' });
    world.emit({ kind: 'shake', intensity: 0.002, duration: 0.15 });
    for (const id of this.order) world.getEntity(id)?.resetSignal(world);
    this.prev = this.order.map(() => false);
  }
  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'RESET') {
      this.active = false;
      this.fail(world);
    } else if (action.type === 'START') {
      this.enabled = true;
      this.active = false;
      this.progress = 0;
    } else if (action.type === 'STOP') this.enabled = false;
  }
}

/** Invisible region; active while the player is inside (or latched once entered). */
export class TriggerZone extends Entity {
  latch: boolean;
  constructor(def: EntityDef) {
    super(def);
    this.latch = this.bool('latch', true);
  }
  override update(world: WorldApi): void {
    const p = world.player;
    const inside = !p.dead && pointInRect(p.x + p.w / 2, p.y + p.h / 2, this);
    if (inside && !this.active) {
      this.active = true;
      world.fire('ZONE_ENTERED', this.id);
    } else if (!inside && this.active && !this.latch) this.active = false;
  }
  override onPlayerRespawn(): void {
    if (this.bool('resetOnDeath', false)) this.active = false;
  }
  override handleAction(_world: WorldApi, action: LevelAction): void {
    // Scripted zones (boss phases) can be switched on/off directly.
    if (action.type === 'START') this.active = true;
    else if (action.type === 'STOP' || action.type === 'RESET') this.active = false;
  }
}

/** Delayed / periodic signal: active for `on` seconds every `period` seconds, or pulses when powered. */
export class Timer extends Entity {
  override update(world: WorldApi): void {
    const period = this.num('period', 4);
    const on = this.num('on', period / 2);
    const offset = this.num('offset', 0);
    const gated = this.requires.length > 0;
    if (gated && !this.powered) {
      this.active = false;
      return;
    }
    const t = (((world.time + offset) % period) + period) % period;
    this.active = t < on;
  }
}

export const tileCenter = (tx: number): number => tx * TILE + TILE / 2;
