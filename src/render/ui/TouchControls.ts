import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import type { InputManager, TouchState } from '../../input/InputManager';

interface Btn {
  key: keyof TouchState | 'dpad';
  x: number;
  y: number;
  r: number;
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/** On-screen virtual D-pad and action buttons (multi-touch). Rendered in the HUD scene. */
export class TouchControls {
  private btns: Btn[] = [];
  private dpad: { x: number; y: number; r: number; base: Phaser.GameObjects.Image; knob: Phaser.GameObjects.Image };
  private visible = true;

  constructor(
    private scene: Phaser.Scene,
    private input: InputManager,
    scale: number,
  ) {
    scene.input.addPointer(3);
    const s = scale;
    const dr = 110 * s;
    this.dpad = {
      x: 40 + dr,
      y: VIEW_H - 40 - dr,
      r: dr,
      base: scene.add.image(40 + dr, VIEW_H - 40 - dr, 'ui_touch_btn').setDisplaySize(dr * 2, dr * 2).setAlpha(0.5).setScrollFactor(0),
      knob: scene.add.image(40 + dr, VIEW_H - 40 - dr, 'ui_touch_btn').setDisplaySize(dr * 0.8, dr * 0.8).setAlpha(0.8).setScrollFactor(0),
    };
    const br = 58 * s;
    const defs: [keyof TouchState, string, number, number][] = [
      ['jump', 'A', VIEW_W - 40 - br, VIEW_H - 40 - br],
      ['attack', 'X', VIEW_W - 40 - br * 3.2, VIEW_H - 40 - br * 0.8],
      ['interact', 'Y', VIEW_W - 40 - br * 1.2, VIEW_H - 40 - br * 3.1],
    ];
    for (const [key, label, x, y] of defs) {
      const img = scene.add.image(x, y, 'ui_touch_btn').setDisplaySize(br * 2, br * 2).setAlpha(0.6).setScrollFactor(0);
      const t = scene.add.text(x, y, label, { fontFamily: 'Nunito, sans-serif', fontSize: `${Math.round(34 * s)}px`, color: '#ffe28a', fontStyle: '800' }).setOrigin(0.5).setScrollFactor(0);
      this.btns.push({ key, x, y, r: br * 1.15, img, label: t });
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.dpad.base.setVisible(v);
    this.dpad.knob.setVisible(v);
    for (const b of this.btns) {
      b.img.setVisible(v);
      b.label.setVisible(v);
    }
  }

  update(): void {
    const st: TouchState = { left: false, right: false, up: false, down: false, jump: false, attack: false, interact: false };
    if (this.visible) {
      const pointers = this.scene.input.manager.pointers;
      let knobX = this.dpad.x;
      let knobY = this.dpad.y;
      for (const p of pointers) {
        if (!p.isDown) continue;
        // Pointer positions are in game coordinates already.
        const dx = p.x - this.dpad.x;
        const dy = p.y - this.dpad.y;
        const d = Math.hypot(dx, dy);
        if (d < this.dpad.r * 1.5 && p.x < VIEW_W / 2) {
          const k = Math.min(1, d / this.dpad.r);
          knobX = this.dpad.x + (dx / (d || 1)) * k * this.dpad.r * 0.6;
          knobY = this.dpad.y + (dy / (d || 1)) * k * this.dpad.r * 0.6;
          if (d > this.dpad.r * 0.25) {
            const a = Math.atan2(dy, dx);
            if (Math.cos(a) > 0.38) st.right = true;
            if (Math.cos(a) < -0.38) st.left = true;
            if (Math.sin(a) < -0.5) st.up = true;
            if (Math.sin(a) > 0.6) st.down = true;
          }
          continue;
        }
        for (const b of this.btns) {
          if (Math.hypot(p.x - b.x, p.y - b.y) < b.r) (st as unknown as Record<string, boolean>)[b.key] = true;
        }
      }
      this.dpad.knob.setPosition(knobX, knobY);
      for (const b of this.btns) b.img.setAlpha((st as unknown as Record<string, boolean>)[b.key] ? 0.95 : 0.55);
    }
    this.input.setTouch(st);
  }

  destroy(): void {
    this.dpad.base.destroy();
    this.dpad.knob.destroy();
    for (const b of this.btns) {
      b.img.destroy();
      b.label.destroy();
    }
    this.input.setTouch({ left: false, right: false, up: false, down: false, jump: false, attack: false, interact: false });
  }
}
