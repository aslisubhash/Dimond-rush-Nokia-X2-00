import { TILE } from '../constants';
import { DEFAULT_MARKS, DEFAULT_SIZE, FLUID_CHARS, TILE_CHARS, TOP_ANCHORED, Tile } from './legend';
import type { EntitySpec, EntityType, LevelSpec, LogicMode, Props } from './schema';

/** Runtime-ready entity definition. All geometry in logical pixels. */
export interface EntityDef {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Original tile coordinates of the top-left corner. */
  tx: number;
  ty: number;
  props: Props;
  requires: string[];
  logic: LogicMode;
  arena: boolean;
}

export interface CompiledLevel {
  spec: LevelSpec;
  cols: number;
  rows: number;
  tiles: Uint8Array;
  widthPx: number;
  heightPx: number;
  spawn: { x: number; y: number };
  entities: EntityDef[];
  /** Problems found while compiling (unknown characters, duplicate ids …). */
  errors: string[];
}

function sizeFor(spec: EntitySpec): [number, number] {
  const d = DEFAULT_SIZE[spec.type] ?? [1, 1];
  return [spec.w ?? d[0], spec.h ?? d[1]];
}

function toDef(spec: EntitySpec, id: string, tx: number, ty: number): EntityDef {
  const [w, h] = sizeFor(spec);
  return {
    id,
    type: spec.type,
    tx,
    ty,
    x: tx * TILE,
    y: ty * TILE,
    w: w * TILE,
    h: h * TILE,
    props: { ...(spec.props ?? {}) },
    requires: [...(spec.requires ?? [])],
    logic: spec.logic ?? 'and',
    arena: spec.arena ?? false,
  };
}

