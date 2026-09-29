import { TILE } from '../constants';
import type { BossPhaseSpec, BossSpec } from '../levels/schema';
import { approach, clamp, type Rect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import type { Boss } from './Boss';

/** Kind-specific body/attack logic. The generic Boss controller owns phases and damage. */
export interface BossBrain {
  /** Pose numbers read by the renderer. */
  pose: Record<string, number>;
  reset(boss: Boss, world: WorldApi): void;
  update(boss: Boss, world: WorldApi, dt: number, pattern: string): void;
  canStun(boss: Boss): boolean;
  weakPoint(boss: Boss): Rect | null;
  hurtBoxes(boss: Boss, out: Rect[]): Rect[];
  bounds(boss: Boss): Rect;
  onPhase?(boss: Boss, world: WorldApi, phase: BossPhaseSpec): void;
}

function every(t: number, dt: number, period: number, offset = 0): boolean {
  return Math.floor((t - offset) / period) !== Math.floor((t - offset - dt) / period) && t - offset >= 0;
}

function aimAt(world: WorldApi, sx: number, sy: number, speed: number): { vx: number; vy: number } {
  const p = world.player;
  const dx = p.x + p.w / 2 - sx;
  const dy = p.y + p.h / 2 - sy;
  const d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}

function flashHint(boss: Boss, world: WorldApi, t: number, dt: number): void {
  const hint = boss.phase?.hint;
  if (!hint?.length) return;
  const cycle = hint.length * 0.8 + 2;
  const local = t % cycle;
  const prev = (t - dt) % cycle;
  for (let i = 0; i < hint.length; i++) {
    const at = 0.6 + i * 0.8;
    if (prev < at && local >= at) {
      const e = world.getEntity(hint[i] ?? '');
      if (e) {
        e.anim = 1;
        world.emit({ kind: 'particles', preset: 'echo', x: e.cx, y: e.cy, count: 1 });
        world.emit({ kind: 'sound', id: `chime_${e.num('pitch', i)}`, x: e.cx, y: e.cy, volume: 0.6 });
      }
      boss.brain.pose['hint'] = i + 1;
    }
  }
}

// ---------------------------------------------------------------- Serpent (1-8)

class SerpentBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  private lungeX = 0;
  private lungeY = 0;
  reset(b: Boss): void {
    this.t = 0;
    this.pose = { emerge: 0, headX: b.bx, headY: b.by + 40, mouth: 0, stunned: 0, facing: -1 };
  }
  canStun(): boolean {
    return (this.pose['emerge'] ?? 0) > 0.6;
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    const p = world.player;
    const px = p.x + p.w / 2;
    if (pattern === 'dormant' || pattern === 'intro') {
      P['emerge'] = pattern === 'intro' ? approach(P['emerge'] ?? 0, 1, dt * 0.8) : 0;
      P['headX'] = b.bx;
      P['headY'] = b.by - 170 * (P['emerge'] ?? 0) + 40;
      P['mouth'] = pattern === 'intro' ? 0.5 + 0.5 * Math.sin(b.anim * 10) : 0;
      return;
    }
    if (pattern === 'defeat') {
      P['emerge'] = approach(P['emerge'] ?? 0, 0, dt * 0.35);
      P['headY'] = approach(P['headY'] ?? b.by, b.by + 20, 60 * dt);
      P['stunned'] = 1;
      return;
    }
    if (pattern === 'stunned') {
      const sx = b.param('slumpX', 0) * TILE || b.bx - 180;
      const sy = b.param('slumpY', 0) * TILE || b.by - 30;
      P['headX'] = approach(P['headX'] ?? sx, sx, 400 * dt);
      P['headY'] = approach(P['headY'] ?? sy, sy, 400 * dt);
      P['stunned'] = 1;
      P['mouth'] = 0.2;
      P['emerge'] = 1;
      this.t = 0.8; // resume from the hover part of the cycle
      return;
    }
    P['stunned'] = 0;
    const spit = pattern === 'bite_spit';
    const period = spit ? 3.8 : 4.4;
    this.t += dt;
    const c = this.t % period;
    const hoverY = b.by - 170;
    const minX = b.bx - b.param('reach', 7) * TILE;
    const maxX = b.bx + 2 * TILE;
    if (c < 0.8) {
      P['emerge'] = c / 0.8;
      P['headX'] = approach(P['headX'] ?? b.bx, b.bx, 300 * dt);
      P['headY'] = b.by + 40 - (b.by + 40 - hoverY) * (P['emerge'] ?? 0);
      P['mouth'] = 0;
    } else if (c < 2.2) {
      P['emerge'] = 1;
      const tx = clamp(px + 90, minX + 60, maxX);
      P['headX'] = approach(P['headX'] ?? b.bx, tx, 110 * dt);
      P['headY'] = hoverY + Math.sin(this.t * 3) * 12;
      P['facing'] = px < (P['headX'] ?? 0) ? -1 : 1;
      if (spit && every(c, dt, 0.7, 0.9)) {
        const v = aimAt(world, P['headX'] ?? 0, P['headY'] ?? 0, 300);
        world.spawnProjectile({ x: P['headX'] ?? 0, y: (P['headY'] ?? 0) + 10, vx: v.vx, vy: v.vy - 160, radius: 8, kind: 'venom', gravity: 500, life: 3 });
        world.emit({ kind: 'sound', id: 'spit' });
      }
      this.lungeX = clamp(px, minX, maxX);
      this.lungeY = Math.min(p.y + p.h / 2, b.by - 10);
    } else if (c < 2.6) {
      P['mouth'] = approach(P['mouth'] ?? 0, 1, dt * 4);
      P['headY'] = approach(P['headY'] ?? hoverY, hoverY - 30, 120 * dt);
      if (c - dt < 2.2) world.emit({ kind: 'sound', id: 'hiss' });
    } else if (c < 3.0) {
      P['headX'] = approach(P['headX'] ?? 0, this.lungeX, 900 * dt);
      P['headY'] = approach(P['headY'] ?? 0, this.lungeY, 900 * dt);
      if (c - dt < 2.6) world.emit({ kind: 'sound', id: 'bite' });
    } else if (c < 3.6) {
      P['mouth'] = approach(P['mouth'] ?? 0, 0, dt * 4);
      P['headX'] = approach(P['headX'] ?? 0, b.bx - TILE, 260 * dt);
      P['headY'] = approach(P['headY'] ?? 0, hoverY, 260 * dt);
    } else {
      P['emerge'] = 1 - (c - 3.6) / (period - 3.6);
      P['headX'] = approach(P['headX'] ?? 0, b.bx, 300 * dt);
      P['headY'] = b.by + 40 - (b.by + 40 - hoverY) * (P['emerge'] ?? 0);
      if (c - dt < 3.6) world.emit({ kind: 'particles', preset: 'water_splash', x: b.bx, y: b.by, count: 16 });
    }
  }
  weakPoint(): Rect | null {
    return { x: (this.pose['headX'] ?? 0) - 22, y: (this.pose['headY'] ?? 0) - 22, w: 44, h: 40 };
  }
  hurtBoxes(b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    if ((this.pose['emerge'] ?? 0) < 0.3) return out;
    const hx = this.pose['headX'] ?? 0;
    const hy = this.pose['headY'] ?? 0;
    out.push({ x: hx - 24, y: hy - 18, w: 48, h: 36 });
    // Neck segments along the curve from base to head.
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const x = b.bx + (hx - b.bx) * t;
      const y = b.by + (hy - b.by) * t * t;
      if (y < b.by - 10) out.push({ x: x - 14, y: y - 14, w: 28, h: 28 });
    }
    return out;
  }
  bounds(): Rect {
    return { x: (this.pose['headX'] ?? 0) - 60, y: (this.pose['headY'] ?? 0) - 40, w: 120, h: 180 };
  }
}

