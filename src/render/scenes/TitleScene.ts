import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { t } from '../../i18n';
import { GameServices } from '../../services';
import { Menu } from '../ui/Menu';
import { COLORS, goldText, panel, style } from '../ui/theme';

/** Animated title screen with the main menu. */
export class TitleScene extends Phaser.Scene {
  private menu!: Menu;
  private confirm: Menu | null = null;
  private confirmObjs: Phaser.GameObjects.GameObject[] = [];
  private layers: Phaser.GameObjects.TileSprite[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    const world = 'jungle';
    this.layers = [
      this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${world}_sky`).setOrigin(0),
      this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${world}_far`).setOrigin(0),
      this.add.tileSprite(0, 40, VIEW_W, VIEW_H, `bg_${world}_mid`).setOrigin(0),
    ];
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(VIEW_W, VIEW_H);
    this.add.particles(0, 0, 'leaf', { x: { min: 0, max: VIEW_W }, y: -10, speedY: { min: 30, max: 60 }, speedX: { min: -30, max: 20 }, lifespan: 12000, frequency: 350, rotate: { min: 0, max: 360 } });
    // Arin and relic props.
    const arin = this.add.sprite(VIEW_W / 2 + 330, VIEW_H - 120, `arin_${s.save.data.cosmetics.equipped}`, 'victory').setScale(3).setOrigin(0.5, 1);
    this.tweens.add({ targets: arin, y: arin.y - 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const crystal = this.add.sprite(VIEW_W / 2 + 342, VIEW_H - 330, 'crystal', 0).setScale(2.5);
    this.add.image(crystal.x, crystal.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xb65cff).setScale(2).setAlpha(0.6);
    this.tweens.add({ targets: crystal, y: crystal.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const title = this.add.text(90, 130, t('game.title'), { ...style(64, COLORS.gold, true), strokeThickness: 8 }).setOrigin(0, 0.5);
    goldText(title);
    const season = this.add.text(94, 205, t('game.season'), { ...style(44, COLORS.gold, true), strokeThickness: 6 }).setOrigin(0, 0.5);
    goldText(season);
    this.add.text(96, 250, t('game.tagline'), style(20, COLORS.text)).setOrigin(0, 0.5).setAlpha(0.85);

    const hasSave = Object.keys(s.save.data.levels).length > 0 || s.save.data.seenIntro;
    panel(this, 70, 300, 420, hasSave ? 330 : 270, 0.8);
    const items = [
      ...(hasSave ? [{ label: () => t('menu.continue'), onSelect: () => this.startGame(false) }] : []),
      { label: () => t('menu.newGame'), onSelect: () => (hasSave ? this.askNew() : this.startGame(true)) },
      { label: () => t('menu.settings'), onSelect: () => this.openSettings() },
      { label: () => t('menu.credits'), onSelect: () => this.scene.start('Story', { pages: ['credits.body'], next: 'Title' }) },
    ];
    this.menu = new Menu(this, 280, 360, items, s.input, s.audio, { size: 32 });
    this.add.text(VIEW_W / 2, VIEW_H - 24, 'v0.1 · Season 2', style(14, COLORS.dim)).setOrigin(0.5);
    this.input.once('pointerdown', () => s.audio.unlock());
    this.input.keyboard?.once('keydown', () => s.audio.unlock());
    s.audio.playMusic('title');
    this.events.on('resume', () => {
      this.menu.active = true;
      s.input.clearMenu();
    });
  }

  private startGame(fresh: boolean): void {
    const s = GameServices.get(this);
    s.audio.unlock();
    if (fresh) s.save.reset();
    if (!s.save.data.seenIntro) {
      s.save.data.seenIntro = true;
      s.save.save();
      this.scene.start('Story', { pages: ['story.intro.1', 'story.intro.2', 'story.intro.3', 'story.intro.4'], next: 'WorldMap' });
    } else this.scene.start('WorldMap');
  }

  private askNew(): void {
    const s = GameServices.get(this);
    this.menu.active = false;
    const g = panel(this, VIEW_W / 2 - 330, VIEW_H / 2 - 110, 660, 220, 0.97);
    const txt = this.add.text(VIEW_W / 2, VIEW_H / 2 - 50, t('menu.confirmNew'), { ...style(22), wordWrap: { width: 560 }, align: 'center' }).setOrigin(0.5);
    const close = (): void => {
      this.confirm?.destroy();
      this.confirm = null;
      for (const o of this.confirmObjs) o.destroy();
      this.confirmObjs = [];
      this.menu.active = true;
    };
    this.confirm = new Menu(this, VIEW_W / 2, VIEW_H / 2 + 20, [
      { label: () => t('menu.no'), onSelect: close },
      { label: () => t('menu.yes'), onSelect: () => this.startGame(true) },
    ], s.input, s.audio, { size: 28, spacing: 44 });
    this.confirmObjs = [g, txt];
  }

  private openSettings(): void {
    this.menu.active = false;
    this.scene.launch('Settings', { from: 'Title' });
    this.scene.pause();
  }

  override update(time: number): void {
    this.layers.forEach((l, i) => (l.tilePositionX = time * 0.01 * (i + 1)));
    const s = GameServices.get(this);
    if (this.confirm) {
      this.confirm.update();
      if (s.input.consumeMenu('back')) this.confirm.index = 0;
      return;
    }
    this.menu.update();
  }
}
