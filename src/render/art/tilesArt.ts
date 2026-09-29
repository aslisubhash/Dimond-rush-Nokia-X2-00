import type { WorldId } from '../../core/types';
import { hash2 } from '../../core/util/math';
import { PALETTES, mix, shade, type WorldPalette } from './palette';
import { makeCanvas, Px } from './Px';

export const TILESET_COLS = 16;
export const TILESET_ROWS = 5;

/** Tile indices inside a generated world tileset. */
export const TI = {
  terrainA: 0,
  terrainB: 16,
  secret: 32,
  oneWay: 48,
  oneWayL: 49,
  oneWayR: 50,
  ladder: 51,
  vine: 52,
  spikes: 53,
  iceTop: 54,
  ice: 55,
  sandTop: 56,
  sand: 57,
  quickTop: 58,
  quick: 59,
  back: 60, // 60..63
  backEdge: 64, // 64..65
  backDark: 66, // 66..67 (behind terrain edges / shadowed)
  crumble: 68,
} as const;

const T = 16; // art px per tile

function brickPattern(px: Px, pal: WorldPalette, world: WorldId, seed: number, variant: number): void {
  const [hi, lt, md, dk] = pal.stone;
  px.r(0, 0, T, T, md);
  if (world === 'crystal' || world === 'volcano') {
    // Irregular rock with facets.
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const n = hash2(x >> 1, y >> 1, seed + variant * 17);
        px.p(x, y, n > 0.78 ? lt : n < 0.2 ? dk : md);
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(hash2(i, seed, 3) * 12) + 2;
      const y = Math.floor(hash2(seed, i, 5) * 12) + 2;
      px.r(x, y, 3, 1, hi);
      px.p(x, y + 1, lt);
    }
    if (world === 'volcano' && hash2(seed, variant, 44) > 0.55) {
      // Glowing cracks.
      let x = Math.floor(hash2(seed, 1, 9) * 14) + 1;
      for (let y = 4; y < 12; y++) {
        px.p(x, y, y % 3 === 0 ? '#ffb31f' : '#c8401a');
        if (hash2(x, y, seed) > 0.6) x += hash2(y, x, seed) > 0.5 ? 1 : -1;
        x = Math.max(1, Math.min(14, x));
      }
    } else if (world === 'crystal') {
      // Embedded crystal inclusions.
      if (hash2(seed, 7, 1) > 0.55) {
        const cx = 3 + Math.floor(hash2(seed, 2, 2) * 9);
        const cy = 4 + Math.floor(hash2(seed, 3, 2) * 8);
        px.r(cx, cy, 2, 3, pal.accent);
        px.p(cx, cy, '#f0d0ff');
        px.p(cx + 1, cy + 3, '#6f2fb8');
      }
    }
    return;
  }
  const big = world === 'desert' || world === 'sky';
  const bh = big ? 8 : 4;
  const bw = big ? 8 : 8;
  for (let row = 0; row < T / bh; row++) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col <= T / bw; col++) {
      const x0 = col * bw + off + (variant ? bw / 4 : 0);
      const y0 = row * bh;
      const n = hash2(col + seed, row + variant * 3, seed);
      const base = n > 0.7 ? lt : n < 0.25 ? mix(md, dk, 0.35) : md;
      px.r(x0, y0, bw - 1, bh - 1, base);
      px.h(x0, y0, bw - 1, n > 0.5 ? hi : lt);
      px.v(x0, y0, bh - 1, lt);
      px.h(x0, y0 + bh - 2, bw - 1, mix(base, dk, 0.4));
      // Mortar.
      px.h(x0, y0 + bh - 1, bw, dk);
      px.v(x0 + bw - 1, y0, bh, dk);
      if (world === 'jungle' && n > 0.82) {
        px.r(x0 + 1, y0 + 1, 2, 1, pal.cap[1]);
        px.p(x0 + 2, y0 + 2, pal.cap[2]);
      }
      if (world === 'desert' && n > 0.86) {
        // Hieroglyph notch.
        px.r(x0 + 2, y0 + 2, 1, 3, dk);
        px.r(x0 + 3, y0 + 3, 2, 1, dk);
      }
      if (world === 'ice' && n > 0.6) px.p(x0 + 2, y0 + 1, '#ffffff');
      if (world === 'sky' && n > 0.75) {
        px.h(x0 + 1, y0 + 3, bw - 3, '#e0b040');
      }
    }
  }
}

