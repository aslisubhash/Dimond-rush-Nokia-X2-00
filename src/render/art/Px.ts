/**
 * Pixel-art drawing helper. Draws onto a canvas using a fixed art-pixel scale so every
 * procedurally generated sprite shares the same chunky pixel grid.
 */
export class Px {
  readonly ctx: CanvasRenderingContext2D;
  readonly s: number;
  ox = 0;
  oy = 0;
  flip = false;
  private fw = 0;

  constructor(ctx: CanvasRenderingContext2D, scale = 2) {
    this.ctx = ctx;
    this.s = scale;
    ctx.imageSmoothingEnabled = false;
  }

  /** Set the origin (in canvas pixels) and optional horizontal flip across a frame of width fw art px. */
  at(ox: number, oy: number, flip = false, fw = 0): this {
    this.ox = ox;
    this.oy = oy;
    this.flip = flip;
    this.fw = fw;
    return this;
  }

  private X(x: number, w = 1): number {
    const ax = this.flip ? this.fw - x - w : x;
    return this.ox + ax * this.s;
  }

  p(x: number, y: number, c: string): this {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(this.X(x), this.oy + y * this.s, this.s, this.s);
    return this;
  }

  r(x: number, y: number, w: number, h: number, c: string): this {
    if (w <= 0 || h <= 0) return this;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(this.X(x, w), this.oy + y * this.s, w * this.s, h * this.s);
    return this;
  }

  /** Horizontal line. */
  h(x: number, y: number, w: number, c: string): this {
    return this.r(x, y, w, 1, c);
  }

  /** Vertical line. */
  v(x: number, y: number, h: number, c: string): this {
    return this.r(x, y, 1, h, c);
  }

  /** Filled pixel disc. */
  disc(cx: number, cy: number, rad: number, c: string): this {
    for (let y = -rad; y <= rad; y++) {
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y <= rad * rad + rad * 0.8) this.p(cx + x, cy + y, c);
      }
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.p(cx + x, cy + y, c);
      }
    }
    return this;
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 512; i++) {
      this.p(x, y, c);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Draw a sprite from a string grid with a palette map. '.' is transparent. */
  grid(x: number, y: number, rows: string[], pal: Record<string, string>): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i] as string;
        const c = pal[ch];
        if (c) this.p(x + i, y + j, c);
      }
    });
    return this;
  }
}

/** Create an offscreen canvas. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Outline all opaque pixels of a canvas region with a dark 1-art-px border (sprite readability). */
export function outline(canvas: HTMLCanvasElement, color: string, scale = 2): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h);
  const a = src.data;
  const out = ctx.createImageData(w, h);
  const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  for (let y = 0; y < h; y += scale) {
    for (let x = 0; x < w; x += scale) {
      if ((a[(y * w + x) * 4 + 3] ?? 0) > 0) continue;
      let near = false;
      for (const [dx, dy] of [
        [scale, 0],
        [-scale, 0],
        [0, scale],
        [0, -scale],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && (a[(ny * w + nx) * 4 + 3] ?? 0) > 128) near = true;
      }
      if (!near) continue;
      for (let yy = 0; yy < scale; yy++) {
        for (let xx = 0; xx < scale; xx++) {
          const i = ((y + yy) * w + (x + xx)) * 4;
          out.data[i] = r;
          out.data[i + 1] = g;
          out.data[i + 2] = b;
          out.data[i + 3] = 255;
        }
      }
    }
  }
  const tmp = makeCanvas(w, h);
  tmp.getContext('2d')?.putImageData(out, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}
