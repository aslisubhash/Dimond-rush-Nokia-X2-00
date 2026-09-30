import { describe, expect, it } from 'vitest';
import { Progression } from '../../src/core/progression';
import { MemoryStorage, SaveManager } from '../../src/core/save/SaveManager';
import { SAVE_KEY, SAVE_VERSION } from '../../src/core/save/schema';
import type { RunStats } from '../../src/core/world/GameWorld';
import { LEVELS } from '../../src/data/levels';

const stats = (p: Partial<RunStats> = {}): RunStats => ({
  time: 60,
  crystals: 3,
  crystalsTotal: 5,
  coins: 4,
  coinsTotal: 10,
  relics: 0,
  secretsFound: [],
  secretsTotal: 1,
  damage: 2,
  deaths: 1,
  collected: [],
  cosmetics: [],
  templeKey: false,
  heartVessel: false,
  seal: false,
  ...p,
});

describe('SaveManager', () => {
  it('starts from defaults and round-trips through storage', () => {
    const store = new MemoryStorage();
    const a = new SaveManager(store);
    expect(a.data.version).toBe(SAVE_VERSION);
    a.recordCompletion('1-1', 'jungle', false, stats(), []);
    const b = new SaveManager(store);
    expect(b.data.levels['1-1']?.completed).toBe(true);
    expect(b.data.levels['1-1']?.bestCrystals).toBe(3);
  });
  it('never lowers best records', () => {
    const s = new SaveManager(new MemoryStorage());
    s.recordCompletion('1-1', 'jungle', false, stats({ time: 50, crystals: 5, damage: 0 }), []);
    s.recordCompletion('1-1', 'jungle', false, stats({ time: 90, crystals: 1, damage: 3 }), []);
    const r = s.data.levels['1-1']!;
    expect(r.bestTime).toBe(50);
    expect(r.bestCrystals).toBe(5);
    expect(r.leastDamage).toBe(0);
  });
  it('banks relics, heart vessels, keys, seals and cosmetics once', () => {
    const s = new SaveManager(new MemoryStorage());
    const run = stats({ templeKey: true, seal: true, cosmetics: ['verdant'] });
    s.recordCompletion('1-8', 'jungle', true, run, ['relic_1', 'heart_vessel_1']);
    s.recordCompletion('1-8', 'jungle', true, run, ['relic_1', 'heart_vessel_1']);
    expect(s.data.collectibles.relics).toEqual(['1-8::relic_1']);
    expect(s.data.collectibles.heartVessels).toHaveLength(1);
    expect(s.data.collectibles.templeKeys).toEqual(['jungle']);
    expect(s.data.collectibles.seals).toEqual(['jungle']);
    expect(s.data.bosses).toEqual(['jungle']);
    expect(s.data.cosmetics.unlocked).toContain('verdant');
    expect(s.relicsInWorld(['1-1', '1-8'])).toBe(1);
  });
  it('a heart vessel raises max health exactly once', () => {
    const s = new SaveManager(new MemoryStorage());
    const before = s.data.upgrades.maxHealth;
    s.recordCheckpointProgress('2-8', 'desert', stats(), ['heart_vessel_2']);
    s.recordCheckpointProgress('2-8', 'desert', stats(), ['heart_vessel_2']);
    expect(s.data.upgrades.maxHealth).toBe(before + 1);
  });
  it('migrates a v1 save', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 1, completed: ['1-1', '1-2'], crystals: 9 }));
    const s = new SaveManager(store);
    expect(s.data.version).toBe(SAVE_VERSION);
    expect(s.data.levels['1-1']?.completed).toBe(true);
    expect(s.data.levels['1-2']?.bestTime).toBeNull();
    expect(s.data.settings.bindings.jump.length).toBeGreaterThan(0);
  });
  it('quarantines a corrupt save instead of destroying it', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, '{not json');
    const s = new SaveManager(store);
    expect(s.lastError).toMatch(/corrupt/);
    expect(store.getItem(`${SAVE_KEY}.corrupt`)).toBe('{not json');
    expect(s.data.levels).toEqual({});
  });
  it('fills in settings added after the save was written', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, settings: { masterVolume: 0.3 } }));
    const s = new SaveManager(store);
    expect(s.data.settings.masterVolume).toBe(0.3);
    expect(s.data.settings.bindings.left).toContain('KeyA');
  });
  it('reset keeps settings but clears progress', () => {
    const s = new SaveManager(new MemoryStorage());
    s.data.settings.masterVolume = 0.2;
    s.recordCompletion('1-1', 'jungle', false, stats(), []);
    s.reset();
    expect(s.data.levels).toEqual({});
    expect(s.data.settings.masterVolume).toBe(0.2);
  });
});

describe('Progression', () => {
  const prog = new Progression(LEVELS);
  it('covers all 48 levels in world order', () => {
    expect(prog.order).toHaveLength(48);
    expect(prog.order[0]).toBe('1-1');
    expect(prog.order[47]).toBe('6-8');
    for (const w of ['jungle', 'desert', 'crystal', 'volcano', 'ice', 'sky'] as const) expect(prog.levelsOf(w)).toHaveLength(8);
  });
  it('unlocks each level after the previous is completed', () => {
    const s = new SaveManager(new MemoryStorage());
    expect(prog.isUnlocked('1-1', s.data)).toBe(true);
    expect(prog.isUnlocked('1-2', s.data)).toBe(false);
    s.recordCompletion('1-1', 'jungle', false, stats(), []);
    expect(prog.isUnlocked('1-2', s.data)).toBe(true);
    expect(prog.frontier(s.data)).toBe('1-2');
  });
  it('rates crystals as stars', () => {
    expect(Progression.stars(5, 5)).toBe(5);
    expect(Progression.stars(0, 5)).toBe(0);
    expect(Progression.stars(0, 0)).toBe(5);
  });
});

describe('Content', () => {
  it('each world has three relics, a temple key, a temple door, a heart vessel and a seal', () => {
    for (const w of ['jungle', 'desert', 'crystal', 'volcano', 'ice', 'sky'] as const) {
      const lv = LEVELS.filter((l) => l.world === w);
      const text = JSON.stringify(lv);
      expect((text.match(/"type":"relic"/g) ?? []).length, w).toBe(3);
      expect(text, w).toContain('"type":"temple_key"');
      expect(text, w).toContain('"type":"temple_door"');
      expect(text, w).toContain('"type":"heart_vessel"');
      expect(text, w).toContain('"type":"seal"');
      expect(lv.filter((l) => l.boss)).toHaveLength(1);
    }
  });
});
