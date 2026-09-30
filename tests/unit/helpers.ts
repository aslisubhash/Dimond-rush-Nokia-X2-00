import type { Entity } from '../../src/core/entities/Entity';
import { LEVELS } from '../../src/data/levels';
import { compileLevel } from '../../src/core/levels/LevelLoader';
import type { LevelSpec } from '../../src/core/levels/schema';
import { emptyInput, type InputState } from '../../src/core/types';
import { GameWorld, type WorldOptions } from '../../src/core/world/GameWorld';
import { SIM_HZ } from '../../src/core/constants';

export function makeLevel(map: string[], extra: Partial<LevelSpec> = {}): LevelSpec {
  return {
    id: 'test',
    name: 'Test',
    world: 'jungle',
    index: 1,
    mechanics: [],
    purpose: 'test',
    parTime: 60,
    secrets: [],
    map,
    ...extra,
  };
}

export function makeWorld(map: string[], extra: Partial<LevelSpec> = {}, opts: WorldOptions = {}): GameWorld {
  const c = compileLevel(makeLevel(map, extra));
  if (c.errors.length) throw new Error(c.errors.join('\n'));
  return new GameWorld(c, opts);
}

export function input(p: Partial<InputState> = {}): InputState {
  return { ...emptyInput(), ...p };
}

/** Run the world for `seconds` with the given input (pressed flags only on the first step). */
export function run(world: GameWorld, seconds: number, p: Partial<InputState> = {}): void {
  const steps = Math.round(seconds * SIM_HZ);
  for (let i = 0; i < steps; i++) {
    const inp = input(p);
    if (i > 0) {
      inp.jumpPressed = false;
      inp.attackPressed = false;
      inp.interactPressed = false;
    }
    world.step(inp);
  }
}

export function settle(world: GameWorld): void {
  run(world, 0.5);
}

/** Place the player standing in tile column tx with feet on top of row ty+1. */
export function teleport(world: GameWorld, tx: number, ty: number): void {
  const p = world.player;
  p.x = tx * 32 + 16 - p.w / 2;
  p.y = (ty + 1) * 32 - p.h;
  p.vx = 0;
  p.vy = 0;
  p.safeX = p.x + p.w / 2;
  p.safeY = p.y + p.h;
  run(world, 0.2);
}

export function levelWorld(id: string, opts: WorldOptions = {}): GameWorld {
  const spec = LEVELS.find((l) => l.id === id);
  if (!spec) throw new Error(`no level ${id}`);
  return new GameWorld(compileLevel(spec), opts);
}

/** Find an entity of a type whose top-left tile (at level start) is tx,ty. */
export function entityAt(world: GameWorld, type: string, tx: number, ty: number): Entity {
  const e = world.entities.find((x) => x.type === type && Math.floor(x.x / 32) === tx && Math.floor(x.y / 32) === ty);
  if (!e) throw new Error(`no ${type} at ${tx},${ty}`);
  return e;
}

/** Jump with the given horizontal direction, holding jump for `hold` seconds. */
export function jump(world: GameWorld, dir: -1 | 0 | 1, hold = 0.5, after = 0.6): void {
  const h = { right: dir > 0, left: dir < 0 };
  run(world, 1 / 120, { ...h, jump: true, jumpPressed: true });
  run(world, hold, { ...h, jump: true });
  run(world, after, h);
}

/**
 * Jump towards tile column `tx` (centre), steering until the player's centre reaches it,
 * then drift down until grounded (or `maxTime` runs out).
 */
export function hopTo(world: GameWorld, tx: number, hold = 0.3, maxTime = 1.5): void {
  const p = world.player;
  const target = tx * 32 + 16;
  const steer = (): Partial<InputState> => {
    const cx = p.x + p.w / 2;
    if (cx < target - 4) return { right: true };
    if (cx > target + 4) return { left: true };
    return {};
  };
  run(world, 1 / 120, { ...steer(), jump: true, jumpPressed: true });
  const steps = Math.round(maxTime * SIM_HZ);
  for (let i = 0; i < steps; i++) {
    const inp = input({ ...steer(), jump: i < hold * SIM_HZ });
    world.step(inp);
    if (i > 10 && p.grounded) break;
  }
  run(world, 0.05);
}

/** Walk (run) horizontally until the player's centre is over tile column `tx`. */
export function walkTo(world: GameWorld, tx: number, maxTime = 12): void {
  const p = world.player;
  const target = tx * 32 + 16;
  for (let i = 0; i < maxTime * SIM_HZ; i++) {
    const cx = p.x + p.w / 2;
    if (Math.abs(cx - target) < 3) break;
    world.step(input(cx < target ? { right: true, walk: Math.abs(cx - target) < 24 } : { left: true, walk: Math.abs(cx - target) < 24 }));
  }
  run(world, 0.1);
}

/** Climb (up/down) while on a ladder until the feet reach row `row` or time runs out. */
export function climbTo(world: GameWorld, row: number, maxTime = 8): void {
  const p = world.player;
  const up = (p.y + p.h) / 32 > row;
  for (let i = 0; i < maxTime * SIM_HZ; i++) {
    const f = (p.y + p.h) / 32;
    if (up ? f <= row + 0.02 : f >= row - 0.02) break;
    world.step(input(up ? { up: true } : { down: true }));
  }
  run(world, 0.1);
}
