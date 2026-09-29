import { makeCanvas, outline, Px } from './Px';

/** A generated texture: one canvas, optionally split into equally sized frames. */
export interface ArtAsset {
  key: string;
  canvas: HTMLCanvasElement;
  frameW?: number;
  frameH?: number;
  frames?: number;
  /** Empty display rows below the lowest opaque pixel of frame 0 (for foot anchoring). */
  footPad?: number;
}

/** Measure transparent rows at the bottom of the first frame. */
export function measureFootPad(a: ArtAsset): number {
  const ctx = a.canvas.getContext('2d') as CanvasRenderingContext2D;
  const w = a.frameW ?? a.canvas.width;
  const h = a.frameH ?? a.canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) if ((data[(y * w + x) * 4 + 3] ?? 0) > 0) return h - 1 - y;
  }
  return 0;
}

/** Draw `n` frames of fw×fh (display px) with a scale-2 pixel helper. */
export function sheet(key: string, fw: number, fh: number, n: number, draw: (px: Px, i: number) => void, opts: { outline?: string; scale?: number } = {}): ArtAsset {
  const scale = opts.scale ?? 2;
  const canvas = makeCanvas(fw * n, fh);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  for (let i = 0; i < n; i++) {
    const f = makeCanvas(fw, fh);
    const px = new Px(f.getContext('2d') as CanvasRenderingContext2D, scale);
    draw(px, i);
    if (opts.outline) outline(f, opts.outline, scale);
    ctx.drawImage(f, i * fw, 0);
  }
  return n > 1 ? { key, canvas, frameW: fw, frameH: fh, frames: n } : { key, canvas };
}

/** Plain canvas-drawn texture (for gradients / smooth effects). */
export function canvasArt(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): ArtAsset {
  const canvas = makeCanvas(w, h);
  draw(canvas.getContext('2d') as CanvasRenderingContext2D);
  return { key, canvas };
}
