import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import type { LevelSpec } from '../../core/levels/schema';
import { WORLD_ORDER, type WorldId } from '../../core/types';
import { formatTime } from '../../core/util/math';
import { hasKey, t } from '../../i18n';
import { GameServices } from '../../services';
import { ensureOutfit } from '../art/AssetRegistry';
import { OUTFITS } from '../art/playerArt';
import { COLORS, goldText, panel, style } from '../ui/theme';

/** Node layout for 8 levels (normalized within the map area). */
const NODE_POS: [number, number][] = [
  [0.08, 0.72],
  [0.2, 0.46],
  [0.33, 0.66],
  [0.45, 0.38],
  [0.57, 0.62],
  [0.68, 0.34],
  [0.8, 0.58],
  [0.93, 0.36],
];

const MAP = { x: 60, y: 120, w: VIEW_W - 120, h: 390 };

/** Season 2 world map: six worlds × eight level nodes. */
export class WorldMapScene extends Phaser.Scene {
  private worldIdx = 0;
  private nodeIdx = 0;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private arin!: Phaser.GameObjects.Sprite;
  private info!: Phaser.GameObjects.Text;
  private info2!: Phaser.GameObjects.Text;
  private focus: string | null = null;
  private tabs: Phaser.GameObjects.Text[] = [];
  private loreBtn!: Phaser.GameObjects.Text;
  private outfitBtn!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldMap');
  }

  init(data: { focus?: string }): void {
    this.focus = data?.focus ?? null;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    const target = this.focus && s.progression.isUnlocked(this.focus, s.save.data) ? this.focus : s.progression.frontier(s.save.data);
    const spec = s.progression.get(target);
    this.worldIdx = Math.max(0, WORLD_ORDER.indexOf(spec?.world ?? 'jungle'));
    this.nodeIdx = Math.max(0, (spec?.index ?? 1) - 1);
    goldText(this.add.text(VIEW_W / 2, 30, t('map.title'), { ...style(34, COLORS.gold, true), strokeThickness: 6 }).setOrigin(0.5).setDepth(10));
    this.tabs = WORLD_ORDER.map((w, i) => {
      const tab = this.add.text(120 + i * 208, 78, t(`world.${w}`), style(17)).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
      tab.on('pointerdown', () => this.setWorld(i));
      return tab;
    });
    panel(this, 40, 520, VIEW_W - 80, 180, 0.9).setDepth(10);
    this.info = this.add.text(70, 545, '', style(26, COLORS.gold, true)).setDepth(11);
    this.info2 = this.add.text(70, 590, '', { ...style(19), lineSpacing: 6, wordWrap: { width: 740 } }).setDepth(11);
    this.loreBtn = this.add.text(VIEW_W - 70, 560, '', style(20, COLORS.purple)).setOrigin(1, 0.5).setDepth(11).setInteractive({ useHandCursor: true });
    this.loreBtn.on('pointerdown', () => this.openLore());
    this.outfitBtn = this.add.text(VIEW_W - 70, 600, '', style(20, COLORS.teal)).setOrigin(1, 0.5).setDepth(11).setInteractive({ useHandCursor: true });
    this.outfitBtn.on('pointerdown', () => this.cycleOutfit());
    this.add.text(VIEW_W - 70, 660, '◂ ▸ level   ▴ ▾ world   JUMP play   ESC title', style(15, COLORS.dim)).setOrigin(1, 0.5).setDepth(11);
    this.arin = this.add.sprite(0, 0, ensureOutfit(this, s.save.data.cosmetics.equipped), 'idle0').setOrigin(0.5, 1).setScale(1.4).setDepth(9);
    this.build();
    this.input.on('pointerdown', () => s.audio.unlock());
    s.audio.playMusic(WORLD_ORDER[this.worldIdx] as WorldId);
  }

  private get worldId(): WorldId {
    return WORLD_ORDER[this.worldIdx] as WorldId;
  }

  private levels(): LevelSpec[] {
    return GameServices.get(this).progression.levelsOf(this.worldId);
  }

  private setWorld(i: number): void {
    const s = GameServices.get(this);
    const w = WORLD_ORDER[i];
    if (!w || !s.progression.worldUnlocked(w, s.save.data)) {
      s.audio.play('locked');
      return;
    }
    this.worldIdx = i;
    this.nodeIdx = 0;
    s.audio.play('ui_select');
    s.audio.playMusic(w);
    this.build();
  }

  private nodeXY(i: number): [number, number] {
    const [nx, ny] = NODE_POS[i] ?? [0.5, 0.5];
    return [MAP.x + nx * MAP.w, MAP.y + ny * MAP.h];
  }

  private build(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const s = GameServices.get(this);
    const save = s.save.data;
    const w = this.worldId;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objs.push(o);
      return o;
    };
    add(this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${w}_sky`).setOrigin(0).setDepth(0));
    add(this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_${w}_far`).setOrigin(0).setDepth(1));
    add(this.add.tileSprite(0, 60, VIEW_W, VIEW_H, `bg_${w}_mid`).setOrigin(0).setDepth(2).setAlpha(0.7));
    add(this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(3));
    add(this.add.text(VIEW_W / 2, MAP.y + 6, t(`world.${w}.rule`), style(18, COLORS.text)).setOrigin(0.5).setDepth(8).setAlpha(0.85));
    this.tabs.forEach((tab, i) => {
      const ww = WORLD_ORDER[i] as WorldId;
      const unlocked = s.progression.worldUnlocked(ww, save);
      tab.setColor(i === this.worldIdx ? COLORS.gold : unlocked ? COLORS.text : COLORS.dim).setText((unlocked ? '' : '🔒 ') + t(`world.${ww}`) + (save.bosses.includes(ww) ? ' ✦' : ''));
    });
    const levels = this.levels();
    const g = add(this.add.graphics().setDepth(4));
    for (let i = 0; i < levels.length - 1; i++) {
      const [x0, y0] = this.nodeXY(i);
      const [x1, y1] = this.nodeXY(i + 1);
      const open = s.progression.isUnlocked(levels[i + 1]?.id ?? '', save);
      g.lineStyle(6, 0x000000, 0.4).lineBetween(x0, y0 + 3, x1, y1 + 3);
      g.lineStyle(4, open ? 0xffd56a : 0x6a6458, 1).lineBetween(x0, y0, x1, y1);
    }
    levels.forEach((lv, i) => {
      const [x, y] = this.nodeXY(i);
      const rec = save.levels[lv.id];
      const unlocked = s.progression.isUnlocked(lv.id, save);
      const boss = !!lv.boss;
      const r = boss ? 1.5 : 1;
      if (rec?.completed) add(this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd56a).setScale(boss ? 1.3 : 0.9).setAlpha(0.7).setDepth(5));
      const node = add(this.add.image(x, y, 'ui_node').setScale(r).setDepth(6).setInteractive({ useHandCursor: true }));
      node.setTint(rec?.completed ? 0xffd56a : unlocked ? 0xffffff : 0x3a3630);
      node.on('pointerdown', () => {
        if (this.nodeIdx === i) this.play();
        else {
          this.nodeIdx = i;
          this.refresh();
        }
      });
      add(this.add.text(x, y, boss ? '♛' : lv.id, { ...style(boss ? 26 : 14, unlocked ? '#1a1210' : '#8a8478'), strokeThickness: 0 }).setOrigin(0.5).setDepth(7));
      if (rec?.secretFound) add(this.add.circle(x + 20 * r, y - 18 * r, 7, 0xb65cff).setStrokeStyle(2, 0xffffff).setDepth(7));
      if (!unlocked) add(this.add.text(x, y + 30 * r, '🔒', style(14)).setOrigin(0.5).setDepth(7));
    });
    this.refresh();
  }

  private refresh(): void {
    const s = GameServices.get(this);
    const save = s.save.data;
    const levels = this.levels();
    this.nodeIdx = Math.max(0, Math.min(levels.length - 1, this.nodeIdx));
    const lv = levels[this.nodeIdx];
    if (!lv) {
      this.info.setText(t(`world.${this.worldId}`));
      this.info2.setText('');
      return;
    }
    const [x, y] = this.nodeXY(this.nodeIdx);
    this.tweens.killTweensOf(this.arin);
    this.tweens.add({ targets: this.arin, x, y: y - 16, duration: 220, ease: 'Sine.out' });
    const rec = save.levels[lv.id];
    const unlocked = s.progression.isUnlocked(lv.id, save);
    this.info.setText(`${lv.id}  ${hasKey(`level.${lv.id}`) ? t(`level.${lv.id}`) : lv.name}`);
    const lines: string[] = [];
    if (!unlocked) lines.push(t('map.locked'));
    else if (rec?.completed) lines.push(t('map.best', { time: formatTime(rec.bestTime ?? 0), c: rec.bestCrystals, t: rec.crystalsTotal }) + (rec.secretFound ? `   ✦ ${t('hud.secretFound')}` : ''));
    else lines.push(t('map.select'));
    const lvIds = levels.map((l) => l.id);
    const relics = s.save.relicsInWorld(lvIds);
    lines.push(`${t('map.relics', { n: relics })}   ·   ${t('map.crystals', { n: s.save.totalCrystals() })}   ·   ${t(`world.seal.${this.worldId}`)} ${save.collectibles.seals.includes(this.worldId) ? '✦' : '—'}`);
    this.info2.setText(lines.join('\n'));
    this.loreBtn.setText(relics >= 3 ? `▸ ${t('menu.lore')}` : `${t('menu.lore')} (${relics}/3)`).setColor(relics >= 3 ? COLORS.purple : COLORS.dim);
    const outfit = save.cosmetics.equipped;
    this.outfitBtn.setText(t('menu.outfit', { name: outfit }) + (save.cosmetics.unlocked.length > 1 ? ' ⟳' : ''));
  }

  private play(): void {
    const s = GameServices.get(this);
    const lv = this.levels()[this.nodeIdx];
    if (!lv || !s.progression.isUnlocked(lv.id, s.save.data)) {
      s.audio.play('locked');
      return;
    }
    s.audio.unlock();
    s.audio.play('ui_select');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', { levelId: lv.id }));
  }

  private openLore(): void {
    const s = GameServices.get(this);
    const relics = s.save.relicsInWorld(this.levels().map((l) => l.id));
    if (relics < 3) {
      s.audio.play('locked');
      return;
    }
    this.scene.start('Story', { pages: [`lore.${this.worldId}`], next: 'WorldMap', nextData: { focus: this.levels()[this.nodeIdx]?.id }, image: 'relic' });
  }

  private cycleOutfit(): void {
    const s = GameServices.get(this);
    const c = s.save.data.cosmetics;
    const list = c.unlocked.filter((o) => OUTFITS[o]);
    if (list.length < 2) return;
    c.equipped = list[(list.indexOf(c.equipped) + 1) % list.length] ?? 'classic';
    s.save.save();
    this.arin.setTexture(ensureOutfit(this, c.equipped), 'victory');
    this.refresh();
  }

  override update(time: number): void {
    const s = GameServices.get(this);
    s.input.pollGamepad();
    const inp = s.input;
    const n = this.levels().length;
    if (inp.consumeMenu('left')) {
      if (this.nodeIdx > 0) this.nodeIdx--;
      else if (this.worldIdx > 0) {
        this.setWorld(this.worldIdx - 1);
        this.nodeIdx = 7;
      }
      s.audio.play('ui_move');
      this.refresh();
    }
    if (inp.consumeMenu('right')) {
      if (this.nodeIdx < n - 1) this.nodeIdx++;
      else if (this.worldIdx < WORLD_ORDER.length - 1 && s.progression.worldUnlocked(WORLD_ORDER[this.worldIdx + 1] as WorldId, s.save.data)) this.setWorld(this.worldIdx + 1);
      s.audio.play('ui_move');
      this.refresh();
    }
    if (inp.consumeMenu('up') && this.worldIdx > 0) this.setWorld(this.worldIdx - 1);
    if (inp.consumeMenu('down') && this.worldIdx < WORLD_ORDER.length - 1) this.setWorld(this.worldIdx + 1);
    if (inp.consumeMenu('confirm')) this.play();
    if (inp.consumeMenu('back') || inp.consumePause()) this.scene.start('Title');
    this.arin.setFrame(Math.floor(time / 500) % 2 ? 'idle0' : 'idle1');
  }
}
