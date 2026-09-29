import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import { DEPTH } from '../layers';

export interface LightSpot {
  x: number;
  y: number;
  r: number;
}

/**
 * Darkness overlay for dark levels: a screen-sized render texture filled with ambient darkness
 * from which light sprites are erased each frame.
 */
export class Lighting {
  private rt: Phaser.GameObjects.RenderTexture | null = null;
  private stamp: Phaser.GameObjects.Image;
  readonly spots: LightSpot[] = [];
  private count = 0;

  constructor(
    scene: Phaser.Scene,
    private darkness: number,
  ) {
    this.stamp = scene.make.image({ key: 'light', add: false });
    if (darkness > 0) {
      this.rt = scene.add.renderTexture(0, 0, VIEW_W, VIEW_H).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.LIGHTING);
    }
  }

  get active(): boolean {
    return !!this.rt;
  }

  begin(): void {
    this.count = 0;
  }

  add(x: number, y: number, r: number): void {
    if (!this.rt) return;
    let s = this.spots[this.count];
    if (!s) {
      s = { x, y, r };
      this.spots.push(s);
    } else {
      s.x = x;
      s.y = y;
      s.r = r;
    }
    this.count++;
  }

  render(cam: Phaser.Cameras.Scene2D.Camera): void {
    const rt = this.rt;
    if (!rt) return;
    rt.clear();
    rt.fill(0x05030a, this.darkness);
    for (let i = 0; i < this.count; i++) {
      const s = this.spots[i] as LightSpot;
      const sx = s.x - cam.scrollX;
      const sy = s.y - cam.scrollY;
      if (sx < -s.r || sy < -s.r || sx > VIEW_W + s.r || sy > VIEW_H + s.r) continue;
      this.stamp.setScale((s.r * 2) / 256);
      rt.erase(this.stamp, sx, sy);
    }
  }

  destroy(): void {
    this.rt?.destroy();
    this.stamp.destroy();
  }
}
