import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { DEFAULT_BINDINGS, type GameAction } from '../../core/save/schema';
import { LANGUAGES, setLanguage, t } from '../../i18n';
import { GameServices } from '../../services';
import { Menu, type MenuItem } from '../ui/Menu';
import { COLORS, panel, style } from '../ui/theme';

const REMAP: GameAction[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'interact', 'pause'];

/** Accessibility & controls settings. Overlay launched from Title or Pause. */
export class SettingsScene extends Phaser.Scene {
  private menu!: Menu;
  private from = 'Title';
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('Settings');
  }

  init(data: { from: string }): void {
    this.from = data.from;
  }

  create(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    const set = s.save.data.settings;
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.6).setOrigin(0);
    panel(this, 190, 26, VIEW_W - 380, VIEW_H - 52, 0.97);
    this.add.text(VIEW_W / 2, 64, t('settings.title'), style(36, COLORS.gold, true)).setOrigin(0.5);
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const onOff = (b: boolean): string => (b ? t('settings.on') : t('settings.off'));
    const vol = (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', label: string): MenuItem => ({
      label: () => `${t(label)}   ◂ ${pct(set[key])} ▸`,
      onAdjust: (d) => {
        set[key] = Math.round(Math.max(0, Math.min(1, set[key] + d * 0.1)) * 10) / 10;
        s.applyAudio();
        this.persist();
      },
    });
    const toggle = (key: 'screenShake' | 'reducedMotion' | 'highContrast', label: string): MenuItem => ({
      label: () => `${t(label)}   ${onOff(set[key])}`,
      onAdjust: () => {
        set[key] = !set[key];
        this.persist();
      },
    });
    const items: MenuItem[] = [
      vol('masterVolume', 'settings.master'),
      vol('musicVolume', 'settings.music'),
      vol('sfxVolume', 'settings.sfx'),
      toggle('screenShake', 'settings.shake'),
      toggle('reducedMotion', 'settings.reducedMotion'),
      toggle('highContrast', 'settings.highContrast'),
      {
        label: () => `${t('settings.touchControls')}   ${t(`settings.${set.touchControls}`)}`,
        onAdjust: (d) => {
          const opts = ['auto', 'on', 'off'] as const;
          set.touchControls = opts[(opts.indexOf(set.touchControls) + d + 3) % 3] as (typeof opts)[number];
          this.persist();
        },
      },
      {
        label: () => `${t('settings.touchScale')}   ◂ ${pct(set.touchScale)} ▸`,
        onAdjust: (d) => {
          set.touchScale = Math.round(Math.max(0.7, Math.min(1.5, set.touchScale + d * 0.1)) * 10) / 10;
          this.persist();
        },
      },
      {
        label: () => `${t('settings.quality')}   ${t(`settings.${set.quality}`)}`,
        onAdjust: () => {
          set.quality = set.quality === 'high' ? 'low' : 'high';
          this.persist();
        },
      },
      {
        label: () => `${t('settings.language')}   ${set.language.toUpperCase()}`,
        onAdjust: (d) => {
          const i = LANGUAGES.indexOf(set.language);
          set.language = LANGUAGES[(i + d + LANGUAGES.length) % LANGUAGES.length] ?? 'en';
          setLanguage(set.language);
          this.persist();
        },
      },
      ...REMAP.map(
        (a): MenuItem => ({
          label: () => `${t(`action.${a}`)}   [${(set.bindings[a] ?? []).map((c) => c.replace(/^Key|^Arrow/, '')).join(' / ')}]`,
          onSelect: () => this.remap(a),
        }),
      ),
      {
        label: () => t('settings.resetControls'),
        onSelect: () => {
          set.bindings = structuredClone(DEFAULT_BINDINGS);
          s.input.setBindings(set.bindings);
          this.persist();
        },
      },
      { label: () => t('menu.back'), onSelect: () => this.close() },
    ];
    this.menu = new Menu(this, 250, 120, items, s.input, s.audio, { size: 21, spacing: 27, align: 'left' });
    this.status = this.add.text(VIEW_W / 2, VIEW_H - 50, '', style(20, COLORS.teal)).setOrigin(0.5);
  }

  private remap(a: GameAction): void {
    const s = GameServices.get(this);
    this.menu.active = false;
    this.status.setText(t('settings.pressKey', { action: t(`action.${a}`) }));
    s.input.captureNext = (code) => {
      const set = s.save.data.settings;
      // Primary key replaced; keep the secondary default so the game stays playable.
      const rest = (set.bindings[a] ?? []).slice(1);
      set.bindings[a] = [code, ...rest.filter((c) => c !== code)];
      s.input.setBindings(set.bindings);
      this.persist();
      this.status.setText('');
      this.time.delayedCall(150, () => {
        this.menu.active = true;
        s.input.clearMenu();
        this.menu.refresh();
      });
    };
  }

  private persist(): void {
    GameServices.get(this).save.save();
  }

  private close(): void {
    const s = GameServices.get(this);
    s.input.clearMenu();
    this.scene.stop();
    this.scene.resume(this.from);
  }

  override update(): void {
    const s = GameServices.get(this);
    s.input.pollGamepad();
    if (this.menu.active && (s.input.consumeMenu('back') || s.input.consumePause())) {
      this.close();
      return;
    }
    this.menu.update();
  }
}
