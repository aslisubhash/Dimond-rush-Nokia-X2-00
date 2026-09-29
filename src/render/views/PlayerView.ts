import Phaser from 'phaser';
import type { Player } from '../../core/player/Player';
import { PLAYER } from '../../core/player/playerConfig';
import { DEPTH } from '../layers';

/** Arin's sprite, attack whip and invulnerability blink. */
export class PlayerView {
  private s: Phaser.GameObjects.Sprite;
  private whip: Phaser.GameObjects.Image;
  private slash: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    private p: Player,
    textureKey: string,
  ) {
    this.shadow = scene.add.ellipse(0, 0, 22, 6, 0x000000, 0.25).setDepth(DEPTH.PLAYER - 1);
    this.s = scene.add.sprite(0, 0, textureKey, 'idle0').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
    this.whip = scene.add.image(0, 0, 'whip').setOrigin(0, 0.5).setDepth(DEPTH.PLAYER + 1).setVisible(false);
    this.slash = scene.add.image(0, 0, 'slash').setOrigin(0.1, 0.8).setDepth(DEPTH.PLAYER + 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  }

  setTexture(key: string): void {
    this.s.setTexture(key, 'idle0');
  }

  sync(time: number): void {
    const p = this.p;
    const st = p.state;
    const t = p.fsm.time;
    let f = 'idle0';
    switch (st) {
      case 'IDLE':
        f = Math.floor(time / 600) % 2 ? 'idle1' : 'idle0';
        break;
      case 'RUN':
        f = `run${Math.floor(p.runDistance / 14) % 6}`;
        break;
      case 'JUMP':
        f = 'jump';
        break;
      case 'FALL':
        f = 'fall';
        break;
      case 'LAND':
        f = 'land';
        break;
      case 'CROUCH':
        f = Math.abs(p.vx) > 10 ? `crawl${Math.floor(p.runDistance / 12) % 2}` : 'crouch';
        break;
      case 'SWIM':
        f = `swim${Math.floor(time / 300) % 2}`;
        break;
      case 'CLIMB':
        f = `climb${Math.floor(p.runDistance / 16) % 2}`;
        break;
      case 'PUSH':
        f = `push${Math.floor(time / 250) % 2}`;
        break;
      case 'PULL':
        f = `pull${Math.floor(time / 250) % 2}`;
        break;
      case 'HURT':
        f = 'hurt';
        break;
      case 'ATTACK':
        f = t < PLAYER.attackActiveStart ? 'attack0' : t < PLAYER.attackActiveEnd ? 'attack1' : 'attack2';
        break;
      case 'DEATH':
        f = t < 0.5 ? 'death0' : 'death1';
        break;
      case 'VICTORY':
        f = 'victory';
        break;
    }
    const fx = p.x + p.w / 2;
    const fy = p.y + p.h;
    this.s.setFrame(f).setPosition(Math.round(fx), Math.round(fy)).setFlipX(p.facing < 0);
    this.s.setAlpha(p.invuln > 0 && !p.dead ? (Math.floor(time / 70) % 2 ? 0.35 : 1) : 1);
    if (st === 'DEATH') this.s.setAlpha(Math.max(0, 1 - Math.max(0, t - 0.8) * 1.5));
    this.shadow.setVisible(p.grounded && !p.dead).setPosition(fx, fy - 1);

    const attacking = st === 'ATTACK' || (st === 'SWIM' && p.attackBox !== null);
    const box = p.attackBox;
    this.whip.setVisible(attacking && !!box);
    this.slash.setVisible(attacking && !!box);
    if (box) {
      const hx = p.facing > 0 ? p.x + p.w - 2 : p.x + 2;
      const hy = p.y + 18;
      this.whip.setPosition(hx, hy).setFlipX(p.facing < 0).setOrigin(p.facing > 0 ? 0 : 1, 0.5);
      this.slash.setPosition(hx, hy + 14).setFlipX(p.facing < 0).setOrigin(p.facing > 0 ? 0.1 : 0.9, 0.8).setAlpha(0.7);
    }
  }

  destroy(): void {
    this.s.destroy();
    this.whip.destroy();
    this.slash.destroy();
    this.shadow.destroy();
  }
}
