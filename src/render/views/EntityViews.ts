import Phaser from 'phaser';
import { TILE } from '../../core/constants';
import type { PhysicsBlock, IceBlock, MagnetStone, RollingStone } from '../../core/entities/blocks';
import type { Mirror, LightSource, Laser, LightReceiver } from '../../core/entities/beams';
import type { Gate, ExitGate } from '../../core/entities/doors';
import type { Entity } from '../../core/entities/Entity';
import type { Magnet, WindSource } from '../../core/entities/forces';
import type { FluidBody, Waterfall, SandFall, WaterCurrent } from '../../core/entities/fluids';
import type { FireJet, FireSource, FireWheel, Icicle, Saw, SpikeTrap } from '../../core/entities/hazards';
import type { Chest, Pickup } from '../../core/entities/pickups';
import type { CrumblingBlock, FallingPlatform, MovingPlatform, RotatingPlatform, ShiftingSand } from '../../core/entities/platforms';
import type { CrystalNode, EchoStone, PressurePlate, Switch, Torch } from '../../core/entities/switches';
import type { Enemy } from '../../core/enemies/Enemy';
import { hash2 } from '../../core/util/math';
import { ASSET_META } from '../art/AssetRegistry';
import { PALETTES, HEX } from '../art/palette';
import { TI } from '../art/tilesArt';
import { DEPTH } from '../layers';
import { View, type RenderContext } from './View';

const ADD = Phaser.BlendModes.ADD;

function glow(r: RenderContext, x: number, y: number, color: number, scale: number, alpha: number, depth: number = DEPTH.OBJECTS - 1): Phaser.GameObjects.Image {
  return r.scene.add.image(x, y, 'glow').setBlendMode(ADD).setTint(color).setScale(scale).setAlpha(alpha).setDepth(depth);
}

// ------------------------------------------------------------------ pickups

class PickupView extends View<Pickup> {
  private s: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: Pickup) {
    super(r, e);
    const key = e.kind === 'seal' ? `seal_${r.worldId}` : e.kind;
    this.s = r.scene.add.sprite(e.cx, e.cy, key, 0).setDepth(DEPTH.PICKUPS);
    const col: Record<string, number> = { crystal: 0xb65cff, coin: 0xffd35a, relic: 0x2fb3a0, temple_key: 0xffd35a, heart: 0xff5a6a, heart_vessel: 0xff8a9a, key: 0xffd35a, seal: 0xffffff };
    this.g = glow(r, e.cx, e.cy, col[e.kind] ?? 0xffffff, e.kind === 'coin' ? 0.35 : 0.6, 0.5, DEPTH.PICKUPS - 1);
    if (e.props['owned']) this.s.setAlpha(0.4);
  }
  sync(time: number): void {
    const e = this.e;
    const vis = !e.removed && !e.hidden;
    this.s.setVisible(vis);
    this.g.setVisible(vis);
    if (!vis) return;
    const bob = e.popTime > 0 || e.homing ? 0 : Math.sin((time / 1000) * 2.4 + e.anim * 6) * 3;
    this.s.setPosition(e.cx, e.cy + bob);
    this.g.setPosition(e.cx, e.cy + bob).setAlpha(0.35 + Math.sin(time / 300 + e.anim * 5) * 0.15);
    if (e.kind === 'crystal') this.s.setFrame(Math.floor(time / 110 + e.anim * 10) % 12 < 6 ? Math.floor(time / 110 + e.anim * 10) % 6 : 5);
    if (e.kind === 'coin') this.s.setFrame(Math.floor(time / 90 + e.anim * 6) % 6);
  }
  override light(): void {
    if (!this.e.removed && !this.e.hidden) this.r.lighting.add(this.e.cx, this.e.cy, this.e.kind === 'crystal' ? 70 : 50);
  }
  destroy(): void {
    this.s.destroy();
    this.g.destroy();
  }
}

class ChestView extends View<Chest> {
  private s: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image | null = null;
  constructor(r: RenderContext, e: Chest) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, `chest_${e.variant}`, 0).setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS);
    if (e.variant !== 'normal') this.g = glow(r, e.cx, e.cy, e.variant === 'secret' ? 0xb65cff : 0xffd35a, 0.6, 0.35);
  }
  sync(time: number): void {
    this.s.setFrame(this.e.opened ? 1 : 0);
    this.s.setVisible(!(this.e.requires.length && !this.e.powered && this.e.props['hiddenUntilPowered']));
    if (this.g) this.g.setAlpha(this.e.opened ? 0.1 : 0.3 + Math.sin(time / 400) * 0.1);
  }
  destroy(): void {
    this.s.destroy();
    this.g?.destroy();
  }
}

// ------------------------------------------------------------------ blocks

class BlockView extends View<PhysicsBlock> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: PhysicsBlock) {
    super(r, e);
    let key = `stone_block_${r.worldId}`;
    if (e.type === 'crate') key = 'crate';
    if (e.type === 'face_stone') key = `face_stone_${r.worldId}`;
    if (e.type === 'ice_block') key = 'ice_block';
    if (e.type === 'rolling_stone') key = 'rolling_stone';
    if (e.type === 'magnet_stone') key = `magnet_stone_${(e as unknown as MagnetStone).polarity > 0 ? 'N' : 'S'}`;
    this.s = r.scene.add.sprite(e.cx, e.cy, key, 0).setDepth(DEPTH.OBJECTS);
    if (e.type === 'rolling_stone') this.s.setDisplaySize(e.w, e.h);
  }
  sync(time: number): void {
    const e = this.e;
    this.s.setVisible(!e.removed);
    this.s.setPosition(e.cx, e.cy);
    if (e.type === 'face_stone' || e.type === 'rolling_stone') this.s.setRotation(e.anim);
    if (e.type === 'magnet_stone') this.s.setTint((e as unknown as MagnetStone).magnetized ? (Math.floor(time / 80) % 2 ? 0xffffff : 0xffc0c0) : 0xffffff);
    if (e.type === 'ice_block') this.s.setAlpha(1 - (e as unknown as IceBlock).melt * 0.7).setScale(1, 1 - (e as unknown as IceBlock).melt * 0.4);
    if (e.type === 'rolling_stone' && (e as unknown as RollingStone).released === false) this.s.setRotation(0);
  }
  destroy(): void {
    this.s.destroy();
  }
}

