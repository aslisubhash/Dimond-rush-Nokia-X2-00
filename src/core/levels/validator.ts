import { TILE } from '../constants';
import { expandDefs } from '../entities/registry';
import { compileLevel, type CompiledLevel, type EntityDef } from './LevelLoader';
import { Tile } from './legend';
import type { BossCondition, LevelSpec } from './schema';

export interface ValidationIssue {
  level: string;
  severity: 'error' | 'warning';
  message: string;
}

const PICKUP_TYPES = new Set(['crystal', 'coin', 'relic', 'temple_key', 'heart', 'heart_vessel', 'key', 'seal']);
const DOOR_TYPES = new Set(['locked_door', 'secret_door', 'gate', 'bridge', 'boss_gate', 'temple_door']);
const ZONE_TYPES = new Set(['secret_zone', 'hint', 'trigger_zone', 'water_body', 'lava_body', 'wind_source', 'water_current', 'sequence_lock', 'timer', 'boss']);

/** Jump envelope (tiles) used by the reachability search; matches playerConfig (≈3.8 tile apex). */
const JUMP_UP = 3;
function reach(dy: number): number {
  if (dy >= 3) return 3;
  if (dy >= 1) return 4;
  if (dy >= -2) return 5;
  return Math.min(8, 5 + Math.floor(-dy / 2));
}

interface Grid {
  cols: number;
  rows: number;
  solid: Uint8Array; // blocks the body
  support: Uint8Array; // can be stood upon (top surface)
  climb: Uint8Array;
  water: Uint8Array;
  deadly: Uint8Array;
}

