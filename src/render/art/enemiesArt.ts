import { shade } from './palette';
import type { Px } from './Px';
import { measureFootPad, sheet, type ArtAsset } from './sheet';

/** 6 frames per enemy: 0-3 move cycle, 4 attack, 5 hurt. Art faces RIGHT. */
export const ENEMY_FRAMES = 6;

interface Pal {
  a: string; // main
  b: string; // dark
  c: string; // light
  e: string; // eye / accent
  x?: string; // extra
}

const OL = '#140d0b';

function bug(px: Px, i: number, p: Pal, fw: number): void {
  const bob = i % 2;
  const gy = fw / 2 - 1; // ground row (art)
  // Legs.
  for (let k = 0; k < 3; k++) {
    const lx = 5 + k * 4 + (i < 4 ? ((i + k) % 2) : 0);
    px.line(lx, gy - 3, lx - 1, gy, p.b);
  }
  px.ellipse(10, gy - 6 - bob, 7, 4, p.a);
  px.ellipse(9, gy - 7 - bob, 5, 2, p.c);
  px.v(10, gy - 10 - bob, 7, p.b);
  px.disc(17, gy - 5 - bob, 2, p.b);
  px.p(18, gy - 6 - bob, i === 4 ? '#ff3a3a' : p.e);
  px.line(18, gy - 7 - bob, 21, gy - 9 - bob, p.b);
}

function snake(px: Px, i: number, p: Pal): void {
  const g = 11;
  const phase = (i * Math.PI) / 2;
  for (let x = 0; x < 13; x++) {
    const y = g - 2 + Math.round(Math.sin(x * 0.7 + phase) * 1.2);
    px.r(x, y, 2, 3, x % 4 === 0 ? p.c : p.a);
    px.p(x, y + 2, p.x ?? p.b);
  }
  const lift = i === 4 ? 4 : 2;
  px.r(12, g - 4 - lift, 3, 5, p.a);
  px.ellipse(16, g - 6 - lift, 3, 2, p.a);
  px.p(17, g - 7 - lift, p.e);
  if (i === 4) px.r(19, g - 5 - lift, 2, 1, '#ff3a3a');
  else px.p(19, g - 5 - lift, '#ff3a3a');
}

function totem(px: Px, i: number, p: Pal): void {
  px.r(4, 4, 12, 18, p.a).v(4, 4, 18, p.c).v(15, 4, 18, p.b);
  px.r(3, 2, 14, 3, p.c).h(3, 2, 14, shade(p.c, 0.1));
  px.r(6, 8, 3, 2, i === 4 ? '#ffffff' : p.e).r(11, 8, 3, 2, i === 4 ? '#ffffff' : p.e);
  px.r(7, 13, 6, i === 4 ? 4 : 2, p.b);
  px.r(2, 20, 16, 2, p.b);
  if (p.x) {
    px.r(5, 5, 2, 1, p.x).r(13, 17, 2, 1, p.x);
  }
}

function biped(px: Px, i: number, p: Pal, kind: string, tall: number): void {
  const g = tall - 1;
  const step = i < 4 ? [0, 2, 0, -2][i] as number : 0;
  const hip = g - 9;
  const sh = hip - 8;
  const cx = 12;
  px.line(cx - 1, hip, cx - 2 - step, g, p.b).line(cx - 2, hip, cx - 3 - step, g, p.b);
  px.line(cx + 1, hip, cx + 2 + step, g, p.a).line(cx + 2, hip, cx + 3 + step, g, p.a);
  px.r(cx - 3, sh, 7, 9, p.a).v(cx - 3, sh, 9, p.c).v(cx + 3, sh, 9, p.b);
  px.r(cx - 2, sh - 6, 6, 6, kind === 'mummy' ? p.c : p.a);
  px.p(cx + 2, sh - 4, p.e).p(cx + 3, sh - 4, p.e);
  const armY = i === 4 ? sh - 3 : sh + 5;
  px.line(cx + 3, sh + 1, cx + 7, armY, p.b).line(cx - 3, sh + 1, cx - 5, sh + 6 - step, p.b);
  if (kind === 'mummy') {
    for (let y = sh - 6; y < g; y += 3) px.h(cx - 3, y, 7, shade(p.c, -0.15));
  }
  if (kind === 'sand_warrior') {
    px.r(cx - 3, sh - 8, 8, 3, '#2f5ab3').h(cx - 3, sh - 8, 8, '#e0b040').v(cx - 4, sh - 6, 6, '#2f5ab3');
    px.line(cx + 7, armY - 8, cx + 7, armY + 6, '#a07a4a').p(cx + 7, armY - 9, '#dfe4ee');
  }
  if (kind === 'golem') {
    px.r(cx - 6, sh - 1, 13, 11, p.a).v(cx - 6, sh - 1, 11, p.c);
    px.r(cx - 3, sh + 1, 3, 4, p.x ?? '#b65cff').r(cx + 2, sh + 5, 2, 3, p.x ?? '#b65cff');
    px.r(cx - 8, sh, 3, 9, p.b).r(cx + 6, sh + (i === 4 ? -4 : 0), 3, 9, p.b);
  }
  if (kind === 'snow_guardian') {
    px.ellipse(cx, sh + 3, 7, 7, p.c).ellipse(cx, sh - 4, 5, 4, p.c);
    px.p(cx + 2, sh - 5, p.e).p(cx + 3, sh - 5, p.e).h(cx, sh - 2, 4, p.b);
  }
  if (kind === 'temple_knight') {
    px.r(cx - 3, sh - 7, 8, 7, '#e0b040').h(cx - 3, sh - 7, 8, '#fff2a8').r(cx + 1, sh - 5, 4, 1, '#1a1210');
    px.r(cx - 7, sh + 1, 4, 8, '#8fb6e0').v(cx - 7, sh + 1, 8, '#ffffff');
    px.line(cx + 7, armY - 9, cx + 7, armY + 3, '#dfe4ee').h(cx + 5, armY + 2, 5, '#e0b040');
  }
}

