import Phaser from 'phaser';
import type { Boss } from '../../core/bosses/Boss';
import { DEPTH } from '../layers';

const ADD = Phaser.BlendModes.ADD;

/** Composite, pose-driven boss rendering. Each kind is assembled from parts. */
export class BossView {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private head?: Phaser.GameObjects.Sprite;
  private segs: Phaser.GameObjects.Image[] = [];
  private arms: Phaser.GameObjects.Image[] = [];
  private wings: Phaser.GameObjects.Sprite[] = [];
  private body?: Phaser.GameObjects.Image;
  private halo?: Phaser.GameObjects.Image;
  private weak: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private b: Boss,
  ) {
    const kind = b.spec.kind;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.parts.push(o);
      return o;
    };
    this.aura = add(scene.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(DEPTH.BOSS - 2).setAlpha(0));
    if (kind === 'serpent') {
      for (let i = 0; i < 9; i++) this.segs.push(add(scene.add.image(0, 0, 'serpent_seg').setDepth(DEPTH.BOSS - 1)));
      this.head = add(scene.add.sprite(0, 0, 'serpent_head', 0).setDepth(DEPTH.BOSS));
    } else if (kind === 'sand_king') {
      this.body = add(scene.add.image(b.bx, b.by, 'king_throne').setOrigin(0.5, 1).setDepth(DEPTH.BOSS - 1));
      this.arms.push(add(scene.add.image(0, 0, 'king_arm').setOrigin(0.5, 0.05).setDepth(DEPTH.BOSS)));
      this.arms.push(add(scene.add.image(0, 0, 'king_arm').setOrigin(0.5, 0.05).setDepth(DEPTH.BOSS).setFlipX(true)));
      this.head = add(scene.add.sprite(0, 0, 'king_head', 0).setDepth(DEPTH.BOSS));
    } else if (kind === 'crystal_titan') {
      this.arms.push(add(scene.add.image(0, 0, 'titan_arm').setOrigin(0.5, 0.05).setDepth(DEPTH.BOSS - 1)));
      this.body = add(scene.add.image(0, 0, 'titan_body').setOrigin(0.5, 1).setDepth(DEPTH.BOSS));
      this.head = add(scene.add.sprite(0, 0, 'titan_head', 0).setDepth(DEPTH.BOSS + 0.5));
      this.arms.push(add(scene.add.image(0, 0, 'titan_arm').setOrigin(0.5, 0.05).setDepth(DEPTH.BOSS + 1)));
    } else if (kind === 'fire_dragon' || kind === 'ice_dragon') {
      const v = kind === 'fire_dragon' ? 'fire' : 'ice';
      this.wings.push(add(scene.add.sprite(0, 0, `dragon_wing_${v}`, 0).setOrigin(0.05, 0.35).setDepth(DEPTH.BOSS - 2)));
      for (let i = 0; i < 6; i++) this.segs.push(add(scene.add.image(0, 0, `dragon_seg_${v}`).setDepth(DEPTH.BOSS - 1).setScale(1 - i * 0.1)));
      this.head = add(scene.add.sprite(0, 0, `dragon_head_${v}`, 0).setDepth(DEPTH.BOSS));
      this.wings.push(add(scene.add.sprite(0, 0, `dragon_wing_${v}`, 0).setOrigin(0.05, 0.35).setDepth(DEPTH.BOSS + 1)));
    } else {
      this.halo = add(scene.add.image(0, 0, 'deity_halo').setDepth(DEPTH.BOSS - 3).setBlendMode(ADD));
      for (let i = 0; i < 6; i++) this.arms.push(add(scene.add.image(0, 0, 'deity_arm').setOrigin(0.5, 0.05).setDepth(DEPTH.BOSS - 1)));
      this.body = add(scene.add.image(0, 0, 'deity_body').setOrigin(0.5, 0.5).setDepth(DEPTH.BOSS));
    }
    this.weak = add(scene.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xff4a8a).setDepth(DEPTH.BOSS + 2).setAlpha(0));
    this.stars = add(scene.add.text(0, 0, '✦ ✦ ✦', { fontFamily: 'monospace', fontSize: '18px', color: '#ffe28a' }).setOrigin(0.5).setDepth(DEPTH.BOSS + 3).setVisible(false));
  }

  sync(time: number): void {
    const b = this.b;
    const P = b.brain.pose;
    const kind = b.spec.kind;
    const hidden = b.state === 'dead';
    for (const o of this.parts) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(!hidden);
    if (hidden) return;
    const flash = b.hitFlash > 0 && Math.floor(time / 50) % 2 === 0;
    const tint = flash ? 0xffffff : b.stun > 0 ? 0xc8c8ff : 0xffffff;
    const g = (k: string, d = 0): number => P[k] ?? d;

    if (kind === 'serpent' && this.head) {
      const hx = g('headX');
      const hy = g('headY');
      const bx = b.bx;
      const by = b.by + 40;
      const em = g('emerge');
      this.segs.forEach((s, i) => {
        const t = (i + 1) / (this.segs.length + 1);
        const cx = bx + (hx - bx) * 0.15;
        const cy = hy + (by - hy) * 0.1;
        const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * hx;
        const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * hy + Math.sin(time / 300 + i) * 3;
        s.setPosition(x, y).setScale(1.25 - t * 0.4).setVisible(y < b.by + 30 && em > 0.05).setTint(tint);
      });
      this.head.setPosition(hx, hy).setFrame(g('mouth') > 0.5 ? 1 : 0).setFlipX(g('facing', -1) < 0).setTint(tint).setVisible(em > 0.05).setAngle(g('stunned') ? 25 * g('facing', -1) : 0);
    } else if (kind === 'sand_king' && this.head && this.body) {
      const slump = g('slump');
      this.body.setTint(tint);
      this.head.setPosition(b.bx, b.by - 172 + slump * 28).setFrame(slump > 0.5 || g('awake') < 0.5 ? 1 : 0).setTint(tint).setAngle(slump * 12);
      const arm = g('arm');
      this.arms[0]?.setPosition(b.bx - 52, b.by - 150).setAngle(20 + arm * 120 - slump * 20).setTint(tint);
      this.arms[1]?.setPosition(b.bx + 52, b.by - 150).setAngle(-20 - arm * 30 + slump * 20).setTint(tint);
    } else if (kind === 'crystal_titan' && this.body && this.head) {
      const x = g('x', b.bx);
      const k = g('kneel');
      const bob = Math.abs(Math.sin(g('walk') * Math.PI)) * 3;
      const f = g('facing', -1);
      this.body.setPosition(x, b.by + k * 30).setFlipX(f > 0).setTint(tint).setScale(1, 1 - k * 0.2);
      this.head.setPosition(x + f * 6, b.by - 130 + k * 45 - bob).setFlipX(f > 0).setTint(tint);
      const swing = Math.sin(g('walk') * Math.PI) * 18 + g('stomp') * -60;
      this.arms[0]?.setPosition(x - f * 50, b.by - 122 + k * 40 - bob).setAngle(-swing).setTint(tint);
      this.arms[1]?.setPosition(x + f * 50, b.by - 122 + k * 40 - bob).setAngle(swing).setTint(tint);
      if (g('hint') > 0) b.brain.pose['hint'] = Math.max(0, g('hint') - 0.02);
    } else if ((kind === 'fire_dragon' || kind === 'ice_dragon') && this.head) {
      const x = g('x', b.bx);
      const y = g('y', b.by);
      const f = g('facing', -1);
      const gr = g('grounded');
      this.head.setPosition(x + f * 70, y - 6 + gr * 10).setFlipX(f < 0).setFrame(g('mouth') + g('breath') > 0.3 ? 1 : 0).setTint(tint);
      this.segs.forEach((s, i) => {
        s.setPosition(x - f * (i * 34 - 10), y + Math.sin(time / 250 + i * 0.8) * (6 - gr * 5) + i * 4 * (1 - gr)).setTint(tint);
      });
      const wing = Math.floor(g('wing') * 1.2) % 2;
      this.wings.forEach((w, i) => w.setPosition(x - f * 10, y - 18).setFlipX(f < 0).setOrigin(f > 0 ? 0.05 : 0.95, 0.35).setFrame(gr > 0.5 ? 1 : wing).setAlpha(i === 0 ? 0.75 : 1).setTint(tint).setScale(1 - gr * 0.3));
    } else if (kind === 'sky_deity' && this.body && this.halo) {
      const y = g('y', b.by);
      const form = g('form');
      const formTint = [0xffffff, 0xfff2c0, 0xffe0a0, 0xffd0ff, 0xffc0c0, 0xffa0a0][Math.floor(form)] ?? 0xffffff;
      this.halo.setPosition(b.bx, y - 90).setRotation(g('halo')).setAlpha(0.55 + g('shield') * 0.3).setTint(form >= 3 ? 0xffb0e0 : 0xffffff).setScale(0.9 + form * 0.05);
      this.body.setPosition(b.bx, y - 70).setTint(flash ? 0xffffff : formTint);
      const n = 2 + Math.min(4, Math.floor(form));
      this.arms.forEach((a, i) => {
        const side = i % 2 ? 1 : -1;
        const k = Math.floor(i / 2);
        a.setVisible(i < n).setPosition(b.bx + side * (60 + k * 8), y - 120 + k * 24).setAngle(side * (40 + k * 30 + g('arms') * 15)).setTint(formTint);
      });
      this.aura.setPosition(b.bx, y - 70).setScale(4.5).setTint(0xfff2c0).setAlpha(g('shield') * 0.35);
    }
    // Weak point highlight (only when exposed — the counterplay window).
    const wp = b.exposed ? b.brain.weakPoint(b) : null;
    if (wp) {
      this.weak.setPosition(wp.x + wp.w / 2, wp.y + wp.h / 2).setScale(Math.max(wp.w, wp.h) / 60).setAlpha(0.55 + Math.sin(time / 90) * 0.25);
    } else this.weak.setAlpha(0);
    this.stars.setVisible(b.stun > 0 && !!wp);
    if (wp) this.stars.setPosition(wp.x + wp.w / 2, wp.y - 18).setAngle(Math.sin(time / 200) * 10);
  }

  destroy(): void {
    for (const p of this.parts) p.destroy();
  }
}