function terrainTile(px: Px, pal: WorldPalette, world: WorldId, mask: number, seed: number, variant: number, secret: boolean): void {
  brickPattern(px, pal, world, seed, variant);
  const [hi, , , dk] = pal.stone;
  const [c0, c1, c2] = pal.cap;
  if (secret) {
    // Subtly cleaner, brighter face — the classic "this wall looks different" tell.
    px.ctx.globalAlpha = 0.12;
    px.r(0, 0, T, T, '#ffffff');
    px.ctx.globalAlpha = 1;
  }
  if (mask & 8) px.v(0, 0, T, mix(hi, pal.stone[1], 0.5));
  if (mask & 2) px.v(T - 1, 0, T, dk);
  if (mask & 4) {
    px.h(0, T - 1, T, dk);
    px.h(0, T - 2, T, mix(pal.stone[2], dk, 0.5));
    // Hanging details under ledges.
    for (let x = 1; x < T - 1; x += 3) {
      const n = hash2(x, seed, 11);
      if (world === 'jungle' && n > 0.5) px.v(x, T - 2, 2 + Math.floor(n * 3) - 2, c2);
      if (world === 'ice' && n > 0.55) px.v(x, T - 2, 2, '#ffffff');
    }
  }
  if (mask & 1) {
    // Surface cap.
    if (world === 'jungle') {
      px.r(0, 0, T, 3, c1);
      px.h(0, 0, T, c0);
      for (let x = 0; x < T; x++) {
        const n = hash2(x, seed, 21);
        if (n > 0.45) px.v(x, 3, 1 + Math.floor(n * 3), n > 0.8 ? c2 : c1);
        if (n > 0.9) px.p(x, 0, '#e8ff9a');
      }
    } else if (world === 'desert') {
      px.r(0, 0, T, 3, c1);
      px.h(0, 0, T, c0);
      for (let x = 0; x < T; x++) if (hash2(x, seed, 22) > 0.6) px.p(x, 3, c2);
    } else if (world === 'crystal') {
      px.h(0, 0, T, pal.stone[1]);
      for (let i = 0; i < 2; i++) {
        const x = 2 + Math.floor(hash2(i, seed, 23) * 11);
        if (hash2(seed, i, 24) > 0.45) {
          const h = 2 + Math.floor(hash2(i, seed, 25) * 3);
          px.r(x, 0, 2, 1, c1);
          px.p(x, 0, c0);
          void h;
        }
      }
    } else if (world === 'volcano') {
      px.r(0, 0, T, 2, mix(pal.stone[1], c2, 0.4));
      px.h(0, 0, T, pal.stone[0]);
      for (let x = 0; x < T; x++) if (hash2(x, seed, 26) > 0.75) px.p(x, 1, c1);
    } else if (world === 'ice') {
      px.r(0, 0, T, 4, c0);
      px.h(0, 3, T, c1);
      for (let x = 0; x < T; x++) if (hash2(x, seed, 27) > 0.5) px.p(x, 4, c2);
      for (let x = 0; x < T; x += 5) px.p(x + Math.floor(hash2(x, seed, 28) * 4), 1, c2);
    } else {
      px.r(0, 0, T, 3, c1);
      px.h(0, 0, T, c0);
      for (let x = 0; x < T; x++) if (hash2(x, seed, 29) > 0.5) px.v(x, 3, 1, c2);
      px.h(0, 4, T, '#e0b040');
    }
  }
}

