import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { t } from '../../i18n';
import { GameServices } from '../../services';
import { Menu } from '../ui/Menu';
import { COLORS, panel, style } from '../ui/theme';
import type { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  private menu!: Menu;
  private game2!: GameScene;

  constructor() {
    super('Pause');
  }

  init(data: { game: GameScene }): void {
    this.game2 = data.game;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.55).setOrigin(0);
    panel(this, VIEW_W / 2 - 250, VIEW_H / 2 - 220, 500, 440, 0.95);
    this.add.text(VIEW_W / 2, VIEW_H / 2 - 170, t('menu.paused'), style(40, COLORS.gold, true)).setOrigin(0.5);
    const g = this.game2;
    this.menu = new Menu(this, VIEW_W / 2, VIEW_H / 2 - 90, [
      { label: () => t('menu.resume'), onSelect: () => this.resume() },
      { label: () => t('menu.restartCheckpoint'), onSelect: () => { this.resume(); g.restartCheckpoint(); } },
      { label: () => t('menu.restartLevel'), onSelect: () => { this.scene.stop(); g.restartLevel(); } },
      { label: () => t('menu.settings'), onSelect: () => { this.menu.active = false; this.scene.launch('Settings', { from: 'Pause' }); this.scene.pause(); } },
      { label: () => t('menu.quitToMap'), onSelect: () => { this.scene.stop(); g.quitToMap(); } },
    ], s.input, s.audio, { size: 28, spacing: 52 });
    this.events.on('resume', () => {
      this.menu.active = true;
      s.input.clearMenu();
    });
  }

  private resume(): void {
    GameServices.get(this).input.clearMenu();
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.resume('HUD');
  }

  override update(): void {
    const s = GameServices.get(this);
    s.input.pollGamepad();
    if (s.input.consumeMenu('back') || s.input.consumePause()) {
      this.resume();
      return;
    }
    this.menu.update();
  }
}