// ------------------------------------------------------------------ switches

class PlateView extends View<PressurePlate> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: PressurePlate) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, 'plate', 0).setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS - 2);
  }
  sync(): void {
    this.s.setFrame(this.e.active ? 1 : 0);
    this.s.setTint(this.e.touched && this.r.highContrast ? 0xffff80 : 0xffffff);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class SwitchView extends View<Switch> {
  private s: Phaser.GameObjects.Sprite;
  private ring: Phaser.GameObjects.Graphics;
  constructor(r: RenderContext, e: Switch) {
    super(r, e);
    const glyph = e.str('glyph', '');
    const key = glyph ? `glyph_${glyph}` : e.type === 'lever' ? 'lever' : 'switch';
    this.s = r.scene.add.sprite(e.cx, e.cy, key, 0).setDepth(DEPTH.OBJECTS);
    this.ring = r.scene.add.graphics().setDepth(DEPTH.OBJECTS + 1);
  }
  sync(): void {
    const e = this.e;
    this.s.setFrame(e.active ? 1 : 0);
    this.s.setAlpha(e.requires.length && !e.powered ? 0.55 : 1);
    this.ring.clear();
    if (e.remaining > 0 && e.timer > 0) {
      this.ring.lineStyle(3, 0xffd35a, 0.9);
      this.ring.beginPath();
      this.ring.arc(e.cx, e.cy, 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * e.remaining) / e.timer);
      this.ring.strokePath();
    }
  }
  destroy(): void {
    this.s.destroy();
    this.ring.destroy();
  }
}

class TorchView extends View<Torch> {
  private s: Phaser.GameObjects.Sprite;
  private f: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: Torch) {
    super(r, e);
    const flip = e.bool('wrongWay', false);
    this.s = r.scene.add.sprite(e.cx, e.cy + 4, 'torch', flip ? 1 : 0).setDepth(DEPTH.BACK_DECO + 2).setFlipY(flip);
    this.f = r.scene.add.sprite(e.cx, e.cy - 10, 'flame', 0).setDepth(DEPTH.BACK_DECO + 3).setOrigin(0.5, 0.8);
    this.f.play({ key: 'flame_anim', startFrame: Math.floor(hash2(e.x, e.y) * 4) });
    this.g = glow(r, e.cx, e.cy - 12, 0xffa040, 1.4, 0.5, DEPTH.BACK_DECO + 1);
  }
  sync(time: number): void {
    const e = this.e;
    const flame = e.flame;
    this.f.setVisible(e.active).setScale(0.8 + flame * 0.25, 0.6 + flame * 0.45);
    this.g.setVisible(e.active).setAlpha(0.35 + Math.sin(time / 90 + e.x) * 0.06).setScale(1.1 + flame * 0.25);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.cx, this.e.cy - 10, 170 + this.e.flame * 20);
  }
  destroy(): void {
    this.s.destroy();
    this.f.destroy();
    this.g.destroy();
  }
}

const NODE_COLORS: Record<string, number> = { purple: 0xb65cff, blue: 0x4dc3ff, gold: 0xffd35a, red: 0xff5a1f };

class CrystalNodeView extends View<CrystalNode> {
  private s: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  private col: number;
  constructor(r: RenderContext, e: CrystalNode) {
    super(r, e);
    const name = e.str('color', 'purple');
    this.col = NODE_COLORS[name] ?? 0xb65cff;
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, `crystal_node_${name}`, 0).setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS);
    this.g = glow(r, e.cx, e.y + e.h - 36, this.col, 1.2, 0);
  }
  sync(time: number, dt: number): void {
    const e = this.e;
    this.s.setFrame(e.active ? 1 : 0);
    // Flash when the boss/echo stone points at this crystal.
    if (e.anim > 0) e.anim = Math.max(0, e.anim - dt * 1.2);
    const flash = e.anim;
    this.s.setTint(flash > 0 ? 0xffffff : e.requires.length && !e.powered ? 0x8888aa : 0xffffff);
    this.g.setAlpha(e.active ? 0.55 + Math.sin(time / 150) * 0.1 : flash * 0.9);
    if (e.duration > 0 && e.active && e.remaining < 1.5) this.s.setAlpha(Math.floor(time / 90) % 2 ? 0.6 : 1);
    else this.s.setAlpha(1);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.cx, this.e.y + this.e.h - 36, 140);
  }
  destroy(): void {
    this.s.destroy();
    this.g.destroy();
  }
}

class EchoView extends View<EchoStone> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: EchoStone) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.cy, 'echo_stone', 0).setDepth(DEPTH.OBJECTS);
  }
  sync(time: number): void {
    this.s.setTint(this.e.playing >= 0 ? (Math.floor(time / 100) % 2 ? 0xbfefff : 0xffffff) : 0xffffff);
  }
  destroy(): void {
    this.s.destroy();
  }
}

