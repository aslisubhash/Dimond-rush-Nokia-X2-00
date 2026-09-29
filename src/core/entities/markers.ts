import { overlaps, pointInRect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from './Entity';

/** Ancient totem. Touching it stores the respawn point and restores health. */
export class Checkpoint extends Entity {
  override update(world: WorldApi, dt: number): void {
    this.anim += dt;
    if (this.active) return;
    const p = world.player;
    if (!p.dead && overlaps({ x: this.x + 4, y: this.y, w: this.w - 8, h: this.h }, p)) {
      this.active = true;
      world.setCheckpoint(this.id, this.cx, this.y + this.h);
      world.fire('CHECKPOINT', this.id);
      world.emit({ kind: 'sound', id: 'checkpoint', x: this.cx, y: this.cy });
      world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.y + 8, count: 24, color: 0x7cf2c9 });
      world.emit({ kind: 'toast', textKey: 'toast.checkpoint' });
    }
  }
}

/** Entering this rectangle discovers the level's secret. */
export class SecretZone extends Entity {
  override update(world: WorldApi): void {
    if (this.active) return;
    const p = world.player;
    if (!p.dead && pointInRect(p.x + p.w / 2, p.y + p.h / 2, this)) {
      this.active = true;
      world.markSecretFound(this.str('secretId', this.id));
    }
  }
}

/** Contextual tutorial text while the player stands inside. */
export class HintZone extends Entity {
  inside = false;
  override update(world: WorldApi): void {
    const p = world.player;
    const now = !p.dead && pointInRect(p.x + p.w / 2, p.y + p.h / 2, this);
    if (now !== this.inside) {
      this.inside = now;
      world.showHint(now ? this.str('textKey', '') : null);
    }
  }
}

/**
 * Pure environmental-storytelling marker (ripple, crack, odd moss, wrong-way torch…).
 * Rendered by the view layer; it has no collision.
 */
export class Clue extends Entity {
  override update(_world: WorldApi, dt: number): void {
    this.anim += dt;
  }
}
