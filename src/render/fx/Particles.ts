import Phaser from 'phaser';
import { DEPTH } from '../layers';

interface Preset {
  texture: string;
  frame?: number;
  speed: [number, number];
  angle: [number, number];
  life: [number, number];
  scale: [number, number];
  alpha: [number, number];
  gravity: number;
  tint: number[];
  blend: Phaser.BlendModes | string;
  rotate?: boolean;
  count: number;
}

const ADD = Phaser.BlendModes.ADD;
const NORMAL = Phaser.BlendModes.NORMAL;

/** Named, pooled particle presets (one emitter each; explode() reuses pooled particles). */
export const PRESETS: Record<string, Preset> = {
  dust: { texture: 'soft', speed: [20, 70], angle: [200, 340], life: [300, 600], scale: [0.9, 0.2], alpha: [0.6, 0], gravity: -20, tint: [0xd8c8a8, 0xb8a888], blend: NORMAL, count: 6 },
  water_splash: { texture: 'pixel2', speed: [80, 260], angle: [220, 320], life: [350, 700], scale: [2, 1], alpha: [1, 0], gravity: 700, tint: [0xbff5ff, 0x7fd8f0, 0xffffff], blend: NORMAL, count: 12 },
  bubbles: { texture: 'bubble', speed: [20, 50], angle: [250, 290], life: [500, 1000], scale: [0.8, 0.5], alpha: [0.9, 0], gravity: -120, tint: [0xffffff], blend: NORMAL, count: 4 },
  crystal_pickup: { texture: 'spark', speed: [60, 220], angle: [0, 360], life: [300, 700], scale: [1.2, 0], alpha: [1, 0], gravity: 0, tint: [0xe0a8ff, 0xb65cff, 0xffffff], blend: ADD, count: 14 },
  coin_pickup: { texture: 'spark', speed: [50, 160], angle: [200, 340], life: [250, 550], scale: [1, 0], alpha: [1, 0], gravity: 300, tint: [0xffd35a, 0xfff2a8], blend: ADD, count: 8 },
  heart_pickup: { texture: 'spark', speed: [40, 140], angle: [0, 360], life: [300, 600], scale: [1.2, 0], alpha: [1, 0], gravity: -60, tint: [0xff6a7a, 0xffd0d0], blend: ADD, count: 10 },
  leaf: { texture: 'leaf', speed: [20, 60], angle: [60, 120], life: [2500, 4000], scale: [1, 1], alpha: [1, 0.2], gravity: 25, tint: [0xffffff, 0xd8ffb0], blend: NORMAL, rotate: true, count: 1 },
  fire: { texture: 'soft', speed: [20, 70], angle: [250, 290], life: [300, 650], scale: [1.4, 0.2], alpha: [1, 0], gravity: -160, tint: [0xffb31f, 0xff5a1f, 0xffe28a], blend: ADD, count: 8 },
  smoke: { texture: 'soft', speed: [10, 40], angle: [250, 290], life: [700, 1300], scale: [1.2, 2.4], alpha: [0.45, 0], gravity: -40, tint: [0x555555, 0x777777], blend: NORMAL, count: 6 },
  steam: { texture: 'soft', speed: [20, 50], angle: [250, 290], life: [600, 1100], scale: [1, 2.6], alpha: [0.5, 0], gravity: -60, tint: [0xffffff, 0xdddddd], blend: NORMAL, count: 6 },
  lava_spark: { texture: 'spark', speed: [80, 260], angle: [210, 330], life: [300, 800], scale: [1, 0.3], alpha: [1, 0], gravity: 500, tint: [0xffd35a, 0xff7a1f, 0xff3a10], blend: ADD, count: 12 },
  ember: { texture: 'spark', speed: [10, 40], angle: [250, 290], life: [2000, 4000], scale: [0.7, 0.2], alpha: [1, 0], gravity: -25, tint: [0xffb31f, 0xff5a1f], blend: ADD, count: 1 },
  ice_shard: { texture: 'pixel2', speed: [80, 240], angle: [200, 340], life: [300, 700], scale: [2.5, 1], alpha: [1, 0], gravity: 800, tint: [0xffffff, 0xbfe6ff, 0x86b8de], blend: NORMAL, count: 12 },
  snow: { texture: 'flake', speed: [20, 60], angle: [95, 125], life: [4000, 6000], scale: [1, 0.8], alpha: [0.9, 0.3], gravity: 10, tint: [0xffffff], blend: NORMAL, count: 1 },
  sand: { texture: 'pixel2', speed: [20, 80], angle: [160, 200], life: [800, 1600], scale: [1.5, 1], alpha: [0.8, 0], gravity: 60, tint: [0xe8c270, 0xf6d58c, 0xc99a52], blend: NORMAL, count: 3 },
  wind: { texture: 'wind_streak', speed: [300, 500], angle: [-3, 3], life: [400, 800], scale: [1, 1.4], alpha: [0.5, 0], gravity: 0, tint: [0xffffff], blend: NORMAL, count: 1 },
  magic: { texture: 'spark', speed: [30, 140], angle: [0, 360], life: [300, 700], scale: [1, 0], alpha: [1, 0], gravity: -40, tint: [0xffffff], blend: ADD, count: 8 },
  light_beam: { texture: 'soft', speed: [40, 120], angle: [0, 360], life: [300, 600], scale: [1.5, 0], alpha: [0.9, 0], gravity: 0, tint: [0xfff2c0, 0xffe28a], blend: ADD, count: 10 },
  motes: { texture: 'soft', speed: [5, 20], angle: [0, 360], life: [3000, 5000], scale: [0.5, 0.1], alpha: [0.7, 0], gravity: -5, tint: [0xfff6cf, 0xe0a8ff], blend: ADD, count: 1 },
  boss_hit: { texture: 'spark', speed: [120, 380], angle: [0, 360], life: [250, 600], scale: [1.8, 0], alpha: [1, 0], gravity: 200, tint: [0xffffff, 0xffe28a, 0xff9a6a], blend: ADD, count: 18 },
  enemy_death: { texture: 'soft', speed: [60, 200], angle: [0, 360], life: [300, 700], scale: [1.4, 0], alpha: [0.9, 0], gravity: 0, tint: [0xffffff, 0xd0c0ff], blend: ADD, count: 16 },
  hurt: { texture: 'spark', speed: [60, 180], angle: [0, 360], life: [200, 400], scale: [1.2, 0], alpha: [1, 0], gravity: 300, tint: [0xff5a5a, 0xffffff], blend: ADD, count: 10 },
  death: { texture: 'soft', speed: [40, 200], angle: [0, 360], life: [500, 1200], scale: [1.5, 0], alpha: [1, 0], gravity: -30, tint: [0xffffff, 0xffe28a, 0xb65cff], blend: ADD, count: 30 },
  chest_open: { texture: 'spark', speed: [80, 260], angle: [230, 310], life: [400, 900], scale: [1.4, 0], alpha: [1, 0], gravity: 250, tint: [0xffd35a, 0xffffff], blend: ADD, count: 24 },
  secret_found: { texture: 'spark', speed: [60, 240], angle: [0, 360], life: [500, 1100], scale: [1.6, 0], alpha: [1, 0], gravity: -30, tint: [0xe0a8ff, 0xffffff, 0x7cf2c9], blend: ADD, count: 28 },
  echo: { texture: 'glow', speed: [0, 0], angle: [0, 0], life: [700, 700], scale: [0.2, 1.6], alpha: [0.8, 0], gravity: 0, tint: [0x9fe6ff], blend: ADD, count: 1 },
};