// ------------------------------------------------------------------ doors

class GateView extends View<Gate> {
  private parts: Phaser.GameObjects.Image[] = [];
  private maskG: Phaser.GameObjects.Graphics | null = null;
  constructor(r: RenderContext, e: Gate) {
    super(r, e);
    const scene = r.scene;
    if (e.type === 'bridge') {
      for (let x = e.x; x < e.x + e.w; x += TILE) this.parts.push(scene.add.image(x, e.y, 'bridge').setOrigin(0, 0).setDepth(DEPTH.OBJECTS).setBlendMode(ADD));
      return;
    }
    if (e.type === 'secret_door') {
      // Looks exactly like the surrounding wall (slightly cleaner — the tell).
      for (let y = e.y; y < e.y + e.h; y += TILE) for (let x = e.x; x < e.x + e.w; x += TILE) this.parts.push(scene.add.image(x, y, `tiles_${r.worldId}`, `t${TI.secret}`).setOrigin(0, 0).setDepth(DEPTH.OBJECTS));
    } else {
      const key = e.type === 'locked_door' ? `locked_door_${r.worldId}` : e.type === 'gate' ? 'gate_bars' : e.type === 'boss_gate' ? 'boss_gate' : e.type === 'temple_door' ? 'temple_door' : `door_${r.worldId}`;
      const img = scene.add.image(e.x, e.y, key).setOrigin(0, 0).setDepth(DEPTH.OBJECTS);
      img.setDisplaySize(e.w, e.h);
      this.parts.push(img);
    }
    // Doors slide up into the ceiling: mask to the frame.
    this.maskG = scene.make.graphics({}, false);
    this.maskG.fillRect(e.x, e.y, e.w, e.h);
    const mask = this.maskG.createGeometryMask();
    for (const p of this.parts) p.setMask(mask);
  }
  sync(): void {
    const e = this.e;
    if (e.type === 'bridge') {
      for (const p of this.parts) p.setAlpha(e.open).setVisible(e.open > 0.02);
      return;
    }
    const off = -e.open * e.h;
    let i = 0;
    for (let y = e.y; y < e.y + e.h; y += TILE) for (let x = e.x; x < e.x + e.w; x += TILE) {
      const p = this.parts[i++];
      if (!p) continue;
      if (e.type === 'secret_door') p.setPosition(x, y + off);
    }
    if (e.type !== 'secret_door') this.parts[0]?.setPosition(e.x, e.y + off);
  }
  destroy(): void {
    for (const p of this.parts) p.destroy();
    this.maskG?.destroy();
  }
}

class ExitView extends View<ExitGate> {
  private s: Phaser.GameObjects.Image;
  private portal: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: ExitGate) {
    super(r, e);
    this.portal = r.scene.add.image(e.cx, e.y + e.h * 0.6, 'glow').setBlendMode(ADD).setTint(0xffe28a).setScale(0.45, 0.75).setDepth(DEPTH.OBJECTS - 2);
    this.s = r.scene.add.image(e.cx, e.y + e.h, 'exit_gate').setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS - 1);
    this.g = glow(r, e.cx, e.y + e.h * 0.55, 0xffe28a, 2, 0.3, DEPTH.OBJECTS - 3);
  }
  sync(time: number): void {
    const on = this.e.active;
    this.portal.setAlpha(on ? 0.8 + Math.sin(time / 200) * 0.15 : 0.1).setTint(on ? 0xffe28a : 0x666688);
    this.g.setAlpha(on ? 0.3 : 0);
    if (on && Math.floor(time / 120) % 3 === 0) this.r.particles.burst('motes', this.e.cx + (hash2(time, 1) - 0.5) * 40, this.e.y + this.e.h - 10, 1);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.cx, this.e.cy, 200);
  }
  destroy(): void {
    this.s.destroy();
    this.portal.destroy();
    this.g.destroy();
  }
}

class CheckpointView extends View {
  private s: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: Entity) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, 'checkpoint', 0).setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS - 1);
    this.g = glow(r, e.cx, e.y + 24, 0x7cf2c9, 1.1, 0);
  }
  sync(time: number): void {
    this.s.setFrame(this.e.active ? 1 : 0);
    this.g.setAlpha(this.e.active ? 0.4 + Math.sin(time / 300) * 0.1 : 0);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.cx, this.e.y + 24, 130);
  }
  destroy(): void {
    this.s.destroy();
    this.g.destroy();
  }
}

// ------------------------------------------------------------------ platforms

