import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../../core/constants';
import type { BackdropSpec } from '../../core/levels/schema';
import type { WorldId } from '../../core/types';
import { hash2 } from '../../core/util/math';
import { DECO } from '../art/decoArt';
import { DEPTH } from '../layers';

const WEATHER_DEFAULT: Record<WorldId, NonNullable<BackdropSpec['weather']>> = {
  jungle: 'leaves',
  desert: 'sand',
  crystal: 'motes',
  volcano: 'embers',
  ice: 'snow',
  sky: 'motes',
};

/** Parallax layers, light shafts, weather and foreground framing. */
export class Backdrop {
  private layers: { img: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private shafts: Phaser.GameObjects.Image[] = [];
  private weather: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private t = 0;

  constructor(
    private scene: Phaser.Scene,
    world: WorldId,
    spec: BackdropSpec | undefined,
    levelW: number,
    levelH: number,
    reducedMotion: boolean,
  ) {
    const defs: [string, number, number][] = [
      [`bg_${world}_sky`, 0.05, DEPTH.BACKGROUND_SKY],
      [`bg_${world}_far`, 0.2, DEPTH.BACKGROUND_DECORATION],
      [`bg_${world}_mid`, 0.45, DEPTH.FAR_MIDGROUND],
    ];
    for (const [key, f, depth] of defs) {
      const img = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H + 40, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
      this.layers.push({ img, f });
    }
    // Atmospheric depth: fog band over the midground.
    const fog = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.FAR_MIDGROUND + 1);
    const fogCol: Record<WorldId, number> = { jungle: 0x9fc27a, desert: 0xf0c27a, crystal: 0x4b3f9c, volcano: 0xff6a2a, ice: 0xcfe6ff, sky: 0xffffff };
    for (let i = 0; i < 12; i++) {
      fog.fillStyle(fogCol[world], 0.018 * (12 - i));
      fog.fillRect(0, VIEW_H - i * 26 - 60, VIEW_W, 26);
    }
    this.objs.push(fog);

    if (spec?.lightShafts || world === 'sky' || world === 'desert') {
      for (let x = 200; x < levelW; x += 520 + Math.floor(hash2(x, 1, 9) * 300)) {
        const s = scene.add.image(x, -40, 'shaft').setOrigin(0.5, 0).setScrollFactor(0.85, 0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.LIGHT_SHAFTS);
        s.setScale(1.4 + hash2(x, 2, 9), 1.6).setAngle(-14).setAlpha(0.3);
        this.shafts.push(s);
      }
    }

    const weather = spec?.weather ?? WEATHER_DEFAULT[world];
    if (weather !== 'none' && !reducedMotion) this.weather = this.makeWeather(weather);

    // Foreground framing silhouettes along the bottom edge.
    const fgKey = `deco_${world}_${world === 'sky' ? DECO.tuft : DECO.plant}`;
    for (let x = 300; x < levelW; x += 640 + Math.floor(hash2(x, 3, 5) * 400)) {
      const img = scene.add.image(x, levelH + 70, fgKey).setOrigin(0.5, 1).setScrollFactor(1.15, 1).setDepth(DEPTH.FOREGROUND);
      img.setScale(2.4).setTint(world === 'sky' ? 0xffffff : 0x0b0f0b).setAlpha(world === 'sky' ? 0.6 : 0.75);
      this.objs.push(img);
    }
  }

  private makeWeather(kind: NonNullable<BackdropSpec['weather']>): Phaser.GameObjects.Particles.ParticleEmitter | null {
    const cfg: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { texture: string }> = {
      leaves: { texture: 'leaf', x: { min: 0, max: VIEW_W + 200 }, y: -20, speedX: { min: -40, max: 20 }, speedY: { min: 30, max: 70 }, lifespan: 9000, frequency: 420, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.6 } },
      sand: { texture: 'pixel2', x: VIEW_W + 20, y: { min: 0, max: VIEW_H }, speedX: { min: -320, max: -180 }, speedY: { min: -10, max: 30 }, lifespan: 7000, frequency: 40, tint: [0xe8c270, 0xf6d58c], alpha: 0.7, scale: { min: 1, max: 2 } },
      embers: { texture: 'spark', x: { min: 0, max: VIEW_W }, y: VIEW_H + 20, speedY: { min: -90, max: -40 }, speedX: { min: -20, max: 20 }, lifespan: 9000, frequency: 90, tint: [0xffb31f, 0xff5a1f], blendMode: 'ADD', scale: { start: 0.9, end: 0.2 }, alpha: { start: 1, end: 0 } },
      snow: { texture: 'flake', x: { min: -100, max: VIEW_W + 100 }, y: -10, speedY: { min: 40, max: 90 }, speedX: { min: -30, max: 10 }, lifespan: 12000, frequency: 60 },
      blizzard: { texture: 'flake', x: VIEW_W + 20, y: { min: -100, max: VIEW_H }, speedX: { min: -520, max: -300 }, speedY: { min: 40, max: 120 }, lifespan: 5000, frequency: 12 },
      motes: { texture: 'soft', x: { min: 0, max: VIEW_W }, y: { min: 0, max: VIEW_H }, speedY: { min: -15, max: 5 }, speedX: { min: -8, max: 8 }, lifespan: 6000, frequency: 160, blendMode: 'ADD', tint: [0xfff6cf, 0xe0a8ff], scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.8, end: 0 } },
      clouds: { texture: 'soft', x: VIEW_W + 60, y: { min: 0, max: VIEW_H }, speedX: { min: -80, max: -40 }, lifespan: 20000, frequency: 900, scale: 6, alpha: 0.2 },
    };
    const c = cfg[kind];
    if (!c || !this.scene.textures.exists(c.texture)) return null;
    const { texture, ...rest } = c;
    const em = this.scene.add.particles(0, 0, texture, { ...rest, maxParticles: 260 });
    em.setScrollFactor(0).setDepth(DEPTH.WEATHER);
    return em;
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, dt: number): void {
    this.t += dt;
    for (const l of this.layers) {
      l.img.tilePositionX = cam.scrollX * l.f;
      l.img.y = -Math.min(40, Math.max(0, cam.scrollY * l.f * 0.15));
    }
    for (const [i, s] of this.shafts.entries()) s.setAlpha(0.18 + Math.sin(this.t * 0.6 + i * 1.7) * 0.08);
  }

  destroy(): void {
    for (const l of this.layers) l.img.destroy();
    for (const s of this.shafts) s.destroy();
    for (const o of this.objs) o.destroy();
    this.weather?.destroy();
  }
}
