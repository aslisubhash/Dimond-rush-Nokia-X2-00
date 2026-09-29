/** Dev-only art preview page: renders generated textures for visual inspection. */
import { renderArin, renderPortrait } from '../render/art/playerArt';
import { renderTileset } from '../render/art/tilesArt';
import { WORLD_ORDER } from '../core/types';

const out = document.getElementById('out') as HTMLDivElement;
function show(c: HTMLCanvasElement, scale = 1, label = ''): void {
  const wrap = document.createElement('div');
  wrap.textContent = label;
  const v = document.createElement('canvas');
  v.width = c.width * scale;
  v.height = c.height * scale;
  const ctx = v.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, v.width, v.height);
  wrap.appendChild(v);
  out.appendChild(wrap);
}
const params = new URLSearchParams(location.search);
const what = params.get('what') ?? 'player';
if (what === 'player') {
  show(renderArin('classic').canvas, 2, 'arin classic');
  show(renderPortrait('classic'), 2, 'portrait');
}
if (what === 'tiles') for (const w of WORLD_ORDER) show(renderTileset(w), 1, w);
(window as unknown as { __ready: boolean }).__ready = true;