export class ParticleFX {
  private emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  enabled = true;
  reduced = false;

  constructor(private readonly scene: Phaser.Scene) {
    for (const name of Object.keys(PRESETS)) this.create(name, name, null);
  }

  private create(key: string, name: string, tintOverride: number | null): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    const p = PRESETS[name];
    if (!p || !this.scene.textures.exists(p.texture)) return undefined;
    const em = this.scene.add.particles(0, 0, p.texture, {
      speed: { min: p.speed[0], max: p.speed[1] },
      angle: { min: p.angle[0], max: p.angle[1] },
      lifespan: { min: p.life[0], max: p.life[1] },
      scale: { start: p.scale[0], end: p.scale[1] },
      alpha: { start: p.alpha[0], end: p.alpha[1] },
      gravityY: p.gravity,
      tint: tintOverride ?? p.tint,
      blendMode: p.blend,
      rotate: p.rotate ? { min: 0, max: 360 } : 0,
      emitting: false,
      maxParticles: name === 'leaf' || name === 'snow' || name === 'ember' || name === 'motes' ? 90 : 220,
    });
    em.setDepth(name === 'snow' || name === 'leaf' || name === 'motes' ? DEPTH.WEATHER : DEPTH.PARTICLES);
    this.emitters.set(key, em);
    return em;
  }

  burst(preset: string, x: number, y: number, count?: number, color?: number): void {
    if (!this.enabled) return;
    const em = this.emitters.get(preset);
    if (!em) return;
    let n = count ?? PRESETS[preset]?.count ?? 6;
    if (this.reduced) n = Math.ceil(n / 3);
    if (color !== undefined) {
      // Coloured bursts use a dedicated emitter whose tint is set per burst.
      const key = `${preset}#tinted`;
      const tinted = this.emitters.get(key) ?? this.create(key, preset, 0xffffff);
      if (tinted) {
        tinted.particleTint = color;
        tinted.explode(n, x, y);
      }
      return;
    }
    em.explode(n, x, y);
  }

  emitter(preset: string): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    return this.emitters.get(preset);
  }

  destroy(): void {
    for (const e of this.emitters.values()) e.destroy();
    this.emitters.clear();
  }
}
