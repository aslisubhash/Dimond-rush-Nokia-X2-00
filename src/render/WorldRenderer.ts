import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../core/constants';
import type { OutEvent, WorldId } from '../core/types';
import { clamp, hash2 } from '../core/util/math';
import type { GameWorld } from '../core/world/GameWorld';
import type { AudioEngine } from '../audio/AudioEngine';
import { PALETTES } from './art/palette';
import { Backdrop } from './fx/Backdrop';
import { Lighting } from './fx/Lighting';
import { ParticleFX } from './fx/Particles';
import { DEPTH } from './layers';
import { TerrainRenderer } from './TerrainRenderer';
import { BossView } from './views/BossView';
import { createEntityView } from './views/EntityViews';
import { PlayerView } from './views/PlayerView';
import type { RenderContext, View } from './views/View';

export interface RenderOptions {
  outfitTexture: string;
  screenShake: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  quality: 'high' | 'low';
}

/** Owns every display object for one level and keeps them in sync with the simulation. */
export class WorldRenderer {
  readonly particles: ParticleFX;
  readonly lighting: Lighting;
  private backdrop: Backdrop;
  private terrain: TerrainRenderer;
  private views: View[] = [];
  private playerView: PlayerView;
  private bossView: BossView | null = null;
  private beams: Phaser.GameObjects.Graphics;
  private beamGlow: Phaser.GameObjects.Graphics;
  private mech: Phaser.GameObjects.Graphics;
  private proj: Phaser.GameObjects.Sprite[] = [];
  private flashRect: Phaser.GameObjects.Rectangle;
  private camX = 0;
  private camY = 0;
  private readonly worldId: WorldId;
  private readonly lantern: number;
  /** HUD-bound events (toasts, boss banners). */
  onUiEvent: ((e: OutEvent) => void) | null = null;

  constructor(
    private scene: Phaser.Scene,
    private world: GameWorld,
    private audio: AudioEngine,
    private opts: RenderOptions,
  ) {
    const spec = world.level.spec;
    this.worldId = spec.world;
    const cam = scene.cameras.main;
    cam.setBackgroundColor(PALETTES[this.worldId].skyTop);
    cam.setBounds(0, 0, world.level.widthPx, world.level.heightPx);
    this.backdrop = new Backdrop(scene, this.worldId, spec.backdrop, world.level.widthPx, world.level.heightPx, opts.reducedMotion);
    this.terrain = new TerrainRenderer(scene, world, this.worldId);
    this.particles = new ParticleFX(scene);
    this.particles.reduced = opts.reducedMotion || opts.quality === 'low';
    this.lighting = new Lighting(scene, spec.backdrop?.darkness ?? 0);
    this.lantern = spec.backdrop?.lanternRadius ?? 150;
    this.mech = scene.add.graphics().setDepth(DEPTH.MECHANISM);
    this.beamGlow = scene.add.graphics().setDepth(DEPTH.BEAMS).setBlendMode(Phaser.BlendModes.ADD);
    this.beams = scene.add.graphics().setDepth(DEPTH.BEAMS + 0.1);
    const ctx: RenderContext = {
      scene,
      world,
      worldId: this.worldId,
      particles: this.particles,
      lighting: this.lighting,
      highContrast: opts.highContrast,
      reducedMotion: opts.reducedMotion,
      mech: this.mech,
    };
    for (const e of world.entities) {
      const v = createEntityView(ctx, e);
      if (v) this.views.push(v);
    }
    if (world.boss) this.bossView = new BossView(scene, world.boss);
    this.playerView = new PlayerView(scene, world.player, opts.outfitTexture);
    for (let i = 0; i < world.projectiles.items.length; i++) this.proj.push(scene.add.sprite(0, 0, 'proj_seed').setDepth(DEPTH.PROJECTILES).setVisible(false));

    // Colour grading & vignette.
    const grade = scene.add.rectangle(0, 0, VIEW_W, VIEW_H, PALETTES[this.worldId].grade, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.VIGNETTE - 1).setBlendMode(Phaser.BlendModes.MULTIPLY);
    grade.setAlpha(0.9);
    scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(VIEW_W, VIEW_H).setScrollFactor(0).setDepth(DEPTH.VIGNETTE).setAlpha(opts.highContrast ? 0.3 : 0.75);
    this.flashRect = scene.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xffffff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.VIGNETTE + 1).setAlpha(0);

