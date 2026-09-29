import type { RunStats } from '../world/GameWorld';
import type { WorldId } from '../types';
import { defaultLevelRecord, defaultSave, SAVE_KEY, SAVE_VERSION, type SaveData } from './schema';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory storage used by tests and when localStorage is unavailable. */
export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Recursively fill missing fields from defaults while keeping stored values.
 * Unknown stored keys are preserved; type mismatches fall back to the default.
 */
export function mergeDefaults<T>(defaults: T, stored: unknown): T {
  if (stored === undefined || stored === null) return defaults;
  if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored : defaults) as T;
  if (typeof defaults === 'object' && defaults !== null) {
    if (typeof stored !== 'object' || Array.isArray(stored)) return defaults;
    const out: Record<string, unknown> = { ...(stored as Record<string, unknown>) };
    for (const [k, v] of Object.entries(defaults as Record<string, unknown>)) {
      out[k] = mergeDefaults(v, (stored as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return (typeof stored === typeof defaults ? stored : defaults) as T;
}

/** Schema migrations: each step upgrades one version. */
const MIGRATIONS: Record<number, (d: Record<string, Json>) => Record<string, Json>> = {
  // v1 stored a flat `completed: string[]` list and `crystals` number.
  1: (d) => {
    const levels: Record<string, Json> = {};
    const completed = Array.isArray(d['completed']) ? (d['completed'] as string[]) : [];
    for (const id of completed) levels[id] = { completed: true };
    const out: Record<string, Json> = { ...d, levels, version: 2 };
    delete out['completed'];
    delete out['crystals'];
    return out;
  },
};

export class SaveManager {
  data: SaveData;
  private readonly storage: KeyValueStorage;
  /** Last load problem (corrupt data etc), for diagnostics. */
  lastError: string | null = null;

  constructor(storage?: KeyValueStorage) {
    this.storage = storage ?? SaveManager.detectStorage();
    this.data = this.load();
  }

  static detectStorage(): KeyValueStorage {
    try {
      const ls = globalThis.localStorage;
      const probe = '__probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    } catch {
      return new MemoryStorage();
    }
  }

  load(): SaveData {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch (e) {
      this.lastError = String(e);
    }
    if (!raw) return defaultSave();
    try {
      let parsed = JSON.parse(raw) as Record<string, Json>;
      let v = typeof parsed['version'] === 'number' ? (parsed['version'] as number) : 1;
      while (v < SAVE_VERSION) {
        const m = MIGRATIONS[v];
        if (m) parsed = m(parsed);
        v++;
        parsed['version'] = v;
      }
      const merged = mergeDefaults(defaultSave(), parsed);
      for (const [id, rec] of Object.entries(merged.levels)) merged.levels[id] = mergeDefaults(defaultLevelRecord(), rec);
      merged.version = SAVE_VERSION;
      return merged;
    } catch (e) {
      // Keep the corrupt blob for recovery instead of silently destroying it.
      this.lastError = `corrupt save: ${String(e)}`;
      try {
        this.storage.setItem(`${SAVE_KEY}.corrupt`, raw);
      } catch {
        /* ignore */
      }
      return defaultSave();
    }
  }

  save(): void {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      this.lastError = String(e);
    }
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings;
    this.save();
  }

  level(id: string) {
    let r = this.data.levels[id];
    if (!r) {
      r = defaultLevelRecord();
      this.data.levels[id] = r;
    }
    return r;
  }

  /** Unique pickups already owned across all levels. */
  ownedSet(): Set<string> {
    const s = new Set<string>();
    for (const [lid, r] of Object.entries(this.data.levels)) for (const o of r.owned) s.add(`${lid}::${o}`);
    return s;
  }

  ownedInLevel(levelId: string): Set<string> {
    return new Set(this.data.levels[levelId]?.owned ?? []);
  }

  /** Persist the result of a completed level run. Never lowers existing records. */
  recordCompletion(levelId: string, world: WorldId, isBoss: boolean, stats: RunStats, uniqueIds: string[]): void {
    const r = this.level(levelId);
    r.completed = true;
    r.bestTime = r.bestTime === null ? stats.time : Math.min(r.bestTime, stats.time);
    r.bestCrystals = Math.max(r.bestCrystals, stats.crystals);
    r.crystalsTotal = stats.crystalsTotal;
    r.bestCoins = Math.max(r.bestCoins, stats.coins);
    r.leastDamage = r.leastDamage === null ? stats.damage : Math.min(r.leastDamage, stats.damage);
    if (stats.secretsFound.length) r.secretFound = true;
    for (const s of stats.secretsFound) {
      const key = `${levelId}:${s}`;
      if (!this.data.secrets.includes(key)) this.data.secrets.push(key);
    }
    this.recordCheckpointProgress(levelId, world, stats, uniqueIds);
    if (isBoss && !this.data.bosses.includes(world)) this.data.bosses.push(world);
    this.data.stats.deaths += stats.deaths;
    this.data.stats.playTime += stats.time;
    this.save();
  }

  /** Unique items are banked as soon as they're collected (even if the player quits). */
  recordCheckpointProgress(levelId: string, world: WorldId, stats: RunStats, uniqueIds: string[]): void {
    const r = this.level(levelId);
    const c = this.data.collectibles;
    for (const id of uniqueIds) {
      if (r.owned.includes(id)) continue;
      r.owned.push(id);
      const key = `${levelId}::${id}`;
      if (id.startsWith('relic') && !c.relics.includes(key)) c.relics.push(key);
      if (id.startsWith('heart_vessel') && !c.heartVessels.includes(key)) {
        c.heartVessels.push(key);
        this.data.upgrades.maxHealth += 1;
      }
    }
    if (stats.templeKey && !c.templeKeys.includes(world)) c.templeKeys.push(world);
    if (stats.seal && !c.seals.includes(world)) c.seals.push(world);
    for (const cos of stats.cosmetics) if (!this.data.cosmetics.unlocked.includes(cos)) this.data.cosmetics.unlocked.push(cos);
  }

  addCoins(n: number): void {
    this.data.collectibles.coins += n;
  }

  totalCrystals(): number {
    return Object.values(this.data.levels).reduce((n, r) => n + r.bestCrystals, 0);
  }

  relicsInWorld(levelIdsOfWorld: string[]): number {
    return this.data.collectibles.relics.filter((k) => levelIdsOfWorld.some((l) => k.startsWith(`${l}::`))).length;
  }
}