function quad(px: Px, i: number, p: Pal): void {
  const g = 13;
  const s = i < 4 ? [0, 1, 0, -1][i] as number : 0;
  px.line(5, g - 4, 4 + s, g, p.b).line(8, g - 4, 9 - s, g, p.a).line(14, g - 4, 13 - s, g, p.b).line(17, g - 4, 18 + s, g, p.a);
  px.ellipse(11, g - 6, 8, 3, p.a).h(4, g - 8, 14, p.c);
  for (let x = 5; x < 17; x += 3) px.line(x, g - 9, x + 1, g - 12 - ((x / 3) % 2), p.x ?? p.c);
  px.ellipse(19, g - 8 - (i === 4 ? 1 : 0), 3, 2, p.a);
  px.p(20, g - 9, p.e);
  if (i === 4) px.h(20, g - 6, 3, '#ffffff');
}

function bat(px: Px, i: number, p: Pal): void {
  const up = [0, -3, -1, 2][i % 4] as number;
  const cy = 7;
  px.ellipse(10, cy, 3, 3, p.a);
  px.p(9, cy - 1, p.e).p(11, cy - 1, p.e);
  px.p(8, cy - 4, p.a).p(12, cy - 4, p.a);
  for (let k = 1; k <= 7; k++) {
    const y = cy + Math.round((up * k) / 7) - (k > 3 ? 1 : 0);
    px.v(10 - 2 - k, y, 2, p.b).v(10 + 2 + k, y, 2, p.b);
  }
  px.p(3, cy + up, p.c).p(17, cy + up, p.c);
  if (i === 5) px.r(8, cy - 1, 5, 2, '#ffffff');
}

function blob(px: Px, i: number, p: Pal): void {
  const g = 13;
  const sq = i % 2;
  px.ellipse(10, g - 5 + sq, 7 + sq, 5 - sq, p.a);
  px.ellipse(10, g - 6 + sq, 5, 3, p.c);
  for (let k = 0; k < 4; k++) px.p(5 + k * 3, g - 11 + ((i + k) % 3), p.x ?? p.c);
  px.r(8, g - 7, 2, 2, '#1a1210').r(12, g - 7, 2, 2, '#1a1210').p(9, g - 7, p.e).p(13, g - 7, p.e);
}

function toad(px: Px, i: number, p: Pal): void {
  const g = 16;
  px.ellipse(11, g - 6, 9, 6, p.a).ellipse(11, g - 8, 7, 3, p.c);
  px.r(4, g - 2, 4, 2, p.b).r(15, g - 2, 4, 2, p.b);
  px.disc(15, g - 12, 2, p.b).p(15, g - 12, p.e);
  px.h(12, g - 5, 8, i === 4 ? '#ffb31f' : p.b);
  if (i === 4) px.r(18, g - 7, 3, 3, '#ffb31f');
  for (let k = 0; k < 3; k++) px.p(7 + k * 4, g - 10, p.x ?? '#ff5a1f');
}

function orb(px: Px, i: number, p: Pal): void {
  px.disc(10, 10, 5, p.a).disc(9, 9, 3, p.c).p(8, 8, '#ffffff');
  const a = (i * Math.PI) / 4;
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + a;
    px.p(10 + Math.round(Math.cos(t) * 8), 10 + Math.round(Math.sin(t) * 3), p.e);
  }
}

function bird(px: Px, i: number, p: Pal): void {
  const up = [2, -2, -4, 0][i % 4] as number;
  px.ellipse(12, 9, 5, 3, p.a).disc(17, 7, 2, p.a).p(18, 6, p.e).h(19, 7, 2, '#e0b040');
  px.line(12, 8, 5, 8 + up, p.c).line(12, 7, 6, 6 + up, p.c).line(11, 9, 4, 10 + up, p.b);
  px.line(7, 10, 3, 13, p.b);
}

interface EnemyArtDef {
  fw: number;
  fh: number;
  pal: Pal;
  draw: (px: Px, i: number, p: Pal) => void;
}

