import Phaser from 'phaser';
import { TILE } from '../core/constants';
import type { GameWorld } from '../core/world/GameWorld';
import { DEPTH } from './layers';

/** Developer overlay: collision boxes, ids, trigger connections, states. World-space part. */
export class DebugOverlay {
  private g: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  visible = false;

  constructor(
    private scene: Phaser.Scene,
    private world: GameWorld,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.DEBUG);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.g.setVisible(v);
    for (const l of this.labels) l.setVisible(false);
  }

  update(): void {
    if (!this.visible) return;
    const g = this.g.clear();
    const w = this.world;
    const cam = this.scene.cameras.main;
    const view = new Phaser.Geom.Rectangle(cam.scrollX - 64, cam.scrollY - 64, cam.width + 128, cam.height + 128);
    // Solid tiles near the camera.
    g.lineStyle(1, 0x00ff88, 0.25);
    const tx0 = Math.max(0, Math.floor(view.x / TILE));
    const tx1 = Math.min(w.map.cols - 1, Math.floor(view.right / TILE));
    const ty0 = Math.max(0, Math.floor(view.y / TILE));
    const ty1 = Math.min(w.map.rows - 1, Math.floor(view.bottom / TILE));
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (w.map.isSolid(x, y)) g.strokeRect(x * TILE, y * TILE, TILE, TILE);
    const p = w.player;
    g.lineStyle(2, 0x00ffff, 1).strokeRect(p.x, p.y, p.w, p.h);
    if (p.attackBox) g.lineStyle(2, 0xff0000, 1).strokeRect(p.attackBox.x, p.attackBox.y, p.attackBox.w, p.attackBox.h);
    let li = 0;
    for (const e of w.entities) {
      if (!view.contains(e.cx, e.cy)) continue;
      const col = e.solidKind() === 'full' ? 0xff8800 : e.solidKind() === 'top' ? 0xffff00 : e.active ? 0x66ff66 : 0x8888ff;
      g.lineStyle(1, col, 0.9).strokeRect(e.x, e.y, e.w, e.h);
      for (const src of e.requires) {
        const s = w.getEntity(src);
        if (s) g.lineStyle(1, s.active ? 0x66ff66 : 0xff6666, 0.8).lineBetween(s.cx, s.cy, e.cx, e.cy);
      }
      let label = this.labels[li];
      if (!label) {
        label = this.scene.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', backgroundColor: '#00000088' }).setDepth(DEPTH.DEBUG + 1);
        this.labels.push(label);
      }
      label.setVisible(true).setPosition(e.x, e.y - 12).setText(`${e.id}${e.active ? '*' : ''}${e.powered ? '⚡' : ''}`);
      li++;
    }
    for (let i = li; i < this.labels.length; i++) this.labels[i]?.setVisible(false);
    if (w.boss) {
      const wp = w.boss.brain.weakPoint(w.boss);
      if (wp) g.lineStyle(2, w.boss.exposed ? 0xff00ff : 0x884488, 1).strokeRect(wp.x, wp.y, wp.w, wp.h);
      const boxes: { x: number; y: number; w: number; h: number }[] = [];
      for (const r of w.boss.brain.hurtBoxes(w.boss, boxes)) g.lineStyle(1, 0xff0000, 0.8).strokeRect(r.x, r.y, r.w, r.h);
      const a = w.boss.arenaRect;
      g.lineStyle(2, 0xffffff, 0.3).strokeRect(a.x, a.y, a.w, a.h);
    }
  }

  destroy(): void {
    this.g.destroy();
    for (const l of this.labels) l.destroy();
  }
}
