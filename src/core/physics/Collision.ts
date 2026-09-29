import { TILE } from '../constants';
import type { Rect } from '../util/math';
import type { TileMap } from './TileMap';

export type SolidKind = 'full' | 'top';

/** Anything that can block movement besides the tile grid (doors, blocks, platforms). */
export interface SolidProvider {
  readonly uid: number;
  x: number;
  y: number;
  w: number;
  h: number;
  solidKind(): SolidKind | null;
  /** Ice-like surfaces reduce friction for bodies standing on them. */
  surfaceFriction?(): number;
}

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
  /** Solid that stopped horizontal motion (null for tiles). */
  blockerX: SolidProvider | null;
  /** Solid that stopped vertical motion (null for tiles). */
  blockerY: SolidProvider | null;
}

export interface BodyLike extends Rect {
  /** When true, one-way platforms are ignored (dropping through). */
  dropThrough?: boolean;
}

const EPS = 0.001;

/**
 * Axis-separated AABB movement against the tile grid and a set of dynamic solids.
 * Deterministic: iteration order is the array order of `solids`.
 */
export class CollisionWorld {
  solids: SolidProvider[] = [];

  constructor(public map: TileMap) {}

  moveX(body: BodyLike, dx: number, ignore?: SolidProvider | null, out?: MoveResult): number {
    if (dx === 0) return 0;
    const res = out;
    let newX = body.x + dx;
    const top = body.y;
    const bottom = body.y + body.h - EPS;
    const ty0 = Math.floor(top / TILE);
    const ty1 = Math.floor(bottom / TILE);
    if (dx > 0) {
      const tx0 = Math.floor((body.x + body.w - EPS) / TILE);
      const tx1 = Math.floor((newX + body.w - EPS) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) {
        let hit = false;
        for (let ty = ty0; ty <= ty1; ty++) {
          if (this.map.isSolid(tx, ty)) {
            hit = true;
            break;
          }
        }
        if (hit && tx * TILE - body.w < newX) {
          newX = tx * TILE - body.w;
          if (res) {
            res.hitX = true;
            res.blockerX = null;
          }
          break;
        }
      }
      for (const s of this.solids) {
        if (s === ignore || s.solidKind() !== 'full') continue;
        if (s.y >= body.y + body.h - EPS || s.y + s.h <= body.y + EPS) continue;
        if (s.x >= body.x + body.w - 0.5 && newX + body.w > s.x) {
          newX = s.x - body.w;
          if (res) {
            res.hitX = true;
            res.blockerX = s;
          }
        }
      }
    } else {
      const tx0 = Math.floor(body.x / TILE);
      const tx1 = Math.floor(newX / TILE);
      for (let tx = tx0; tx >= tx1; tx--) {
        let hit = false;
        for (let ty = ty0; ty <= ty1; ty++) {
          if (this.map.isSolid(tx, ty)) {
            hit = true;
            break;
          }
        }
        if (hit && (tx + 1) * TILE > newX) {
          newX = (tx + 1) * TILE;
          if (res) {
            res.hitX = true;
            res.blockerX = null;
          }
          break;
        }
      }
      for (const s of this.solids) {
        if (s === ignore || s.solidKind() !== 'full') continue;
        if (s.y >= body.y + body.h - EPS || s.y + s.h <= body.y + EPS) continue;
        if (s.x + s.w <= body.x + 0.5 && newX < s.x + s.w) {
          newX = s.x + s.w;
          if (res) {
            res.hitX = true;
            res.blockerX = s;
          }
        }
      }
    }
    const moved = newX - body.x;
    body.x = newX;
    return moved;
  }

