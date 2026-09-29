import Phaser from 'phaser';
import { generateAll, preloadOverrides } from '../art/AssetRegistry';
import { GameServices } from '../../services';

/** Generates all procedural textures and animations, then shows the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadOverrides(this);
  }

  create(): void {
    const services = GameServices.get(this);
    const t0 = performance.now();
    generateAll(this, services.save.data.cosmetics.equipped);
    this.anims.create({ key: 'flame_anim', frames: this.anims.generateFrameNumbers('flame', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    console.info(`[boot] generated textures in ${Math.round(performance.now() - t0)}ms`);
    const params = new URLSearchParams(location.search);
    const level = params.get('level');
    if (level && services.progression.get(level) && services.devTools) {
      this.scene.start('Game', { levelId: level });
      return;
    }
    this.scene.start('Title');
  }
}
