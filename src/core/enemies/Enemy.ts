import { TILE } from '../constants';
import type { EntityDef } from '../levels/LevelLoader';
import type { LevelAction } from '../levels/schema';
import type { MoveResult } from '../physics/Collision';
import type { Facing } from '../types';
import { approach, overlaps } from '../util/math';
import { StateMachine } from '../util/StateMachine';
import type { WorldApi } from '../world/WorldApi';
import { Entity } from '../entities/Entity';
import { ENEMY_KINDS, type EnemyKind } from './enemyKinds';

export type EnemyState = 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK' | 'HURT' | 'STUN' | 'RETURN' | 'DEAD';

const GRAVITY = 1900;

/** Deterministic enemy driven by a small state machine per behaviour type. */
export class Enemy extends Entity {
  kindId: string;
  cfg: EnemyKind;
  hp: number;
  vx = 0;
  vy = 0;
  facing: Facing;
  homeX: number;
  homeY: number;
  grounded = false;
  lastHitSerial = -1;
  flash = 0;
  dormant: boolean;
  cooldown = 0;
  fsm: StateMachine<EnemyState, Enemy>;
  private world!: WorldApi;
  private dt = 0;
  private readonly res: MoveResult = { hitX: false, hitY: false, blockerX: null, blockerY: null };
  private patrolMin: number;
  private patrolMax: number;

  constructor(def: EntityDef, kindId: string) {
    super(def);
    this.kindId = kindId;
    this.cfg = ENEMY_KINDS[kindId] ?? (ENEMY_KINDS['snake'] as EnemyKind);
    this.hp = this.num('hp', this.cfg.hp);
    this.w = this.cfg.w;
    this.h = this.cfg.h;
    // Anchored at the bottom-center of the placement tile.
    this.x = def.x + def.w / 2 - this.w / 2;
    this.y = def.y + def.h - this.h;
    if (this.cfg.behavior === 'flyer' && this.cfg.hangs) this.y = def.y + 2;
    else if (this.cfg.behavior === 'flyer') this.y = def.y + def.h / 2 - this.h / 2;
    this.homeX = this.x;
    this.homeY = this.y;
    this.facing = this.num('facing', -1) > 0 ? 1 : -1;
    this.dormant = this.bool('dormant', false);
    const range = this.num('patrol', 4) * TILE;
    this.patrolMin = this.homeX - range;
    this.patrolMax = this.homeX + range;
    this.cooldown = this.num('delay', 0.8);
    const walkerUpdate = (e: Enemy): void => e.walker();
    this.fsm = new StateMachine<EnemyState, Enemy>(this, this.cfg.behavior === 'flyer' ? 'IDLE' : 'PATROL', {
      IDLE: { update: (e) => e.idle() },
      PATROL: { update: walkerUpdate },
      CHASE: { update: walkerUpdate },
      ATTACK: { update: (e) => e.attack() },
      RETURN: { update: walkerUpdate },
      HURT: {
        enter: (e) => {
          e.flash = 0.3;
        },
        update: (e) => e.hurtUpdate(),
      },
      STUN: { update: (e) => e.stunUpdate() },
      DEAD: {
        enter: (e) => {
          e.world.emit({ kind: 'particles', preset: 'enemy_death', x: e.cx, y: e.cy, count: 18 });
          e.world.emit({ kind: 'sound', id: 'enemy_die', x: e.cx, y: e.cy });
          e.world.fire('ENEMY_KILLED', e.id);
          e.world.collect('coin', `${e.id}_drop`, 1);
        },
        update: (e) => {
          if (e.fsm.time > 0.45) e.removed = true;
        },
      },
    });
  }

  get state(): EnemyState {
    return this.fsm.state;
  }

  override init(world: WorldApi): void {
    super.init(world);
    this.active = this.alive;
  }

  get alive(): boolean {
    return !this.removed && this.fsm.state !== 'DEAD';
  }

