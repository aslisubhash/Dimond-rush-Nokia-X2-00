import { describe, expect, it } from 'vitest';
import { TILE } from '../../src/core/constants';
import { makeWorld, run, settle } from './helpers';

const FLAT = [
  '#                              #',
  '#                              #',
  '#                              #',
  '#                              #',
  '#                              #',
  '#                              #',
  '#  P                           #',
  '################################',
];

describe('player movement', () => {
  it('lands on the ground and idles', () => {
    const w = makeWorld(FLAT);
    settle(w);
    expect(w.player.grounded).toBe(true);
    expect(w.player.state).toBe('IDLE');
    expect(w.player.y + w.player.h).toBeCloseTo(7 * TILE, 3);
  });

  it('runs right and stops at the wall', () => {
    const w = makeWorld(FLAT);
    settle(w);
    run(w, 4.5, { right: true });
    expect(w.player.x + w.player.w).toBeCloseTo(31 * TILE, 3);
    expect(w.player.state === 'RUN' || w.player.state === 'IDLE').toBe(true);
  });

  it('jumps between 3 and 4 tiles high', () => {
    const w = makeWorld(FLAT);
    settle(w);
    const groundY = w.player.y;
    let minY = groundY;
    run(w, 1 / 120, { jump: true, jumpPressed: true });
    for (let i = 0; i < 120; i++) {
      run(w, 1 / 120, { jump: true });
      minY = Math.min(minY, w.player.y);
    }
    const height = (groundY - minY) / TILE;
    expect(height).toBeGreaterThan(3.2);
    expect(height).toBeLessThan(4);
    expect(w.player.grounded).toBe(true);
  });

  it('short hop when jump is released early', () => {
    const w = makeWorld(FLAT);
    settle(w);
    const groundY = w.player.y;
    let minY = groundY;
    run(w, 1 / 120, { jump: true, jumpPressed: true });
    for (let i = 0; i < 100; i++) {
      run(w, 1 / 120, {});
      minY = Math.min(minY, w.player.y);
    }
    expect((groundY - minY) / TILE).toBeLessThan(1.5);
  });

  it('is deterministic for identical inputs', () => {
    const a = makeWorld(FLAT);
    const b = makeWorld(FLAT);
    for (const w of [a, b]) {
      run(w, 0.3, { right: true });
      run(w, 0.2, { right: true, jump: true, jumpPressed: true });
      run(w, 0.7, { left: true });
    }
    expect(a.digest()).toBe(b.digest());
  });

  it('crouches into a one-tile crawlspace', () => {
    const w = makeWorld([
      '#                    #',
      '#                    #',
      '#          ##########',
      '#  P                 #',
      '######################',
    ]);
    settle(w);
    run(w, 2, { right: true });
    // Blocked by the low ceiling while standing.
    expect(w.player.x + w.player.w).toBeLessThanOrEqual(11 * TILE + 0.01);
    run(w, 2.5, { right: true, down: true });
    expect(w.player.x).toBeGreaterThan(14 * TILE);
    expect(w.player.crouching).toBe(true);
  });
});

describe('climbing and swimming', () => {
  it('climbs a ladder', () => {
    const w = makeWorld([
      '#          #',
      '#   ====   #',
      '#    H     #',
      '#    H     #',
      '#    H     #',
      '#  P H     #',
      '############',
    ]);
    settle(w);
    run(w, 0.3, { right: true });
    run(w, 1.6, { up: true });
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(2 * TILE + 1);
  });

  it('swims and floats in water', () => {
    const w = makeWorld([
      '#          #',
      '#  P       #',
      '####~~~~####',
      '#~~~~~~~~~~#',
      '#~~~~~~~~~~#',
      '############',
    ]);
    settle(w);
    run(w, 1.2, { right: true });
    expect(w.player.state).toBe('SWIM');
    run(w, 1.5, {});
    // Floats near the surface.
    expect(w.player.y).toBeLessThan(2 * TILE + 8);
  });
});

describe('damage, death and respawn', () => {
  it('spikes hurt and bounce', () => {
    const w = makeWorld([
      '#          #',
      '#          #',
      '#  P ^^^   #',
      '############',
    ]);
    settle(w);
    run(w, 0.4, { right: true });
    expect(w.player.health).toBeLessThan(w.player.maxHealth);
  });

  it('dies in lava and respawns at the checkpoint', () => {
    const w = makeWorld([
      '#               #',
      '#               #',
      '#  P  K  LLLL   #',
      '#########LLLL####',
      '#################',
    ]);
    settle(w);
    run(w, 0.6, { right: true });
    expect(w.currentCheckpoint).not.toBeNull();
    run(w, 1.5, { right: true });
    expect(w.stats.deaths).toBe(1);
    run(w, 2, {});
    expect(w.player.dead).toBe(false);
    expect(w.player.health).toBe(w.player.maxHealth);
    expect(Math.abs(w.player.x + w.player.w / 2 - (6 * TILE + 16))).toBeLessThan(2);
  });

  it('falling into a pit costs a heart and returns to safety', () => {
    const w = makeWorld([
      '#               #',
      '#               #',
      '#  P            #',
      '######    #######',
    ]);
    settle(w);
    run(w, 0.8, { right: true });
    run(w, 1.5, {});
    expect(w.player.health).toBe(w.player.maxHealth - 1);
    expect(w.player.grounded).toBe(true);
  });
});

describe('water exit', () => {
  it('can leap out of a pool onto the bank', () => {
    const w = makeWorld([
      '#              #',
      '#              #',
      '#              #',
      '#  P           #',
      '####~~~##### ###',
      '####~~~#########',
      '################',
    ]);
    settle(w);
    run(w, 0.6, { right: true });
    run(w, 1.0, {});
    expect(w.player.state).toBe('SWIM');
    run(w, 1 / 120, { right: true, jump: true, jumpPressed: true });
    run(w, 1.2, { right: true, jump: true });
    expect(w.player.state === 'RUN' || w.player.state === 'IDLE' || w.player.state === 'LAND').toBe(true);
    expect(w.player.x).toBeGreaterThan(7 * 32);
  });
});
