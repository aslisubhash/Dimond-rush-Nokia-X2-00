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