  override update(world: WorldApi, dt: number): void {
    // Signal: an enemy is "active" while alive (ward gates open when their guardians fall).
    this.active = this.alive;
    if (this.removed || this.dormant) return;
    this.world = world;
    this.dt = dt;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.fsm.update(dt);
    if (!this.alive) return;
    this.interactPlayer(world);
    if (world.lavaAt(this.cx, this.y + this.h - 2) && this.cfg.behavior !== 'flyer' && !this.kindId.startsWith('fire') && this.kindId !== 'lava_beast') {
      this.fsm.change('DEAD');
    }
    if (this.y > world.level.heightPx + 64) this.removed = true;
  }

  override handleAction(world: WorldApi, action: LevelAction): void {
    if (action.type === 'SPAWN_ENEMY' || action.type === 'START') {
      this.dormant = false;
      world.emit({ kind: 'particles', preset: 'magic', x: this.cx, y: this.cy, count: 16, color: 0xff6b6b });
      world.emit({ kind: 'sound', id: 'enemy_spawn', x: this.cx, y: this.cy });
    }
  }

  // ------------------------------------------------------------ behaviour

  private playerDist(): { dx: number; dy: number; visible: boolean } {
    const p = this.world.player;
    const dx = p.x + p.w / 2 - this.cx;
    const dy = p.y + p.h / 2 - this.cy;
    const visible = !p.dead && Math.abs(dx) < this.cfg.chaseRange && Math.abs(dy) < (this.cfg.behavior === 'flyer' ? 220 : 80) && this.lineOfSight();
    return { dx, dy, visible };
  }

