import Phaser from 'phaser';
import { MAX_STEPS_PER_FRAME, SIM_DT } from '../../core/constants';
import { Checkpoint } from '../../core/entities/markers';
import { Pickup } from '../../core/entities/pickups';
import { compileLevel } from '../../core/levels/LevelLoader';
import type { LevelSpec } from '../../core/levels/schema';
import { emptyInput, type OutEvent } from '../../core/types';
import { GameWorld } from '../../core/world/GameWorld';
import { GameServices } from '../../services';
import { ensureOutfit } from '../art/AssetRegistry';
import { DebugOverlay } from '../DebugOverlay';
import { WorldRenderer } from '../WorldRenderer';

const UNIQUE = /^(relic|temple_key|heart_vessel|seal)/;

/** Runs one level: fixed-step simulation + renderer + HUD overlay. */
export class GameScene extends Phaser.Scene {
  world!: GameWorld;
  spec!: LevelSpec;
  private renderer3!: WorldRenderer;
  private services!: GameServices;
  private acc = 0;
  private inp = emptyInput();
  private debug!: DebugOverlay;
  private banked = 0;
  private finished = false;
  private levelId = '1-1';
  private fpsSamples: number[] = [];
  private lastNow = 0;

  constructor() {
    super('Game');
  }

  init(data: { levelId: string }): void {
    this.levelId = data.levelId;
    this.finished = false;
    this.acc = 0;
    this.banked = 0;
    this.lastNow = 0;
  }

