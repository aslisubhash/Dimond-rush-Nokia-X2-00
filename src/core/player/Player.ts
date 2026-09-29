import { TILE } from '../constants';
import { Tile } from '../levels/legend';
import type { MoveResult, SolidProvider } from '../physics/Collision';
import type { Facing, InputState } from '../types';
import { approach, clamp, type Rect } from '../util/math';
import { StateMachine } from '../util/StateMachine';
import type { PlayerView, WorldApi } from '../world/WorldApi';
import { isCarrier, isPushable, isStepReactive, type Pushable } from '../entities/traits';
import { PLAYER } from './playerConfig';

export type PlayerState =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'FALL'
  | 'LAND'
  | 'CROUCH'
  | 'SWIM'
  | 'CLIMB'
  | 'PUSH'
  | 'PULL'
  | 'HURT'
  | 'ATTACK'
  | 'DEATH'
  | 'VICTORY';

const GROUND_STATES: ReadonlySet<PlayerState> = new Set(['IDLE', 'RUN', 'LAND', 'CROUCH', 'PUSH', 'PULL']);

/**
 * Arin. Deterministic fixed-step controller built on a finite state machine.
 * Pure simulation: no rendering or DOM dependencies.
 */
export class Player implements PlayerView {
  x: number;
  y: number;
  w: number = PLAYER.width;
  h: number = PLAYER.height;
  vx = 0;
  vy = 0;
  facing: Facing = 1;
  grounded = false;
  groundRef: SolidProvider | null = null;
  groundTile = false;
  groundFriction = 1;
  groundSpeed = 1;
  dead = false;
  health: number;
  maxHealth: number;
  keys = 0;
  crouching = false;
  swimming = false;
  climbing = false;
  attackBox: Rect | null = null;
  attackSerial = 0;
  invuln = 0;
  /** Last safe standing position (feet center) used after pits / quicksand. */
  safeX: number;
  safeY: number;
  respawnX: number;
  respawnY: number;
  /** Set by the world when the death animation finished. */
  deathDone = false;
  /** Frame counters for the renderer. */
  runDistance = 0;
  landImpact = 0;

  readonly fsm: StateMachine<PlayerState, Player>;
  input: InputState;
  private world!: WorldApi;
  private coyote = 0;
  private jumpBuffer = 0;
  private attackCooldown = 0;
  private safeTimer = 0;
  /** Object currently being pushed or pulled (renderer uses it for arm poses). */
  pushTarget: Pushable | null = null;
  private jumpHeld = false;
  /** Horizontal wind acceleration at the player this step. */
  windX = 0;
  private dropTimer = 0;
  private hurtDir = 0;
  private readonly moveRes: MoveResult = { hitX: false, hitY: false, blockerX: null, blockerY: null };

