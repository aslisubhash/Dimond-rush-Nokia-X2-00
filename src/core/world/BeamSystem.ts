import { TILE } from '../constants';
import { DIR_VEC, isBeamEmitter, Mirror, parseDir, type BeamDir } from '../entities/beams';
import type { Entity } from '../entities/Entity';
import { CrystalNode } from '../entities/switches';
import { LightReceiver } from '../entities/beams';
import type { WorldApi } from './WorldApi';

export interface BeamSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'light' | 'laser';
}

/** Something a beam can hit besides the standard receivers (bosses, etc). */
export interface BeamTarget {
  onBeam(world: WorldApi, kind: 'light' | 'laser'): boolean;
}

const MAX_CELLS = 160;
const MAX_BOUNCES = 16;

/**
 * Grid ray tracer for light and laser beams. Beams travel along tile centers,
 * turn 90° at mirrors, stop at walls and solid objects, and power receivers.
 */
export class BeamSystem {
  /** Active segments are `pool[0..count)`; objects are reused every step. */
  private readonly pool: BeamSegment[] = [];
  count = 0;
  private cellMap = new Map<number, Entity>();
  private cols = 0;

  init(world: WorldApi): void {
    this.cols = world.map.cols;
    this.cellMap.clear();
    for (const e of world.entities) {
      if (e instanceof Mirror || e instanceof LightReceiver || (e instanceof CrystalNode && e.props['beam'] !== false)) {
        const tx0 = Math.floor(e.x / TILE);
        const ty0 = Math.floor(e.y / TILE);
        const tx1 = Math.floor((e.x + e.w - 1) / TILE);
        const ty1 = Math.floor((e.y + e.h - 1) / TILE);
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) this.cellMap.set(ty * this.cols + tx, e);
      }
    }
  }

  update(world: WorldApi): void {
    this.count = 0;
    for (const e of world.entities) {
      if (e.removed) continue;
      if (isBeamEmitter(e) && e.emitting()) {
        this.trace(world, e, e.beamDir(), e.beamKind());
      } else if (e instanceof CrystalNode && e.active && typeof e.props['emit'] === 'string') {
        this.trace(world, e, parseDir(e.props['emit'] as string), 'light');
      }
    }
  }

  private solidEntityAt(world: WorldApi, px: number, py: number): boolean {
    for (const s of world.collision.solids) {
      if (s.solidKind() !== 'full') continue;
      if (px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h) return true;
    }
    return false;
  }

  private trace(world: WorldApi, src: Entity, dir: BeamDir, kind: 'light' | 'laser'): void {
    let tx = Math.floor(src.cx / TILE);
    let ty = Math.floor((src.y + TILE / 2) / TILE);
    let sx = tx * TILE + TILE / 2;
    let sy = ty * TILE + TILE / 2;
    let d = dir;
    let bounces = 0;
    const p = world.player;
    for (let i = 0; i < MAX_CELLS; i++) {
      const [dx, dy] = DIR_VEC[d] as [number, number];
      tx += dx;
      ty += dy;
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const endAtEdge = (): void => {
        this.push(sx, sy, cx - (dx * TILE) / 2, cy - (dy * TILE) / 2, kind, world);
      };
      if (ty < -1 || ty > world.map.rows + 1) {
        endAtEdge();
        return;
      }
      if (world.map.isSolid(tx, ty) || this.solidEntityAt(world, cx, cy)) {
        endAtEdge();
        return;
      }
      // Bosses and other targets.
      for (const e of world.entities) {
        const t = e as unknown as Partial<BeamTarget>;
        if (typeof t.onBeam === 'function' && !e.removed && cx >= e.x && cx < e.x + e.w && cy >= e.y && cy < e.y + e.h) {
          if (t.onBeam(world, kind)) {
            this.push(sx, sy, cx, cy, kind, world);
            return;
          }
        }
      }
      const hit = this.cellMap.get(ty * this.cols + tx);
      if (hit && hit !== src && !hit.removed) {
        if (hit instanceof Mirror) {
          this.push(sx, sy, cx, cy, kind, world);
          sx = cx;
          sy = cy;
          d = hit.reflect(d);
          if (++bounces > MAX_BOUNCES) return;
          continue;
        }
        if (kind === 'light') {
          if (hit instanceof LightReceiver) hit.lit = true;
          if (hit instanceof CrystalNode) hit.lit = true;
        } else if (hit instanceof LightReceiver && hit.bool('acceptLaser', false)) hit.lit = true;
        this.push(sx, sy, cx, cy, kind, world);
        return;
      }
      // Player blocks lasers (and gets hurt).
      if (kind === 'laser' && !p.dead && cx + 4 > p.x && cx - 4 < p.x + p.w && cy + 4 > p.y && cy - 4 < p.y + p.h) {
        this.push(sx, sy, dx !== 0 ? (dx > 0 ? p.x : p.x + p.w) : cx, dy !== 0 ? (dy > 0 ? p.y : p.y + p.h) : cy, kind, world);
        world.damagePlayer(1, cx - dx * 40, 'laser');
        return;
      }
    }
    this.push(sx, sy, tx * TILE + TILE / 2, ty * TILE + TILE / 2, kind, world);
  }

  get segments(): readonly BeamSegment[] {
    return this.pool.slice(0, this.count);
  }

  segmentAt(i: number): BeamSegment | undefined {
    return i < this.count ? this.pool[i] : undefined;
  }

  private push(x1: number, y1: number, x2: number, y2: number, kind: 'light' | 'laser', _world: WorldApi): void {
    let s = this.pool[this.count];
    if (!s) {
      s = { x1, y1, x2, y2, kind };
      this.pool.push(s);
    } else {
      s.x1 = x1;
      s.y1 = y1;
      s.x2 = x2;
      s.y2 = y2;
      s.kind = kind;
    }
    this.count++;
  }
}