  create(): void {
    const s = (this.services = GameServices.get(this));
    const spec = s.progression.get(this.levelId);
    if (!spec) throw new Error(`Unknown level ${this.levelId}`);
    this.spec = spec;
    s.save.data.currentLevel = spec.id;
    s.save.save();
    const compiled = compileLevel(spec);
    if (compiled.errors.length) console.warn(`[level ${spec.id}]`, compiled.errors);
    this.world = new GameWorld(compiled, {
      maxHealth: s.save.data.upgrades.maxHealth,
      owned: s.save.ownedInLevel(spec.id),
      templeKey: s.save.data.collectibles.templeKeys.includes(spec.world),
    });
    this.world.invulnerable = s.debug.invulnerable;
    const set = s.save.data.settings;
    const outfit = ensureOutfit(this, s.save.data.cosmetics.equipped);
    this.renderer3 = new WorldRenderer(this, this.world, s.audio, {
      outfitTexture: outfit,
      screenShake: set.screenShake,
      reducedMotion: set.reducedMotion,
      highContrast: set.highContrast,
      quality: set.quality,
    });
    this.renderer3.onUiEvent = (e) => this.onUiEvent(e);
    this.debug = new DebugOverlay(this, this.world);
    this.debug.setVisible(s.debug.overlay);
    s.audio.playMusic(spec.world);
    s.input.clearMenu();
    this.scene.launch('HUD', { game: this });
    this.scene.bringToTop('HUD');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.lastNow = 0;
      this.services.input.clearMenu();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.debugKey(e.code));
    const intro = spec.introKey;
    if (intro) this.time.delayedCall(400, () => this.events.emit('ui', { kind: 'toast', textKey: intro } satisfies OutEvent));
    // Expose state for automated browser tests.
    (window as unknown as { __game?: unknown }).__game = { scene: this, world: this.world };
  }

  private onUiEvent(e: OutEvent): void {
    if (e.kind === 'boss' && e.state === 'start') this.services.audio.playMusic('boss');
    if (e.kind === 'boss' && e.state === 'defeated') this.services.audio.playMusic(this.spec.world);
    this.events.emit('ui', e);
  }

  override update(time: number, delta: number): void {
    const s = this.services;
    s.input.pollGamepad();
    if (s.input.consumePause() && !this.finished) {
      this.openPause();
      return;
    }
    // Use real elapsed time (Phaser's smoothed delta under-reports on slow frames).
    const now = performance.now();
    const real = this.lastNow ? now - this.lastNow : delta;
    this.lastNow = now;
    this.acc += Math.min(real, 250) / 1000;
    let steps = 0;
    while (this.acc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
      this.world.step(s.input.sample(this.inp));
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.acc = 0;
    this.renderer3.update(time, delta / 1000);
    this.debug.update();
    this.bankUniques();
    if (this.world.completed && this.world.completedTime > 1.6 && !this.finished) this.finish();
    this.fpsSamples.push(real);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
  }

  get fps(): number {
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsSamples.length);
    return avg > 0 ? 1000 / avg : 0;
  }

  /** Relics / keys / vessels / seals are saved the moment they are collected. */
  private bankUniques(): void {
    const c = this.world.stats.collected;
    if (c.length === this.banked) return;
    const fresh = c.slice(this.banked).filter((id) => UNIQUE.test(id));
    this.banked = c.length;
    if (fresh.length || this.world.stats.templeKey || this.world.stats.cosmetics.length) {
      this.services.save.recordCheckpointProgress(this.spec.id, this.spec.world, this.world.stats, fresh);
      this.services.save.save();
    }
  }

  private finish(): void {
    this.finished = true;
    const s = this.services;
    const stats = this.world.stats;
    const prevBest = s.save.data.levels[this.spec.id]?.bestTime ?? null;
    s.save.addCoins(stats.coins);
    s.save.recordCompletion(this.spec.id, this.spec.world, !!this.spec.boss, stats, stats.collected.filter((id) => UNIQUE.test(id)));
    this.scene.stop('HUD');
    this.scene.start('Results', { levelId: this.spec.id, stats: { ...stats }, prevBest });
  }

  openPause(): void {
    this.scene.pause();
    this.scene.pause('HUD');
    this.scene.launch('Pause', { game: this });
  }

  restartLevel(): void {
    this.scene.stop('HUD');
    this.scene.restart({ levelId: this.spec.id });
  }

  restartCheckpoint(): void {
    this.world.restartFromCheckpoint();
  }

  quitToMap(): void {
    this.scene.stop('HUD');
    this.scene.start('WorldMap', { focus: this.spec.id });
  }

  private debugKey(code: string): void {
    const s = this.services;
    if (!s.devTools) return;
    const w = this.world;
    switch (code) {
      case 'F1':
        s.debug.overlay = !s.debug.overlay;
        this.debug.setVisible(s.debug.overlay);
        break;
      case 'F2': {
        const cps = w.entities.filter((e): e is Checkpoint => e instanceof Checkpoint).sort((a, b) => a.x - b.x);
        const next = cps.find((c) => c.x > w.player.x + 40) ?? cps[0];
        if (next) {
          w.player.x = next.cx - w.player.w / 2;
          w.player.y = next.y + next.h - w.player.h;
          w.player.vx = w.player.vy = 0;
        }
        break;
      }
      case 'F3':
        this.debugSolvePuzzle();
        break;
      case 'F4':
        for (const e of w.entities) if (e instanceof Pickup && !e.removed) e.collect(w);
        for (const e of w.entities) if (e.type === 'chest') e.interact(w);
        break;
      case 'F5':
        this.restartLevel();
        break;
      case 'F6':
        s.debug.invulnerable = !s.debug.invulnerable;
        w.invulnerable = s.debug.invulnerable;
        this.events.emit('ui', { kind: 'toast', textKey: s.debug.invulnerable ? 'Invulnerable ON' : 'Invulnerable OFF' } satisfies OutEvent);
        break;
      case 'F7':
        this.scene.pause();
        this.scene.pause('HUD');
        this.scene.launch('LevelSelect', { from: 'Game' });
        break;
      default:
        break;
    }
  }

  /** F3: force the nearest puzzle open (gates, locks, sequence locks) around the player. */
  private debugSolvePuzzle(): void {
    const w = this.world;
    const px = w.player.x;
    for (const e of w.entities) {
      if (Math.abs(e.cx - px) > 900) continue;
      if (e.type === 'sequence_lock' || e.type === 'light_receiver' || e.type === 'pressure_plate') e.active = true;
      if (['gate', 'locked_door', 'secret_door', 'temple_door'].includes(e.type)) e.handleAction(w, { type: 'OPEN_DOOR' });
      if (e.type === 'bridge') e.handleAction(w, { type: 'OPEN_DOOR' });
      if (e.type === 'exit_gate') e.handleAction(w, { type: 'OPEN_DOOR' });
    }
    if (w.boss && w.boss.state === 'fight') w.boss.stun = 6;
  }

  private cleanup(): void {
    this.renderer3?.destroy();
    this.debug?.destroy();
    this.input.keyboard?.removeAllListeners('keydown');
  }
}