  constructor(spawnX: number, spawnY: number, maxHealth: number, input: InputState) {
    this.x = spawnX - PLAYER.width / 2;
    this.y = spawnY - PLAYER.height;
    this.safeX = spawnX;
    this.safeY = spawnY;
    this.respawnX = spawnX;
    this.respawnY = spawnY;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.input = input;
    this.fsm = new StateMachine<PlayerState, Player>(this, 'IDLE', {
      IDLE: { update: (p, dt) => p.updateGround(dt) },
      RUN: { update: (p, dt) => p.updateGround(dt) },
      LAND: { update: (p, dt) => p.updateGround(dt) },
      PUSH: { update: (p, dt) => p.updateGround(dt), exit: (p) => (p.pushTarget = null) },
      PULL: { update: (p, dt) => p.updateGround(dt), exit: (p) => (p.pushTarget = null) },
      CROUCH: {
        enter: (p) => p.setCrouch(true),
        update: (p, dt) => p.updateGround(dt),
        exit: (p) => p.setCrouch(false),
      },
      JUMP: { update: (p, dt) => p.updateAir(dt) },
      FALL: { update: (p, dt) => p.updateAir(dt) },
      SWIM: {
        enter: (p) => {
          p.swimming = true;
          p.vy *= 0.35;
          p.world.emit({ kind: 'particles', preset: 'water_splash', x: p.x + p.w / 2, y: p.y + p.h / 2, count: 14 });
          p.world.emit({ kind: 'sound', id: 'splash' });
        },
        update: (p, dt) => p.updateSwim(dt),
        exit: (p) => (p.swimming = false),
      },
      CLIMB: {
        enter: (p) => {
          p.climbing = true;
          p.vx = 0;
          p.vy = 0;
        },
        update: (p, dt) => p.updateClimb(dt),
        exit: (p) => (p.climbing = false),
      },
      HURT: { update: (p, dt) => p.updateHurt(dt) },
      ATTACK: {
        enter: (p) => {
          p.attackSerial++;
          p.attackCooldown = PLAYER.attackCooldown;
          p.world.emit({ kind: 'sound', id: 'attack' });
        },
        update: (p, dt) => p.updateAttack(dt),
        exit: (p) => (p.attackBox = null),
      },
      DEATH: {
        enter: (p) => {
          p.dead = true;
          p.vx = 0;
          p.vy = -420;
          p.attackBox = null;
          p.world.emit({ kind: 'particles', preset: 'death', x: p.x + p.w / 2, y: p.y + p.h / 2, count: 30 });
          p.world.emit({ kind: 'sound', id: 'death' });
          p.world.emit({ kind: 'shake', intensity: 0.006, duration: 0.25 });
        },
        update: (p, dt) => p.updateDeath(dt),
      },
      VICTORY: {
        enter: (p) => {
          p.vx = 0;
          p.attackBox = null;
        },
        update: (p, dt) => {
          p.vy = Math.min(p.vy + PLAYER.gravity * dt, PLAYER.maxFall);
          p.moveY(p.vy * dt);
        },
      },
    });
  }

  get state(): PlayerState {
    return this.fsm.state;
  }

  get feetX(): number {
    return this.x + this.w / 2;
  }

  get feetY(): number {
    return this.y + this.h;
  }

  attach(world: WorldApi): void {
    this.world = world;
  }

  step(dt: number): void {
    const w = this.world;
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.jumpBuffer = this.input.jumpPressed ? PLAYER.jumpBuffer : Math.max(0, this.jumpBuffer - dt);
    if (!this.input.jump) this.jumpHeld = false;

    // Ride moving solids before own movement.
    if (this.grounded && this.groundRef && isCarrier(this.groundRef)) {
      const c = this.groundRef;
      if (c.carryDx) this.moveX(c.carryDx);
      if (c.carryDy) {
        if (c.carryDy < 0) this.moveY(c.carryDy, this.groundRef);
        else this.y += c.carryDy;
      }
    }

    // Wind: airborne bodies accelerate; grounded ones drift (see updateGround).
    this.windX = 0;
    if (!this.dead && this.fsm.state !== 'CLIMB') {
      const wind = w.windAt(this.x + this.w / 2, this.y + this.h / 2);
      this.windX = wind.ax;
      if (!this.grounded && (wind.ax || wind.ay)) {
        this.vx += wind.ax * dt;
        this.vy += wind.ay * dt;
      }
    }

    this.fsm.update(dt);
    if (this.dead || this.fsm.state === 'VICTORY') return;

    this.checkEnvironment(dt);
  }

  // ---------------------------------------------------------------- states

  private horizontalIntent(): number {
    const i = this.input;
    if (i.axisX !== 0) return clamp(i.axisX, -1, 1);
    return (i.right ? 1 : 0) - (i.left ? 1 : 0);
  }

  private targetSpeed(): number {
    const mag = Math.abs(this.input.axisX);
    const walking = this.input.walk || (mag > 0 && mag < 0.6);
    return walking ? PLAYER.walkSpeed : PLAYER.runSpeed;
  }

