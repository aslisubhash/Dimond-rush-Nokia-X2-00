import Phaser from 'phaser';
import type { InputManager } from '../../input/InputManager';
import type { AudioEngine } from '../../audio/AudioEngine';
import { COLORS, style } from './theme';

export interface MenuItem {
  label: () => string;
  onSelect?: () => void;
  /** Left/right adjustment (sliders, toggles). */
  onAdjust?: (dir: -1 | 1) => void;
  enabled?: () => boolean;
}

/** Keyboard / gamepad / pointer navigable vertical menu. */
export class Menu {
  index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Text;
  readonly container: Phaser.GameObjects.Container;
  active = true;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    private items: MenuItem[],
    private input: InputManager,
    private audio: AudioEngine,
    opts: { size?: number; spacing?: number; align?: 'center' | 'left' } = {},
  ) {
    const size = opts.size ?? 30;
    const spacing = opts.spacing ?? size * 1.55;
    const origin = opts.align === 'left' ? 0 : 0.5;
    this.container = scene.add.container(x, y);
    items.forEach((it, i) => {
      const t = scene.add.text(0, i * spacing, it.label(), style(size)).setOrigin(origin, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        if (!this.active) return;
        if (this.index !== i) this.audio.play('ui_move');
        this.index = i;
        this.refresh();
      });
      t.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.active) return;
        this.index = i;
        this.audio.unlock();
        if (it.onAdjust && !it.onSelect) {
          const dir = p.x > t.getBounds().centerX ? 1 : -1;
          it.onAdjust(dir);
          this.audio.play('ui_move');
        } else this.select();
        this.refresh();
      });
      this.texts.push(t);
      this.container.add(t);
    });
    this.cursor = scene.add.text(0, 0, '◆', style(size * 0.6, COLORS.gold)).setOrigin(0.5);
    this.container.add(this.cursor);
    this.refresh();
  }

  private enabled(i: number): boolean {
    return this.items[i]?.enabled?.() ?? true;
  }

  refresh(): void {
    this.texts.forEach((t, i) => {
      const it = this.items[i];
      if (!it) return;
      t.setText(it.label());
      const sel = i === this.index;
      t.setColor(!this.enabled(i) ? COLORS.dim : sel ? COLORS.gold : COLORS.text);
      t.setScale(sel ? 1.06 : 1);
    });
    const cur = this.texts[this.index];
    if (cur) {
      const b = cur.getBounds();
      this.cursor.setPosition(cur.originX === 0 ? -24 : -b.width / 2 - 26, cur.y);
    }
  }

  private select(): void {
    const it = this.items[this.index];
    if (!it || !this.enabled(this.index)) {
      this.audio.play('locked');
      return;
    }
    this.audio.play('ui_select');
    it.onSelect?.();
  }

  update(): void {
    if (!this.active) return;
    const inp = this.input;
    const n = this.items.length;
    if (inp.consumeMenu('up')) {
      this.index = (this.index + n - 1) % n;
      this.audio.play('ui_move');
      this.refresh();
    }
    if (inp.consumeMenu('down')) {
      this.index = (this.index + 1) % n;
      this.audio.play('ui_move');
      this.refresh();
    }
    const it = this.items[this.index];
    if (it?.onAdjust) {
      if (inp.consumeMenu('left')) {
        it.onAdjust(-1);
        this.audio.play('ui_move');
        this.refresh();
      }
      if (inp.consumeMenu('right')) {
        it.onAdjust(1);
        this.audio.play('ui_move');
        this.refresh();
      }
    } else {
      inp.consumeMenu('left');
      inp.consumeMenu('right');
    }
    if (inp.consumeMenu('confirm')) {
      if (it?.onSelect) this.select();
      else if (it?.onAdjust) {
        it.onAdjust(1);
        this.refresh();
      }
    }
    this.cursor.setAlpha(0.7 + Math.sin(this.scene.time.now / 150) * 0.3);
  }

  destroy(): void {
    this.container.destroy();
  }
}
