import type Phaser from 'phaser';
import { WORLD_ORDER } from '../../core/types';
import { backgroundAssets } from './backgroundArt';
import { bossAssets } from './bossArt';
import { decoAssets } from './decoArt';
import { enemyAssets } from './enemiesArt';
import { fxAssets } from './fxArt';
import { objectAssets } from './objectsArt';
import { renderArin, renderPortrait, ARIN_FW, ARIN_FH } from './playerArt';
import type { ArtAsset } from './sheet';
import { renderTileset, TILESET_COLS, TILESET_ROWS } from './tilesArt';
import { uiAssets } from './uiArt';

/**
 * Optional file overrides: asset id → URL (relative to /public). When present the file is
 * loaded instead of the procedural placeholder, so final art can be dropped in without code changes.
 * Frame layout must match the placeholder (see docs/ARCHITECTURE.md → Asset pipeline).
 */
export const ASSET_OVERRIDES: Record<string, { url: string; frameW?: number; frameH?: number }> = {};

/** Metadata the renderer needs about generated sheets (foot padding etc). */
export const ASSET_META = new Map<string, { footPad: number; frameW: number; frameH: number }>();

function register(scene: Phaser.Scene, a: ArtAsset): void {
  if (ASSET_OVERRIDES[a.key] || scene.textures.exists(a.key)) return;
  const tex = scene.textures.addCanvas(a.key, a.canvas);
  if (!tex) return;
  if (a.frameW && a.frameH && a.frames) {
    for (let i = 0; i < a.frames; i++) tex.add(i, 0, i * a.frameW, 0, a.frameW, a.frameH);
  }
  ASSET_META.set(a.key, { footPad: a.footPad ?? 0, frameW: a.frameW ?? a.canvas.width, frameH: a.frameH ?? a.canvas.height });
}

/** Queue file overrides on the loader (call in preload). */
export function preloadOverrides(scene: Phaser.Scene): void {
  for (const [key, o] of Object.entries(ASSET_OVERRIDES)) {
    if (o.frameW && o.frameH) scene.load.spritesheet(key, o.url, { frameWidth: o.frameW, frameHeight: o.frameH });
    else scene.load.image(key, o.url);
  }
}

/** Generate every procedural texture. Runs once at boot (a few hundred ms). */
export function generateAll(scene: Phaser.Scene, outfit = 'classic'): void {
  for (const w of WORLD_ORDER) {
    register(scene, { key: `tiles_${w}`, canvas: renderTileset(w) });
    const tex = scene.textures.get(`tiles_${w}`);
    // Individual tile frames (used by views that draw terrain-looking objects).
    for (let i = 0; i < TILESET_COLS * TILESET_ROWS; i++) {
      if (!tex.has(`t${i}`)) tex.add(`t${i}`, 0, (i % TILESET_COLS) * 32, Math.floor(i / TILESET_COLS) * 32, 32, 32);
    }
  }
  for (const group of [objectAssets(), enemyAssets(), bossAssets(), backgroundAssets(), fxAssets(), uiAssets(), decoAssets()]) {
    for (const a of group) register(scene, a);
  }
  ensureOutfit(scene, outfit);
}

/** Player textures are generated per outfit on demand (cosmetic unlocks). */
export function ensureOutfit(scene: Phaser.Scene, outfit: string): string {
  const key = `arin_${outfit}`;
  if (!scene.textures.exists(key)) {
    const { canvas, frames } = renderArin(outfit);
    const tex = scene.textures.addCanvas(key, canvas);
    frames.forEach((name, i) => tex?.add(name, 0, i * ARIN_FW, 0, ARIN_FW, ARIN_FH));
  }
  const pk = `portrait_${outfit}`;
  if (!scene.textures.exists(pk)) scene.textures.addCanvas(pk, renderPortrait(outfit));
  return key;
}