  private updateGround(dt: number): void {
    const i = this.input;
    const fsm = this.fsm;
    const dir = this.horizontalIntent();
    const crouch = fsm.state === 'CROUCH';

    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

    // Climb onto a ladder/vine.
    if (i.up && this.overlapClimbable() && !crouch) {
      this.snapToClimbable();
      fsm.change('CLIMB');
      return;
    }
    if (i.down && this.climbableBelow()) {
      this.snapToClimbable(true);
      this.y += 4;
      fsm.change('CLIMB');
      return;
    }

    // Jump / drop-through.
    if (this.jumpBuffer > 0) {
      if (i.down && this.standingOnOneWay()) {
        this.dropTimer = 0.2;
        this.jumpBuffer = 0;
        this.grounded = false;
        this.y += 2;
        fsm.change('FALL');
        return;
      }
      if (!crouch || this.hasHeadroom(PLAYER.height)) {
        this.doJump();
        return;
      }
    }

    if (i.attackPressed && this.attackCooldown <= 0 && !crouch) {
      fsm.change('ATTACK');
      return;
    }

    // Crouch.
    if (i.down && !crouch && fsm.state !== 'PUSH') {
      fsm.change('CROUCH');
      return;
    }
    if (crouch && !i.down && this.hasHeadroom(PLAYER.height)) {
      fsm.change(Math.abs(this.vx) > 5 ? 'RUN' : 'IDLE');
      return;
    }

    let maxSpeed = crouch ? PLAYER.crawlSpeed : this.targetSpeed();
    maxSpeed *= this.groundSpeed;
    if (fsm.state === 'PUSH') maxSpeed = PLAYER.pushSpeed;
    if (fsm.state === 'PULL') maxSpeed = PLAYER.pullSpeed;
    const accel = PLAYER.groundAccel * this.groundFriction;
    const decel = PLAYER.groundDecel * this.groundFriction;
    const drift = clamp(this.windX * 0.11, -190, 190);
    if (dir !== 0 || drift !== 0) {
      const target = dir * maxSpeed + drift;
      const turning = Math.sign(this.vx) !== Math.sign(target) && this.vx !== 0;
      this.vx = approach(this.vx, target, (turning ? accel + decel : accel) * dt);
    } else {
      this.vx = approach(this.vx, 0, decel * dt);
    }

    // Pull: hold interact while facing a pullable object and move away from it.
    let pulled: Pushable | null = null;
    if (i.interact && dir !== 0) {
      const behind = this.adjacentPushable(-dir as Facing);
      if (behind && behind.pullable) {
        pulled = behind;
        this.facing = (-dir) as Facing;
      }
    }

    this.vy = 0;
    const mr = this.resetRes();
    const want = this.vx * dt;
    const moved = this.moveX(want, mr);

    let pushing: Pushable | null = null;
    if (mr.hitX && dir !== 0 && Math.sign(want) === dir && mr.blockerX && isPushable(mr.blockerX) && !crouch) {
      pushing = mr.blockerX;
      const pushDx = dir * PLAYER.pushSpeed * dt;
      const got = pushing.tryPush(this.world, pushDx);
      if (got !== 0) this.moveX(got);
      this.vx = got / dt;
    } else if (mr.hitX) {
      this.vx = 0;
    }
    const pullTarget = pulled as Pushable | null;
    if (pullTarget && moved !== 0) pullTarget.tryPush(this.world, moved);

    if (Math.abs(this.vx) > 1) this.runDistance += Math.abs(this.vx) * dt;

    this.probeGround();
    if (!this.grounded) {
      this.coyote = PLAYER.coyoteTime;
      fsm.change('FALL');
      return;
    }

    if (fsm.state === 'LAND' && fsm.time < PLAYER.landTime) return;
    if (crouch) return;
    if (pushing) {
      this.pushTarget = pushing;
      fsm.change('PUSH');
    } else if (pulled) {
      this.pushTarget = pulled;
      fsm.change('PULL');
    } else if (Math.abs(this.vx) > 8 || dir !== 0) fsm.change('RUN');
    else fsm.change('IDLE');
  }

  private doJump(): void {
    this.vy = -PLAYER.jumpVelocity;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.grounded = false;
    this.groundRef = null;
    this.jumpHeld = true;
    this.fsm.change('JUMP');
    this.world.emit({ kind: 'sound', id: 'jump' });
    this.world.emit({ kind: 'particles', preset: 'dust', x: this.feetX, y: this.feetY, count: 5 });
  }

