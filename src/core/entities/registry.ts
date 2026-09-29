import type { EntityDef } from '../levels/LevelLoader';
import type { WorldId } from '../types';
import { Boss } from '../bosses/Boss';
import { Enemy } from '../enemies/Enemy';
import { resolveEnemyKind } from '../enemies/enemyKinds';
import { Mirror, LightSource, LightReceiver, Laser } from './beams';
import { StoneBlock, Crate, FaceStone, RollingStone, MagnetStone, IceBlock, PhysicsBlock } from './blocks';
import { Gate, ExitGate } from './doors';
import type { Entity } from './Entity';
import { Magnet, WindSource } from './forces';
import { WaterBody, LavaBody, Waterfall, WaterCurrent, SandFall } from './fluids';
import { SpikeTrap, Saw, FireWheel, FireJet, FireSource, Icicle } from './hazards';
import { Checkpoint, SecretZone, HintZone, Clue } from './markers';
import { Pickup, Chest, Key } from './pickups';
import { MovingPlatform, FallingPlatform, RotatingPlatform, CrumblingBlock, FloatPlatform, ShiftingSand } from './platforms';
import { PressurePlate, Switch, Torch, CrystalNode, EchoStone, SequenceLock, TriggerZone, Timer } from './switches';

type Ctor = new (def: EntityDef) => Entity;

const CTORS: Partial<Record<EntityDef['type'], Ctor>> = {
  stone_block: StoneBlock,
  crate: Crate,
  face_stone: FaceStone,
  rolling_stone: RollingStone,
  magnet_stone: MagnetStone,
  ice_block: IceBlock,
  pressure_plate: PressurePlate,
  switch: Switch,
  lever: Switch,
  torch: Torch,
  crystal_node: CrystalNode,
  echo_stone: EchoStone,
  sequence_lock: SequenceLock,
  trigger_zone: TriggerZone,
  timer: Timer,
  key: Key,
  locked_door: Gate,
  secret_door: Gate,
  gate: Gate,
  bridge: Gate,
  boss_gate: Gate,
  temple_door: Gate,
  exit_gate: ExitGate,
  chest: Chest,
  crystal: Pickup,
  coin: Pickup,
  relic: Pickup,
  temple_key: Pickup,
  heart: Pickup,
  heart_vessel: Pickup,
  seal: Pickup,
  moving_platform: MovingPlatform,
  wind_platform: MovingPlatform,
  falling_platform: FallingPlatform,
  rotating_platform: RotatingPlatform,
  crumbling_block: CrumblingBlock,
  float_platform: FloatPlatform,
  shifting_sand: ShiftingSand,
  water_body: WaterBody,
  lava_body: LavaBody,
  waterfall: Waterfall,
  water_current: WaterCurrent,
  sand_fall: SandFall,
  mirror: Mirror,
  light_source: LightSource,
  light_receiver: LightReceiver,
  laser: Laser,
  magnet: Magnet,
  wind_source: WindSource,
  fire_source: FireSource,
  fire_jet: FireJet,
  spike_trap: SpikeTrap,
  saw: Saw,
  fire_wheel: FireWheel,
  icicle: Icicle,
  checkpoint: Checkpoint,
  secret_zone: SecretZone,
  hint: HintZone,
  clue: Clue,
  boss: Boss,
};

/** Expand authoring shorthands (e.g. a rotating ring with `count` platforms). */
export function expandDefs(defs: EntityDef[]): EntityDef[] {
  const out: EntityDef[] = [];
  for (const d of defs) {
    if (d.type === 'wind_platform' && d.props['drive'] === undefined) d.props['drive'] = 'wind';
    const count = typeof d.props['count'] === 'number' ? d.props['count'] : 1;
    if (d.type === 'rotating_platform' && count > 1) {
      const phase = typeof d.props['phase'] === 'number' ? d.props['phase'] : 0;
      for (let i = 0; i < count; i++) {
        out.push({ ...d, id: `${d.id}_${String.fromCharCode(97 + i)}`, props: { ...d.props, phase: phase + (360 / count) * i }, requires: [...d.requires] });
      }
      continue;
    }
    out.push(d);
  }
  return out;
}

export function createEntity(def: EntityDef, world: WorldId): Entity {
  if (def.type === 'enemy') {
    const kind = resolveEnemyKind(typeof def.props['kind'] === 'string' ? def.props['kind'] : 'walker', world);
    return new Enemy(def, kind);
  }
  const C = CTORS[def.type];
  if (!C) throw new Error(`No entity implementation for type '${def.type}' (${def.id})`);
  return new C(def);
}

/** Update ordering: moving solids → physics bodies → [player] → everything else → actors. */
export function updatePhase(e: Entity): number {
  if (e instanceof MovingPlatform || e instanceof FallingPlatform || e instanceof RotatingPlatform || e instanceof FloatPlatform || e instanceof ShiftingSand || e instanceof Gate) return 0;
  if (e instanceof PhysicsBlock) return 1;
  if (e instanceof Enemy || e instanceof Boss) return 3;
  return 2;
}