function buildGrid(c: CompiledLevel, defs: EntityDef[], openSecrets: boolean): Grid {
  const { cols, rows } = c;
  const n = cols * rows;
  const g: Grid = { cols, rows, solid: new Uint8Array(n), support: new Uint8Array(n), climb: new Uint8Array(n), water: new Uint8Array(n), deadly: new Uint8Array(n) };
  const set = (arr: Uint8Array, x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < cols && y < rows) arr[y * cols + x] = 1;
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = c.tiles[y * cols + x] as Tile;
      const i = y * cols + x;
      if (t === Tile.Solid || t === Tile.Ice || t === Tile.Sand || (t === Tile.Secret && !openSecrets)) {
        g.solid[i] = 1;
        g.support[i] = 1;
      }
      if (t === Tile.OneWay) g.support[i] = 1;
      if (t === Tile.Ladder || t === Tile.Vine) g.climb[i] = 1;
      if (t === Tile.Spikes) g.deadly[i] = 1;
    }
  }
  const cellsOf = (e: EntityDef, fn: (x: number, y: number) => void): void => {
    for (let ty = Math.floor(e.y / TILE); ty <= Math.floor((e.y + e.h - 1) / TILE); ty++) for (let tx = Math.floor(e.x / TILE); tx <= Math.floor((e.x + e.w - 1) / TILE); tx++) fn(tx, ty);
  };
  for (const e of defs) {
    const p = e.props;
    switch (e.type) {
      case 'water_body': {
        const levels = Array.isArray(p['levels']) ? (p['levels'] as number[]) : [e.ty];
        const top = Math.min(...levels);
        for (let ty = top; ty < e.ty + e.h / TILE; ty++) for (let tx = e.tx; tx < e.tx + e.w / TILE; tx++) set(g.water, tx, ty);
        break;
      }
      case 'lava_body':
        if (!p['rising'] && !p['risingOnPower']) cellsOf(e, (x, y) => set(g.deadly, x, y));
        else cellsOf({ ...e, y: e.y + e.h - TILE, h: TILE }, (x, y) => set(g.deadly, x, y));
        break;
      case 'crumbling_block':
      case 'falling_platform':
      case 'bridge':
      case 'float_platform':
        cellsOf({ ...e, h: TILE }, (x, y) => set(g.support, x, y));
        if (e.type === 'float_platform') {
          // Rides any water body beneath it: support at every height up to the top water level.
          for (let ty = e.ty - 12; ty <= e.ty; ty++) for (let tx = e.tx; tx < e.tx + e.w / TILE; tx++) set(g.support, tx, ty);
        }
        break;
      case 'moving_platform':
      case 'wind_platform': {
        const path = Array.isArray(p['path']) ? (p['path'] as [number, number][]) : [];
        const pts: [number, number][] = [[0, 0], ...path];
        const solidFull = p['solid'] === 'full';
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i] as [number, number];
          const b = (pts[i + 1] ?? a) as [number, number];
          const steps = Math.max(1, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
          for (let k = 0; k <= steps; k++) {
            const ox = Math.round(a[0] + ((b[0] - a[0]) * k) / steps);
            const oy = Math.round(a[1] + ((b[1] - a[1]) * k) / steps);
            for (let tx = 0; tx < e.w / TILE; tx++) set(g.support, e.tx + ox + tx, e.ty + oy);
          }
        }
        if (solidFull) cellsOf(e, (x, y) => set(g.support, x, y));
        break;
      }
      case 'rotating_platform': {
        const r = typeof p['radius'] === 'number' ? p['radius'] : 3;
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const x = Math.round(e.tx + Math.cos(a) * r);
          const y = Math.round(e.ty + Math.sin(a) * r);
          set(g.support, x, y);
          set(g.support, x + 1, y);
        }
        break;
      }
      case 'shifting_sand':
        for (let ty = e.ty; ty < e.ty + e.h / TILE; ty++) for (let tx = e.tx; tx < e.tx + e.w / TILE; tx++) set(g.support, tx, ty);
        break;
      default:
        break;
    }
  }
  // Movable stones: every position they can be pushed / rolled to becomes a potential step.
  const solidT = (x: number, y: number): boolean => x < 0 || x >= cols || (y >= 0 && y < rows && !!g.solid[y * cols + x]);
  const supT = (x: number, y: number): boolean => y >= rows || (y >= 0 && x >= 0 && x < cols && !!g.support[y * cols + x]);
  for (const e of defs) {
    if (!['stone_block', 'crate', 'magnet_stone', 'face_stone', 'ice_block'].includes(e.type)) continue;
    const rolls = e.type === 'face_stone' || (e.type === 'ice_block' && e.props['slides'] !== false);
    const seen = new Set<number>();
    const stack: [number, number][] = [[e.tx, e.ty]];
    const land = (x: number, y: number): [number, number] => {
      let yy = y;
      while (yy + 1 < rows && !supT(x, yy + 1) && !solidT(x, yy + 1)) yy++;
      return [x, yy];
    };
    while (stack.length && seen.size < 400) {
      const [x, y] = stack.pop() as [number, number];
      const k = y * cols + x;
      if (seen.has(k)) continue;
      seen.add(k);
      set(g.support, x, y);
      for (const d of [-1, 1]) {
        if (!rolls) {
          if (!solidT(x + d, y)) stack.push(land(x + d, y));
          continue;
        }
        let cx = x;
        let cy = y;
        for (let n = 0; n < cols; n++) {
          if (solidT(cx + d, cy)) break;
          cx += d;
          if (!supT(cx, cy + 1) && !solidT(cx, cy + 1)) {
            const [lx, ly] = land(cx, cy);
            const slot = solidT(cx - 1, ly) && solidT(cx + 1, ly);
            cx = lx;
            cy = ly;
            if (slot) break;
          }
        }
        if (cx !== x || cy !== y) stack.push([cx, cy]);
      }
    }
  }
  return g;
}