// ---------------------------------------------------------------- Sand King (2-8)

class SandKingBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  private warnings: { x: number; t: number }[] = [];
  reset(): void {
    this.t = 0;
    this.warnings = [];
    this.pose = { arm: 0, slump: 0, glow: 0, awake: 0 };
  }
  canStun(): boolean {
    return true;
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    P['awake'] = approach(P['awake'] ?? 0, pattern === 'dormant' ? 0 : 1, dt);
    P['slump'] = approach(P['slump'] ?? 0, pattern === 'stunned' || pattern === 'defeat' ? 1 : 0, dt * 3);
    P['glow'] = 0.5 + 0.5 * Math.sin(b.anim * 3);
    if (pattern === 'dormant' || pattern === 'intro' || pattern === 'stunned' || pattern === 'defeat') {
      P['arm'] = approach(P['arm'] ?? 0, pattern === 'intro' ? 1 : 0, dt * 2);
      return;
    }
    this.t += dt;
    const wave = pattern === 'sand_wave' || pattern === 'both';
    const rain = pattern === 'sand_rain' || pattern === 'both';
    const period = pattern === 'both' ? 2.6 : 3.2;
    const c = this.t % period;
    P['arm'] = c < 0.6 ? c / 0.6 : Math.max(0, 1 - (c - 0.6) * 2);
    if (wave && every(this.t, dt, period, 0.6)) {
      world.spawnProjectile({ x: b.bx - 70, y: b.by - 16, vx: -250, vy: 0, radius: 14, kind: 'sandwave', life: 7 });
      world.emit({ kind: 'sound', id: 'sand_wave' });
    }
    if (rain && every(this.t, dt, period * 0.9, 0.3)) {
      const px = world.player.x + world.player.w / 2;
      for (const off of [-96, 0, 96]) this.warnings.push({ x: clamp(px + off, b.arenaRect.x + 32, b.arenaRect.x + b.arenaRect.w - 200), t: 0.7 });
      world.emit({ kind: 'sound', id: 'rumble', volume: 0.5 });
    }
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i]!;
      w.t -= dt;
      if (Math.floor(w.t * 20) % 3 === 0) world.emit({ kind: 'particles', preset: 'sand', x: w.x, y: b.arenaRect.y + 8, count: 1 });
      if (w.t <= 0) {
        world.spawnProjectile({ x: w.x, y: b.arenaRect.y + 12, vx: 0, vy: 120, radius: 12, kind: 'sand', gravity: 1400, life: 3 });
        this.warnings.splice(i, 1);
      }
    }
  }
  weakPoint(b: Boss): Rect | null {
    const s = this.pose['slump'] ?? 0;
    return { x: b.bx - 26, y: b.by - 118 + s * 40, w: 52, h: 44 };
  }
  hurtBoxes(b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    if ((this.pose['awake'] ?? 0) < 0.5) return out;
    out.push({ x: b.bx - 50, y: b.by - 70, w: 100, h: 70 });
    return out;
  }
  bounds(b: Boss): Rect {
    return { x: b.bx - 80, y: b.by - 190, w: 160, h: 190 };
  }
}

