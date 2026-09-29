import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import type { OutEvent } from '../../core/types';
import { formatTime } from '../../core/util/math';
import { hasKey, t } from '../../i18n';
import { GameServices } from '../../services';
import { TouchControls } from '../ui/TouchControls';
import { COLORS, style } from '../ui/theme';
import type { GameScene } from './GameScene';

/** Unobtrusive HUD: portrait + hearts, collectibles, prompts, hints, toasts, boss bar, touch controls. */
export class HUDScene extends Phaser.Scene {
  private game2!: GameScene;
  private hearts: Phaser.GameObjects.Image[] = [];
  private crystalText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private keyText!: Phaser.GameObjects.Text;
  private keyIcon!: Phaser.GameObjects.Image;
  private prompt!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hintBg!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private toasts: Phaser.GameObjects.Text[] = [];
  private bossName!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossVisible = false;
  private touch: TouchControls | null = null;
  private debugText!: Phaser.GameObjects.Text;
  private lastHealth = -1;
  private lastMax = -1;

  constructor() {
    super('HUD');
  }

  init(data: { game: GameScene }): void {
    this.game2 = data.game;
    this.hearts = [];
    this.toasts = [];
    this.bossVisible = false;
    this.lastHealth = -1;
  }

  create(): void {
    const s = GameServices.get(this);
    const spec = this.game2.spec;
    // Portrait medallion.
    const g = this.add.graphics();
    g.fillStyle(0x0c1018, 0.75).fillCircle(52, 52, 38);
    g.lineStyle(3, 0xc9971f, 1).strokeCircle(52, 52, 38);
    this.add.image(52, 50, `portrait_${s.save.data.cosmetics.equipped}`).setScale(0.95);
    // Right-side counters.
    const panelG = this.add.graphics();
    panelG.fillStyle(0x0c1018, 0.6).fillRoundedRect(VIEW_W - 300, 14, 286, 46, 10);
    panelG.lineStyle(2, 0xc9971f, 0.8).strokeRoundedRect(VIEW_W - 300, 14, 286, 46, 10);
    this.add.image(VIEW_W - 280, 37, 'ui_crystal').setScale(0.9);
    this.crystalText = this.add.text(VIEW_W - 262, 37, '', style(22)).setOrigin(0, 0.5);
    this.add.image(VIEW_W - 170, 37, 'ui_coin').setScale(0.9);
    this.coinText = this.add.text(VIEW_W - 152, 37, '', style(22)).setOrigin(0, 0.5);
    this.add.image(VIEW_W - 80, 37, 'ui_relic').setScale(0.9);
    this.relicText = this.add.text(VIEW_W - 62, 37, '', style(22)).setOrigin(0, 0.5);
    this.keyIcon = this.add.image(110, 92, 'ui_key').setVisible(false);
    this.keyText = this.add.text(128, 92, '', style(20)).setOrigin(0, 0.5);
    this.title = this.add.text(VIEW_W / 2, 30, `${spec.id}  ${hasKey(`level.${spec.id}`) ? t(`level.${spec.id}`) : spec.name}`, style(26, COLORS.gold, true)).setOrigin(0.5);
    this.tweens.add({ targets: this.title, alpha: 0, delay: 3500, duration: 1200 });
    this.hintBg = this.add.graphics();
    this.hint = this.add.text(VIEW_W / 2, VIEW_H - 150, '', { ...style(22), align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5);
    this.prompt = this.add.text(VIEW_W / 2, VIEW_H - 64, '', style(24, COLORS.gold)).setOrigin(0.5);
    this.bossName = this.add.text(VIEW_W / 2, VIEW_H - 76, '', style(22, COLORS.text, true)).setOrigin(0.5).setVisible(false);
    this.bossBar = this.add.graphics();
    this.debugText = this.add.text(10, 130, '', { fontFamily: 'monospace', fontSize: '12px', color: '#aef', backgroundColor: '#000a' }).setVisible(false);

    const set = s.save.data.settings;
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (set.touchControls === 'on' || (set.touchControls === 'auto' && touchCapable)) this.touch = new TouchControls(this, s.input, set.touchScale);
    // Tapping the portrait pauses (touch players have no ESC key).
    const pauseZone = this.add.zone(52, 52, 80, 80).setInteractive();
    pauseZone.on('pointerdown', () => this.game2.openPause());

    this.game2.events.on('ui', this.onUi, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game2.events.off('ui', this.onUi, this);
      this.touch?.destroy();
      this.touch = null;
    });
  }