/** Breadth-first search over body positions (x = column, y = row of the body's lower cell). */
function reachable(g: Grid, sx: number, sy: number): Uint8Array {
  const { cols, rows } = g;
  const idx = (x: number, y: number): number => y * cols + x;
  const inb = (x: number, y: number): boolean => x >= 0 && x < cols && y >= -4 && y < rows;
  const free = (x: number, y: number): boolean => {
    if (x < 0 || x >= cols) return false;
    if (y < 0) return true;
    if (y >= rows) return true;
    return !g.solid[idx(x, y)] && !g.deadly[idx(x, y)];
  };
  const clearBody = (x: number, y: number): boolean => free(x, y) && (free(x, y - 1) || true);
  const supported = (x: number, y: number): boolean => y + 1 < rows && y + 1 >= 0 && !!g.support[idx(x, y + 1)];
  const climbable = (x: number, y: number): boolean => y >= 0 && y < rows && (!!g.climb[idx(x, y)] || (y - 1 >= 0 && !!g.climb[idx(x, y - 1)]));
  const wet = (x: number, y: number): boolean => y >= 0 && y < rows && !!g.water[idx(x, y)];
  const seen = new Uint8Array(cols * (rows + 1));
  const out = new Uint8Array(cols * rows);
  const q: number[] = [];
  const push = (x: number, y: number): void => {
    if (!inb(x, y) || y < 0) return;
    const k = idx(x, y);
    if (seen[k]) return;
    if (!clearBody(x, y)) return;
    seen[k] = 1;
    out[k] = 1;
    q.push(k);
  };
  /** Drop from (x,y) straight down to the first support / water / climbable cell. */
  const fall = (x: number, y: number): void => {
    for (let yy = y; yy < rows; yy++) {
      if (!free(x, yy)) return;
      if (supported(x, yy) || wet(x, yy) || climbable(x, yy)) {
        push(x, yy);
        return;
      }
    }
  };
  push(sx, sy);
  if (!seen[idx(sx, sy)]) fall(sx, sy);
  while (q.length) {
    const k = q.shift() as number;
    const x = k % cols;
    const y = (k - x) / cols;
    const onGround = supported(x, y);
    const inWater = wet(x, y);
    const onClimb = climbable(x, y);
    // Walk / step off ledges.
    for (const d of [-1, 1]) {
      if (!free(x + d, y)) continue;
      if (supported(x + d, y) || wet(x + d, y) || climbable(x + d, y)) push(x + d, y);
      else if (onGround || onClimb) {
        // Falling with a little horizontal drift.
        for (let drift = 0; drift <= 2; drift++) {
          const fx = x + d * (1 + drift);
          let ok = true;
          for (let s = 1; s <= drift; s++) if (!free(x + d * (1 + s), y)) ok = false;
          if (ok) fall(fx, y);
        }
      }
    }
    // Climbing.
    if (onClimb) {
      push(x, y - 1);
      push(x, y + 1);
      if (!climbable(x, y - 1) && free(x, y - 1)) {
        // Pop onto the ledge at the top.
        for (const d of [-1, 0, 1]) if (supported(x + d, y - 1)) push(x + d, y - 1);
      }
    }
    // Swimming.
    if (inWater) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        if (wet(x + dx, y + dy) || supported(x + dx, y + dy)) push(x + dx, y + dy);
      }
      if (!wet(x, y - 1)) {
        // Surface: leap out like a jump of 2 tiles.
        for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (supported(x + dx, y + dy) && free(x + dx, y + dy)) push(x + dx, y + dy);
      }
    }
    // Jumping (from ground, ladders/vines and the water surface).
    if (onGround || onClimb) {
      let head = 0;
      while (head < JUMP_UP && free(x, y - 1 - head - 1)) head++;
      for (let dy = -10; dy <= head; dy++) {
        const r = reach(dy);
        for (let dx = -r; dx <= r; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = x + dx;
          const ty = y - dy;
          if (!inb(tx, ty) || ty < 0 || ty >= rows) continue;
          if (!(supported(tx, ty) || wet(tx, ty) || climbable(tx, ty))) continue;
          if (!free(tx, ty)) continue;
          // Arc check: rise in place, cross at apex row, then descend.
          const apex = y - Math.max(dy, 0) - (dy >= head ? 0 : 1);
          let ok = true;
          for (let yy = y; yy >= apex && ok; yy--) if (!free(x, yy)) ok = false;
          const step = dx > 0 ? 1 : -1;
          for (let xx = x; xx !== tx + step && ok; xx += step) if (!free(xx, apex)) ok = false;
          for (let yy = apex; yy <= ty && ok; yy++) if (!free(tx, yy)) ok = false;
          if (ok) push(tx, ty);
        }
      }
    }
  }
  return out;
}