  private lineOfSight(): boolean {
    const p = this.world.player;
    const x0 = this.cx;
    const y0 = this.cy - 4;
    const x1 = p.x + p.w / 2;
    const y1 = p.y + 10;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.world.map.isSolidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  private groundAhead(dir: number): boolean {
    const fx = dir > 0 ? this.x + this.w + 2 : this.x - 2;
    const fy = this.y + this.h + 4;
    const map = this.world.map;
    const p = map.props(Math.floor(fx / TILE), Math.floor(fy / TILE));
    if (p.solid || p.oneWay) return true;
    for (const s of this.world.collision.solids) {
      if (s.solidKind() && fx >= s.x && fx <= s.x + s.w && fy >= s.y && fy <= s.y + s.h) return true;
    }
    return false;
  }

  private wallAhead(dir: number): boolean {
    const fx = dir > 0 ? this.x + this.w + 2 : this.x - 2;
    return this.world.map.isSolidAt(fx, this.y + this.h - 6) || this.world.map.isSolidAt(fx, this.y + 4) || !!this.hazardAhead(dir);
  }

  private hazardAhead(dir: number): boolean {
    const fx = dir > 0 ? this.x + this.w + 4 : this.x - 4;
    const t = this.world.map.tileAt(fx, this.y + this.h - 4);
    return t === 3; // spikes
  }

  private walker(): void {
    const cfg = this.cfg;
    const fsm = this.fsm;
    const dt = this.dt;
    if (cfg.behavior === 'flyer') {
      this.flyer();
      return;
    }
    const { dx, visible } = this.playerDist();
    let speed = cfg.speed;
    if (fsm.state === 'PATROL') {
      if (visible && cfg.chaseSpeed > 0) fsm.change('CHASE');
      else if (cfg.behavior === 'shooter' && visible) fsm.change('ATTACK');
    } else if (fsm.state === 'CHASE') {
      speed = cfg.chaseSpeed;
      this.facing = dx > 0 ? 1 : -1;
      if (!visible && fsm.time > 0.6) fsm.change('RETURN');
      else if (cfg.lunge && Math.abs(dx) < cfg.attackRange && this.cooldown <= 0) {
        fsm.change('ATTACK');
        return;
      }
    } else if (fsm.state === 'RETURN') {
      const hd = this.homeX - this.x;
      this.facing = hd > 0 ? 1 : -1;
      if (Math.abs(hd) < 4) fsm.change('PATROL');
      if (visible) fsm.change('CHASE');
    }
    if (cfg.behavior === 'shooter') {
      if (visible) {
        this.facing = dx > 0 ? 1 : -1;
        if (this.cooldown <= 0) fsm.change('ATTACK');
        speed = 0;
      } else if (cfg.speed === 0) speed = 0;
    }

    // Patrol turn-around at edges, walls and patrol bounds.
    if (fsm.state === 'PATROL' && speed > 0) {
      if ((this.facing > 0 && this.x > this.patrolMax) || (this.facing < 0 && this.x < this.patrolMin)) this.turn();
    }
    if (speed > 0 && this.grounded && (!this.groundAhead(this.facing) || this.wallAhead(this.facing))) {
      if (fsm.state === 'PATROL') this.turn();
      else speed = 0;
    }
    const target = this.facing * speed;
    this.vx = cfg.slides ? approach(this.vx, target, 250 * dt) : target;
    this.physics(true);
  }

  private turn(): void {
    this.facing = (-this.facing) as Facing;
    this.fsm.change('IDLE');
  }

  private idle(): void {
    if (this.cfg.behavior === 'flyer') {
      this.flyer();
      return;
    }
    this.vx = 0;
    this.physics(true);
    if (this.fsm.time > 0.45) this.fsm.change('PATROL');
    if (this.cfg.behavior === 'shooter' && this.playerDist().visible && this.cooldown <= 0) this.fsm.change('ATTACK');
  }

  private flyer(): void {
    const cfg = this.cfg;
    const fsm = this.fsm;
    const dt = this.dt;
    const { dx, dy, visible } = this.playerDist();
    if (fsm.state === 'IDLE') {
      if (cfg.hangs) {
        this.vx = 0;
        this.vy = 0;
      } else {
        // Figure-eight drift around home.
        const t = this.anim;
        this.x = this.homeX + Math.sin(t * 0.9) * this.num('patrol', 3) * TILE;
        this.y = this.homeY + Math.sin(t * 1.8) * 18;
        this.facing = Math.cos(t * 0.9) > 0 ? 1 : -1;
      }
      if (visible) fsm.change('CHASE');
      return;
    }
    if (fsm.state === 'CHASE') {
      const d = Math.hypot(dx, dy) || 1;
      const sp = cfg.chaseSpeed;
      this.vx = approach(this.vx, (dx / d) * sp, 400 * dt);
      this.vy = approach(this.vy, (dy / d) * sp + Math.sin(this.anim * 6) * 60, 400 * dt);
      this.facing = dx > 0 ? 1 : -1;
      if (cfg.projectile && this.cooldown <= 0 && visible) {
        this.fire();
      }
      if (fsm.time > 2.4 || !visible) fsm.change('RETURN');
    } else if (fsm.state === 'RETURN') {
      const hx = this.homeX - this.x;
      const hy = this.homeY - this.y;
      const d = Math.hypot(hx, hy);
      if (d < 6) {
        this.x = this.homeX;
        this.y = this.homeY;
        this.vx = this.vy = 0;
        fsm.change('IDLE');
        return;
      }
      this.vx = (hx / d) * cfg.speed;
      this.vy = (hy / d) * cfg.speed;
      if (fsm.time > 1.2 && visible) fsm.change('CHASE');
    }
    const r = this.res;
    r.hitX = r.hitY = false;
    this.world.collision.moveX(this, this.vx * dt, null, r);
    this.world.collision.moveY(this, this.vy * dt, null, r);
  }

  private fire(): void {
    const pr = this.cfg.projectile;
    if (!pr) return;
    const p = this.world.player;
    const sx = this.cx + this.facing * (this.w / 2);
    const sy = this.cy - 6;
    let vx = this.facing * pr.speed;
    let vy = 0;
    if (pr.aimed) {
      const tx = p.x + p.w / 2 - sx;
      const ty = p.y + p.h / 2 - sy;
      if (pr.gravity > 0) {
        // Lob: pick flight time from horizontal distance.
        const t = Math.max(0.5, Math.min(1.4, Math.abs(tx) / pr.speed));
        vx = tx / t;
        vy = (ty - 0.5 * pr.gravity * t * t) / t;
      } else {
        const d = Math.hypot(tx, ty) || 1;
        vx = (tx / d) * pr.speed;
        vy = (ty / d) * pr.speed;
      }
    }
    this.world.spawnProjectile({ x: sx, y: sy, vx, vy, radius: 7, kind: pr.kind, gravity: pr.gravity, life: 4 });
    this.world.emit({ kind: 'sound', id: `shoot_${pr.kind}`, x: sx, y: sy, volume: 0.7 });
    this.cooldown = pr.cooldown;
  }

  private attack(): void {
    const fsm = this.fsm;
    const cfg = this.cfg;
    if (cfg.behavior === 'shooter') {
      this.vx = 0;
      this.physics(true);
      if (fsm.time > 0.5 && this.cooldown <= 0) this.fire();
      if (fsm.time > 0.8) fsm.change('PATROL');
      return;
    }
    // Lunge: brief windup then dash.
    if (fsm.time < 0.3) {
      this.vx = 0;
    } else if (fsm.time < 0.55) {
      this.vx = this.facing * (cfg.lunge ?? 200);
      if (!this.groundAhead(this.facing)) this.vx = 0;
    } else {
      this.cooldown = 1.2;
      fsm.change('CHASE');
    }
    this.physics(true);
  }

  private hurtUpdate(): void {
    this.vx = approach(this.vx, 0, 600 * this.dt);
    if (this.cfg.behavior === 'flyer') {
      this.world.collision.moveX(this, this.vx * this.dt);
      this.vy = approach(this.vy, 0, 600 * this.dt);
      this.world.collision.moveY(this, this.vy * this.dt);
    } else this.physics(false);
    if (this.fsm.time > 0.35) this.fsm.change(this.hp <= 0 ? 'DEAD' : 'CHASE');
  }

  private stunUpdate(): void {
    this.vx = 0;
    if (this.cfg.behavior !== 'flyer') this.physics(false);
    if (this.fsm.time > 1.6) this.fsm.change('PATROL');
  }

  private physics(edgeSafe: boolean): void {
    const dt = this.dt;
    const r = this.res;
    r.hitX = r.hitY = false;
    this.vy = Math.min(this.vy + GRAVITY * dt, 800);
    const moved = this.world.collision.moveX(this, this.vx * dt, null, r);
    if (r.hitX && this.fsm.state === 'PATROL') this.turn();
    void moved;
    void edgeSafe;
    this.world.collision.moveY(this, this.vy * dt, null, r);
    this.grounded = r.hitY && this.vy > 0;
    if (r.hitY) this.vy = 0;
  }

  // ------------------------------------------------------------ combat

  private interactPlayer(world: WorldApi): void {
    const p = world.player;
    if (p.dead) return;
    if (p.attackBox && p.attackSerial !== this.lastHitSerial && overlaps(p.attackBox, this)) {
      this.lastHitSerial = p.attackSerial;
      this.damage(world, 1, p.x + p.w / 2);
      return;
    }
    if (this.fsm.state === 'STUN' || this.fsm.state === 'HURT') return;
    if (!overlaps({ x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 3 }, p)) return;
    const feet = p.y + p.h;
    if (this.cfg.stompable && p.vy > 60 && feet < this.y + Math.min(14, this.h * 0.6)) {
      world.knockPlayer(null, -470);
      this.damage(world, 1, this.cx, true);
      world.emit({ kind: 'sound', id: 'stomp', x: this.cx, y: this.y });
      return;
    }
    world.damagePlayer(1, this.cx, this.kindId);
  }

  damage(world: WorldApi, amount: number, fromX: number, stomp = false): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.flash = 0.3;
    this.vx = (this.cx < fromX ? -1 : 1) * (stomp ? 60 : 220);
    if (this.cfg.behavior === 'flyer') this.vy = -120;
    world.emit({ kind: 'sound', id: 'enemy_hit', x: this.cx, y: this.cy });
    world.emit({ kind: 'particles', preset: 'boss_hit', x: this.cx, y: this.cy, count: 8 });
    this.fsm.restart(this.hp <= 0 ? 'DEAD' : 'HURT');
  }

  crush(world: WorldApi): void {
    this.hp = 0;
    world.emit({ kind: 'shake', intensity: 0.004, duration: 0.15 });
    this.damage(world, 99, this.cx);
  }

  stun(): void {
    if (this.alive) this.fsm.restart('STUN');
  }

  override onPlayerRespawn(): void {
    if (!this.alive) return;
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = this.vy = 0;
    this.hp = this.num('hp', this.cfg.hp);
    this.fsm.restart(this.cfg.behavior === 'flyer' ? 'IDLE' : 'PATROL');
  }
}