  private onUi(e: OutEvent): void {
    if (e.kind === 'toast') this.toast(hasKey(e.textKey) ? t(e.textKey, e.params) : e.textKey);
    if (e.kind === 'boss') {
      if (e.state === 'start') {
        this.bossVisible = true;
        const name = t(e.nameKey ?? '');
        this.bossName.setText(name).setVisible(true);
        const banner = this.add.text(VIEW_W / 2, VIEW_H / 2 - 120, name, { ...style(40, COLORS.gold, true), strokeThickness: 7 }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: banner, alpha: 1, duration: 500, yoyo: true, hold: 1600, onComplete: () => banner.destroy() });
      }
      if (e.state === 'defeated') {
        this.bossVisible = false;
        this.bossName.setVisible(false);
      }
    }
  }

  private toast(text: string): void {
    const y = 150 + this.toasts.length * 44;
    const tt = this.add.text(VIEW_W / 2, y, text, { ...style(26, COLORS.gold), align: 'center' }).setOrigin(0.5).setAlpha(0);
    this.toasts.push(tt);
    this.tweens.add({
      targets: tt,
      alpha: 1,
      y: y - 10,
      duration: 300,
      hold: 1900,
      yoyo: true,
      onComplete: () => {
        tt.destroy();
        this.toasts = this.toasts.filter((x) => x !== tt);
      },
    });
  }

  private keyParams(): Record<string, string> {
    const inp = GameServices.get(this).input;
    const out: Record<string, string> = {};
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'attack', 'interact'] as const) out[a] = `[${inp.describe(a)}]`;
    out['key'] = out['interact'] ?? '';
    return out;
  }

  override update(time: number): void {
    const s = GameServices.get(this);
    const w = this.game2.world;
    if (!w) return;
    this.touch?.update();
    const p = w.player;
    // Hearts (rebuild only when changed).
    if (p.health !== this.lastHealth || p.maxHealth !== this.lastMax) {
      if (p.maxHealth !== this.lastMax) {
        for (const h of this.hearts) h.destroy();
        this.hearts = [];
        for (let i = 0; i < p.maxHealth; i++) this.hearts.push(this.add.image(104 + i * 34, 44, 'ui_heart', 0));
      }
      if (p.health < this.lastHealth) this.cameras.main.shake(120, 0.004);
      this.hearts.forEach((h, i) => h.setFrame(i < p.health ? 0 : 2));
      this.lastHealth = p.health;
      this.lastMax = p.maxHealth;
    }
    if (p.health === 1 && !p.dead) this.hearts[0]?.setScale(1 + Math.sin(time / 120) * 0.1);
    const st = w.stats;
    this.crystalText.setText(`${st.crystals}/${st.crystalsTotal}`);
    this.coinText.setText(`${st.coins}`);
    const relicsTotal = s.save.data.collectibles.relics.length + (st.relics > 0 ? 0 : 0);
    this.relicText.setText(`${relicsTotal}`);
    this.keyIcon.setVisible(p.keys > 0);
    this.keyText.setText(p.keys > 0 ? `×${p.keys}` : '');
    const params = this.keyParams();
    const prompt = w.prompt;
    this.prompt.setText(prompt ? t(prompt.textKey, params) : '');
    this.prompt.setAlpha(0.8 + Math.sin(time / 200) * 0.2);
    const hintKey = w.hintKey;
    this.hint.setText(hintKey ? t(hintKey, params) : '');
    this.hintBg.clear();
    if (hintKey) {
      const b = this.hint.getBounds();
      this.hintBg.fillStyle(0x0c1018, 0.65).fillRoundedRect(b.x - 16, b.y - 10, b.width + 32, b.height + 20, 10);
      this.hintBg.lineStyle(2, 0xc9971f, 0.6).strokeRoundedRect(b.x - 16, b.y - 10, b.width + 32, b.height + 20, 10);
    }
    // Boss health bar.
    this.bossBar.clear();
    if (this.bossVisible && w.boss) {
      const bw = 520;
      const x = VIEW_W / 2 - bw / 2;
      const y = VIEW_H - 56;
      this.bossBar.fillStyle(0x0c1018, 0.8).fillRoundedRect(x - 4, y - 4, bw + 8, 22, 6);
      this.bossBar.fillStyle(w.boss.exposed ? 0xff4a8a : 0xb8321a, 1).fillRoundedRect(x, y, bw * w.boss.healthFraction, 14, 4);
      this.bossBar.lineStyle(2, 0xc9971f, 1).strokeRoundedRect(x - 4, y - 4, bw + 8, 22, 6);
      this.bossName.setY(y - 22);
      this.prompt.setY(VIEW_H - 110);
    } else this.prompt.setY(VIEW_H - 64);
    // Debug readout.
    const dbg = s.debug.overlay && s.devTools;
    this.debugText.setVisible(dbg);
    if (dbg) {
      const cam = this.game2.cameras.main;
      const puzzle = w.entities.filter((e) => e.type === 'sequence_lock' || e.type === 'pressure_plate' || e.type === 'light_receiver').map((e) => `${e.id}:${e.active ? 'ON' : 'off'}`).join(' ');
      this.debugText.setText(
        [
          `FPS ${this.game2.fps.toFixed(0)}  level ${w.level.spec.id}  t=${formatTime(w.stats.time)}`,
          `player ${p.x.toFixed(1)},${p.y.toFixed(1)} v=${p.vx.toFixed(0)},${p.vy.toFixed(0)} ${p.state} hp ${p.health}/${p.maxHealth}`,
          `cam ${cam.scrollX.toFixed(0)},${cam.scrollY.toFixed(0)}  checkpoint ${w.currentCheckpoint ?? '-'}  invuln ${w.invulnerable}`,
          `boss ${w.boss ? `${w.boss.state} phase ${w.boss.phaseIndex} stun ${w.boss.stun.toFixed(1)}` : '-'}`,
          `puzzle ${puzzle.slice(0, 160)}`,
          `last events: ${w.eventLog.slice(-4).map((e) => `${e.type}(${e.source})`).join(' ')}`,
          'F1 overlay F2 next checkpoint F3 solve F4 collect F5 restart F6 invuln F7 levels',
        ].join('\n'),
      );
    }
  }
}