  private updateAir(dt: number): void {
    const i = this.input;
    const fsm = this.fsm;
    this.coyote = Math.max(0, this.coyote - dt);
    const dir = this.horizontalIntent();
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

    if (this.jumpBuffer > 0 && this.coyote > 0 && fsm.state === 'FALL') {
      this.doJump();
      return;
    }
    if (i.up && this.overlapClimbable() && this.vy > -300) {
      this.snapToClimbable();
      fsm.change('CLIMB');
      return;
    }
    if (i.attackPressed && this.attackCooldown <= 0) {
      fsm.change('ATTACK');
      return;
    }

    const maxSpeed = this.targetSpeed();
    if (dir !== 0) this.vx = approach(this.vx, dir * maxSpeed, PLAYER.airAccel * dt);
    else this.vx = approach(this.vx, 0, PLAYER.airDecel * dt);

    // Variable jump height.
    if (fsm.state === 'JUMP' && !this.jumpHeld && this.vy < 0) {
      this.vy *= PLAYER.jumpCutMul;
      this.jumpHeld = true; // apply once
    }
    const g = this.vy > 0 ? PLAYER.gravity * PLAYER.fallGravityMul : PLAYER.gravity;
    this.vy = Math.min(this.vy + g * dt, PLAYER.maxFall);
    if (fsm.state === 'JUMP' && this.vy >= 0) fsm.change('FALL');

    this.integrateAir(dt);
    if (this.grounded) {
      this.landImpact = this.lastFallSpeed;
      if (this.lastFallSpeed > 520) {
        this.world.emit({ kind: 'particles', preset: 'dust', x: this.feetX, y: this.feetY, count: 8 });
        this.world.emit({ kind: 'sound', id: 'land' });
        if (this.lastFallSpeed > 820) this.world.emit({ kind: 'shake', intensity: 0.003, duration: 0.12 });
      }
      fsm.change('LAND');
    }
  }

  private lastFallSpeed = 0;

  /** Shared airborne integration with collision. Sets grounded when landing. */
  private integrateAir(dt: number): void {
    const mr = this.moveRes;
    mr.hitX = mr.hitY = false;
    mr.blockerX = mr.blockerY = null;
    this.moveX(this.vx * dt, mr);
    if (mr.hitX) this.vx = 0;
    const falling = this.vy;
    this.moveY(this.vy * dt, null, mr);
    if (mr.hitY) {
      if (falling > 0) {
        this.lastFallSpeed = falling;
        this.vy = 0;
        this.probeGround();
      } else {
        this.vy = 0;
        this.world.emit({ kind: 'sound', id: 'bump', volume: 0.4 });
      }
    } else {
      this.grounded = false;
      this.groundRef = null;
    }
  }

  private updateSwim(dt: number): void {
    const i = this.input;
    const water = this.world.waterAt(this.x + this.w / 2, this.y + this.h * 0.45);
    if (!water) {
      this.fsm.change(this.vy < 0 ? 'JUMP' : 'FALL');
      return;
    }
    const dir = this.horizontalIntent();
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
    this.vx = approach(this.vx, dir * PLAYER.swimSpeed, 900 * dt);
    const nearSurface = this.y < water.surfaceY + 6;
    if (i.jumpPressed) {
      if (nearSurface) {
        this.vy = -PLAYER.swimExitJump;
        this.jumpHeld = true;
        this.world.emit({ kind: 'particles', preset: 'water_splash', x: this.feetX, y: water.surfaceY, count: 10 });
        this.world.emit({ kind: 'sound', id: 'swim' });
        this.fsm.change('JUMP');
        return;
      } else {
        this.vy = -PLAYER.swimStroke;
        this.world.emit({ kind: 'sound', id: 'swim', volume: 0.5 });
        this.world.emit({ kind: 'particles', preset: 'bubbles', x: this.feetX, y: this.y, count: 4 });
      }
    }
    const floatY = water.surfaceY - 12;
    if (i.up && !nearSurface) this.vy = approach(this.vy, -PLAYER.swimSpeed, 900 * dt);
    else if (i.down) this.vy = approach(this.vy, PLAYER.swimSpeed, 900 * dt);
    else if (this.y > floatY + 2) this.vy = approach(this.vy, -110, 700 * dt);
    else if (this.y < floatY - 2) this.vy = Math.min(this.vy + PLAYER.gravity * dt, PLAYER.swimMaxSink);
    else this.vy = approach(this.vy, 0, 900 * dt);
    if (i.attackPressed && this.attackCooldown <= 0) {
      this.attackSerial++;
      this.attackCooldown = PLAYER.attackCooldown;
    }
    this.integrateAir(dt);
    if (this.grounded) this.vy = 0;
  }