// ---------------------------------------------------------------- Crystal Titan (3-8)

class TitanBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  x = 0;
  reset(b: Boss): void {
    this.t = 0;
    this.x = b.bx;
    this.pose = { x: b.bx, walk: 0, arm: 0, kneel: 0, facing: -1, hint: 0, stomp: 0 };
  }
  canStun(): boolean {
    return true;
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    P['kneel'] = approach(P['kneel'] ?? 0, pattern === 'stunned' || pattern === 'defeat' ? 1 : 0, dt * 3);
    P['stomp'] = Math.max(0, (P['stomp'] ?? 0) - dt * 3);
    if (pattern === 'dormant' || pattern === 'intro' || pattern === 'stunned' || pattern === 'defeat') {
      P['x'] = this.x;
      return;
    }
    this.t += dt;
    flashHint(b, world, this.t, dt);
    const p = world.player;
    const px = p.x + p.w / 2;
    const dir = px < this.x ? -1 : 1;
    P['facing'] = dir;
    const minX = b.arenaRect.x + 90;
    const maxX = b.arenaRect.x + b.arenaRect.w - 90;
    const speed = pattern === 'shard_throw' ? 30 : 48;
    if (Math.abs(px - this.x) > 110) {
      this.x = clamp(this.x + dir * speed * dt, minX, maxX);
      P['walk'] = (P['walk'] ?? 0) + dt * 3;
    }
    P['x'] = this.x;
    if (every(this.t, dt, 3.6, 1.5)) {
      P['stomp'] = 1;
      world.emit({ kind: 'shake', intensity: 0.008, duration: 0.3 });
      world.emit({ kind: 'sound', id: 'stomp_heavy' });
      for (const d of [-1, 1]) world.spawnProjectile({ x: this.x + d * 50, y: b.by - 12, vx: d * 230, vy: 0, radius: 12, kind: 'shockwave', life: 3 });
    }
    if (pattern === 'shard_throw' && every(this.t, dt, 2.2, 0.8)) {
      const sx = this.x;
      const sy = b.by - 130;
      for (const spread of [-80, 0, 80]) {
        const tx = px + spread - sx;
        const t = 1.0;
        world.spawnProjectile({ x: sx, y: sy, vx: tx / t, vy: -350, radius: 8, kind: 'shard', gravity: 900, life: 3 });
      }
      world.emit({ kind: 'sound', id: 'crystal_throw' });
    }
  }
  weakPoint(b: Boss): Rect | null {
    const k = this.pose['kneel'] ?? 0;
    return { x: this.x - 30, y: b.by - 120 + k * 40, w: 60, h: 50 };
  }
  hurtBoxes(b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    out.push({ x: this.x - 44, y: b.by - 130, w: 88, h: 130 });
    return out;
  }
  bounds(b: Boss): Rect {
    return { x: this.x - 70, y: b.by - 170, w: 140, h: 170 };
  }
}

