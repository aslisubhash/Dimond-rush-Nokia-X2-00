import type { WorldId } from '../core/types';

/** Generative music description per world: scale, tempo, instrument colours. */
export interface MusicStyle {
  root: number; // Hz
  scale: number[]; // semitone offsets
  bpm: number;
  lead: OscillatorType;
  pad: OscillatorType;
  padCutoff: number;
  /** Pattern of scale degrees (-1 = rest). */
  pattern: number[];
  ambience: 'jungle' | 'desert' | 'cave' | 'lava' | 'wind' | 'sky';
}

export const MUSIC: Record<WorldId | 'boss' | 'title', MusicStyle> = {
  title: { root: 146.83, scale: [0, 2, 3, 7, 9], bpm: 72, lead: 'triangle', pad: 'sawtooth', padCutoff: 700, pattern: [0, 2, 4, 3, -1, 2, 1, -1, 0, 4, 3, 2, -1, 1, 0, -1], ambience: 'sky' },
  jungle: { root: 130.81, scale: [0, 2, 4, 7, 9], bpm: 88, lead: 'triangle', pad: 'triangle', padCutoff: 900, pattern: [0, -1, 2, 4, -1, 3, 2, -1, 4, -1, 3, 1, 2, -1, 0, -1], ambience: 'jungle' },
  desert: { root: 146.83, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 80, lead: 'sawtooth', pad: 'sawtooth', padCutoff: 600, pattern: [0, 1, 2, -1, 1, 0, -1, 4, 3, 2, -1, 1, 2, -1, 0, -1], ambience: 'desert' },
  crystal: { root: 110, scale: [0, 2, 3, 7, 10], bpm: 70, lead: 'sine', pad: 'triangle', padCutoff: 1400, pattern: [4, -1, 2, -1, 3, -1, 0, -1, 4, 3, -1, 1, -1, 2, -1, -1], ambience: 'cave' },
  volcano: { root: 98, scale: [0, 1, 3, 5, 7, 8], bpm: 104, lead: 'square', pad: 'sawtooth', padCutoff: 500, pattern: [0, 0, 2, -1, 1, 0, 3, -1, 0, 0, 2, 4, 3, 1, 0, -1], ambience: 'lava' },
  ice: { root: 123.47, scale: [0, 2, 3, 5, 7, 10], bpm: 76, lead: 'sine', pad: 'triangle', padCutoff: 1100, pattern: [0, -1, 4, -1, 3, 2, -1, -1, 5, -1, 4, 3, -1, 1, -1, -1], ambience: 'wind' },
  sky: { root: 174.61, scale: [0, 2, 4, 7, 9, 11], bpm: 84, lead: 'triangle', pad: 'sine', padCutoff: 1800, pattern: [0, 2, 4, 5, -1, 4, 2, -1, 3, 5, 4, 2, -1, 1, 0, -1], ambience: 'sky' },
  boss: { root: 98, scale: [0, 1, 3, 5, 6, 8, 10], bpm: 132, lead: 'square', pad: 'sawtooth', padCutoff: 700, pattern: [0, 0, 3, 0, 4, 0, 3, 1, 0, 0, 3, 0, 5, 4, 3, 1], ambience: 'lava' },
};