  private updateClimb(dt: number): void {
    const i = this.input;
    if (this.jumpBuffer > 0) {
      const dir = this.horizontalIntent();
      this.vy = -PLAYER.climbJump;
      this.vx = dir * PLAYER.runSpeed * 0.8;
      if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
      this.jumpBuffer = 0;
      this.jumpHeld = true;
      this.fsm.change('JUMP');
      this.world.emit({ kind: 'sound', id: 'jump' });
      return;
    }
    const vine = this.onVine();
    const vy = (i.down ? 1 : 0) - (i.up ? 1 : 0);
    const dir = this.horizontalIntent();
    this.vy = vy * PLAYER.climbSpeed;
    this.vx = vine ? dir * PLAYER.climbSpeed * 0.6 : 0;
    const mr = this.moveRes;
    mr.hitX = mr.hitY = false;
    this.moveX(this.vx * dt, mr);
    const beforeY = this.y;
    this.moveY(this.vy * dt, null, mr);
    if (vy !== 0 || this.vx !== 0) this.runDistance += Math.abs(this.y - beforeY) + Math.abs(this.vx * dt);

    if (!this.overlapClimbable()) {
      // Reached the top: pop up onto the ledge.
      if (vy < 0) {
        this.vy = -200;
        this.fsm.change('FALL');
      } else this.fsm.change('FALL');
      return;
    }
    if (vy > 0 && mr.hitY) {
      this.probeGround();
      if (this.grounded) this.fsm.change('IDLE');
    }
  }

  private updateAttack(dt: number): void {
    const t = this.fsm.time;
    const airborne = !this.grounded;
    if (airborne) {
      const g = this.vy > 0 ? PLAYER.gravity * PLAYER.fallGravityMul : PLAYER.gravity;
      this.vy = Math.min(this.vy + g * dt, PLAYER.maxFall);
      this.integrateAir(dt);
    } else {
      this.vx = approach(this.vx, 0, PLAYER.groundDecel * dt);
      this.moveX(this.vx * dt);
      this.probeGround();
      if (!this.grounded) this.vy = 0;
    }
    if (t >= PLAYER.attackActiveStart && t <= PLAYER.attackActiveEnd) {
      const reach = PLAYER.attackReach;
      this.attackBox = {
        x: this.facing > 0 ? this.x + this.w - 4 : this.x - reach + 4,
        y: this.y + 6,
        w: reach,
        h: 30,
      };
    } else this.attackBox = null;
    if (t >= PLAYER.attackTime) {
      this.attackBox = null;
      if (this.grounded) this.fsm.change(Math.abs(this.vx) > 8 ? 'RUN' : 'IDLE');
      else this.fsm.change('FALL');
    }
  }

  private updateHurt(dt: number): void {
    this.vx = approach(this.vx, 0, 500 * dt);
    this.vy = Math.min(this.vy + PLAYER.gravity * dt, PLAYER.maxFall);
    this.integrateAir(dt);
    if (this.fsm.time >= PLAYER.hurtTime) this.fsm.change(this.grounded ? 'IDLE' : 'FALL');
    void this.hurtDir;
  }

  private updateDeath(dt: number): void {
    if (this.fsm.time < 0.25) return; // brief freeze
    this.vy = Math.min(this.vy + PLAYER.gravity * 0.6 * dt, PLAYER.maxFall);
    this.y += this.vy * dt * 0.3;
    if (this.fsm.time >= PLAYER.deathTime) this.deathDone = true;
  }

  // ------------------------------------------------------------ helpers

  private resetRes(): MoveResult {
    const r = this.moveRes;
    r.hitX = r.hitY = false;
    r.blockerX = r.blockerY = null;
    return r;
  }

  private moveX(dx: number, res?: MoveResult): number {
    return this.world.collision.moveX(this, dx, null, res);
  }

  private moveY(dy: number, ignore?: SolidProvider | null, res?: MoveResult): number {
    const body = this as { x: number; y: number; w: number; h: number; dropThrough?: boolean };
    body.dropThrough = this.dropTimer > 0 || (this.fsm.state === 'CLIMB' && this.input.down);
    return this.world.collision.moveY(body, dy, ignore ?? null, res);
  }

  dropThrough = false;