const DEFS: Record<string, EnemyArtDef> = {
  snake: { fw: 48, fh: 32, pal: { a: '#4f9a3a', b: '#2a5a1f', c: '#a6dd5a', e: '#ffd35a', x: '#e8d070' }, draw: (px, i, p) => snake(px, i, p) },
  beetle: { fw: 48, fh: 32, pal: { a: '#2f6a5a', b: '#153a30', c: '#6fd0b0', e: '#ffd35a' }, draw: (px, i, p) => bug(px, i, p, 32) },
  guardian: { fw: 40, fh: 48, pal: { a: '#6b6a4c', b: '#403f2c', c: '#8f8c66', e: '#7cf2c9', x: '#5da83a' }, draw: (px, i, p) => totem(px, i, p) },
  scarab: { fw: 48, fh: 32, pal: { a: '#2a6ad0', b: '#123a80', c: '#ffd35a', e: '#ffffff' }, draw: (px, i, p) => bug(px, i, p, 32) },
  mummy: { fw: 48, fh: 56, pal: { a: '#d8ccaa', b: '#8a7a5a', c: '#efe6cc', e: '#ff5a3a' }, draw: (px, i, p) => biped(px, i, p, 'mummy', 28) },
  sand_warrior: { fw: 48, fh: 56, pal: { a: '#c98a4a', b: '#7a4a1e', c: '#e8b870', e: '#ffffff' }, draw: (px, i, p) => biped(px, i, p, 'sand_warrior', 28) },
  crystal_creature: { fw: 48, fh: 32, pal: { a: '#5a61a8', b: '#2a2f55', c: '#8b93d6', e: '#e0a8ff', x: '#b65cff' }, draw: (px, i, p) => quad(px, i, p) },
  cave_bat: { fw: 40, fh: 32, pal: { a: '#4a3a6a', b: '#2a1f40', c: '#8a7ab0', e: '#ff3a5a' }, draw: (px, i, p) => bat(px, i, p) },
  golem: { fw: 56, fh: 64, pal: { a: '#5a61a8', b: '#2a2f55', c: '#8b93d6', e: '#4dc3ff', x: '#b65cff' }, draw: (px, i, p) => biped(px, i, p, 'golem', 32) },
  fire_creature: { fw: 40, fh: 32, pal: { a: '#ff5a1f', b: '#a82a0a', c: '#ffb31f', e: '#fffbe0', x: '#ffd35a' }, draw: (px, i, p) => blob(px, i, p) },
  lava_beast: { fw: 48, fh: 40, pal: { a: '#4f3530', b: '#2e1d1a', c: '#7a5a52', e: '#ffb31f', x: '#ff5a1f' }, draw: (px, i, p) => toad(px, i, p) },
  fire_bat: { fw: 40, fh: 32, pal: { a: '#c8401a', b: '#6a1a0a', c: '#ffb31f', e: '#fffbe0' }, draw: (px, i, p) => bat(px, i, p) },
  ice_creature: { fw: 48, fh: 32, pal: { a: '#86b8de', b: '#4a77a8', c: '#e4f4ff', e: '#1a3a70', x: '#ffffff' }, draw: (px, i, p) => quad(px, i, p) },
  frost_bat: { fw: 40, fh: 32, pal: { a: '#6f9cc6', b: '#3a5f8a', c: '#dff4ff', e: '#ffffff' }, draw: (px, i, p) => bat(px, i, p) },
  snow_guardian: { fw: 56, fh: 64, pal: { a: '#e4f4ff', b: '#86b8de', c: '#ffffff', e: '#2a6ad0' }, draw: (px, i, p) => biped(px, i, p, 'snow_guardian', 32) },
  celestial: { fw: 40, fh: 40, pal: { a: '#ffe28a', b: '#c9971f', c: '#fffbe0', e: '#b65cff' }, draw: (px, i, p) => orb(px, i, p) },
  flying_guardian: { fw: 48, fh: 40, pal: { a: '#e0b040', b: '#8a6a20', c: '#fff2a8', e: '#4dc3ff' }, draw: (px, i, p) => bird(px, i, p) },
  temple_knight: { fw: 48, fh: 64, pal: { a: '#f6f0e0', b: '#a8a08a', c: '#ffffff', e: '#4dc3ff' }, draw: (px, i, p) => biped(px, i, p, 'temple_knight', 32) },
};

export function enemyArtSize(kind: string): { fw: number; fh: number } {
  const d = DEFS[kind];
  return d ? { fw: d.fw, fh: d.fh } : { fw: 48, fh: 48 };
}

export function enemyAssets(): ArtAsset[] {
  return Object.entries(DEFS).map(([kind, d]) => {
    const a = sheet(`enemy_${kind}`, d.fw, d.fh, ENEMY_FRAMES, (px, i) => {
      d.draw(px, i, d.pal);
      if (i === 5) {
        px.ctx.globalCompositeOperation = 'source-atop';
        px.ctx.fillStyle = 'rgba(255,255,255,0.55)';
        px.ctx.fillRect(0, 0, d.fw, d.fh);
        px.ctx.globalCompositeOperation = 'source-over';
      }
    }, { outline: OL });
    a.footPad = measureFootPad(a);
    return a;
  });
}