function backTile(px: Px, pal: WorldPalette, world: WorldId, seed: number, edge: boolean, dark: boolean): void {
  const [lt, md, dk] = pal.back;
  px.r(0, 0, T, T, md);
  const bh = world === 'desert' || world === 'sky' ? 8 : 4;
  for (let row = 0; row < T / bh; row++) {
    const off = row % 2 ? 4 : 0;
    for (let col = -1; col < 3; col++) {
      const x0 = col * 8 + off;
      const n = hash2(col + seed * 3, row, seed);
      px.r(x0, row * bh, 7, bh - 1, n > 0.72 ? lt : n < 0.2 ? dk : md);
      px.h(x0, row * bh + bh - 1, 8, dk);
      px.v(x0 + 7, row * bh, bh, dk);
    }
  }
  if (world === 'crystal' && hash2(seed, 5, 5) > 0.7) {
    px.r(6, 6, 2, 3, mix(pal.accent, md, 0.5));
  }
  if (world === 'volcano' && hash2(seed, 6, 6) > 0.6) px.p(4 + (seed % 8), 9, '#7a2a10');
  if (edge) {
    // Broken top edge.
    for (let x = 0; x < T; x++) {
      const h = Math.floor(hash2(x >> 1, seed, 31) * 5);
      px.v(x, 0, h, 'rgba(0,0,0,0)');
      px.ctx.clearRect(px.ox + x * px.s, px.oy, px.s, h * px.s);
      px.p(x, h, lt);
    }
  }
  if (dark) {
    px.ctx.globalAlpha = 0.35;
    px.r(0, 0, T, T, '#000000');
    px.ctx.globalAlpha = 1;
  }
}

function oneWayTile(px: Px, pal: WorldPalette, world: WorldId, part: 'mid' | 'l' | 'r'): void {
  const [a, b, c] = pal.platform;
  if (world === 'sky') {
    // Cloud puff.
    px.ellipse(8, 4, 8, 3, '#ffffff');
    px.h(1, 6, 14, '#dfeefc');
    px.h(3, 7, 10, '#c4dcf2');
    if (part === 'l') px.ctx.clearRect(px.ox, px.oy, 2 * px.s, 8 * px.s);
    if (part === 'r') px.ctx.clearRect(px.ox + 14 * px.s, px.oy, 2 * px.s, 8 * px.s);
    return;
  }
  px.r(0, 0, T, 5, b);
  px.h(0, 0, T, a);
  px.h(0, 4, T, c);
  for (let x = 3; x < T; x += 6) px.v(x, 1, 3, c);
  if (world === 'crystal') {
    px.h(0, 1, T, '#bfe4ff');
  }
  if (part === 'l') {
    px.r(0, 5, 3, 3, c);
    px.p(1, 5, b);
  }
  if (part === 'r') {
    px.r(13, 5, 3, 3, c);
    px.p(14, 5, b);
  }
  if (world === 'jungle') {
    px.p(5, 5, pal.cap[1]);
    px.v(10, 5, 2, pal.cap[2]);
  }
}

function spikesTile(px: Px, world: WorldId): void {
  const cols: Record<WorldId, [string, string, string]> = {
    jungle: ['#e6e0c8', '#a9a38a', '#5d5a4a'],
    desert: ['#fff2d0', '#c9b08a', '#6e5a3a'],
    crystal: ['#f3d6ff', '#b65cff', '#5a2a9a'],
    volcano: ['#5a4a4a', '#2e2222', '#ff5a1f'],
    ice: ['#ffffff', '#a9d8f5', '#4a77a8'],
    sky: ['#fff6cf', '#e0b040', '#8a6a20'],
  };
  const [hi, md, dk] = cols[world];
  for (let i = 0; i < 4; i++) {
    const x0 = i * 4;
    for (let y = 0; y < 8; y++) {
      const w = Math.max(1, Math.floor((y + 1) / 2));
      px.h(x0 + 2 - Math.floor(w / 2), 8 + y, w, y < 2 ? hi : md);
    }
    px.v(x0 + 1, 11, 5, dk);
  }
  px.h(0, 15, T, dk);
}