  probeGround(): void {
    this.dropThrough = this.dropTimer > 0;
    const g = this.world.collision.groundBelow(this);
    if (!g) {
      this.grounded = false;
      this.groundRef = null;
      return;
    }
    this.grounded = true;
    this.groundRef = g.solid;
    this.groundTile = g.tile;
    if (g.solid && isStepReactive(g.solid)) g.solid.onStepped(this.world);
    // Surface properties.
    const map = this.world.map;
    const fy = Math.floor((this.y + this.h + 1) / TILE);
    let fr = 1;
    let sp = 1;
    if (g.tile) {
      const cx = Math.floor((this.x + this.w / 2) / TILE);
      const p = map.props(cx, fy).solid || map.props(cx, fy).oneWay ? map.props(cx, fy) : map.props(Math.floor((this.facing > 0 ? this.x : this.x + this.w - 1) / TILE), fy);
      fr = p.friction;
      sp = p.speed;
    } else if (g.solid && g.solid.surfaceFriction) fr = g.solid.surfaceFriction();
    this.groundFriction = fr;
    this.groundSpeed = sp;
  }

  private setCrouch(on: boolean): void {
    if (on === this.crouching) return;
    this.crouching = on;
    const newH = on ? PLAYER.crouchHeight : PLAYER.height;
    this.y += this.h - newH;
    this.h = newH;
  }

  private hasHeadroom(height: number): boolean {
    const r = { x: this.x, y: this.y + this.h - height, w: this.w, h: height - this.h };
    if (r.h <= 0) return true;
    return !this.world.collision.overlapsSolid(r);
  }

  /** Climbable cell; a one-way platform capping a ladder/vine counts as its top rung. */
  private climbableAt(tx: number, ty: number): boolean {
    const map = this.world.map;
    const p = map.props(tx, ty);
    return p.climbable || (p.oneWay && map.props(tx, ty + 1).climbable);
  }

  private overlapClimbable(): boolean {
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const t0 = Math.floor((this.y + 6) / TILE);
    const t1 = Math.floor((this.y + this.h - 4) / TILE);
    for (let ty = t0; ty <= t1; ty++) if (this.climbableAt(cx, ty)) return true;
    return false;
  }

  private onVine(): boolean {
    const map = this.world.map;
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const cy = Math.floor((this.y + this.h / 2) / TILE);
    return map.get(cx, cy) === Tile.Vine;
  }

  private climbableBelow(): boolean {
    if (!this.grounded) return false;
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const fy = Math.floor((this.y + this.h + 2) / TILE);
    return this.climbableAt(cx, fy);
  }

  private snapToClimbable(below = false): void {
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const map = this.world.map;
    if (below || map.get(cx, Math.floor((this.y + this.h / 2) / TILE)) === Tile.Ladder) {
      this.x = cx * TILE + TILE / 2 - this.w / 2;
    }
  }

  private standingOnOneWay(): boolean {
    if (!this.grounded) return false;
    if (this.groundRef) return this.groundRef.solidKind() === 'top';
    const fy = Math.floor((this.y + this.h + 1) / TILE);
    const map = this.world.map;
    const tx0 = Math.floor(this.x / TILE);
    const tx1 = Math.floor((this.x + this.w - 0.01) / TILE);
    let any = false;
    for (let tx = tx0; tx <= tx1; tx++) {
      const p = map.props(tx, fy);
      if (p.solid) return false;
      if (p.oneWay) any = true;
    }
    return any;
  }

  private adjacentPushable(side: Facing): Pushable | null {
    for (const s of this.world.collision.solids) {
      if (!isPushable(s) || s.solidKind() !== 'full') continue;
      if (this.y + this.h <= s.y + 4 || this.y >= s.y + s.h) continue;
      const gap = side > 0 ? s.x - (this.x + this.w) : this.x - (s.x + s.w);
      if (gap >= -1 && gap <= 10) return s;
    }
    return null;
  }

