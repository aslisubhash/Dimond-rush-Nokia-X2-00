import type { EntityDef } from '../levels/LevelLoader';
import { overlaps } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

type PickupKind = 'crystal' | 'coin' | 'relic' | 'temple_key' | 'heart_vessel' | 'key' | 'heart' | 'seal';

const SOUND: Record<PickupKind, string> = {
  crystal: 'crystal',
  coin: 'coin',
  relic: 'relic',
  temple_key: 'relic',
  heart_vessel: 'relic',
  key: 'key',
  heart: 'heart',
  seal: 'seal',
};

const PARTICLES: Record<PickupKind, string> = {
  crystal: 'crystal_pickup',
  coin: 'coin_pickup',
  relic: 'secret_found',
  temple_key: 'secret_found',
  heart_vessel: 'secret_found',
  key: 'coin_pickup',
  heart: 'heart_pickup',
  seal: 'secret_found',
};

/** Collectible item. Hitbox is shrunk to the item's visual center. */
export class Pickup extends Entity {
  readonly kind: PickupKind;
  /** Hidden pickups appear when their chest opens. */
  hidden: boolean;
  /** Spawned from a chest: pops upward and then homes to the player. */
  popTime = 0;
  vy = 0;
  baseY: number;
  collected = false;
  /** Revealed from a chest: flies to the player after popping. */
  homing = false;

  constructor(def: EntityDef) {
    super(def);
    this.kind = def.type as PickupKind;
    this.hidden = this.bool('hidden', false);
    const size = this.kind === 'coin' ? 16 : this.kind === 'heart' ? 18 : 22;
    this.x = def.x + (def.w - size) / 2;
    this.y = def.y + (def.h - size) / 2;
    this.w = size;
    this.h = size;
    this.baseY = this.y;
    this.anim = (def.tx * 0.37 + def.ty * 0.61) % 1;
  }

  /** Collected pickups from a previous run (save data) are removed at level start. */
  alreadyOwned = false;

  override update(world: WorldApi, dt: number): void {
    if (this.removed || this.hidden) return;
    this.anim += dt;
    if (this.popTime > 0) {
      this.popTime -= dt;
      this.vy += 900 * dt;
      this.y += this.vy * dt;
      if (this.popTime <= 0) this.baseY = this.y;
      return;
    }
    const p = world.player;
    if (this.homing && !p.dead) {
      const dx = p.x + p.w / 2 - this.cx;
      const dy = p.y + p.h / 2 - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(d / dt, 520);
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
    }
    if (!p.dead && overlaps(this, { x: p.x - 4, y: p.y - 2, w: p.w + 8, h: p.h + 4 })) this.collect(world);
  }

  collect(world: WorldApi): void {
    if (this.collected) return;
    if (this.kind === 'heart' && world.player.health >= world.player.maxHealth) return;
    this.collected = true;
    this.removed = true;
    world.collect(this.kind, this.id, this.num('amount', 1));
    world.emit({ kind: 'sound', id: SOUND[this.kind], x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: PARTICLES[this.kind], x: this.cx, y: this.cy, count: this.kind === 'coin' ? 8 : 16 });
    world.fire('ITEM_COLLECTED', this.id);
    if (this.kind === 'relic' || this.kind === 'temple_key' || this.kind === 'heart_vessel' || this.kind === 'seal') {
      world.emit({ kind: 'toast', textKey: `toast.${this.kind}` });
      world.emit({ kind: 'flash', color: 0xffffff, duration: 0.2 });
    }
  }

  reveal(world: WorldApi, delay: number): void {
    this.hidden = false;
    this.popTime = 0.45 + delay;
    this.vy = -420;
    this.homing = true;
    world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 4 });
  }
}

/** Chest: normal (coins/crystals), secret (relic), boss (seal), legendary (cosmetic). */
export class Chest extends Entity {
  opened = false;
  openAnim = 0;
  constructor(def: EntityDef) {
    super(def);
  }
  get variant(): string {
    return this.str('variant', 'normal');
  }
  /** Ids of hidden pickups released on opening. */
  get contents(): string[] {
    const c = this.props['contents'];
    return Array.isArray(c) ? (c as string[]) : [];
  }
  override interactPrompt(): string | null {
    if (this.opened) return null;
    if (this.requires.length && !this.powered) return null;
    return 'prompt.openChest';
  }
  override interact(world: WorldApi): void {
    if (this.opened) return;
    this.opened = true;
    this.active = true;
    this.touched = true;
    world.fire('CHEST_OPENED', this.id);
    world.emit({ kind: 'sound', id: 'chest_open', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: 'chest_open', x: this.cx, y: this.y + 4, count: 26, color: this.variant === 'secret' ? 0xc77dff : 0xffd166 });
    this.contents.forEach((id, i) => {
      const e = world.getEntity(id);
      if (e instanceof Pickup) {
        e.x = this.cx - e.w / 2 + (i - (this.contents.length - 1) / 2) * 14;
        e.y = this.y - 6;
        e.reveal(world, i * 0.06);
      }
    });
    const coins = this.num('coins', 0);
    if (coins > 0) world.collect('coin', `${this.id}_coins`, coins);
    const cosmetic = this.str('cosmetic', '');
    if (cosmetic) {
      world.collect('cosmetic', cosmetic);
      world.emit({ kind: 'toast', textKey: 'toast.cosmetic', params: { name: cosmetic } });
    }
  }
  override update(_world: WorldApi, dt: number): void {
    if (this.opened && this.openAnim < 1) this.openAnim = Math.min(1, this.openAnim + dt * 3);
  }
}

export class Key extends Pickup {}
