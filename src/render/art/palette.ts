import type { WorldId } from '../../core/types';

/** Per-world palette extracted from the Season 2 storyboard. */
export interface WorldPalette {
  stone: [string, string, string, string]; // highlight, light, mid, dark
  cap: [string, string, string]; // surface cap (moss / sand / crystal / crust / snow / grass)
  back: [string, string, string]; // back wall light, mid, dark
  accent: string;
  accent2: string;
  skyTop: string;
  skyBottom: string;
  fog: string;
  far: string;
  mid: string;
  platform: [string, string, string];
  water: string;
  light: number; // ambient light tint (0xRRGGBB)
  grade: number; // colour grade tint for the camera
}

export const PALETTES: Record<WorldId, WorldPalette> = {
  jungle: {
    stone: ['#b8b48a', '#8f8c66', '#6b6a4c', '#403f2c'],
    cap: ['#a6dd5a', '#5da83a', '#2f6a22'],
    back: ['#4d5a3c', '#3a4630', '#252e1f'],
    accent: '#b65cff',
    accent2: '#ffb347',
    skyTop: '#16301f',
    skyBottom: '#6f9a4a',
    fog: '#9fc27a',
    far: '#27472a',
    mid: '#1c3520',
    platform: ['#a78a5a', '#7c6240', '#4f3d27'],
    water: '#22a08c',
    light: 0xfff2c4,
    grade: 0xf1ffe6,
  },
  desert: {
    stone: ['#f6d58c', '#d9aa5c', '#a8773a', '#6b4520'],
    cap: ['#fbe4a4', '#e8c270', '#b88a45'],
    back: ['#8e6534', '#6c4a24', '#452e15'],
    accent: '#b65cff',
    accent2: '#4dd6ff',
    skyTop: '#3a220e',
    skyBottom: '#e3a14d',
    fog: '#f0c27a',
    far: '#7a4b22',
    mid: '#5a3717',
    platform: ['#e8bd6a', '#b98a42', '#7a5526'],
    water: '#2f9fb3',
    light: 0xffe0a0,
    grade: 0xfff1d8,
  },
  crystal: {
    stone: ['#8b93d6', '#5a61a8', '#3a3f78', '#1f2246'],
    cap: ['#e7b8ff', '#b65cff', '#6f2fb8'],
    back: ['#2d3163', '#212449', '#14162f'],
    accent: '#b65cff',
    accent2: '#4dc3ff',
    skyTop: '#07081a',
    skyBottom: '#1f2352',
    fog: '#4b3f9c',
    far: '#151838',
    mid: '#0f112a',
    platform: ['#7fb8ff', '#4a7fd0', '#2a4a8a'],
    water: '#3b6fd8',
    light: 0xc7b8ff,
    grade: 0xe6e2ff,
  },
  volcano: {
    stone: ['#8a5a48', '#5e3a2e', '#3f2520', '#211212'],
    cap: ['#ffcf5a', '#ff7a1f', '#c23a10'],
    back: ['#3b1d18', '#2a1411', '#170a08'],
    accent: '#ff5a1f',
    accent2: '#ffd35a',
    skyTop: '#120405',
    skyBottom: '#6a1a0c',
    fog: '#ff6a2a',
    far: '#3a0f0a',
    mid: '#240806',
    platform: ['#7a5a52', '#4f3530', '#2e1d1a'],
    water: '#3aa0c8',
    light: 0xffb088,
    grade: 0xffe6da,
  },
  ice: {
    stone: ['#f2fbff', '#bfe3f7', '#86b8de', '#4a77a8'],
    cap: ['#ffffff', '#e4f4ff', '#b6d8ef'],
    back: ['#5d86b3', '#3f6592', '#284469'],
    accent: '#b65cff',
    accent2: '#7fe0ff',
    skyTop: '#0e1c3a',
    skyBottom: '#7fa8d6',
    fog: '#cfe6ff',
    far: '#3b5d8a',
    mid: '#2a4670',
    platform: ['#d8f1ff', '#9ccbeb', '#5f93c0'],
    water: '#5fb3e0',
    light: 0xe4f4ff,
    grade: 0xeef6ff,
  },
  sky: {
    stone: ['#fffaf0', '#e7ddc6', '#bfae8a', '#8a7552'],
    cap: ['#b7f07a', '#6cbf4a', '#3d8a2f'],
    back: ['#d8c9a5', '#b8a57c', '#8f7c55'],
    accent: '#b65cff',
    accent2: '#ffd56a',
    skyTop: '#3f8fe0',
    skyBottom: '#d9f0ff',
    fog: '#ffffff',
    far: '#8fb6e0',
    mid: '#b2cfee',
    platform: ['#f6e7b8', '#e0b040', '#9a7420'],
    water: '#6fd0ff',
    light: 0xfff6dc,
    grade: 0xfffdf4,
  },
};

export const HEX = (s: string): number => parseInt(s.slice(1), 16);

export function shade(hex: string, amt: number): string {
  const n = HEX(hex);
  const f = (c: number): number => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function mix(a: string, b: string, t: number): string {
  const x = HEX(a);
  const y = HEX(b);
  const c = (s: number): number => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}