export function compileLevel(spec: LevelSpec): CompiledLevel {
  const errors: string[] = [];
  const rows = spec.map.length;
  const cols = spec.map.reduce((m, r) => Math.max(m, r.length), 0);
  const tiles = new Uint8Array(cols * rows);
  const fluid: (('water' | 'lava') | null)[] = new Array(cols * rows).fill(null);
  const marks: Record<string, EntitySpec> = { ...DEFAULT_MARKS, ...(spec.marks ?? {}) };
  let spawn: { x: number; y: number } | null = null;

  // First pass: count mark occurrences so repeated marks with explicit ids get suffixes.
  const markCounts = new Map<string, number>();
  for (const row of spec.map) {
    for (const ch of row) {
      const isOverride = !!spec.marks && ch in spec.marks;
      if (marks[ch] && (isOverride || (!(ch in TILE_CHARS) && !(ch in FLUID_CHARS)))) {
        markCounts.set(ch, (markCounts.get(ch) ?? 0) + 1);
      }
    }
  }

  const entities: EntityDef[] = [];
  const typeCounters = new Map<string, number>();
  const markSeen = new Map<string, number>();
  const autoId = (type: string): string => {
    const n = (typeCounters.get(type) ?? 0) + 1;
    typeCounters.set(type, n);
    return `${type}_${n}`;
  };

  for (let y = 0; y < rows; y++) {
    const row = spec.map[y] ?? '';
    for (let x = 0; x < cols; x++) {
      const ch = row[x] ?? ' ';
      const idx = y * cols + x;
      const override = spec.marks && ch in spec.marks;
      if (!override && ch in TILE_CHARS) {
        tiles[idx] = TILE_CHARS[ch] ?? Tile.Empty;
        continue;
      }
      if (!override && ch in FLUID_CHARS) {
        fluid[idx] = FLUID_CHARS[ch] ?? null;
        continue;
      }
      if (ch === 'P') {
        if (spawn) errors.push(`duplicate spawn 'P' at ${x},${y}`);
        spawn = { x: x * TILE + TILE / 2, y: (y + 1) * TILE };
        continue;
      }
      const m = marks[ch];
      if (!m) {
        errors.push(`unknown map character '${ch}' at ${x},${y}`);
        continue;
      }
      const seen = (markSeen.get(ch) ?? 0) + 1;
      markSeen.set(ch, seen);
      let id: string;
      if (m.id) id = (markCounts.get(ch) ?? 1) > 1 ? `${m.id}_${seen}` : m.id;
      else id = autoId(m.type);
      const [, h] = sizeFor(m);
      const ty = TOP_ANCHORED.has(m.type) ? y : y - h + 1;
      entities.push(toDef(m, id, x, ty));
      // Entities placed inside fluid keep the fluid region continuous.
      const left = row[x - 1];
      const above = y > 0 ? (spec.map[y - 1] ?? '')[x] : undefined;
      if ((left && FLUID_CHARS[left]) || (above && FLUID_CHARS[above])) {
        fluid[idx] = FLUID_CHARS[left ?? ''] ?? FLUID_CHARS[above ?? ''] ?? null;
      }
    }
  }

  // Flood-fill fluid characters into rectangular bodies.
  const visited = new Uint8Array(cols * rows);
  for (let i = 0; i < fluid.length; i++) {
    const kind = fluid[i];
    if (!kind || visited[i]) continue;
    let minX = cols;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;
    const stack = [i];
    visited[i] = 1;
    while (stack.length) {
      const c = stack.pop() as number;
      const cx = c % cols;
      const cy = (c - cx) / cols;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      const nb = [cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1, cy > 0 ? c - cols : -1, cy < rows - 1 ? c + cols : -1];
      for (const n of nb) {
        if (n >= 0 && !visited[n] && fluid[n] === kind) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }
    const type: EntityType = kind === 'water' ? 'water_body' : 'lava_body';
    entities.push(
      toDef({ type, w: maxX - minX + 1, h: maxY - minY + 1, props: { static: true } }, autoId(type), minX, minY),
    );
  }

  // Explicit entities.
  for (const e of spec.entities ?? []) {
    if (e.x === undefined || e.y === undefined) {
      errors.push(`entity ${e.id ?? e.type} has no position`);
      continue;
    }
    entities.push(toDef(e, e.id ?? autoId(e.type), e.x, e.y));
  }

  // Secrets and hints become zone entities.
  for (const s of spec.secrets) {
    const [x, y, w, h] = s.room;
    entities.push(toDef({ type: 'secret_zone', w, h, props: { secretId: s.id } }, `zone_${s.id}`, x, y));
  }
  for (const [i, hint] of (spec.hints ?? []).entries()) {
    const [x, y, w, h] = hint.rect;
    entities.push(toDef({ type: 'hint', w, h, props: { textKey: hint.textKey } }, `hint_${i + 1}`, x, y));
  }
  if (spec.boss) {
    entities.push(toDef({ type: 'boss', w: 1, h: 1, props: { kind: spec.boss.kind } }, 'boss', spec.boss.x, spec.boss.y));
  }

  // Resolve `outputs` sugar into `requires` on the targets.
  const byId = new Map<string, EntityDef>();
  for (const e of entities) {
    if (byId.has(e.id)) errors.push(`duplicate entity id '${e.id}'`);
    byId.set(e.id, e);
  }
  const outputSources: [string, string[]][] = [];
  const collectOutputs = (specs: EntitySpec[], resolveId: (s: EntitySpec, i: number) => string[]): void => {
    specs.forEach((s, i) => {
      if (s.outputs?.length) for (const id of resolveId(s, i)) outputSources.push([id, s.outputs]);
    });
  };
  collectOutputs(spec.entities ?? [], (s, i) => [s.id ?? entities.filter((e) => e.type === s.type)[i]?.id ?? '']);
  for (const [ch, m] of Object.entries(spec.marks ?? {})) {
    if (!m.outputs?.length) continue;
    const n = markCounts.get(ch) ?? 0;
    const ids = m.id ? (n > 1 ? Array.from({ length: n }, (_, k) => `${m.id}_${k + 1}`) : [m.id]) : [];
    if (!m.id) errors.push(`mark '${ch}' uses outputs but has no id`);
    outputSources.push(...ids.map((id): [string, string[]] => [id, m.outputs ?? []]));
  }
  for (const [src, outs] of outputSources) {
    for (const t of outs) {
      const target = byId.get(t);
      if (!target) errors.push(`'${src}' outputs to unknown entity '${t}'`);
      else if (!target.requires.includes(src)) target.requires.push(src);
    }
  }

  if (!spawn) {
    errors.push('level has no player spawn (P)');
    spawn = { x: TILE * 2, y: TILE * 2 };
  }

  return {
    spec,
    cols,
    rows,
    tiles,
    widthPx: cols * TILE,
    heightPx: rows * TILE,
    spawn,
    entities,
    errors,
  };
}