  private checkEnvironment(dt: number): void {
    const w = this.world;
    const cx = this.x + this.w / 2;
    // Water.
    const water = w.waterAt(cx, this.y + this.h * 0.45);
    // Enter swimming only when sinking into the water (never while leaping out of it).
    if (water && this.vy >= 0 && this.fsm.state !== 'SWIM' && this.fsm.state !== 'CLIMB' && this.fsm.state !== 'HURT') {
      this.fsm.change('SWIM');
    }
    // Lava is lethal.
    if (w.lavaAt(cx, this.y + this.h - 6)) {
      w.emit({ kind: 'particles', preset: 'lava_spark', x: cx, y: this.y + this.h, count: 20 });
      w.killPlayer('lava');
      return;
    }
    // Spikes: only the lower part of the spike tile hurts.
    const map = w.map;
    const tx0 = Math.floor((this.x + 3) / TILE);
    const tx1 = Math.floor((this.x + this.w - 3) / TILE);
    const tyFeet = Math.floor((this.y + this.h - 2) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (map.get(tx, tyFeet) === Tile.Spikes && this.y + this.h > tyFeet * TILE + 14) {
        w.damagePlayer(1, tx * TILE + TILE / 2, 'spikes');
        if (!this.dead) {
          this.vy = -560;
          this.grounded = false;
          this.fsm.change('HURT');
        }
        return;
      }
    }
    // Quicksand: slow sinking; fully submerged hurts and returns to safety.
    const qsFeet = map.tileAt(cx, this.y + this.h - 4) === Tile.Quicksand;
    if (qsFeet) {
      this.vy = Math.min(this.vy, 45);
      this.vx *= 0.9;
      if (this.input.jumpPressed) {
        this.vy = -430;
        this.fsm.change('JUMP');
      }
      if (map.tileAt(cx, this.y + 4) === Tile.Quicksand) {
        w.damagePlayer(1, cx, 'quicksand');
        this.returnToSafety();
      }
    }
    // Crushed by a moving solid.
    if (!this.dead && this.fsm.state !== 'CLIMB') {
      const inside = w.collision.overlapsSolid({ x: this.x + 3, y: this.y + 4, w: this.w - 6, h: this.h - 8 });
      if (inside) {
        w.emit({ kind: 'shake', intensity: 0.008, duration: 0.2 });
        w.damagePlayer(1, cx, 'crush');
        this.returnToSafety();
      }
    }
    // Fell out of the level.
    if (this.y > w.level.heightPx + 64) {
      w.damagePlayer(1, cx, 'pit');
      if (!this.dead) this.returnToSafety();
    }
    // Track the last safe position (static ground only).
    if (this.grounded && this.groundTile && !this.groundRef && this.fsm.state !== 'HURT' && this.invuln <= 0) {
      this.safeTimer += dt;
      if (this.safeTimer > 0.15) {
        this.safeX = cx;
        this.safeY = this.y + this.h;
      }
    } else this.safeTimer = 0;
  }

  returnToSafety(): void {
    this.setCrouch(false);
    this.x = this.safeX - this.w / 2;
    this.y = this.safeY - this.h;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    if (!this.dead) this.fsm.change('FALL');
  }

  hurt(fromX: number): void {
    if (this.dead) return;
    const dir = this.x + this.w / 2 < fromX ? -1 : 1;
    this.hurtDir = dir;
    this.vx = dir * PLAYER.hurtKnockX;
    this.vy = -PLAYER.hurtKnockY;
    this.grounded = false;
    this.groundRef = null;
    this.invuln = PLAYER.invulnTime;
    if (this.fsm.state === 'CLIMB' || this.fsm.state === 'SWIM') {
      if (this.fsm.state === 'SWIM') {
        this.vy = -200;
        return;
      }
    }
    this.fsm.restart('HURT');
  }

  die(): void {
    if (this.dead) return;
    this.health = 0;
    this.setCrouch(false);
    this.fsm.change('DEATH');
  }

  respawn(): void {
    this.dead = false;
    this.deathDone = false;
    this.health = this.maxHealth;
    this.setCrouch(false);
    this.x = this.respawnX - this.w / 2;
    this.y = this.respawnY - this.h;
    this.vx = 0;
    this.vy = 0;
    this.invuln = 1;
    this.safeX = this.respawnX;
    this.safeY = this.respawnY;
    this.grounded = false;
    this.groundRef = null;
    this.fsm.restart('FALL');
  }

  victory(): void {
    this.fsm.change('VICTORY');
  }

  get inGroundState(): boolean {
    return GROUND_STATES.has(this.fsm.state);
  }
}