// ---------------------------------------------------------------- Dragons (4-8, 5-8)

class FireDragonBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  x = 0;
  y = 0;
  reset(b: Boss): void {
    this.t = 0;
    this.x = b.bx;
    this.y = b.by;
    this.pose = { x: b.bx, y: b.by, wing: 0, mouth: 0, grounded: 0, facing: -1, cool: 0 };
  }
  canStun(): boolean {
    return true;
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    const A = b.arenaRect;
    P['wing'] = (P['wing'] ?? 0) + dt * (pattern === 'grounded' ? 1 : 7);
    const p = world.player;
    const px = p.x + p.w / 2;
    if (pattern === 'dormant') {
      this.x = b.bx;
      this.y = b.by;
    } else if (pattern === 'intro') {
      this.x = approach(this.x, A.x + A.w / 2, 120 * dt);
      this.y = approach(this.y, A.y + 130, 120 * dt);
    } else if (pattern === 'grounded' || pattern === 'defeat') {
      P['grounded'] = approach(P['grounded'] ?? 0, 1, dt * 2);
      this.x = approach(this.x, A.x + A.w / 2 + 60, 240 * dt);
      this.y = approach(this.y, A.y + A.h - 70, 360 * dt);
      P['cool'] = approach(P['cool'] ?? 0, 1, dt);
      this.t += dt;
      if (pattern === 'grounded' && every(this.t, dt, 3.5, 1.5)) {
        world.spawnProjectile({ x: this.x - 70, y: this.y + 10, vx: -280, vy: 0, radius: 10, kind: 'fireball', life: 1.2 });
        world.emit({ kind: 'sound', id: 'fire_breath' });
      }
    } else {
      P['grounded'] = approach(P['grounded'] ?? 0, 0, dt * 2);
      this.t += dt;
      if (pattern === 'fly_across') {
        const u = (this.t * 0.35) % 2;
        const s = u < 1 ? u : 2 - u;
        const tx = A.x + 120 + (A.w - 240) * s;
        this.x = approach(this.x, tx, 520 * dt);
        this.y = A.y + 120 + Math.sin(this.t * 2.2) * 40 + Math.max(0, Math.sin(this.t * 0.7)) * 170;
        P['facing'] = u < 1 ? 1 : -1;
      } else {
        const tx = clamp(px, A.x + 140, A.x + A.w - 140);
        this.x = approach(this.x, tx, 90 * dt);
        this.y = approach(this.y, A.y + 110 + Math.sin(this.t * 1.5) * 25, 120 * dt);
        P['facing'] = px < this.x ? -1 : 1;
        const rate = pattern === 'cooling' ? 1.8 : pattern === 'lava_rise' ? 1.4 : 1.1;
        if (every(this.t, dt, rate, 0.5)) {
          const v = aimAt(world, this.x, this.y + 20, 320);
          world.spawnProjectile({ x: this.x + (P['facing'] ?? 1) * 50, y: this.y + 20, vx: v.vx, vy: v.vy, radius: 10, kind: 'fireball', life: 4 });
          world.emit({ kind: 'sound', id: 'fire_breath', volume: 0.7 });
          P['mouth'] = 1;
        }
      }
    }
    P['mouth'] = Math.max(0, (P['mouth'] ?? 0) - dt * 2);
    P['x'] = this.x;
    P['y'] = this.y;
  }
  weakPoint(): Rect | null {
    const f = this.pose['facing'] ?? -1;
    return { x: this.x + f * 70 - 28, y: this.y - 26, w: 56, h: 52 };
  }
  hurtBoxes(_b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    if ((this.pose['grounded'] ?? 0) > 0.5) return out;
    out.push({ x: this.x - 60, y: this.y - 30, w: 120, h: 60 });
    return out;
  }
  bounds(): Rect {
    return { x: this.x - 110, y: this.y - 70, w: 220, h: 140 };
  }
}

class IceDragonBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  x = 0;
  y = 0;
  perch = 0;
  reset(b: Boss): void {
    this.t = 0;
    this.perch = 0;
    this.x = b.bx;
    this.y = b.by;
    this.pose = { x: b.bx, y: b.by, wing: 0, breath: 0, grounded: 0, facing: -1 };
  }
  private perchPos(b: Boss): { x: number; y: number } {
    const key = this.perch === 0 ? 'A' : 'B';
    return { x: b.param(`perch${key}X`, b.bx / TILE) * TILE, y: b.param(`perch${key}Y`, b.by / TILE) * TILE };
  }
  canStun(): boolean {
    return true;
  }
  onPhase(b: Boss, _w: WorldApi, phase: BossPhaseSpec): void {
    if (phase.pattern === 'swap' || phase.pattern === 'blizzard') this.perch = phase.pattern === 'swap' ? 1 : 0;
    void b;
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    P['wing'] = (P['wing'] ?? 0) + dt * 4;
    if (pattern === 'dormant') return;
    if (pattern === 'stunned' || pattern === 'defeat') {
      const pp = this.perchPos(b);
      P['grounded'] = approach(P['grounded'] ?? 0, 1, dt * 3);
      this.y = approach(this.y, b.param('groundY', (b.arenaRect.y + b.arenaRect.h) / TILE) * TILE - 50, 500 * dt);
      this.x = approach(this.x, pp.x, 200 * dt);
    } else {
      P['grounded'] = approach(P['grounded'] ?? 0, 0, dt * 2);
      const pp = this.perchPos(b);
      this.x = approach(this.x, pp.x, 260 * dt);
      this.y = approach(this.y, pp.y + Math.sin(b.anim * 2) * 6, 260 * dt);
      const p = world.player;
      P['facing'] = p.x + p.w / 2 < this.x ? -1 : 1;
      if (pattern !== 'intro') {
        this.t += dt;
        const period = pattern === 'blizzard' ? 2.4 : 3.0;
        if (every(this.t, dt, period, 1)) {
          const f = P['facing'] ?? -1;
          const v = aimAt(world, this.x + f * 60, this.y, 300);
          for (const spread of [-0.22, 0, 0.22]) {
            const c = Math.cos(spread);
            const s = Math.sin(spread);
            world.spawnProjectile({ x: this.x + f * 60, y: this.y + 8, vx: v.vx * c - v.vy * s, vy: v.vx * s + v.vy * c, radius: 8, kind: 'ice', life: 3 });
          }
          P['breath'] = 1;
          world.emit({ kind: 'sound', id: 'frost_breath' });
        }
        if (pattern === 'blizzard' && every(this.t, dt, 1.1, 0.4)) {
          const x = b.arenaRect.x + 64 + ((this.t * 173.3) % (b.arenaRect.w - 128));
          world.spawnProjectile({ x, y: b.arenaRect.y + 8, vx: 0, vy: 60, radius: 8, kind: 'ice', gravity: 900, life: 3 });
        }
      }
    }
    P['breath'] = Math.max(0, (P['breath'] ?? 0) - dt * 2);
    P['x'] = this.x;
    P['y'] = this.y;
  }
  weakPoint(): Rect | null {
    const f = this.pose['facing'] ?? -1;
    return { x: this.x + f * 60 - 28, y: this.y - 30, w: 56, h: 56 };
  }
  hurtBoxes(_b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    out.push({ x: this.x - 56, y: this.y - 30, w: 112, h: 64 });
    return out;
  }
  bounds(): Rect {
    return { x: this.x - 110, y: this.y - 70, w: 220, h: 140 };
  }
}

