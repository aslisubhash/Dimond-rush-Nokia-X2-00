import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { Progression } from '../../core/progression';
import { formatTime } from '../../core/util/math';
import type { RunStats } from '../../core/world/GameWorld';
import { t } from '../../i18n';
import { GameServices } from '../../services';
import { Menu } from '../ui/Menu';
import { COLORS, goldText, panel, style } from '../ui/theme';

/** LEVEL COMPLETE summary. Never requires perfection to continue. */
export class ResultsScene extends Phaser.Scene {
  private menu!: Menu;
  private levelId = '';
  private stats!: RunStats;
  private prevBest: number | null = null;

  constructor() {
    super('Results');
  }

  init(data: { levelId: string; stats: RunStats; prevBest: number | null }): void {
    this.levelId = data.levelId;
    this.stats = data.stats;
    this.prevBest = data.prevBest;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    const spec = s.progression.get(this.levelId);
    const world = spec?.world ?? 'jungle';
    this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${world}_sky`).setOrigin(0);
    this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${world}_far`).setOrigin(0).setAlpha(0.7);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.35).setOrigin(0);
    panel(this, VIEW_W / 2 - 330, 60, 660, 600, 0.95);
    goldText(this.add.text(VIEW_W / 2, 110, t('results.title'), { ...style(46, COLORS.gold, true), strokeThickness: 7 }).setOrigin(0.5));
    this.add.text(VIEW_W / 2, 158, `${this.levelId} · ${spec?.name ?? ''}`, style(22, COLORS.text)).setOrigin(0.5);
    const st = this.stats;
    const secretFound = st.secretsFound.length > 0;
    const rows: [string, string, string?][] = [
      [t('results.time'), formatTime(st.time), this.prevBest === null || st.time < this.prevBest ? t('results.newRecord') : undefined],
      [t('results.crystals'), `${st.crystals} / ${st.crystalsTotal}`],
      [t('results.coins'), `${st.coins}`],
      [t('results.secret'), secretFound ? t('results.found') : t('results.notFound')],
      [t('results.relic'), st.relics > 0 ? '✦' : st.collected.some((c) => c.startsWith('relic')) ? '✦' : t('results.none')],
      [t('results.damage'), `${st.damage}`],
    ];
    rows.forEach(([k, v, extra], i) => {
      const y = 220 + i * 50;
      const a = this.add.text(VIEW_W / 2 - 260, y, k, style(24, COLORS.text)).setOrigin(0, 0.5).setAlpha(0);
      const b = this.add.text(VIEW_W / 2 + 260, y, v, style(24, k === t('results.secret') ? (secretFound ? COLORS.purple : COLORS.dim) : COLORS.gold)).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: [a, b], alpha: 1, delay: 200 + i * 160, duration: 250 });
      if (extra) this.add.text(VIEW_W / 2 + 60, y, extra, style(16, COLORS.teal)).setOrigin(0, 0.5);
      this.time.delayedCall(200 + i * 160, () => s.audio.play('coin', { volume: 0.4 }));
    });
    const stars = Progression.stars(st.crystals, st.crystalsTotal);
    this.add.text(VIEW_W / 2, 530, t('results.rating'), style(18, COLORS.dim)).setOrigin(0.5);
    const starText = this.add.text(VIEW_W / 2, 565, '★'.repeat(stars) + '☆'.repeat(5 - stars), { ...style(40, COLORS.gold), strokeThickness: 5 }).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: starText, scale: 1, delay: 1300, duration: 400, ease: 'Back.out' });
    s.audio.playMusic(world);
    const isBoss = !!spec?.boss;
    const next = s.progression.next(this.levelId);
    this.menu = new Menu(this, VIEW_W / 2, 620, [
      { label: () => t('results.continue'), onSelect: () => this.continue(isBoss, world, next) },
      { label: () => t('results.replay'), onSelect: () => this.scene.start('Game', { levelId: this.levelId }) },
    ], s.input, s.audio, { size: 26, spacing: 0, cursor: false });
    // Two items side by side.
    const texts = this.menu.container.list.filter((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text[];
    texts[0]?.setX(-120);
    texts[1]?.setX(120);
  }

  private continue(isBoss: boolean, world: string, next: string | null): void {
    if (isBoss) {
      const pages = [`story.boss.${world}`];
      if (world === 'sky') pages.push('story.ending.1', 'story.ending.2', 'story.ending.3');
      this.scene.start('Story', { pages, next: 'WorldMap', nextData: { focus: next ?? this.levelId }, image: `seal_${world}` });
      return;
    }
    this.scene.start('WorldMap', { focus: next ?? this.levelId });
  }

  override update(): void {
    const s = GameServices.get(this);
    s.input.pollGamepad();
    // Horizontal layout: left/right also navigate.
    if (s.input.consumeMenu('left')) this.menu.index = 0;
    if (s.input.consumeMenu('right')) this.menu.index = 1;
    this.menu.refresh();
    this.menu.update();
  }
}
