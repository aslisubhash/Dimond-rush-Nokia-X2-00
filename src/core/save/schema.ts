import type { WorldId } from '../types';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'relics-six-temples.save';

export type GameAction = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'interact' | 'pause' | 'walk';

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  /** Touch control scale 0.7 – 1.5. */
  touchScale: number;
  touchControls: 'auto' | 'on' | 'off';
  quality: 'high' | 'low';
  language: string;
  /** Keyboard bindings: action → list of KeyboardEvent.code values. */
  bindings: Record<GameAction, string[]>;
}

export interface LevelRecord {
  completed: boolean;
  bestTime: number | null;
  bestCrystals: number;
  crystalsTotal: number;
  bestCoins: number;
  secretFound: boolean;
  /** Unique pickups collected in this level (relics, keys, vessels, seals). */
  owned: string[];
  leastDamage: number | null;
}

export interface SaveData {
  version: number;
  currentLevel: string;
  levels: Record<string, LevelRecord>;
  collectibles: {
    coins: number;
    relics: string[];
    templeKeys: WorldId[];
    heartVessels: string[];
    seals: WorldId[];
  };
  bosses: WorldId[];
  secrets: string[];
  upgrades: { maxHealth: number };
  cosmetics: { unlocked: string[]; equipped: string };
  settings: Settings;
  stats: { deaths: number; playTime: number };
  seenIntro: boolean;
}

export const DEFAULT_BINDINGS: Record<GameAction, string[]> = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyK'],
  attack: ['KeyF', 'KeyJ'],
  interact: ['KeyE', 'KeyL'],
  pause: ['Escape', 'KeyP'],
  walk: ['ShiftLeft', 'ShiftRight'],
};

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    screenShake: true,
    reducedMotion: false,
    highContrast: false,
    touchScale: 1,
    touchControls: 'auto',
    quality: 'high',
    language: 'en',
    bindings: structuredClone(DEFAULT_BINDINGS),
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    currentLevel: '1-1',
    levels: {},
    collectibles: { coins: 0, relics: [], templeKeys: [], heartVessels: [], seals: [] },
    bosses: [],
    secrets: [],
    upgrades: { maxHealth: 4 },
    cosmetics: { unlocked: ['classic'], equipped: 'classic' },
    settings: defaultSettings(),
    stats: { deaths: 0, playTime: 0 },
    seenIntro: false,
  };
}

export function defaultLevelRecord(): LevelRecord {
  return { completed: false, bestTime: null, bestCrystals: 0, crystalsTotal: 0, bestCoins: 0, secretFound: false, owned: [], leastDamage: null };
}