// ---------------------------------------------------------------- Sky Deity (6-8)

class SkyDeityBrain implements BossBrain {
  pose: Record<string, number> = {};
  private t = 0;
  y = 0;
  reset(b: Boss): void {
    this.t = 0;
    this.y = b.by;
    this.pose = { form: 0, halo: 0, shield: 1, seal: 0, y: b.by, arms: 0 };
  }
  canStun(): boolean {
    return true;
  }
  onPhase(_b: Boss, world: WorldApi, phase: BossPhaseSpec): void {
    const order = ['barrage', 'pylons', 'beams', 'rings', 'expose', 'final'];
    this.pose['form'] = Math.max(0, order.indexOf(phase.id));
    world.emit({ kind: 'flash', color: 0xfff2c0, duration: 0.35 });
  }
  update(b: Boss, world: WorldApi, dt: number, pattern: string): void {
    const P = this.pose;
    P['halo'] = (P['halo'] ?? 0) + dt * (0.4 + (P['form'] ?? 0) * 0.15);
    P['arms'] = Math.sin(b.anim * 1.3);
    const form = P['form'] ?? 0;
    P['shield'] = approach(P['shield'] ?? 1, form >= 3 ? 0 : 1, dt);
    P['seal'] = approach(P['seal'] ?? 0, form >= 4 ? 1 : 0, dt * 0.8);
    const targetY = form >= 4 ? b.by + b.param('descend', 3) * TILE : b.by;
    this.y = approach(this.y, targetY + Math.sin(b.anim * 1.1) * 10, 60 * dt);
    P['y'] = this.y;
    if (pattern === 'dormant' || pattern === 'intro' || pattern === 'defeat' || pattern === 'expose') return;
    this.t += dt;
    const cx = b.bx;
    const cy = this.y - 40;
    const burst = (n: number, speed: number, rot: number): void => {
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        world.spawnProjectile({ x: cx, y: cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 8, kind: 'orb', life: 5, ghost: true });
      }
      world.emit({ kind: 'sound', id: 'celestial', volume: 0.7 });
    };
    if (pattern === 'barrage' && every(this.t, dt, 1.7)) burst(10, 150, this.t);
    if ((pattern === 'orbs' || pattern === 'rings') && every(this.t, dt, 2.2)) {
      const v = aimAt(world, cx, cy, 190);
      world.spawnProjectile({ x: cx, y: cy, vx: v.vx, vy: v.vy, radius: 9, kind: 'orb', life: 6, ghost: true });
      world.emit({ kind: 'sound', id: 'celestial', volume: 0.5 });
    }
    if (pattern === 'sweep' && every(this.t, dt, 0.35)) {
      const a = this.t * 1.3;
      for (const o of [0, Math.PI]) world.spawnProjectile({ x: cx, y: cy, vx: Math.cos(a + o) * 170, vy: Math.abs(Math.sin(a + o)) * 170, radius: 7, kind: 'orb', life: 5, ghost: true });
    }
    if (pattern === 'desperate' && every(this.t, dt, 2.4)) burst(8, 130, -this.t);
  }
  weakPoint(b: Boss): Rect | null {
    return { x: b.bx - 30, y: this.y - 70, w: 60, h: 60 };
  }
  hurtBoxes(_b: Boss, out: Rect[]): Rect[] {
    out.length = 0;
    return out;
  }
  bounds(b: Boss): Rect {
    return { x: b.bx - 150, y: this.y - 220, w: 300, h: 260 };
  }
}

export function createBrain(kind: BossSpec['kind']): BossBrain {
  switch (kind) {
    case 'serpent':
      return new SerpentBrain();
    case 'sand_king':
      return new SandKingBrain();
    case 'crystal_titan':
      return new TitanBrain();
    case 'fire_dragon':
      return new FireDragonBrain();
    case 'ice_dragon':
      return new IceDragonBrain();
    case 'sky_deity':
      return new SkyDeityBrain();
  }
}
