import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { GameServices } from '../../services';
import { COLORS, panel, style } from '../ui/theme';

/** Developer level selector (F7). Not reachable in production builds. */
export class LevelSelectScene extends Phaser.Scene {
  private idx = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private from = 'Game';

  constructor() {
    super('LevelSelect');
  }

  init(data: { from: string }): void {
    this.from = data.from;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0, 0.7).setOrigin(0);
    panel(this, 60, 40, VIEW_W - 120, VIEW_H - 80, 0.97);
    this.add.text(VIEW_W / 2, 70, 'DEBUG LEVEL SELECT (F7)', style(24, COLORS.gold)).setOrigin(0.5);
    this.texts = s.levels.map((l, i) => {
      const col = Math.floor(i / 8);
      const row = i % 8;
      const tx = this.add.text(100 + col * 185, 120 + row * 60, `${l.id} ${l.name}`, style(15)).setInteractive({ useHandCursor: true });
      tx.on('pointerdown', () => this.go(i));
      return tx;
    });
    this.refresh();
  }

  private refresh(): void {
    this.texts.forEach((t, i) => t.setColor(i === this.idx ? COLORS.gold : COLORS.text));
  }

  private go(i: number): void {
    const s = GameServices.get(this);
    const lv = s.levels[i];
    if (!lv) return;
    this.scene.stop('HUD');
    this.scene.stop(this.from);
    this.scene.stop();
    this.scene.start('Game', { levelId: lv.id });
  }

  override update(): void {
    const s = GameServices.get(this);
    const inp = s.input;
    const n = this.texts.length;
    if (inp.consumeMenu('down')) this.idx = (this.idx + 1) % n;
    if (inp.consumeMenu('up')) this.idx = (this.idx + n - 1) % n;
    if (inp.consumeMenu('right')) this.idx = Math.min(n - 1, this.idx + 8);
    if (inp.consumeMenu('left')) this.idx = Math.max(0, this.idx - 8);
    this.refresh();
    if (inp.consumeMenu('confirm')) this.go(this.idx);
    if (inp.consumeMenu('back')) {
      this.scene.stop();
      this.scene.resume(this.from);
      if (this.from === 'Game') this.scene.resume('HUD');
    }
  }
}
