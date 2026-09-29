import { SIM_DT, TILE } from '../constants';
import { Boss } from '../bosses/Boss';
import { Enemy } from '../enemies/Enemy';
import { ExitGate } from '../entities/doors';
import type { Entity } from '../entities/Entity';
import { WindSource } from '../entities/forces';
import { FluidBody, WaterCurrent } from '../entities/fluids';
import { FireSource } from '../entities/hazards';
import { Pickup } from '../entities/pickups';
import { createEntity, expandDefs, updatePhase } from '../entities/registry';
import { Tile } from '../levels/legend';
import type { CompiledLevel } from '../levels/LevelLoader';
import type { LevelAction, LevelEventType, TriggerSpec } from '../levels/schema';
import { CollisionWorld } from '../physics/Collision';
import { TileMap } from '../physics/TileMap';
import { PLAYER } from '../player/playerConfig';
import { Player } from '../player/Player';
import { emptyInput, type InputState, type OutEvent } from '../types';
import { dist, overlaps, type Rect } from '../util/math';
import { BeamSystem } from './BeamSystem';
import { ProjectilePool } from './Projectiles';
import type { FluidQuery, ProjectileSpec, WorldApi } from './WorldApi';

export interface WorldOptions {
  maxHealth?: number;
  /** Unique pickups (relics, keys, vessels, seals) owned from earlier runs. */
  owned?: ReadonlySet<string>;
  /** The world's temple key has been found. */
  templeKey?: boolean;
}

export interface RunStats {
  time: number;
  crystals: number;
  crystalsTotal: number;
  coins: number;
  coinsTotal: number;
  relics: number;
  secretsFound: string[];
  secretsTotal: number;
  damage: number;
  deaths: number;
  /** Ids of pickups collected this run. */
  collected: string[];
  cosmetics: string[];
  templeKey: boolean;
  heartVessel: boolean;
  seal: boolean;
}

export interface LevelEvent {
  type: LevelEventType;
  source: string;
  value?: number;
}

/** The complete deterministic simulation of one level. No rendering, no DOM. */
export class GameWorld implements WorldApi {
  readonly level: CompiledLevel;
  readonly map: TileMap;
  readonly collision: CollisionWorld;
  readonly player: Player;
  readonly entities: Entity[] = [];
  readonly projectiles = new ProjectilePool();
  readonly beams = new BeamSystem();
  readonly flags = new Map<string, number | string | boolean>();
  readonly stats: RunStats;
  readonly boss: Boss | null = null;
  /** Presentation events for the renderer/audio. Drained by the scene each frame. */
  readonly out: OutEvent[] = [];
  time = 0;
  steps = 0;
  invulnerable = false;
  completed = false;
  completedTime = 0;
  hintKey: string | null = null;
  prompt: { textKey: string; x: number; y: number } | null = null;
  input: InputState = emptyInput();
  eventLog: LevelEvent[] = [];
  private readonly byId = new Map<string, Entity>();
  private readonly ordered: Entity[] = [];
  private readonly prePlayer: Entity[] = [];
  private readonly postPlayer: Entity[] = [];
  private readonly logicTargets: Entity[] = [];
  private readonly fluids: FluidBody[] = [];
  private readonly winds: WindSource[] = [];
  private readonly currents: WaterCurrent[] = [];
  private readonly heat: FireSource[] = [];
  private readonly exits: ExitGate[] = [];
  private readonly triggers: (TriggerSpec & { fired: boolean })[];
  private readonly eventQueue: LevelEvent[] = [];
  private readonly prevActive = new Map<Entity, boolean>();
  private readonly listeners: ((e: LevelEvent) => void)[] = [];
  private lastTileHitSerial = -1;
  private readonly owned: ReadonlySet<string>;
  private readonly windOut = { ax: 0, ay: 0 };
  private checkpointId: string | null = null;

