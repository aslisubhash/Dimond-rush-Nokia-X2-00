import type { WorldApi } from '../world/WorldApi';

/** Solid that moved this step and carries whatever stands on it. */
export interface Carrier {
  carryDx: number;
  carryDy: number;
}

export function isCarrier(o: unknown): o is Carrier {
  return !!o && typeof (o as Carrier).carryDx === 'number' && typeof (o as Carrier).carryDy === 'number';
}

/** Object the player can push (and optionally pull). */
export interface Pushable {
  pullable: boolean;
  /** Attempt to move horizontally by dx. Returns the distance actually moved. */
  tryPush(world: WorldApi, dx: number): number;
  /** Notifies the object it was touched by the player this step. */
  markPushed?(): void;
}

export function isPushable(o: unknown): o is Pushable {
  return !!o && typeof (o as Pushable).tryPush === 'function';
}

/** Something that reacts to the player standing on it (falling / crumbling platforms). */
export interface StepReactive {
  onStepped(world: WorldApi): void;
}

export function isStepReactive(o: unknown): o is StepReactive {
  return !!o && typeof (o as StepReactive).onStepped === 'function';
}
