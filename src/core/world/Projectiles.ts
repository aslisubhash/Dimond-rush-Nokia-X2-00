import { overlaps } from '../util/math';
import type { ProjectileSpec, WorldApi } from './WorldApi';

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: string;
  gravity: number;
  life: number;
  age: number;
  ghost: boolean;
  damage: number;
}

const POOL_SIZE = 128;

/** Fixed-size pool; never allocates during gameplay. */
export class ProjectilePool {
  readonly items: Projectile[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.items.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 6, kind: '', gravity: 0, life: 0, age: 0, ghost: false, damage: 1 });
    }
  }

  spawn(s: ProjectileSpec): void {
    const p = this.items.find((i) => !i.active);
    if (!p) return;
    p.active = true;
    p.x = s.x;
    p.y = s.y;
    p.vx = s.vx;
    p.vy = s.vy;
    p.radius = s.radius;
    p.kind = s.kind;
    p.gravity = s.gravity ?? 0;
    p.life = s.life ?? 4;
    p.age = 0;
    p.ghost = s.ghost ?? false;
    p.damage = s.damage ?? 1;
  }

  clear(): void {
    for (const p of this.items) p.active = false;
  }

  update(world: WorldApi, dt: number): void {
    const pl = world.player;
    for (const p of this.items) {
      if (!p.active) continue;
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Floor-hugging waves follow the ground.
      if ((p.kind === 'sandwave' || p.kind === 'shockwave') && !world.map.isSolidAt(p.x, p.y + p.radius + 2)) p.life = 0;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      if (!p.ghost && world.map.isSolidAt(p.x, p.y)) {
        p.active = false;
        world.emit({ kind: 'particles', preset: impactPreset(p.kind), x: p.x, y: p.y, count: 8 });
        continue;
      }
      if (world.waterAt(p.x, p.y) && (p.kind === 'fireball' || p.kind === 'ember')) {
        p.active = false;
        world.emit({ kind: 'particles', preset: 'steam', x: p.x, y: p.y, count: 8 });
        continue;
      }
      const box = { x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 };
      if (pl.attackBox && overlaps(pl.attackBox, box) && p.kind !== 'sandwave' && p.kind !== 'shockwave') {
        p.active = false;
        world.emit({ kind: 'particles', preset: impactPreset(p.kind), x: p.x, y: p.y, count: 10 });
        world.emit({ kind: 'sound', id: 'deflect', x: p.x, y: p.y });
        continue;
      }
      if (!pl.dead && overlaps({ x: box.x + 2, y: box.y + 2, w: box.w - 4, h: box.h - 4 }, pl)) {
        p.active = false;
        world.damagePlayer(p.damage, p.x, p.kind);
        world.emit({ kind: 'particles', preset: impactPreset(p.kind), x: p.x, y: p.y, count: 10 });
      }
      if (p.y > world.level.heightPx + 100 || p.x < -100 || p.x > world.level.widthPx + 100) p.active = false;
    }
  }
}

function impactPreset(kind: string): string {
  switch (kind) {
    case 'fireball':
    case 'ember':
      return 'lava_spark';
    case 'ice':
    case 'snowball':
      return 'ice_shard';
    case 'shard':
      return 'crystal_pickup';
    case 'orb':
      return 'magic';
    case 'venom':
      return 'water_splash';
    default:
      return 'dust';
  }
}