/** Expand standing positions into the air space a jump can sweep (for mid-air collectibles). */
function airReach(g: Grid, r: Uint8Array): Uint8Array {
  const out = new Uint8Array(r);
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      if (!r[y * g.cols + x]) continue;
      for (let dy = 0; dy <= JUMP_UP + 1; dy++) {
        const yy = y - dy;
        if (yy < 0 || g.solid[yy * g.cols + x]) break;
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < g.cols && !g.solid[yy * g.cols + xx]) out[yy * g.cols + xx] = 1;
        }
      }
    }
  }
  return out;
}

function collectIds(spec: LevelSpec, defs: EntityDef[]): Set<string> {
  const ids = new Set(defs.map((d) => d.id));
  // Rotating ring children.
  for (const d of expandDefs(defs.map((x) => ({ ...x, props: { ...x.props }, requires: [...x.requires] })))) ids.add(d.id);
  void spec;
  return ids;
}

export function validateLevel(spec: LevelSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string): void => void issues.push({ level: spec.id, severity: 'error', message });
  const warn = (message: string): void => void issues.push({ level: spec.id, severity: 'warning', message });
  const c = compileLevel(spec);
  for (const e of c.errors) err(e);
  const defs = c.entities;
  const ids = collectIds(spec, defs);
  const byType = (t: string): EntityDef[] => defs.filter((d) => d.type === t);

  // Map shape.
  const widths = new Set(spec.map.map((r) => r.length));
  if (widths.size > 1) warn(`map rows have different widths: ${[...widths].join(', ')}`);

  // Spawn must not be inside collision.
  const sx = Math.floor(c.spawn.x / TILE);
  const sy = Math.floor((c.spawn.y - 1) / TILE);
  const solidAt = (x: number, y: number): boolean => {
    const t = c.tiles[y * c.cols + x];
    return t === Tile.Solid || t === Tile.Secret || t === Tile.Ice || t === Tile.Sand;
  };
  if (solidAt(sx, sy) || (sy > 0 && solidAt(sx, sy - 1))) err('player spawn is inside solid terrain');

  // Exit.
  const exits = byType('exit_gate');
  if (!exits.length) err('level has no exit gate');

  // Bounds & embedded collectibles.
  for (const d of defs) {
    if (ZONE_TYPES.has(d.type)) continue;
    if (d.x < 0 || d.y < -TILE * 4 || d.x + d.w > c.widthPx || d.y + d.h > c.heightPx) err(`${d.id} (${d.type}) lies outside the level bounds`);
    if (PICKUP_TYPES.has(d.type)) {
      const tx = Math.floor((d.x + d.w / 2) / TILE);
      const ty = Math.floor((d.y + d.h / 2) / TILE);
      if (tx < 0 || ty < 0 || tx >= c.cols || ty >= c.rows) err(`${d.id} has invalid coordinates`);
      else if (solidAt(tx, ty) && !d.props['hidden']) err(`${d.id} is embedded in solid terrain at ${tx},${ty}`);
    }
  }

  // Dependencies.
  for (const d of defs) {
    for (const r of d.requires) if (!ids.has(r)) err(`${d.id} requires unknown entity '${r}'`);
    const unless = d.props['unless'];
    if (Array.isArray(unless)) for (const r of unless as string[]) if (!ids.has(r)) err(`${d.id} 'unless' references unknown entity '${r}'`);
  }
  const actionTargets = new Set<string>();
  for (const t of spec.triggers ?? []) {
    if (t.source && !ids.has(t.source) && !spec.secrets.some((s) => s.id === t.source)) err(`trigger on ${t.on} has unknown source '${t.source}'`);
    for (const a of t.actions) {
      if (a.target) {
        actionTargets.add(a.target);
        if (!a.target.endsWith('*') && !ids.has(a.target) && a.type !== 'CHANGE_LEVEL_STATE') err(`trigger action ${a.type} targets unknown '${a.target}'`);
      }
    }
  }
  const boss = spec.boss;
  if (boss) {
    for (const g of boss.gates ?? []) {
      actionTargets.add(g);
      if (!ids.has(g)) err(`boss gate '${g}' does not exist`);
    }
    for (const a of boss.onDefeat ?? []) if (a.target) actionTargets.add(a.target);
    for (const ph of boss.phases) for (const a of [...(ph.enter ?? []), ...(ph.afterStun ?? [])]) if (a.target) actionTargets.add(a.target);
  }
  // Doors must be openable.
  const keys = byType('key').length;
  const lockedNoReq = byType('locked_door').filter((d) => !d.requires.length).length;
  if (lockedNoReq > keys) err(`${lockedNoReq} locked door(s) but only ${keys} key(s)`);
  for (const d of defs) {
    if (!DOOR_TYPES.has(d.type) || d.type === 'locked_door' || d.type === 'temple_door' || d.type === 'boss_gate') continue;
    if (!d.requires.length && !actionTargets.has(d.id) && !d.props['open']) err(`${d.id} (${d.type}) has no dependency and is never opened`);
  }
  for (const ex of exits) {
    if (ex.requires.length === 0) continue;
    for (const r of ex.requires) if (!ids.has(r)) err(`exit requires unknown '${r}'`);
  }
  // Sequence locks.
  for (const d of byType('sequence_lock')) {
    const order = Array.isArray(d.props['order']) ? (d.props['order'] as string[]) : [];
    if (!order.length) err(`${d.id} has an empty order`);
    for (const o of order) if (!ids.has(o)) err(`${d.id} order references unknown '${o}'`);
  }
  // Chest contents.
  for (const d of byType('chest')) {
    const cont = Array.isArray(d.props['contents']) ? (d.props['contents'] as string[]) : [];
    for (const o of cont) if (!ids.has(o)) err(`${d.id} contains unknown '${o}'`);
  }

  // Circular dependencies.
  const graph = new Map(defs.map((d) => [d.id, d.requires]));
  const state = new Map<string, number>();
  const visit = (id: string, stack: string[]): void => {
    const st = state.get(id) ?? 0;
    if (st === 2) return;
    if (st === 1) {
      const cyc = stack.slice(stack.indexOf(id));
      const intentional = cyc.some((x) => defs.find((d) => d.id === x)?.props['allowCycle']);
      if (!intentional) warn(`circular dependency: ${[...cyc, id].join(' → ')}`);
      return;
    }
    state.set(id, 1);
    for (const r of graph.get(id) ?? []) visit(r, [...stack, id]);
    state.set(id, 2);
  };
  for (const d of defs) visit(d.id, []);

  // Secrets.
  if (!spec.secrets.length) err('level has no secret');
  for (const s of spec.secrets) {
    if (!s.reward) err(`secret ${s.id} has no reward`);
    else if (!ids.has(s.reward)) err(`secret ${s.id} reward '${s.reward}' does not exist`);
    if (!s.clue || !s.why || !s.discoveryMethod) err(`secret ${s.id} is missing clue / why / discovery metadata`);
    const [rx, ry, rw, rh] = s.room;
    if (rx < 0 || ry < 0 || rx + rw > c.cols || ry + rh > c.rows) err(`secret ${s.id} room lies outside the level`);
    const reward = defs.find((d) => d.id === s.reward);
    const chest = defs.find((d) => d.type === 'chest' && Array.isArray(d.props['contents']) && (d.props['contents'] as string[]).includes(s.reward));
    const holder = chest ?? reward;
    if (holder) {
      const hx = holder.tx;
      const hy = holder.ty;
      if (hx < rx - 2 || hx > rx + rw + 1 || hy < ry - 2 || hy > ry + rh + 1) warn(`secret ${s.id} reward is not inside its secret room`);
    }
  }

  // Boss.
  if (spec.index === 8 && !boss) err('boss level (x-8) has no boss');
  if (boss) {
    if (!byType('boss').length) err('boss spec without boss entity');
    let damageable = false;
    boss.phases.forEach((ph, i) => {
      const u: BossCondition = ph.until;
      if ('hits' in u) {
        damageable = true;
        if (!ph.stunOn && !ph.exposed) err(`boss phase ${ph.id}: needs hits but the weak point is never exposed (no stunOn / exposed)`);
      }
      if ('signal' in u && !ids.has(u.signal)) err(`boss phase ${ph.id} waits for unknown signal '${u.signal}'`);
      if ('allSignals' in u) for (const sgl of u.allSignals) if (!ids.has(sgl)) err(`boss phase ${ph.id} waits for unknown signal '${sgl}'`);
      if (ph.stunOn && !ids.has(ph.stunOn)) err(`boss phase ${ph.id} stunOn unknown '${ph.stunOn}'`);
      for (const h of ph.hint ?? []) if (!ids.has(h)) err(`boss phase ${ph.id} hint unknown '${h}'`);
      void i;
    });
    if (!damageable) err('boss has no phase that requires hits — it can never be defeated by the player');
  }

  // Reachability.
  const g = buildGrid(c, defs, false);
  const r = reachable(g, sx, sy);
  const reached = (d: EntityDef): boolean => {
    for (let ty = Math.floor(d.y / TILE) - 1; ty <= Math.floor((d.y + d.h - 1) / TILE) + 1; ty++) {
      for (let tx = Math.floor(d.x / TILE) - 1; tx <= Math.floor((d.x + d.w - 1) / TILE) + 1; tx++) {
        if (tx >= 0 && ty >= 0 && tx < c.cols && ty < c.rows && r[ty * c.cols + tx]) return true;
      }
    }
    return false;
  };
  for (const ex of exits) if (!reached(ex)) err(`exit ${ex.id} is not reachable from the spawn`);
  const gs = buildGrid(c, defs, true);
  const rs = airReach(gs, reachable(gs, sx, sy));
  for (const d of defs) {
    if (d.type !== 'crystal' && d.type !== 'coin' && d.type !== 'chest') continue;
    if (d.props['hidden']) continue;
    let ok = reached(d);
    if (!ok) {
      for (let ty = d.ty - 1; ty <= d.ty + 1 && !ok; ty++) for (let tx = d.tx - 1; tx <= d.tx + 1 && !ok; tx++) if (tx >= 0 && ty >= 0 && tx < c.cols && ty < c.rows && rs[ty * c.cols + tx]) ok = true;
    }
    if (!ok) warn(`${d.id} (${d.type}) at ${d.tx},${d.ty} may be unreachable`);
  }
  for (const s of spec.secrets) {
    const [rx, ry, rw, rh] = s.room;
    let ok = false;
    for (let ty = ry; ty < ry + rh && !ok; ty++) for (let tx = rx; tx < rx + rw && !ok; tx++) if (rs[ty * c.cols + tx]) ok = true;
    if (!ok) warn(`secret ${s.id} room may be unreachable`);
  }
  // Collectible budget.
  const crystals = byType('crystal').length;
  if (!boss && (crystals < 3 || crystals > 8)) warn(`level has ${crystals} crystals (expected 3–8)`);
  return issues;
}

export function validateAll(levels: readonly LevelSpec[]): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const l of levels) {
    if (seen.has(l.id)) out.push({ level: l.id, severity: 'error', message: 'duplicate level id' });
    seen.add(l.id);
    out.push(...validateLevel(l));
  }
  // Three relic fragments per world.
  const worlds = new Map<string, number>();
  for (const l of levels) {
    const n = l.entities?.filter((e) => e.type === 'relic').length ?? 0;
    const m = Object.values(l.marks ?? {}).filter((e) => e.type === 'relic').length;
    worlds.set(l.world, (worlds.get(l.world) ?? 0) + n + m);
  }
  for (const [w, n] of worlds) {
    const count = levels.filter((l) => l.world === w).length;
    if (count === 8 && n !== 3) out.push({ level: w, severity: 'warning', message: `world ${w} has ${n} relic fragments (expected 3)` });
  }
  return out;
}
