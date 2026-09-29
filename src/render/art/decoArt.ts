import { WORLD_ORDER, type WorldId } from '../../core/types';
import { PALETTES, mix, shade } from './palette';
import type { Px } from './Px';
import { sheet, type ArtAsset } from './sheet';

/** Decoration slots per world: tuft, plant, hanging, wall ornament, big prop, small detail. */
export const DECO = { tuft: 0, plant: 1, hang: 2, wall: 3, big: 4, small: 5 } as const;
export const DECO_SIZES: [number, number][] = [
  [32, 16],
  [32, 48],
  [16, 96],
  [32, 32],
  [64, 80],
  [16, 16],
];

function draw(px: Px, w: WorldId, slot: number): void {
  const p = PALETTES[w];
  const [c0, c1, c2] = p.cap;
  const [s0, s1, s2, s3] = p.stone;
  switch (w) {
    case 'jungle':
      if (slot === 0) for (let x = 0; x < 16; x++) px.v(x, 8 - ((x * 5) % 6), (x * 5) % 6, x % 2 ? c1 : c2).p(x, 8 - ((x * 5) % 6), c0);
      if (slot === 1) {
        for (let k = 0; k < 5; k++) px.line(8, 23, 1 + k * 3.5, 4 + Math.abs(k - 2) * 3, k % 2 ? c1 : c2);
        px.disc(4, 6, 1, '#ff6fae').disc(12, 5, 1, '#ffd35a');
      }
      if (slot === 2) for (let y = 0; y < 48; y++) {
        const x = 4 + Math.round(Math.sin(y * 0.3) * 2);
        px.p(x, y, c2);
        if (y % 5 === 0) px.r(x + 1, y, 2, 2, c1);
      }
      if (slot === 3) {
        px.disc(8, 8, 6, s2).disc(8, 8, 4, s1).r(5, 6, 2, 2, s3).r(9, 6, 2, 2, s3).h(6, 11, 4, s3);
        px.r(2, 2, 4, 2, c1);
      }
      if (slot === 4) {
        // Mossy guardian statue head.
        px.r(8, 10, 16, 30, s2).v(8, 10, 30, s1).r(4, 36, 24, 4, s3);
        px.r(10, 16, 4, 3, s3).r(18, 16, 4, 3, s3).r(14, 22, 4, 5, s3).h(11, 30, 10, s3);
        px.r(8, 8, 16, 4, c1).p(10, 12, c2).p(20, 13, c2).r(6, 3, 20, 6, s1);
      }
      if (slot === 5) px.disc(4, 4, 2, '#ff6fae').p(4, 4, '#ffd35a');
      break;
    case 'desert':
      if (slot === 0) px.ellipse(8, 7, 8, 2, '#f6d58c').h(1, 6, 14, '#fbe4a4');
      if (slot === 1) {
        px.r(4, 8, 8, 14, '#a8773a').ellipse(8, 8, 5, 2, '#c98a4a').r(3, 12, 10, 2, '#6b4520').r(5, 16, 6, 1, '#2f5ab3');
      }
      if (slot === 2) for (let y = 0; y < 48; y += 1) px.p(3 + (y % 2), y, 'rgba(0,0,0,0)');
      if (slot === 3) {
        px.r(1, 1, 14, 14, s2).r(2, 2, 12, 12, s1);
        px.disc(8, 5, 2, '#2f5ab3').v(8, 7, 5, s3).h(5, 8, 7, s3);
      }
      if (slot === 4) {
        px.r(10, 12, 12, 26, s1).v(10, 12, 26, s0).r(6, 6, 20, 7, s2).h(6, 6, 20, s0).r(4, 36, 24, 4, s3);
        px.r(13, 18, 6, 12, '#2f5ab3').h(13, 20, 6, '#e0b040');
      }
      if (slot === 5) px.r(3, 5, 4, 3, '#e0b040').p(4, 4, '#fff2a8');
      break;
    case 'crystal':
      if (slot === 0) for (let k = 0; k < 4; k++) px.r(2 + k * 4, 8 - (k % 3) * 2, 2, (k % 3) * 2, k % 2 ? c1 : '#4dc3ff');
      if (slot === 1) {
        px.v(8, 8, 16, '#4a7fd0').ellipse(8, 7, 6, 3, '#4dc3ff').ellipse(8, 6, 4, 2, '#9fe6ff');
      }
      if (slot === 2) for (let y = 0; y < 30; y++) px.h(8 - Math.max(0, 3 - y / 10), y, Math.max(1, 6 - y / 5), y > 26 ? c1 : s2);
      if (slot === 3) px.r(6, 4, 3, 10, c1).p(6, 4, c0).r(10, 7, 2, 7, '#4dc3ff').r(3, 9, 2, 5, c2);
      if (slot === 4) {
        const cols = [c1, '#4dc3ff', c2, c0];
        for (let k = 0; k < 5; k++) {
          const x = 4 + k * 5;
          const h = 14 + ((k * 7) % 4) * 5;
          px.r(x, 40 - h, 4, h, cols[k % 4] as string).p(x, 40 - h, '#ffffff').v(x + 3, 40 - h, h, shade(cols[k % 4] as string, -0.25));
        }
      }
      if (slot === 5) px.r(6, 6, 2, 4, '#4dc3ff').p(6, 6, '#e6fbff');
      break;
    case 'volcano':
      if (slot === 0) for (let x = 0; x < 16; x += 3) px.r(x, 5, 2, 3, s2).p(x, 5, c1);
      if (slot === 1) px.r(5, 10, 6, 14, s2).r(4, 8, 8, 3, s1).p(7, 9, c1).p(6, 14, c2);
      if (slot === 2) for (let y = 0; y < 40; y++) px.p(4, y, y % 4 ? '#ff7a1f' : '#ffd35a');
      if (slot === 3) px.disc(8, 8, 5, s2).r(5, 7, 2, 2, '#ffb31f').r(9, 7, 2, 2, '#ffb31f');
      if (slot === 4) {
        px.r(6, 16, 20, 24, s2).v(6, 16, 24, s1).r(2, 36, 28, 4, s3);
        for (let y = 18; y < 38; y += 4) px.h(10, y, 12, '#ff5a1f');
      }
      if (slot === 5) px.r(5, 6, 5, 3, '#e8dcc0').p(4, 7, '#e8dcc0').p(10, 7, '#e8dcc0');
      break;
    case 'ice':
      if (slot === 0) px.ellipse(8, 6, 8, 3, '#ffffff').h(1, 8, 14, '#dff4ff');
      if (slot === 1) {
        for (let k = 0; k < 4; k++) px.h(8 - (k + 1) * 1.5, 6 + k * 4, (k + 1) * 3, '#2a5a5a').h(8 - (k + 1) * 1.5, 6 + k * 4, (k + 1) * 3 - 1, '#e8f4ff');
        px.v(8, 20, 4, '#5a3a1e');
      }
      if (slot === 2) for (let y = 0; y < 24; y++) px.h(8 - Math.max(0, 3 - y / 6), y, Math.max(1, 6 - y / 4), y % 5 === 0 ? '#ffffff' : '#bfe6ff');
      if (slot === 3) px.r(3, 3, 10, 10, '#9fd6f5').h(3, 3, 10, '#ffffff').line(5, 5, 10, 10, '#e8f7ff');
      if (slot === 4) {
        px.ellipse(16, 30, 12, 10, '#ffffff').ellipse(16, 16, 8, 7, '#ffffff').ellipse(16, 30, 11, 9, '#e8f4ff');
        px.p(13, 14, '#1a1210').p(18, 14, '#1a1210').r(15, 17, 3, 1, '#ff7a1f').line(6, 24, 1, 18, '#5a3a1e').line(26, 24, 31, 18, '#5a3a1e');
      }
      if (slot === 5) px.p(4, 4, '#ffffff').p(3, 5, '#dff4ff').p(5, 5, '#dff4ff');
      break;
    case 'sky':
      if (slot === 0) for (let x = 0; x < 16; x++) px.v(x, 6 - ((x * 3) % 4), (x * 3) % 4, x % 2 ? c1 : c2);
      if (slot === 1) {
        px.v(8, 6, 18, '#e0b040').r(4, 4, 8, 3, '#e0b040').r(9, 7, 6, 8, '#b65cff').h(9, 7, 6, '#e0a8ff');
      }
      if (slot === 2) for (let y = 0; y < 44; y++) px.p(4, y, y % 6 < 3 ? '#e0b040' : '#fff2a8');
      if (slot === 3) px.disc(8, 8, 6, '#e0b040').disc(8, 8, 4, '#fff6cf').disc(8, 8, 2, '#b65cff');
      if (slot === 4) {
        px.r(10, 8, 12, 32, s1).v(10, 8, 32, s0).v(21, 8, 32, s2).r(6, 4, 20, 5, '#e0b040').h(6, 4, 20, '#fff2a8').r(6, 38, 20, 3, s3);
      }
      if (slot === 5) px.line(2, 6, 5, 4, '#ffffff').line(5, 4, 8, 6, '#ffffff');
      break;
  }
  void mix;
}

export function decoAssets(): ArtAsset[] {
  const out: ArtAsset[] = [];
  for (const w of WORLD_ORDER) {
    DECO_SIZES.forEach(([fw, fh], slot) => {
      out.push(sheet(`deco_${w}_${slot}`, fw, fh, 1, (px) => draw(px, w, slot), { outline: slot === 2 || slot === 0 ? undefined : '#140d0b' }));
    });
  }
  return out;
}