  moveY(body: BodyLike, dy: number, ignore?: SolidProvider | null, out?: MoveResult): number {
    if (dy === 0) return 0;
    const res = out;
    let newY = body.y + dy;
    const left = body.x;
    const right = body.x + body.w - EPS;
    const tx0 = Math.floor(left / TILE);
    const tx1 = Math.floor(right / TILE);
    if (dy > 0) {
      const oldBottom = body.y + body.h;
      const ty0 = Math.floor((oldBottom - EPS) / TILE);
      const ty1 = Math.floor((newY + body.h - EPS) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) {
        let hit = false;
        for (let tx = tx0; tx <= tx1; tx++) {
          const p = this.map.props(tx, ty);
          if (p.solid || (p.oneWay && !body.dropThrough && oldBottom <= ty * TILE + EPS)) {
            hit = true;
            break;
          }
        }
        if (hit && ty * TILE - body.h < newY) {
          newY = ty * TILE - body.h;
          if (res) {
            res.hitY = true;
            res.blockerY = null;
          }
          break;
        }
      }
      for (const s of this.solids) {
        if (s === ignore) continue;
        const kind = s.solidKind();
        if (!kind) continue;
        if (s.x >= body.x + body.w - EPS || s.x + s.w <= body.x + EPS) continue;
        if (kind === 'top' && body.dropThrough) continue;
        if (oldBottom <= s.y + 0.5 && newY + body.h > s.y) {
          newY = s.y - body.h;
          if (res) {
            res.hitY = true;
            res.blockerY = s;
          }
        }
      }
    } else {
      const ty0 = Math.floor(body.y / TILE);
      const ty1 = Math.floor(newY / TILE);
      for (let ty = ty0; ty >= ty1; ty--) {
        let hit = false;
        for (let tx = tx0; tx <= tx1; tx++) {
          if (this.map.isSolid(tx, ty)) {
            hit = true;
            break;
          }
        }
        if (hit && (ty + 1) * TILE > newY) {
          newY = (ty + 1) * TILE;
          if (res) {
            res.hitY = true;
            res.blockerY = null;
          }
          break;
        }
      }
      for (const s of this.solids) {
        if (s === ignore || s.solidKind() !== 'full') continue;
        if (s.x >= body.x + body.w - EPS || s.x + s.w <= body.x + EPS) continue;
        if (s.y + s.h <= body.y + 0.5 && newY < s.y + s.h) {
          newY = s.y + s.h;
          if (res) {
            res.hitY = true;
            res.blockerY = s;
          }
        }
      }
    }
    const moved = newY - body.y;
    body.y = newY;
    return moved;
  }

  /** True if the rectangle overlaps any solid tile or full solid (used for crush / spawn checks). */
  overlapsSolid(r: Rect, ignore?: SolidProvider | null): SolidProvider | 'tile' | null {
    const tx0 = Math.floor((r.x + EPS) / TILE);
    const tx1 = Math.floor((r.x + r.w - EPS) / TILE);
    const ty0 = Math.floor((r.y + EPS) / TILE);
    const ty1 = Math.floor((r.y + r.h - EPS) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.map.isSolid(tx, ty)) return 'tile';
      }
    }
    for (const s of this.solids) {
      if (s === ignore || s.solidKind() !== 'full') continue;
      if (r.x < s.x + s.w - EPS && r.x + r.w > s.x + EPS && r.y < s.y + s.h - EPS && r.y + r.h > s.y + EPS) return s;
    }
    return null;
  }

  /** What the body is standing on (probe 1px below its feet). */
  groundBelow(body: BodyLike, ignore?: SolidProvider | null): { solid: SolidProvider | null; tile: boolean } | null {
    const y = body.y + body.h + 0.5;
    const tx0 = Math.floor((body.x + EPS) / TILE);
    const tx1 = Math.floor((body.x + body.w - EPS) / TILE);
    const ty = Math.floor(y / TILE);
    const onTileRow = Math.abs(ty * TILE - (body.y + body.h)) < 0.75;
    for (const s of this.solids) {
      if (s === ignore) continue;
      const kind = s.solidKind();
      if (!kind || (kind === 'top' && body.dropThrough)) continue;
      if (body.x < s.x + s.w - EPS && body.x + body.w > s.x + EPS && Math.abs(s.y - (body.y + body.h)) < 0.75) {
        return { solid: s, tile: false };
      }
    }
    if (onTileRow) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const p = this.map.props(tx, ty);
        if (p.solid || (p.oneWay && !body.dropThrough)) return { solid: null, tile: true };
      }
    }
    return null;
  }
}
