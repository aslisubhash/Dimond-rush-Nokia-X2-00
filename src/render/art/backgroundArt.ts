import { WORLD_ORDER, type WorldId } from '../../core/types';
import { hash2 } from '../../core/util/math';
import { PALETTES, mix, shade } from './palette';
import { makeCanvas } from './Px';
import type { ArtAsset } from './sheet';

const W = 640; // half-res, scaled ×2 → tileable 1280×720
const H = 360;
const TAU = Math.PI * 2;

/** Periodic 1D noise so layers tile seamlessly. */
function pnoise(x: number, seed: number, octaves: number[]): number {
  let v = 0;
  let amp = 1;
  let total = 0;
  for (const k of octaves) {
    v += Math.sin((x / W) * TAU * k + seed * (k + 1.37)) * amp;
    total += amp;
    amp *= 0.55;
  }
  return v / total;
}

function upscale(src: HTMLCanvasElement, key: string): ArtAsset {
  const c = makeCanvas(W * 2, H * 2);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, W * 2, H * 2);
  return { key, canvas: c };
}

function sky(world: WorldId): ArtAsset {
  const p = PALETTES[world];
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.skyTop);
  g.addColorStop(0.75, p.skyBottom);
  g.addColorStop(1, mix(p.skyBottom, p.fog, 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Dithered bands for the pixel look.
  for (let y = 0; y < H; y += 2) {
    for (let x = (y / 2) % 2; x < W; x += 4) {
      if (hash2(x, y, 5) > 0.93) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  if (world === 'ice' || world === 'crystal') {
    for (let i = 0; i < 160; i++) {
      const x = hash2(i, 1, 7) * W;
      const y = hash2(i, 2, 7) * H * 0.6;
      ctx.fillStyle = world === 'ice' ? `rgba(255,255,255,${0.3 + hash2(i, 3, 7) * 0.7})` : `rgba(182,92,255,${0.2 + hash2(i, 3, 7) * 0.5})`;
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
  }
  if (world === 'ice') {
    // Aurora.
    for (let x = 0; x < W; x++) {
      const y = 60 + pnoise(x, 3, [1, 3]) * 25;
      const grd = ctx.createLinearGradient(0, y - 40, 0, y + 20);
      grd.addColorStop(0, 'rgba(127,255,200,0)');
      grd.addColorStop(0.6, 'rgba(127,255,200,0.22)');
      grd.addColorStop(1, 'rgba(127,255,200,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y - 40, 1, 60);
    }
  }
  if (world === 'jungle' || world === 'desert' || world === 'sky') {
    const sx = W * 0.72;
    const sy = world === 'desert' ? H * 0.55 : H * 0.22;
    const r = world === 'desert' ? 60 : 36;
    const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, r * 3);
    grd.addColorStop(0, 'rgba(255,250,220,0.95)');
    grd.addColorStop(0.2, 'rgba(255,240,190,0.5)');
    grd.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = world === 'desert' ? '#ffd88a' : '#fffbe8';
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.35, 0, TAU);
    ctx.fill();
  }
  if (world === 'volcano') {
    const grd = ctx.createRadialGradient(W * 0.5, H, 10, W * 0.5, H, H);
    grd.addColorStop(0, 'rgba(255,120,40,0.55)');
    grd.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }
  if (world === 'sky') {
    for (let i = 0; i < 9; i++) cloud(ctx, hash2(i, 9, 1) * W, 40 + hash2(i, 8, 1) * 200, 30 + hash2(i, 7, 1) * 50, 'rgba(255,255,255,0.7)');
  }
  return upscale(c, `bg_${world}_sky`);
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string): void {
  ctx.fillStyle = col;
  for (const dx of [-W, 0, W]) {
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.arc(x + dx + (k - 2.5) * s * 0.35, y - Math.sin((k / 5) * Math.PI) * s * 0.25, s * 0.28, 0, TAU);
      ctx.fill();
    }
    ctx.fillRect(x + dx - s * 0.9, y - 2, s * 1.8, s * 0.2);
  }
}

function silhouette(ctx: CanvasRenderingContext2D, base: number, amp: number, seed: number, oct: number[], color: string, top?: string): void {
  for (let x = 0; x < W; x++) {
    const y = Math.round(base + pnoise(x, seed, oct) * amp);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, H - y);
    if (top) {
      ctx.fillStyle = top;
      ctx.fillRect(x, y, 1, 2);
    }
  }
}

function far(world: WorldId): ArtAsset {
  const p = PALETTES[world];
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const col = p.far;
  if (world === 'jungle') {
    silhouette(ctx, 210, 30, 1, [2, 5, 11], mix(col, p.fog, 0.35));
    // Distant temple ziggurat.
    ctx.fillStyle = mix(col, p.fog, 0.2);
    for (let s = 0; s < 6; s++) ctx.fillRect(360 + s * 10, 150 + s * 14, 160 - s * 20, 16);
    ctx.fillRect(420, 120, 40, 36);
    silhouette(ctx, 250, 22, 4, [3, 7, 17, 29], col);
  } else if (world === 'desert') {
    ctx.fillStyle = mix(col, p.fog, 0.45);
    for (const [x, s] of [
      [120, 120],
      [300, 80],
      [520, 150],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x - s, 260);
      ctx.lineTo(x, 260 - s * 0.9);
      ctx.lineTo(x + s, 260);
      ctx.fill();
    }
    silhouette(ctx, 262, 10, 2, [2, 3, 5], mix(col, p.fog, 0.2), mix(p.fog, '#ffffff', 0.3));
  } else if (world === 'crystal') {
    for (let x = 0; x < W; x += 3) {
      const h = 30 + Math.abs(pnoise(x, 5, [4, 9, 23])) * 120;
      ctx.fillStyle = col;
      ctx.fillRect(x, 0, 3, h);
    }
    silhouette(ctx, 250, 40, 6, [3, 8, 19], col);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(hash2(i, 4, 2) * W);
      const y = 150 + Math.floor(hash2(i, 5, 2) * 150);
      ctx.fillStyle = i % 3 ? 'rgba(182,92,255,0.5)' : 'rgba(77,195,255,0.5)';
      ctx.fillRect(x, y, 3, 8);
      ctx.fillRect(x + 1, y - 3, 1, 3);
    }
  } else if (world === 'volcano') {
    ctx.fillStyle = mix(col, '#ff5a1f', 0.15);
    for (const [x, s] of [
      [180, 190],
      [470, 150],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x - s * 1.2, 300);
      ctx.lineTo(x - 18, 300 - s);
      ctx.lineTo(x + 18, 300 - s);
      ctx.lineTo(x + s * 1.2, 300);
      ctx.fill();
      ctx.fillStyle = '#ff7a1f';
      ctx.fillRect(x - 12, 300 - s, 24, 3);
      for (let k = 0; k < 40; k++) ctx.fillRect(x - 4 + Math.sin(k) * (k * 0.8), 300 - s + k * 3, 2, 3);
      ctx.fillStyle = mix(col, '#ff5a1f', 0.15);
    }
    silhouette(ctx, 280, 20, 3, [4, 9], col);
  } else if (world === 'ice') {
    for (let x = 0; x < W; x++) {
      const y = Math.round(190 + pnoise(x, 7, [2, 5, 13]) * 70);
      ctx.fillStyle = mix(col, p.fog, 0.25);
      ctx.fillRect(x, y, 1, H - y);
      const snow = Math.max(0, 230 - y) / 4;
      ctx.fillStyle = '#e8f4ff';
      ctx.fillRect(x, y, 1, Math.min(18, 2 + snow));
    }
    silhouette(ctx, 270, 18, 9, [5, 11], col);
  } else {
    for (let i = 0; i < 5; i++) {
      const x = hash2(i, 3, 3) * W;
      const y = 160 + hash2(i, 4, 3) * 100;
      const s = 30 + hash2(i, 5, 3) * 40;
      ctx.fillStyle = mix(p.far, '#ffffff', 0.35);
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s * 0.3, y + s * 0.9);
      ctx.lineTo(x - s * 0.2, y + s * 0.7);
      ctx.fill();
      ctx.fillStyle = '#9ad06a';
      ctx.fillRect(x - s, y - 3, s * 2, 4);
      ctx.fillStyle = mix(p.far, '#ffffff', 0.5);
      ctx.fillRect(x - 6, y - 26, 12, 23);
      ctx.fillRect(x - 10, y - 30, 20, 5);
    }
    for (let i = 0; i < 8; i++) cloud(ctx, hash2(i, 6, 3) * W, 280 + hash2(i, 7, 3) * 60, 60 + hash2(i, 8, 3) * 40, 'rgba(255,255,255,0.85)');
  }
  return upscale(c, `bg_${world}_far`);
}

