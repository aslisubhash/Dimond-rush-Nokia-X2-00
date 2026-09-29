export type WorldId = 'jungle' | 'desert' | 'crystal' | 'volcano' | 'ice' | 'sky';

export const WORLD_ORDER: readonly WorldId[] = ['jungle', 'desert', 'crystal', 'volcano', 'ice', 'sky'];

export type Facing = -1 | 1;

/** One logical input sample consumed by a simulation step. */
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Analog horizontal axis in [-1,1]; overrides left/right magnitude when non-zero. */
  axisX: number;
  jump: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  interact: boolean;
  interactPressed: boolean;
  walk: boolean;
}

export function emptyInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    axisX: 0,
    jump: false,
    jumpPressed: false,
    attackPressed: false,
    interact: false,
    interactPressed: false,
    walk: false,
  };
}

/** Presentation events emitted by the simulation and drained by the renderer/audio layer. */
export type OutEvent =
  | { kind: 'sound'; id: string; x?: number; y?: number; volume?: number }
  | { kind: 'particles'; preset: string; x: number; y: number; count?: number; color?: number }
  | { kind: 'shake'; intensity: number; duration: number }
  | { kind: 'flash'; color: number; duration: number }
  | { kind: 'toast'; textKey: string; params?: Record<string, string | number> }
  | { kind: 'dialog'; textKey: string }
  | { kind: 'boss'; state: 'start' | 'phase' | 'defeated'; phase?: number; nameKey?: string };
