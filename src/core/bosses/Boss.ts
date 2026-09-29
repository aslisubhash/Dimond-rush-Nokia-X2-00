import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { BossCondition, BossPhaseSpec, BossSpec } from '../levels/schema';
import { overlaps, type Rect } from '../util/math';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from '../entities/Entity';
import { createBrain, type BossBrain } from './brains';

export type BossState = 'dormant' | 'intro' | 'fight' | 'defeated' | 'dead';

/**
 * Generic puzzle-boss controller. Phases, stun sources and victory conditions come from level
 * data; the kind-specific `brain` only moves the body and spawns attacks.
 * OBSERVATION → MECHANIC → COUNTERPLAY → VULNERABILITY.
 */
export class Boss extends Entity {
  spec!: BossSpec;
  brain!: BossBrain;
  state: BossState = 'dormant';
  phaseIndex = 0;
  phaseTime = 0;
  phaseHits = 0;
  stun = 0;
  stateTime = 0;
  hitFlash = 0;
  totalHits = 0;
  hitsTaken = 0;
  lastHitSerial = -1;
  prevStunSignal = false;
  bx: number;
  by: number;
  arenaRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tmpBoxes: Rect[] = [];

  constructor(def: EntityDef) {
    super(def);
    this.bx = def.x + TILE / 2;
    this.by = def.y + TILE;
  }

  override init(world: WorldApi): void {
    const spec = world.level.spec.boss;
    if (!spec) throw new Error('boss entity without boss spec');
    this.spec = spec;
    const [ax, ay, aw, ah] = spec.arena;
    this.arenaRect = { x: ax * TILE, y: ay * TILE, w: aw * TILE, h: ah * TILE };
    this.brain = createBrain(spec.kind);
    this.totalHits = spec.phases.reduce((n, p) => n + ('hits' in p.until ? p.until.hits : 0), 0);
    this.brain.reset(this, world);
    this.captureInitial();
  }

  get phase(): BossPhaseSpec | undefined {
    return this.spec.phases[this.phaseIndex];
  }

  get exposed(): boolean {
    const ph = this.phase;
    return this.state === 'fight' && !!ph && (ph.exposed === true || this.stun > 0);
  }

  get healthFraction(): number {
    if (this.totalHits <= 0) return this.state === 'dead' ? 0 : 1;
    return Math.max(0, 1 - this.hitsTaken / this.totalHits);
  }

  param(key: string, fallback: number): number {
    return this.spec.params?.[key] ?? fallback;
  }

  override update(world: WorldApi, dt: number): void {
    this.anim += dt;
    this.stateTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const p = world.player;
    switch (this.state) {
      case 'dormant':
        if (!p.dead && p.x > this.spec.startX * TILE) this.begin(world);
        this.brain.update(this, world, dt, 'dormant');
        break;
      case 'intro':
        this.brain.update(this, world, dt, 'intro');
        if (this.stateTime > 2.4) {
          this.state = 'fight';
          this.stateTime = 0;
          this.enterPhase(world, 0);
        }
        break;
      case 'fight':
        this.updateFight(world, dt);
        break;
      case 'defeated':
        this.brain.update(this, world, dt, 'defeat');
        if (this.stateTime > 1 && Math.floor(this.stateTime * 6) !== Math.floor((this.stateTime - dt) * 6)) {
          const wp = this.brain.bounds(this);
          world.emit({ kind: 'particles', preset: 'boss_hit', x: wp.x + ((this.stateTime * 97) % wp.w), y: wp.y + ((this.stateTime * 53) % wp.h), count: 10 });
          world.emit({ kind: 'sound', id: 'explosion', volume: 0.6 });
        }
        if (this.stateTime > 3.2) {
          this.state = 'dead';
          this.active = true;
          world.emit({ kind: 'flash', color: 0xffffff, duration: 0.5 });
          world.emit({ kind: 'shake', intensity: 0.012, duration: 0.6 });
          world.emit({ kind: 'boss', state: 'defeated', nameKey: this.spec.nameKey });
          for (const g of this.spec.gates ?? []) world.runAction({ type: 'OPEN_DOOR', target: g });
          for (const a of this.spec.onDefeat ?? []) world.runAction(a);
          world.fire('BOSS_DEFEATED', this.id);
        }
        break;
      case 'dead':
        break;
    }
  }