class PlatformView extends View<MovingPlatform | FallingPlatform | RotatingPlatform> {
  private parts: Phaser.GameObjects.Image[] = [];
  private sail: Phaser.GameObjects.Image | null = null;
  private wall: Phaser.GameObjects.TileSprite | null = null;
  constructor(r: RenderContext, e: MovingPlatform | FallingPlatform | RotatingPlatform) {
    super(r, e);
    const scene = r.scene;
    if (e.solidKind() === 'full' && e.type === 'moving_platform') {
      this.wall = scene.add.tileSprite(e.x, e.y, e.w, e.h, `stone_block_${r.worldId}`).setOrigin(0, 0).setDepth(DEPTH.OBJECTS);
      return;
    }
    const variant = e.str('variant', '');
    const key = e.type === 'float_platform' ? 'platform_float' : `platform_${variant && scene.textures.exists(`platform_${variant}`) ? variant : r.worldId}`;
    const n = Math.max(1, Math.round(e.w / TILE));
    for (let i = 0; i < n; i++) this.parts.push(scene.add.image(0, 0, key, n === 1 ? 1 : i === 0 ? 0 : i === n - 1 ? 2 : 1).setOrigin(0, 0).setDepth(DEPTH.OBJECTS));
    if (e.type === 'falling_platform') for (const p of this.parts) p.setTint(0xd8c8b0);
    if (e.type === 'wind_platform') this.sail = scene.add.image(0, 0, 'sail').setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS - 1);
    if (e.bool('ice', false)) for (const p of this.parts) p.setTint(0xcfefff);
  }
  sync(time: number): void {
    const e = this.e;
    if (this.wall) {
      this.wall.setPosition(e.x, e.y);
      return;
    }
    let ox = 0;
    const fp = e as FallingPlatform;
    if (e.type === 'falling_platform') {
      if (fp.state === 'shaking') ox = Math.sin(time / 20) * 2;
      for (const p of this.parts) p.setVisible(fp.state !== 'gone');
    }
    this.parts.forEach((p, i) => p.setPosition(e.x + ox + i * TILE, e.y - 2));
    if (this.sail) this.sail.setPosition(e.cx, e.y).setScale(1 + Math.sin(time / 300) * 0.05, 1);
    if (e.type === 'rotating_platform') {
      const rp = e as RotatingPlatform;
      this.r.mech.lineStyle(3, 0x8a7552, 0.8).lineBetween(rp.anchorX, rp.anchorY, e.cx, e.cy);
      this.r.mech.fillStyle(0xe0b040, 1).fillCircle(rp.anchorX, rp.anchorY, 7);
    }
    if (e.type === 'moving_platform' && e.str('variant', '') === 'vine') {
      this.r.mech.lineStyle(3, 0x3f7a2a, 1).lineBetween(e.x + 6, e.y, e.x + 6, e.y - 400).lineBetween(e.x + e.w - 6, e.y, e.x + e.w - 6, e.y - 400);
    }
  }
  destroy(): void {
    for (const p of this.parts) p.destroy();
    this.sail?.destroy();
    this.wall?.destroy();
  }
}

class CrumbleView extends View<CrumblingBlock> {
  private s: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: CrumblingBlock) {
    super(r, e);
    const ice = e.str('variant', 'stone') === 'thin_ice';
    this.s = r.scene.add.image(e.x, e.y, `tiles_${r.worldId}`, `t${ice ? TI.iceTop : TI.crumble}`).setOrigin(0, 0).setDepth(DEPTH.COLLISION + 1);
    if (ice) this.s.setAlpha(0.8);
  }
  sync(time: number): void {
    const e = this.e;
    this.s.setVisible(e.state !== 'gone');
    this.s.setX(e.x + (e.state === 'cracking' ? Math.sin(time / 15) * 1.5 : 0));
  }
  destroy(): void {
    this.s.destroy();
  }
}

class SandView extends View<ShiftingSand> {
  private g: Phaser.GameObjects.Graphics;
  constructor(r: RenderContext, e: ShiftingSand) {
    super(r, e);
    this.g = r.scene.add.graphics().setDepth(DEPTH.COLLISION + 1);
  }
  sync(time: number): void {
    const e = this.e;
    const g = this.g.clear();
    g.fillStyle(0xd9aa5c, 1).fillRect(e.x, e.y, e.w, e.h);
    g.fillStyle(0xf6d58c, 1).fillRect(e.x, e.y, e.w, 5);
    g.fillStyle(0xfbe4a4, 1).fillRect(e.x, e.y, e.w, 2);
    for (let i = 0; i < e.w / 6; i++) g.fillStyle(0xb88a45, 1).fillRect(e.x + ((i * 37) % e.w), e.y + 8 + ((i * 53 + Math.floor(time / 400)) % Math.max(8, e.h - 10)), 2, 2);
  }
  destroy(): void {
    this.g.destroy();
  }
}

// ------------------------------------------------------------------ fluids