export function renderTileset(world: WorldId): HTMLCanvasElement {
  const pal = PALETTES[world];
  const canvas = makeCanvas(TILESET_COLS * 32, TILESET_ROWS * 32);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const px = new Px(ctx, 2);
  const at = (i: number): Px => px.at((i % TILESET_COLS) * 32, Math.floor(i / TILESET_COLS) * 32);
  for (let m = 0; m < 16; m++) {
    terrainTile(at(TI.terrainA + m), pal, world, m, 101 + m, 0, false);
    terrainTile(at(TI.terrainB + m), pal, world, m, 211 + m * 3, 1, false);
    terrainTile(at(TI.secret + m), pal, world, m, 101 + m, 0, true);
  }
  oneWayTile(at(TI.oneWay), pal, world, 'mid');
  oneWayTile(at(TI.oneWayL), pal, world, 'l');
  oneWayTile(at(TI.oneWayR), pal, world, 'r');
  // Ladder.
  const lp = at(TI.ladder);
  const wood = world === 'sky' ? ['#f6e7b8', '#c9971f'] : world === 'ice' ? ['#d8f1ff', '#6f9cc6'] : ['#a07a4a', '#5e4224'];
  lp.v(3, 0, T, wood[1] as string).v(4, 0, T, wood[0] as string).v(11, 0, T, wood[1] as string).v(12, 0, T, wood[0] as string);
  for (let y = 2; y < T; y += 5) lp.h(3, y, 10, wood[0] as string).h(3, y + 1, 10, wood[1] as string);
  // Vine.
  const vp = at(TI.vine);
  for (let y = 0; y < T; y++) {
    const x = 7 + Math.round(Math.sin(y * 0.8) * 1.5);
    vp.r(x, y, 2, 1, '#3f7a2a');
    if (y % 4 === 1) vp.r(x - 3, y, 3, 2, '#6fb84a').p(x - 3, y, '#a6dd5a');
    if (y % 4 === 3) vp.r(x + 2, y, 3, 2, '#5da83a').p(x + 4, y, '#a6dd5a');
  }
  spikesTile(at(TI.spikes), world);
  // Ice.
  const ip = at(TI.iceTop);
  ip.r(0, 0, T, T, '#a8dcf7').h(0, 0, T, '#ffffff').h(0, 1, T, '#dff4ff');
  ip.line(3, 4, 7, 10, '#e8f7ff').line(10, 3, 13, 8, '#e8f7ff');
  const ii = at(TI.ice);
  ii.r(0, 0, T, T, '#8cc6ec').line(2, 2, 6, 9, '#c4e6fa').line(9, 6, 14, 14, '#c4e6fa');
  ii.v(15, 0, T, '#5f93c0');
  // Sand.
  const sp = at(TI.sandTop);
  sp.r(0, 0, T, T, '#e8c270').h(0, 0, T, '#fbe4a4').h(0, 1, T, '#f6d58c');
  for (let i = 0; i < 12; i++) sp.p(Math.floor(hash2(i, 1, 41) * 16), 3 + Math.floor(hash2(1, i, 41) * 12), '#c99a52');
  const sn = at(TI.sand);
  sn.r(0, 0, T, T, '#d9aa5c');
  for (let i = 0; i < 14; i++) sn.p(Math.floor(hash2(i, 2, 42) * 16), Math.floor(hash2(2, i, 42) * 16), '#b88a45');
  const qt = at(TI.quickTop);
  qt.r(0, 2, T, 14, '#b8894a').h(0, 2, T, '#d9aa5c');
  for (let x = 0; x < T; x += 4) qt.h(x, 5 + (x % 8 ? 1 : 0), 3, '#9b6b33');
  const qi = at(TI.quick);
  qi.r(0, 0, T, T, '#a8773a');
  for (let y = 2; y < T; y += 4) qi.h((y * 3) % 8, y, 5, '#8a5f2a');
  for (let i = 0; i < 4; i++) backTile(at(TI.back + i), pal, world, 300 + i * 13, false, false);
  for (let i = 0; i < 2; i++) backTile(at(TI.backEdge + i), pal, world, 400 + i * 7, true, false);
  for (let i = 0; i < 2; i++) backTile(at(TI.backDark + i), pal, world, 500 + i * 7, false, true);
  // Crumbling block (used by entity view as texture too).
  const cp = at(TI.crumble);
  brickPattern(cp, pal, world, 777, 1);
  cp.line(3, 1, 7, 8, pal.stone[3]).line(7, 8, 5, 14, pal.stone[3]).line(7, 8, 12, 11, pal.stone[3]);
  void shade;
  return canvas;
}