  constructor(level: CompiledLevel, opts: WorldOptions = {}) {
    this.level = level;
    this.map = new TileMap(level.cols, level.rows, level.tiles);
    this.collision = new CollisionWorld(this.map);
    this.owned = opts.owned ?? new Set();
    this.player = new Player(level.spawn.x, level.spawn.y, opts.maxHealth ?? PLAYER.baseHealth, this.input);
    this.player.attach(this);
    if (opts.templeKey) this.flags.set('templeKey', true);

    for (const def of expandDefs(level.entities)) {
      const e = createEntity(def, level.spec.world);
      this.entities.push(e);
      this.byId.set(e.id, e);
      if (e instanceof Boss) (this as { boss: Boss | null }).boss = e;
    }
    this.ordered = [...this.entities].sort((a, b) => updatePhase(a) - updatePhase(b));
    for (const e of this.ordered) (updatePhase(e) <= 1 ? this.prePlayer : this.postPlayer).push(e);
    for (const e of this.entities) {
      if (e.requires.length || Array.isArray(e.props['unless'])) this.logicTargets.push(e);
      if (e instanceof FluidBody) this.fluids.push(e);
      if (e instanceof WindSource) this.winds.push(e);
      if (e instanceof WaterCurrent) this.currents.push(e);
      if (e instanceof FireSource) this.heat.push(e);
      if (e instanceof ExitGate) this.exits.push(e);
      if (e.solidKind !== undefined) this.collision.solids.push(e);
    }
    // Pickups owned from earlier runs become "echoes": still visible, but not counted again.
    for (const e of this.entities) {
      if (e instanceof Pickup && this.owned.has(e.id)) e.props['owned'] = true;
    }
    this.triggers = (level.spec.triggers ?? []).map((t) => ({ ...t, fired: false }));
    for (const e of this.entities) e.init(this);
    this.evaluateLogic(true);
    for (const e of this.entities) e.captureInitial();
    this.beams.init(this);

    const crystals = this.entities.filter((e) => e.type === 'crystal').length;
    const coins = this.entities.filter((e) => e.type === 'coin').length;
    this.stats = {
      time: 0,
      crystals: 0,
      crystalsTotal: crystals,
      coins: 0,
      coinsTotal: coins,
      relics: 0,
      secretsFound: [],
      secretsTotal: level.spec.secrets.length,
      damage: 0,
      deaths: 0,
      collected: [],
      cosmetics: [],
      templeKey: false,
      heartVessel: false,
      seal: false,
    };
  }