function mid(world: WorldId): ArtAsset {
  const p = PALETTES[world];
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const col = p.mid;
  const lit = shade(col, 0.08);
  if (world === 'jungle') {
    for (let i = 0; i < 7; i++) {
      const x = Math.floor((i / 7) * W + hash2(i, 1, 4) * 40);
      const w = 14 + Math.floor(hash2(i, 2, 4) * 12);
      ctx.fillStyle = col;
      ctx.fillRect(x, 0, w, H);
      ctx.fillStyle = lit;
      ctx.fillRect(x, 0, 2, H);
      for (let v = 0; v < 3; v++) {
        const vx = x + hash2(i, v, 5) * w;
        ctx.fillStyle = '#244a22';
        for (let y = 0; y < 140 + v * 40; y += 2) ctx.fillRect(vx + Math.sin(y * 0.1) * 2, y, 2, 2);
      }
    }
    silhouette(ctx, 300, 20, 8, [6, 13, 27], col);
    for (let x = 0; x < W; x += 1) {
      const y = 20 + Math.abs(pnoise(x, 2, [7, 15, 31])) * 50;
      ctx.fillStyle = col;
      ctx.fillRect(x, 0, 1, y);
    }
  } else if (world === 'desert') {
    for (let i = 0; i < 5; i++) {
      const x = Math.floor((i / 5) * W + 30);
      ctx.fillStyle = col;
      ctx.fillRect(x, 90, 26, H);
      ctx.fillRect(x - 6, 80, 38, 12);
      ctx.fillStyle = lit;
      ctx.fillRect(x, 92, 3, H);
      for (let y = 110; y < H; y += 24) ctx.fillRect(x + 6, y, 14, 3);
    }
    silhouette(ctx, 310, 12, 4, [3, 7], col);
  } else if (world === 'crystal') {
    for (let i = 0; i < 6; i++) {
      const x = Math.floor((i / 6) * W + hash2(i, 1, 6) * 50);
      const w = 30 + hash2(i, 2, 6) * 30;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w * 0.6, 120 + hash2(i, 3, 6) * 80);
      ctx.fill();
      ctx.fillStyle = 'rgba(182,92,255,0.7)';
      ctx.fillRect(x + w * 0.4, 60, 4, 16);
    }
    silhouette(ctx, 300, 25, 5, [5, 12], col);
  } else if (world === 'volcano') {
    for (let i = 0; i < 5; i++) {
      const x = Math.floor((i / 5) * W + hash2(i, 1, 8) * 60);
      ctx.fillStyle = col;
      ctx.fillRect(x, 60 + hash2(i, 2, 8) * 60, 30, H);
      ctx.fillStyle = 'rgba(255,90,31,0.6)';
      ctx.fillRect(x + 12, 60 + hash2(i, 2, 8) * 60, 3, H);
    }
    silhouette(ctx, 320, 15, 6, [4, 11], col, '#ff5a1f');
  } else if (world === 'ice') {
    for (let i = 0; i < 10; i++) {
      const x = Math.floor((i / 10) * W + hash2(i, 1, 9) * 30);
      const h = 80 + hash2(i, 2, 9) * 80;
      ctx.fillStyle = col;
      for (let k = 0; k < h; k += 2) {
        const w = (k / h) * 26;
        ctx.fillRect(x - w / 2, 330 - h + k, w, 2);
      }
      ctx.fillStyle = '#e8f4ff';
      for (let k = 10; k < h; k += 18) ctx.fillRect(x - (k / h) * 13, 330 - h + k, (k / h) * 26, 2);
    }
    silhouette(ctx, 325, 10, 3, [6, 13], col, '#ffffff');
  } else {
    for (let i = 0; i < 10; i++) cloud(ctx, hash2(i, 1, 10) * W, 300 + hash2(i, 2, 10) * 40, 70 + hash2(i, 3, 10) * 60, 'rgba(255,255,255,0.95)');
    for (let i = 0; i < 3; i++) {
      const x = (i / 3) * W + 90;
      ctx.fillStyle = mix(p.mid, '#ffffff', 0.2);
      ctx.fillRect(x, 150, 18, 160);
      ctx.fillRect(x - 5, 142, 28, 10);
      ctx.fillStyle = '#e0b040';
      ctx.fillRect(x - 5, 148, 28, 2);
    }
  }
  return upscale(c, `bg_${world}_mid`);
}

export function backgroundAssets(): ArtAsset[] {
  const out: ArtAsset[] = [];
  for (const w of WORLD_ORDER) out.push(sky(w), far(w), mid(w));
  return out;
}