class FluidView extends View<FluidBody> {
  private g: Phaser.GameObjects.Graphics;
  private caustics: Phaser.GameObjects.TileSprite | null = null;
  private glowImg: Phaser.GameObjects.Image | null = null;
  private lava: boolean;
  constructor(r: RenderContext, e: FluidBody) {
    super(r, e);
    this.lava = e.type === 'lava_body';
    this.g = r.scene.add.graphics().setDepth(this.lava ? DEPTH.FLUIDS : DEPTH.FLUIDS);
    if (!this.lava) this.caustics = r.scene.add.tileSprite(e.x, e.y, e.w, e.h, 'caustics').setOrigin(0, 0).setDepth(DEPTH.FLUIDS + 0.5).setBlendMode(ADD).setAlpha(0.5);
    else this.glowImg = r.scene.add.image(e.cx, e.y, 'glow').setBlendMode(ADD).setTint(0xff6a1f).setDepth(DEPTH.FLUIDS - 1);
  }
  sync(time: number): void {
    const e = this.e;
    const g = this.g.clear();
    const top = e.surfaceY;
    const bottom = e.y + e.h;
    if (top >= bottom - 1) {
      this.caustics?.setVisible(false);
      this.glowImg?.setVisible(false);
      return;
    }
    const t = time / 1000;
    const pal = PALETTES[this.r.worldId];
    const base = this.lava ? 0xe8420f : HEX(pal.water);
    const deep = this.lava ? 0x9a1a05 : 0x0b3a4a;
    // Body with vertical gradient bands.
    const bands = 8;
    const h = bottom - top;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(base), Phaser.Display.Color.ValueToColor(deep), 100, k * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), this.lava ? 1 : 0.55 + k * 0.15);
      g.fillRect(e.x, top + (h * i) / bands, e.w, h / bands + 1);
    }
    // Animated surface.
    const amp = this.lava ? 2.5 : this.r.reducedMotion ? 1 : 2;
    g.fillStyle(this.lava ? 0xffd35a : 0xbff5ff, this.lava ? 1 : 0.8);
    for (let x = e.x; x < e.x + e.w; x += 4) {
      const y = top + Math.sin(x * 0.05 + t * (this.lava ? 2 : 3)) * amp + Math.sin(x * 0.13 - t * 2) * amp * 0.5;
      g.fillRect(x, y - 2, 4, 3);
      if (this.lava && Math.sin(x * 0.3 + t) > 0.93) g.fillStyle(0xfff2a8, 1).fillRect(x, y + 4, 4, 3).fillStyle(0xffd35a, 1);
    }
    if (this.caustics) {
      this.caustics.setVisible(true).setPosition(e.x, top + 2).setSize(e.w, Math.max(1, h - 2));
      this.caustics.tilePositionX = t * 12;
      this.caustics.tilePositionY = -t * 6;
    }
    if (this.glowImg) this.glowImg.setVisible(true).setPosition(e.cx, top).setScale(e.w / 90, 1.2).setAlpha(0.35 + Math.sin(t * 2) * 0.05);
    if (this.lava && Math.floor(t * 8) !== Math.floor((t - 0.016) * 8)) this.r.particles.burst('ember', e.x + hash2(Math.floor(t * 8), 3) * e.w, top, 1);
    // Clue ripple rendering is handled by ClueView; static pools get occasional bubbles.
  }
  override light(): void {
    if (this.lava) for (let x = this.e.x + 48; x < this.e.x + this.e.w; x += 96) this.r.lighting.add(x, this.e.surfaceY, 150);
  }
  destroy(): void {
    this.g.destroy();
    this.caustics?.destroy();
    this.glowImg?.destroy();
  }
}

class FallView extends View<Waterfall | SandFall> {
  private s: Phaser.GameObjects.TileSprite;
  constructor(r: RenderContext, e: Waterfall | SandFall) {
    super(r, e);
    this.s = r.scene.add.tileSprite(e.x, e.y, e.w, e.h, e.type === 'sand_fall' ? 'sandfall' : 'waterfall').setOrigin(0, 0).setDepth(DEPTH.FLUIDS - 0.5);
  }
  sync(time: number): void {
    const e = this.e;
    this.s.tilePositionY = -time * (e.type === 'sand_fall' ? 0.35 : 0.5);
    this.s.setAlpha(e.flow);
    const warn = e.type === 'sand_fall' && !!e.props['warn'];
    if (warn && Math.floor(time / 60) % 3 === 0) this.r.particles.burst('sand', e.cx, e.y + 4, 1);
    if (e.flow > 0.5 && Math.floor(time / 50) % 2 === 0) this.r.particles.burst(e.type === 'sand_fall' ? 'sand' : 'water_splash', e.cx + (hash2(time, 2) - 0.5) * e.w, e.y + e.h - 4, 1);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class CurrentView extends View<WaterCurrent> {
  sync(time: number): void {
    const e = this.e;
    if (!e.active || Math.floor(time / 180) % 2) return;
    this.r.particles.burst('bubbles', e.x + hash2(time, 5) * e.w, e.y + hash2(time, 6) * e.h, 1);
  }
  destroy(): void {}
}

// ------------------------------------------------------------------ light & magnets

const DIR_ANGLE = [0, 90, 180, 270];

class MirrorView extends View<Mirror> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: Mirror) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.cy, 'mirror', 0).setDepth(DEPTH.OBJECTS);
  }
  sync(): void {
    this.s.setFrame(this.e.orient).setScale(1 - this.e.spin * 0.5, 1);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class EmitterView extends View<LightSource | Laser> {
  private s: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: LightSource | Laser) {
    super(r, e);
    const key = e.type === 'laser' ? 'laser_emitter' : 'light_source';
    this.s = r.scene.add.image(e.x + 16, e.y + 16, key).setDepth(DEPTH.OBJECTS).setAngle(DIR_ANGLE[e.dir] ?? 0);
    this.g = glow(r, e.x + 16, e.y + 16, e.type === 'laser' ? 0xff3a5a : 0xffe28a, 0.8, 0.4);
  }
  sync(time: number): void {
    const e = this.e;
    const on = e.type === 'laser' ? (e as Laser).emitting() : (e as LightSource).emitting();
    const warn = e.type === 'laser' && !!e.props['warn'];
    this.g.setAlpha(on ? 0.5 : warn ? (Math.floor(time / 80) % 2 ? 0.5 : 0) : 0.05);
  }
  destroy(): void {
    this.s.destroy();
    this.g.destroy();
  }
}

class ReceiverView extends View<LightReceiver> {
  private s: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: LightReceiver) {
    super(r, e);
    this.s = r.scene.add.sprite(e.x + 16, e.y + 16, 'light_receiver', 0).setDepth(DEPTH.OBJECTS);
    this.g = glow(r, e.x + 16, e.y + 16, 0xffe28a, 1.2, 0);
  }
  sync(time: number): void {
    this.s.setFrame(this.e.active ? 1 : 0);
    this.g.setAlpha(this.e.active ? 0.5 + Math.sin(time / 120) * 0.1 : 0);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.x + 16, this.e.y + 16, 120);
  }
  destroy(): void {
    this.s.destroy();
    this.g.destroy();
  }
}

