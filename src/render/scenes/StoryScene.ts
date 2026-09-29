import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { t } from '../../i18n';
import { GameServices } from '../../services';
import { COLORS, panel, style } from '../ui/theme';

interface StoryData {
  pages: string[];
  next: string;
  nextData?: object;
  image?: string;
}

/** Narrative text pages (intro, boss memories, lore, ending). Skippable. */
export class StoryScene extends Phaser.Scene {
  private pages: string[] = [];
  private idx = 0;
  private text!: Phaser.GameObjects.Text;
  private dataIn!: StoryData;
  private typed = 0;

  constructor() {
    super('Story');
  }

  init(data: StoryData): void {
    this.dataIn = data;
    this.pages = data.pages;
    this.idx = 0;
    this.typed = 0;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    this.cameras.main.setBackgroundColor('#07060a');
    this.add.particles(0, 0, 'soft', { x: { min: 0, max: VIEW_W }, y: { min: 0, max: VIEW_H }, lifespan: 5000, frequency: 120, scale: { start: 0.6, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: [0xffe28a, 0xb65cff], blendMode: 'ADD', speedY: { min: -20, max: -5 } });
    if (this.dataIn.image) this.add.image(VIEW_W / 2, 200, this.dataIn.image).setScale(3);
    panel(this, 140, VIEW_H - 330, VIEW_W - 280, 250, 0.9);
    this.text = this.add.text(180, VIEW_H - 300, '', { ...style(26, COLORS.text), wordWrap: { width: VIEW_W - 360 }, lineSpacing: 10 });
    this.add.text(VIEW_W - 170, VIEW_H - 110, t('story.continue'), style(20, COLORS.gold)).setOrigin(1, 0.5);
    this.input.on('pointerdown', () => this.advance());
  }

  private advance(): void {
    const full = t(this.pages[this.idx] ?? '');
    if (this.typed < full.length) {
      this.typed = full.length;
      return;
    }
    GameServices.get(this).audio.play('ui_select');
    this.idx++;
    this.typed = 0;
    if (this.idx >= this.pages.length) this.scene.start(this.dataIn.next, this.dataIn.nextData);
  }

  override update(_time: number, delta: number): void {
    const s = GameServices.get(this);
    const full = t(this.pages[this.idx] ?? '');
    this.typed = Math.min(full.length, this.typed + delta * 0.05);
    this.text?.setText(full.slice(0, Math.floor(this.typed)));
    if (s.input.consumeMenu('confirm')) this.advance();
    if (s.input.consumeMenu('back') || s.input.consumePause()) this.scene.start(this.dataIn.next, this.dataIn.nextData);
  }
}