  onEvent(fn: (e: LevelEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  getEntity(id: string): Entity | undefined {
    return this.byId.get(id);
  }

  /** Advance the simulation by exactly one fixed step. */
  step(input: InputState): void {
    const dt = SIM_DT;
    this.steps++;
    this.time += dt;
    Object.assign(this.input, input);
    if (!this.completed) this.stats.time += dt;

    for (const e of this.prePlayer) if (!e.removed) e.update(this, dt);

    if (this.player.deathDone) this.respawnPlayer();
    this.player.step(dt);

    if (!this.player.dead && !this.completed) {
      this.resolveInteraction();
      this.resolveAttack();
    }

    for (const e of this.postPlayer) if (!e.removed) e.update(this, dt);

    this.projectiles.update(this, dt);
    this.beams.update(this);
    this.evaluateLogic(false);
    this.processEvents();

    if (!this.completed && !this.player.dead) {
      for (const ex of this.exits) {
        if (ex.playerInside(this)) {
          this.complete();
          break;
        }
      }
    }
    if (this.completed) this.completedTime += dt;
  }

  // ------------------------------------------------------------ logic

  private evaluateLogic(initial: boolean): void {
    for (const e of this.logicTargets) {
      let powered: boolean;
      if (e.logic === 'or') powered = e.requires.some((id) => !!this.byId.get(id)?.active);
      else powered = e.requires.every((id) => !!this.byId.get(id)?.active);
      // `unless`: NOT inputs — any active one cuts the power.
      const unless = e.props['unless'];
      if (powered && Array.isArray(unless)) powered = !(unless as string[]).some((id) => !!this.byId.get(id)?.active);
      if (powered !== e.powered) {
        e.powered = powered;
        if (!initial || powered) e.onPowerChanged(this, powered);
      }
    }
    for (const e of this.entities) {
      const was = this.prevActive.get(e) ?? false;
      if (e.active !== was) {
        this.prevActive.set(e, e.active);
        if (!initial) this.fire(e.active ? 'SIGNAL_ON' : 'SIGNAL_OFF', e.id);
      }
    }
  }

  fire(type: LevelEventType, source: string, value?: number): void {
    const ev: LevelEvent = value === undefined ? { type, source } : { type, source, value };
    this.eventQueue.push(ev);
  }

  private processEvents(): void {
    let guard = 0;
    while (this.eventQueue.length && guard++ < 256) {
      const ev = this.eventQueue.shift() as LevelEvent;
      this.eventLog.push(ev);
      if (this.eventLog.length > 200) this.eventLog.shift();
      for (const l of this.listeners) l(ev);
      for (const t of this.triggers) {
        if (t.fired && t.once !== false) continue;
        if (t.on !== ev.type || (t.source && t.source !== ev.source)) continue;
        t.fired = true;
        for (const a of t.actions) this.runAction(a, ev.source);
      }
    }
  }

  runAction(action: LevelAction, _sourceId?: string): void {
    switch (action.type) {
      case 'SHAKE_CAMERA':
        this.emit({ kind: 'shake', intensity: typeof action.value === 'number' ? action.value : 0.006, duration: 0.4 });
        return;
      case 'SHOW_TEXT':
        this.emit({ kind: 'toast', textKey: String(action.value ?? '') });
        return;
      case 'CHANGE_LEVEL_STATE':
        if (action.target) this.flags.set(action.target, action.value ?? true);
        return;
      case 'REVEAL_SECRET': {
        const [x, y] = String(action.value ?? action.target ?? '').split(',').map(Number);
        if (x !== undefined && y !== undefined) this.openSecretTiles(x, y);
        return;
      }
      default:
        break;
    }
    if (!action.target) return;
    const target = this.byId.get(action.target);
    if (target) {
      target.handleAction(this, action);
      return;
    }
    // Group targets: every entity whose id starts with "prefix*".
    if (action.target.endsWith('*')) {
      const prefix = action.target.slice(0, -1);
      for (const e of this.entities) if (e.id.startsWith(prefix)) e.handleAction(this, action);
    }
  }

  // ------------------------------------------------------------ player interaction

  private resolveInteraction(): void {
    const p = this.player;
    const reach: Rect = { x: p.x - 16, y: p.y - 8, w: p.w + 32, h: p.h + 12 };
    let best: Entity | null = null;
    let bestD = Infinity;
    let bestPrompt: string | null = null;
    for (const e of this.entities) {
      if (e.removed || !overlaps(reach, e)) continue;
      const prompt = e.interactPrompt(this);
      if (!prompt) continue;
      const d = dist(e.cx, e.cy, p.x + p.w / 2, p.y + p.h / 2);
      if (d < bestD) {
        bestD = d;
        best = e;
        bestPrompt = prompt;
      }
    }
    this.prompt = best && bestPrompt ? { textKey: bestPrompt, x: best.cx, y: best.y } : null;
    const wantsInteract = this.input.interactPressed || (this.input.up && best !== null && this.upEdge());
    if (!wantsInteract) return;
    if (best) {
      best.touched = true;
      best.interact(this);
      return;
    }
    // Secret walls respond to a careful inspection (no prompt: the clue is visual).
    if (this.input.interactPressed) {
      const fx = p.facing > 0 ? p.x + p.w + 6 : p.x - 6;
      for (const fy of [p.y + 8, p.y + p.h - 8]) {
        const tx = Math.floor(fx / TILE);
        const ty = Math.floor(fy / TILE);
        if (this.map.get(tx, ty) === Tile.Secret) {
          this.openSecretTiles(tx, ty);
          return;
        }
      }
    }
  }

  private prevUp = false;
  private upEdge(): boolean {
    const edge = this.input.up && !this.prevUp;
    this.prevUp = this.input.up;
    return edge;
  }

  private resolveAttack(): void {
    const p = this.player;
    const box = p.attackBox;
    if (!box) return;
    for (const e of this.entities) {
      if (e.removed || e instanceof Enemy || e instanceof Boss) continue;
      if (!overlaps(box, e)) continue;
      const key = `hit_${p.attackSerial}`;
      if (e.props['_lastHit'] === key) continue;
      e.props['_lastHit'] = key;
      if (e.onAttack(this)) {
        e.touched = true;
        this.emit({ kind: 'particles', preset: 'magic', x: e.cx, y: e.cy, count: 4 });
      }
    }
    if (this.lastTileHitSerial === p.attackSerial) return;
    const tx0 = Math.floor(box.x / TILE);
    const tx1 = Math.floor((box.x + box.w) / TILE);
    const ty0 = Math.floor(box.y / TILE);
    const ty1 = Math.floor((box.y + box.h) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = this.map.get(tx, ty);
        if (t === Tile.Secret) {
          this.lastTileHitSerial = p.attackSerial;
          this.emit({ kind: 'sound', id: 'hollow', x: tx * TILE, y: ty * TILE });
          this.openSecretTiles(tx, ty);
          return;
        }
        if (t === Tile.Solid && (p.facing > 0 ? tx * TILE >= p.x + p.w - 2 : (tx + 1) * TILE <= p.x + 2)) {
          this.lastTileHitSerial = p.attackSerial;
          this.emit({ kind: 'sound', id: 'thunk', x: tx * TILE, y: ty * TILE, volume: 0.5 });
          this.emit({ kind: 'particles', preset: 'dust', x: p.facing > 0 ? tx * TILE : (tx + 1) * TILE, y: box.y + box.h / 2, count: 3 });
          return;
        }
      }
    }
  }

  openSecretTiles(tx: number, ty: number): void {
    const opened = this.map.openSecret(tx, ty);
    if (!opened.length) return;
    this.emit({ kind: 'sound', id: 'wall_break' });
    this.emit({ kind: 'shake', intensity: 0.004, duration: 0.3 });
    for (const c of opened) this.emit({ kind: 'particles', preset: 'dust', x: c.x * TILE + 16, y: c.y * TILE + 16, count: 6 });
  }

  // ------------------------------------------------------------ WorldApi services

  emit(e: OutEvent): void {
    if (this.out.length < 512) this.out.push(e);
  }

  waterAt(x: number, y: number): FluidQuery | null {
    for (const f of this.fluids) {
      if (f.type === 'water_body' && f.contains(x, y)) return { surfaceY: f.surfaceY, entity: f };
    }
    return null;
  }

  lavaAt(x: number, y: number): FluidQuery | null {
    for (const f of this.fluids) {
      if (f.type === 'lava_body' && f.contains(x, y)) return { surfaceY: f.surfaceY, entity: f };
    }
    return null;
  }

  spawnProjectile(p: ProjectileSpec): void {
    this.projectiles.spawn(p);
  }

  damagePlayer(amount: number, fromX: number, cause: string): void {
    const p = this.player;
    if (p.dead || p.invuln > 0 || this.completed) return;
    if (this.invulnerable) return;
    p.health = Math.max(0, p.health - amount);
    this.stats.damage += amount;
    this.emit({ kind: 'sound', id: 'hurt' });
    this.emit({ kind: 'flash', color: 0xff3030, duration: 0.15 });
    this.emit({ kind: 'shake', intensity: 0.004, duration: 0.15 });
    this.emit({ kind: 'particles', preset: 'hurt', x: p.x + p.w / 2, y: p.y + p.h / 2, count: 10 });
    if (p.health <= 0) this.killPlayer(cause);
    else p.hurt(fromX);
  }

  killPlayer(_cause: string): void {
    const p = this.player;
    if (p.dead || this.completed) return;
    if (this.invulnerable) {
      p.returnToSafety();
      return;
    }
    this.stats.deaths++;
    p.die();
  }

  knockPlayer(vx: number | null, vy: number | null): void {
    const p = this.player;
    if (p.dead) return;
    if (vx !== null) p.vx = vx;
    if (vy !== null) p.vy = vy;
    if (vy !== null && vy < 0) p.grounded = false;
    if (p.fsm.state === 'CLIMB' || p.fsm.state === 'IDLE' || p.fsm.state === 'RUN' || p.fsm.state === 'LAND' || p.fsm.state === 'JUMP') {
      p.fsm.change(vy !== null && vy < 0 ? 'JUMP' : 'FALL');
    }
  }

  collect(kind: Parameters<WorldApi['collect']>[0], id: string, amount = 1): void {
    const s = this.stats;
    const owned = this.owned.has(id);
    switch (kind) {
      case 'crystal':
        s.crystals += amount;
        break;
      case 'coin':
        s.coins += amount;
        break;
      case 'relic':
        if (!owned) s.relics += 1;
        break;
      case 'temple_key':
        s.templeKey = true;
        break;
      case 'heart_vessel':
        s.heartVessel = true;
        if (!owned) {
          this.player.maxHealth += 1;
          this.player.health = this.player.maxHealth;
        }
        break;
      case 'seal':
        s.seal = true;
        break;
      case 'key':
        this.player.keys += amount;
        break;
      case 'heart':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
        break;
      case 'cosmetic':
        if (!s.cosmetics.includes(id)) s.cosmetics.push(id);
        return;
    }
    if (kind !== 'key' && kind !== 'heart') s.collected.push(id);
  }

  setCheckpoint(id: string, x: number, y: number): void {
    this.checkpointId = id;
    this.player.respawnX = x;
    this.player.respawnY = y;
    this.player.health = this.player.maxHealth;
  }

  get currentCheckpoint(): string | null {
    return this.checkpointId;
  }

  markSecretFound(secretId: string): void {
    if (this.stats.secretsFound.includes(secretId)) return;
    this.stats.secretsFound.push(secretId);
    this.fire('SECRET_FOUND', secretId);
    this.emit({ kind: 'sound', id: 'secret' });
    this.emit({ kind: 'toast', textKey: 'toast.secret' });
    const p = this.player;
    this.emit({ kind: 'particles', preset: 'secret_found', x: p.x + p.w / 2, y: p.y, count: 30 });
  }

  showHint(textKey: string | null): void {
    this.hintKey = textKey;
  }

  windAt(x: number, y: number): { ax: number; ay: number } {
    const o = this.windOut;
    o.ax = 0;
    o.ay = 0;
    for (const w of this.winds) {
      const f = w.force(x, y);
      if (f) {
        o.ax += f.ax;
        o.ay += f.ay;
      }
    }
    for (const c of this.currents) {
      const f = c.force(this, x, y);
      if (f) {
        o.ax += f.ax;
        o.ay += f.ay;
      }
    }
    return o;
  }

  isHot(x: number, y: number, radius: number): boolean {
    for (const h of this.heat) {
      if (h.active && dist(h.cx, h.cy, x, y) <= radius) return true;
    }
    for (const f of this.fluids) {
      if (f.type === 'lava_body' && x >= f.x && x <= f.x + f.w && Math.abs(f.surfaceY - y) < radius * 0.5) return true;
    }
    return false;
  }

  // ------------------------------------------------------------ lifecycle

  private respawnPlayer(): void {
    const bossFight = this.boss && (this.boss.state === 'fight' || this.boss.state === 'intro');
    this.player.respawn();
    this.projectiles.clear();
    if (bossFight && this.boss) {
      for (const e of this.entities) if (e.arena) e.restoreInitial();
      this.boss.resetFight(this);
    }
    for (const e of this.entities) e.onPlayerRespawn(this);
    this.emit({ kind: 'sound', id: 'respawn' });
    this.emit({ kind: 'particles', preset: 'magic', x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, count: 20, color: 0x7cf2c9 });
  }

  /** Pause-menu "Restart from checkpoint": respawn without a death and reset movable stones (soft-lock escape). */
  restartFromCheckpoint(): void {
    for (const e of this.entities) if (e.type === 'stone_block' || e.type === 'crate' || e.type === 'face_stone' || e.type === 'magnet_stone' || e.type === 'ice_block') e.handleAction(this, { type: 'RESET' });
    this.respawnPlayer();
  }

  private complete(): void {
    this.completed = true;
    this.player.victory();
    this.emit({ kind: 'sound', id: 'level_complete' });
    this.emit({ kind: 'particles', preset: 'secret_found', x: this.player.x + this.player.w / 2, y: this.player.y, count: 40 });
  }

  /** Camera lock rectangle while a boss fight is active. */
  get cameraLock(): Rect | null {
    const b = this.boss;
    if (b && (b.state === 'intro' || b.state === 'fight' || b.state === 'defeated')) return b.arenaRect;
    return null;
  }

  /** Compact state digest for determinism tests. */
  digest(): string {
    const p = this.player;
    const parts = [p.x.toFixed(3), p.y.toFixed(3), p.vx.toFixed(3), p.vy.toFixed(3), p.state, p.health];
    for (const e of this.entities) parts.push(`${e.id}:${e.x.toFixed(2)},${e.y.toFixed(2)},${e.active ? 1 : 0}`);
    return parts.join('|');
  }
}