class MagnetView extends View<Magnet> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: Magnet) {
    super(r, e);
    const ang = e.dirX > 0 ? 0 : e.dirX < 0 ? 180 : e.dirY > 0 ? 90 : 270;
    this.s = r.scene.add.sprite(e.cx, e.cy, 'magnet', 0).setDepth(DEPTH.OBJECTS).setAngle(ang);
  }
  sync(time: number): void {
    const e = this.e;
    this.s.setFrame(e.attract ? 0 : 1).setAlpha(e.enabled ? 1 : 0.6);
    if (!e.enabled) return;
    const m = this.r.mech;
    const col = e.attract ? 0x4da3ff : 0xff5a5a;
    const phase = ((time / 400) % 1) * (e.attract ? -1 : 1);
    for (let k = 0; k < 4; k++) {
      const d = (((k / 4 + phase) % 1) + 1) % 1;
      const dist = 20 + d * (e.range - 20);
      m.lineStyle(2, col, 0.6 * (1 - d));
      if (e.dirY === 0) m.lineBetween(e.cx + e.dirX * dist, e.cy - 10, e.cx + e.dirX * dist, e.cy + 10);
      else m.lineBetween(e.cx - 10, e.cy + e.dirY * dist, e.cx + 10, e.cy + e.dirY * dist);
    }
  }
  destroy(): void {
    this.s.destroy();
  }
}

class WindView extends View<WindSource> {
  private fan: Phaser.GameObjects.Sprite | null = null;
  private em: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(r: RenderContext, e: WindSource) {
    super(r, e);
    if (e.bool('fan', true)) {
      const fx = e.ax > 0 ? e.x + 16 : e.ax < 0 ? e.x + e.w - 16 : e.cx;
      const fy = e.ay < 0 ? e.y + e.h - 16 : e.ay > 0 ? e.y + 16 : e.cy;
      this.fan = r.scene.add.sprite(fx, fy, 'fan', 0).setDepth(DEPTH.OBJECTS);
    }
    const ang = e.ax > 0 ? 0 : e.ax < 0 ? 180 : e.ay > 0 ? 90 : 270;
    this.em = r.scene.add.particles(0, 0, 'wind_streak', {
      x: { min: e.x, max: e.x + e.w },
      y: { min: e.y, max: e.y + e.h },
      angle: ang,
      speed: { min: 300, max: 520 },
      lifespan: 500,
      frequency: Math.max(20, 9000 / Math.max(1, (e.w * e.h) / 1024)),
      alpha: { start: 0.45, end: 0 },
      rotate: ang,
      emitting: false,
      maxParticles: 60,
    });
    this.em.setDepth(DEPTH.PARTICLES);
  }
  sync(time: number): void {
    const e = this.e;
    const on = e.gust > 0.3;
    if (on && !this.em.emitting) this.em.start();
    if (!on && this.em.emitting) this.em.stop();
    if (this.fan) this.fan.setFrame(on ? Math.floor(time / 60) % 2 : 0);
    if (e.props['warn'] && Math.floor(time / 100) % 2 === 0 && this.fan) this.fan.setTint(0xffe0a0);
    else this.fan?.setTint(0xffffff);
  }
  destroy(): void {
    this.fan?.destroy();
    this.em.destroy();
  }
}

// ------------------------------------------------------------------ hazards

class FireSourceView extends View<FireSource> {
  private s: Phaser.GameObjects.Sprite;
  private f: Phaser.GameObjects.Sprite;
  private g: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: FireSource) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, 'brazier', 0).setOrigin(0.5, 1).setDepth(DEPTH.OBJECTS);
    this.f = r.scene.add.sprite(e.cx, e.y + 16, 'flame', 0).setOrigin(0.5, 1).setScale(1.6).setDepth(DEPTH.OBJECTS + 1);
    this.f.play('flame_anim');
    this.g = glow(r, e.cx, e.y + 8, 0xff8a30, 2, 0);
  }
  sync(time: number): void {
    const on = this.e.active;
    this.s.setFrame(on ? 1 : 0);
    this.f.setVisible(on);
    this.g.setAlpha(on ? 0.45 + Math.sin(time / 100) * 0.07 : 0);
  }
  override light(): void {
    if (this.e.active) this.r.lighting.add(this.e.cx, this.e.y, 230);
  }
  destroy(): void {
    this.s.destroy();
    this.f.destroy();
    this.g.destroy();
  }
}

class FireJetView extends View<FireJet> {
  private s: Phaser.GameObjects.Image;
  private flames: Phaser.GameObjects.Sprite[] = [];
  private dir: string;
  constructor(r: RenderContext, e: FireJet) {
    super(r, e);
    this.dir = e.str('dir', 'up');
    const ang = { up: 0, right: 90, down: 180, left: 270 }[this.dir] ?? 0;
    this.s = r.scene.add.image(e.cx, e.cy, 'fire_jet').setAngle(ang).setDepth(DEPTH.OBJECTS);
    const n = e.num('length', 4) * 2;
    for (let i = 0; i < n; i++) {
      const f = r.scene.add.sprite(0, 0, 'flame', i % 4).setDepth(DEPTH.OBJECTS + 1).setBlendMode(ADD).setScale(2.2);
      f.play({ key: 'flame_anim', startFrame: i % 4 });
      this.flames.push(f);
    }
  }
  sync(time: number): void {
    const e = this.e;
    const len = e.num('length', 4) * TILE * e.flame;
    const [dx, dy] = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as Record<string, [number, number]>)[this.dir] ?? [0, -1];
    this.flames.forEach((f, i) => {
      const d = ((i + 0.5) / this.flames.length) * len;
      f.setVisible(e.flame > 0.05).setPosition(e.cx + dx * (d + 10), e.cy + dy * (d + 10)).setAlpha(0.9 - (i / this.flames.length) * 0.4);
    });
    if (e.warn && Math.floor(time / 70) % 2 === 0) this.r.particles.burst('lava_spark', e.cx + dx * 14, e.cy + dy * 14, 1);
  }
  override light(): void {
    if (this.e.flame > 0.2) this.r.lighting.add(this.e.cx, this.e.cy - 40, 160);
  }
  destroy(): void {
    this.s.destroy();
    for (const f of this.flames) f.destroy();
  }
}