    // Start the camera on the player.
    const p = world.player;
    this.camX = clamp(p.x - VIEW_W / 2, 0, Math.max(0, world.level.widthPx - VIEW_W));
    this.camY = clamp(p.y - VIEW_H * 0.55, 0, Math.max(0, world.level.heightPx - VIEW_H));
    cam.setScroll(this.camX, this.camY);
  }

  update(time: number, dt: number): void {
    const world = this.world;
    this.terrain.refresh();
    this.updateCamera(dt);
    const cam = this.scene.cameras.main;
    this.backdrop.update(cam, dt);
    this.audio.setListener(cam.scrollX + VIEW_W / 2);
    this.mech.clear();
    for (const v of this.views) v.sync(time, dt);
    this.playerView.sync(time);
    this.bossView?.sync(time);
    this.drawBeams(time);
    this.drawProjectiles(time);
    this.drainEvents();
    if (this.lighting.active) {
      this.lighting.begin();
      const p = world.player;
      if (!p.dead) this.lighting.add(p.x + p.w / 2, p.y + p.h / 2, this.lantern);
      for (const l of this.terrain.lights) this.lighting.add(l.x, l.y, l.r);
      for (const v of this.views) v.light();
      for (let i = 0; i < world.beams.count; i++) {
        const s = world.beams.segmentAt(i);
        if (!s) continue;
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        for (let d = 0; d <= len; d += 64) {
          const k = len > 0 ? d / len : 0;
          this.lighting.add(s.x1 + (s.x2 - s.x1) * k, s.y1 + (s.y2 - s.y1) * k, 70);
        }
      }
      this.lighting.render(cam);
    }
    if (this.flashRect.alpha > 0) this.flashRect.setAlpha(Math.max(0, this.flashRect.alpha - dt * 2.5));
  }

  private updateCamera(dt: number): void {
    const cam = this.scene.cameras.main;
    const world = this.world;
    const p = world.player;
    const lock = world.cameraLock;
    const b = lock ?? { x: 0, y: 0, w: world.level.widthPx, h: world.level.heightPx };
    const tx = p.x + p.w / 2 + p.facing * 70 + p.vx * 0.15;
    const ty = p.y + p.h / 2 - 40;
    let desiredX = this.camX;
    let desiredY = this.camY;
    const cx = this.camX + VIEW_W / 2;
    const cy = this.camY + VIEW_H / 2;
    const dzx = 60;
    if (tx > cx + dzx) desiredX += tx - (cx + dzx);
    if (tx < cx - dzx) desiredX += tx - (cx - dzx);
    if (ty > cy + 50) desiredY += ty - (cy + 50);
    if (ty < cy - 90) desiredY += ty - (cy - 90);
    const clampX = (v: number): number => (b.w <= VIEW_W ? b.x + (b.w - VIEW_W) / 2 : clamp(v, b.x, b.x + b.w - VIEW_W));
    const clampY = (v: number): number => (b.h <= VIEW_H ? b.y + (b.h - VIEW_H) / 2 : clamp(v, b.y, b.y + b.h - VIEW_H));
    desiredX = clampX(desiredX);
    desiredY = clampY(desiredY);
    const k = 1 - Math.exp(-dt * (lock ? 3 : 7));
    this.camX += (desiredX - this.camX) * k;
    this.camY += (desiredY - this.camY) * k;
    // Never expose outside the designed level.
    this.camX = clamp(this.camX, 0, Math.max(0, world.level.widthPx - VIEW_W));
    this.camY = clamp(this.camY, 0, Math.max(0, world.level.heightPx - VIEW_H));
    cam.setScroll(Math.round(this.camX), Math.round(this.camY));
  }

  private drawBeams(time: number): void {
    const g = this.beams.clear();
    const gl = this.beamGlow.clear();
    const world = this.world;
    for (let i = 0; i < world.beams.count; i++) {
      const s = world.beams.segmentAt(i);
      if (!s) continue;
      const laser = s.kind === 'laser';
      const pulse = 0.8 + Math.sin(time / 60 + i) * 0.2;
      gl.lineStyle(laser ? 12 : 18, laser ? 0xff2040 : 0xffd060, 0.25 * pulse).lineBetween(s.x1, s.y1, s.x2, s.y2);
      gl.lineStyle(laser ? 6 : 9, laser ? 0xff5a7a : 0xffe28a, 0.45 * pulse).lineBetween(s.x1, s.y1, s.x2, s.y2);
      g.lineStyle(laser ? 2 : 3, 0xffffff, 0.95).lineBetween(s.x1, s.y1, s.x2, s.y2);
      if (Math.floor(time / 45 + i) % 4 === 0) this.particles.burst(laser ? 'lava_spark' : 'light_beam', s.x2, s.y2, 1);
    }
  }

  private drawProjectiles(time: number): void {
    const items = this.world.projectiles.items;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const s = this.proj[i];
      if (!p || !s) continue;
      if (!p.active) {
        s.setVisible(false);
        continue;
      }
      const key = `proj_${p.kind}`;
      if (s.texture.key !== key) s.setTexture(this.scene.textures.exists(key) ? key : 'proj_seed', 0);
      s.setVisible(true).setPosition(p.x, p.y);
      if (p.kind === 'spear' || p.kind === 'ice' || p.kind === 'shard') s.setRotation(Math.atan2(p.vy, p.vx));
      else if (p.kind === 'sandwave' || p.kind === 'shockwave') {
        s.setFlipX(p.vx < 0).setOrigin(0.5, 0.75);
      } else s.setRotation(time / 150);
      if ((p.kind === 'fireball' || p.kind === 'orb') && s.texture.frameTotal > 2) s.setFrame(Math.floor(time / 90) % 2);
      if (p.kind === 'fireball' && Math.floor(time / 40 + i) % 3 === 0) this.particles.burst('fire', p.x, p.y, 1);
    }
  }

  private drainEvents(): void {
    const out = this.world.out;
    for (const e of out) {
      switch (e.kind) {
        case 'particles':
          this.particles.burst(e.preset, e.x, e.y, e.count, e.color);
          break;
        case 'sound':
          this.audio.play(e.id, { ...(e.x !== undefined ? { x: e.x } : {}), ...(e.volume !== undefined ? { volume: e.volume } : {}) });
          break;
        case 'shake':
          if (this.opts.screenShake && !this.opts.reducedMotion) this.scene.cameras.main.shake(e.duration * 1000, e.intensity);
          break;
        case 'flash':
          if (!this.opts.reducedMotion) this.flashRect.setFillStyle(e.color, 1).setAlpha(0.3);
          break;
        default:
          this.onUiEvent?.(e);
      }
    }
    out.length = 0;
  }

  /** Switch Arin's outfit texture. */
  setOutfit(key: string): void {
    this.playerView.setTexture(key);
  }

  destroy(): void {
    for (const v of this.views) v.destroy();
    this.playerView.destroy();
    this.bossView?.destroy();
    this.terrain.destroy();
    this.backdrop.destroy();
    this.particles.destroy();
    this.lighting.destroy();
    for (const s of this.proj) s.destroy();
    void hash2;
  }
}