  private begin(world: WorldApi): void {
    this.state = 'intro';
    this.stateTime = 0;
    for (const g of this.spec.gates ?? []) world.runAction({ type: 'CLOSE_DOOR', target: g });
    world.emit({ kind: 'boss', state: 'start', nameKey: this.spec.nameKey });
    world.emit({ kind: 'sound', id: 'boss_roar' });
    world.emit({ kind: 'shake', intensity: 0.008, duration: 0.8 });
  }

  private enterPhase(world: WorldApi, index: number): void {
    this.phaseIndex = index;
    this.phaseTime = 0;
    this.phaseHits = 0;
    this.stun = 0;
    const ph = this.phase;
    if (!ph) return;
    this.prevStunSignal = ph.stunOn ? !!world.getEntity(ph.stunOn)?.active : false;
    for (const a of ph.enter ?? []) world.runAction(a, this.id);
    world.emit({ kind: 'boss', state: 'phase', phase: index, nameKey: this.spec.nameKey });
    if (ph.textKey) world.emit({ kind: 'toast', textKey: ph.textKey });
    world.fire('BOSS_PHASE', this.id, index);
    this.brain.onPhase?.(this, world, ph);
  }

  private conditionMet(world: WorldApi, c: BossCondition): boolean {
    if ('time' in c) return this.phaseTime >= c.time;
    if ('hits' in c) return this.phaseHits >= c.hits;
    if ('signal' in c) return !!world.getEntity(c.signal)?.active;
    return c.allSignals.every((id) => !!world.getEntity(id)?.active);
  }

  private updateFight(world: WorldApi, dt: number): void {
    const ph = this.phase;
    if (!ph) return;
    this.phaseTime += dt;

    // Stun from the environment (rising edge of the stun signal).
    if (ph.stunOn) {
      const sig = !!world.getEntity(ph.stunOn)?.active;
      if (sig && !this.prevStunSignal && this.stun <= 0 && this.brain.canStun(this)) {
        this.stun = ph.stunDuration ?? 5;
        world.emit({ kind: 'sound', id: 'boss_stun' });
        world.emit({ kind: 'shake', intensity: 0.01, duration: 0.4 });
        world.emit({ kind: 'toast', textKey: 'toast.bossStunned' });
      }
      this.prevStunSignal = sig;
    }
    if (this.stun > 0) {
      this.stun -= dt;
      if (this.stun <= 0) {
        this.stun = 0;
        for (const a of ph.afterStun ?? []) world.runAction(a, this.id);
      }
    }

    this.brain.update(this, world, dt, this.stun > 0 ? 'stunned' : ph.pattern);

    // Player strikes the weak point.
    const p = world.player;
    if (this.exposed && p.attackBox && p.attackSerial !== this.lastHitSerial) {
      const wp = this.brain.weakPoint(this);
      if (wp && overlaps(wp, p.attackBox)) {
        this.lastHitSerial = p.attackSerial;
        this.phaseHits++;
        this.hitsTaken++;
        this.hitFlash = 0.35;
        world.emit({ kind: 'sound', id: 'boss_hit' });
        world.emit({ kind: 'particles', preset: 'boss_hit', x: wp.x + wp.w / 2, y: wp.y + wp.h / 2, count: 22 });
        world.emit({ kind: 'shake', intensity: 0.007, duration: 0.2 });
        world.knockPlayer(p.x + p.w / 2 < wp.x + wp.w / 2 ? -260 : 260, -300);
        if ('hits' in ph.until && this.phaseHits >= ph.until.hits) this.stun = 0;
      }
    }
    // Body contact.
    if (this.stun <= 0 && !p.dead) {
      for (const r of this.brain.hurtBoxes(this, this.tmpBoxes)) {
        if (overlaps(r, p)) {
          world.damagePlayer(1, r.x + r.w / 2, 'boss');
          break;
        }
      }
    }

    if (this.conditionMet(world, ph.until)) {
      if (this.phaseIndex + 1 >= this.spec.phases.length) {
        this.state = 'defeated';
        this.stateTime = 0;
        this.hitsTaken = this.totalHits;
        world.emit({ kind: 'sound', id: 'boss_defeat' });
        world.emit({ kind: 'shake', intensity: 0.01, duration: 1.2 });
      } else this.enterPhase(world, this.phaseIndex + 1);
    }
  }

  /** Called by the world when the player dies during the fight. */
  resetFight(world: WorldApi): void {
    if (this.state === 'dead' || this.state === 'defeated') return;
    this.restoreInitial();
    this.state = 'dormant';
    this.brain.reset(this, world);
  }
}