class SpikeTrapView extends View<SpikeTrap> {
  private s: Phaser.GameObjects.Image;
  constructor(r: RenderContext, e: SpikeTrap) {
    super(r, e);
    this.s = r.scene.add.image(e.x, e.y + e.h, 'spike_trap').setOrigin(0, 1).setDepth(DEPTH.OBJECTS - 1);
    const mg = r.scene.make.graphics({}, false).fillRect(e.x, e.y, e.w, e.h);
    this.s.setMask(mg.createGeometryMask());
  }
  sync(): void {
    this.s.setY(this.e.y + this.e.h + (1 - this.e.out) * 16);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class SawView extends View<Saw> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: Saw) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.cy, 'saw', 0).setDepth(DEPTH.OBJECTS + 1);
  }
  sync(): void {
    const e = this.e;
    const [dx, dy] = (e.props['path'] as number[] | undefined) ?? [4, 0];
    this.r.mech.lineStyle(4, 0x3a3a44, 0.8).lineBetween(e.ox, e.oy, e.ox + (dx ?? 0) * TILE, e.oy + (dy ?? 0) * TILE);
    this.s.setPosition(e.cx, e.cy).setRotation(e.anim).setDisplaySize(e.w * 1.1, e.h * 1.1);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class FireWheelView extends View<FireWheel> {
  private balls: Phaser.GameObjects.Sprite[] = [];
  private tmp: { x: number; y: number }[] = [];
  constructor(r: RenderContext, e: FireWheel) {
    super(r, e);
    const n = e.arms * e.length;
    for (let i = 0; i < n; i++) this.balls.push(r.scene.add.sprite(0, 0, 'proj_fireball', i % 2).setDepth(DEPTH.OBJECTS + 1));
  }
  sync(time: number): void {
    const e = this.e;
    const pts = e.balls(this.tmp);
    const off = e.requires.length > 0 && e.powered;
    this.balls.forEach((b, i) => {
      const p = pts[i];
      if (p) b.setPosition(p.x, p.y).setFrame(Math.floor(time / 100 + i) % 2).setVisible(!off);
    });
    this.r.mech.fillStyle(0x3f2520, 1).fillCircle(e.x + TILE / 2, e.y + TILE / 2, 8);
  }
  override light(): void {
    if (this.e.requires.length && this.e.powered) return;
    for (const p of this.e.balls(this.tmp)) this.r.lighting.add(p.x, p.y, 60);
  }
  destroy(): void {
    for (const b of this.balls) b.destroy();
  }
}

class IcicleView extends View<Icicle> {
  private s: Phaser.GameObjects.Sprite;
  constructor(r: RenderContext, e: Icicle) {
    super(r, e);
    this.s = r.scene.add.sprite(e.cx, e.y, 'icicle', e.str('variant', 'ice') === 'stone' ? 1 : 0).setOrigin(0.5, 0).setDepth(DEPTH.OBJECTS + 1);
    if (e.num('scale', 1) !== 1) this.s.setScale(e.num('scale', 1));
  }
  sync(time: number): void {
    const e = this.e;
    this.s.setVisible(e.state !== 'gone');
    this.s.setPosition(e.cx + (e.state === 'shake' ? Math.sin(time / 12) * 2 : 0), e.y);
  }
  destroy(): void {
    this.s.destroy();
  }
}

class ClueView extends View {
  private s: Phaser.GameObjects.Image | null = null;
  private g: Phaser.GameObjects.Graphics | null = null;
  private kind: string;
  constructor(r: RenderContext, e: Entity) {
    super(r, e);
    this.kind = e.str('kind', 'crack');
    const scene = r.scene;
    if (this.kind === 'crack') this.s = scene.add.image(e.x, e.y, 'clue_crack').setOrigin(0, 0).setDepth(DEPTH.COLLISION + 1).setAlpha(0.8);
    else if (this.kind === 'moss') this.s = scene.add.image(e.x, e.y, 'clue_moss').setOrigin(0, 0).setDepth(DEPTH.COLLISION + 1);
    else if (this.kind === 'glyph') this.s = scene.add.image(e.x + 16, e.y + 16, 'clue_glyph', e.num('glyph', 0)).setDepth(DEPTH.BACK_DECO + 1).setAlpha(0.55);
    else if (this.kind === 'arrow') this.s = scene.add.image(e.x + 16, e.y + 16, 'clue_glyph', 2).setDepth(DEPTH.BACK_DECO + 1).setAlpha(0.4);
    else this.g = scene.add.graphics().setDepth(DEPTH.FLUIDS + 1);
  }
  sync(time: number): void {
    const e = this.e;
    if (this.kind === 'ripple' && this.g) {
      this.g.clear();
      for (let k = 0; k < 3; k++) {
        const ph = ((time / 1400 + k / 3) % 1 + 1) % 1;
        this.g.lineStyle(2, 0xffffff, 0.5 * (1 - ph)).strokeEllipse(e.cx, e.y + 4, 10 + ph * 50, 4 + ph * 10);
      }
    }
    if (this.kind === 'sparkle' && Math.floor(time / 90) % 11 === 0) this.r.particles.burst('magic', e.cx + (hash2(time, 1) - 0.5) * 20, e.cy, 1);
    if (this.kind === 'glyph' && this.s) this.s.setAlpha(0.4 + Math.sin(time / 500) * 0.15);
  }
  destroy(): void {
    this.s?.destroy();
    this.g?.destroy();
  }
}

// ------------------------------------------------------------------ enemies

class EnemyView extends View<Enemy> {
  private s: Phaser.GameObjects.Sprite;
  private pad: number;
  constructor(r: RenderContext, e: Enemy) {
    super(r, e);
    const key = `enemy_${e.kindId}`;
    this.pad = ASSET_META.get(key)?.footPad ?? 0;
    this.s = r.scene.add.sprite(e.cx, e.y + e.h, key, 0).setOrigin(0.5, 1).setDepth(DEPTH.ENEMIES);
  }
  sync(time: number): void {
    const e = this.e;
    const vis = !e.removed && !e.dormant;
    this.s.setVisible(vis);
    if (!vis) return;
    const st = e.state;
    let frame = Math.floor(time / 130 + e.homeX) % 4;
    if (st === 'ATTACK') frame = 4;
    if (st === 'HURT' || e.flash > 0) frame = 5;
    if (st === 'IDLE' && e.cfg.behavior !== 'flyer') frame = 0;
    if (st === 'STUN') frame = Math.floor(time / 200) % 2 ? 5 : 0;
    this.s.setFrame(frame);
    this.s.setFlipX(e.facing < 0);
    const fly = e.cfg.behavior === 'flyer';
    if (fly) this.s.setOrigin(0.5, 0.5).setPosition(e.cx, e.cy);
    else this.s.setPosition(e.cx, e.y + e.h + this.pad);
    this.s.setAlpha(st === 'DEAD' ? Math.max(0, 1 - e.fsm.time * 2.2) : 1);
    this.s.setScale(st === 'DEAD' ? 1 + e.fsm.time : 1);
    if (fly && e.cfg.hangs && st === 'IDLE') this.s.setFlipY(true).setFrame(0);
    else this.s.setFlipY(false);
  }
  destroy(): void {
    this.s.destroy();
  }
}

// ------------------------------------------------------------------ factory

export function createEntityView(r: RenderContext, e: Entity): View | null {
  switch (e.type) {
    case 'crystal':
    case 'coin':
    case 'relic':
    case 'temple_key':
    case 'heart':
    case 'heart_vessel':
    case 'key':
    case 'seal':
      return new PickupView(r, e as Pickup);
    case 'chest':
      return new ChestView(r, e as Chest);
    case 'stone_block':
    case 'crate':
    case 'face_stone':
    case 'rolling_stone':
    case 'magnet_stone':
    case 'ice_block':
      return new BlockView(r, e as PhysicsBlock);
    case 'pressure_plate':
      return new PlateView(r, e as PressurePlate);
    case 'switch':
    case 'lever':
      return new SwitchView(r, e as Switch);
    case 'torch':
      return new TorchView(r, e as Torch);
    case 'crystal_node':
      return new CrystalNodeView(r, e as CrystalNode);
    case 'echo_stone':
      return new EchoView(r, e as EchoStone);
    case 'locked_door':
    case 'secret_door':
    case 'gate':
    case 'bridge':
    case 'boss_gate':
    case 'temple_door':
      return new GateView(r, e as Gate);
    case 'exit_gate':
      return new ExitView(r, e as ExitGate);
    case 'checkpoint':
      return new CheckpointView(r, e);
    case 'moving_platform':
    case 'falling_platform':
    case 'rotating_platform':
    case 'float_platform':
    case 'wind_platform':
      return new PlatformView(r, e as MovingPlatform);
    case 'crumbling_block':
      return new CrumbleView(r, e as CrumblingBlock);
    case 'shifting_sand':
      return new SandView(r, e as ShiftingSand);
    case 'water_body':
    case 'lava_body':
      return new FluidView(r, e as FluidBody);
    case 'waterfall':
    case 'sand_fall':
      return new FallView(r, e as Waterfall);
    case 'water_current':
      return new CurrentView(r, e as WaterCurrent);
    case 'mirror':
      return new MirrorView(r, e as Mirror);
    case 'light_source':
    case 'laser':
      return new EmitterView(r, e as LightSource);
    case 'light_receiver':
      return new ReceiverView(r, e as LightReceiver);
    case 'magnet':
      return new MagnetView(r, e as Magnet);
    case 'wind_source':
      return new WindView(r, e as WindSource);
    case 'fire_source':
      return new FireSourceView(r, e as FireSource);
    case 'fire_jet':
      return new FireJetView(r, e as FireJet);
    case 'spike_trap':
      return new SpikeTrapView(r, e as SpikeTrap);
    case 'saw':
      return new SawView(r, e as Saw);
    case 'fire_wheel':
      return new FireWheelView(r, e as FireWheel);
    case 'icicle':
      return new IcicleView(r, e as Icicle);
    case 'clue':
      return new ClueView(r, e);
    case 'enemy':
      return new EnemyView(r, e as Enemy);
    default:
      return null;
  }
}
