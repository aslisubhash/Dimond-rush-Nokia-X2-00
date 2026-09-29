import { describe, expect, it } from 'vitest';
import type { Gate } from '../../src/core/entities/doors';
import { validateAll } from '../../src/core/levels/validator';
import { LEVELS } from '../../src/data/levels';
import { entityAt, jump, levelWorld, run, teleport } from './helpers';

describe('level data', () => {
  it('every level validates without errors', () => {
    const errors = validateAll(LEVELS).filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });
});

describe('1-1 Ancient Ruins', () => {
  it('push block lets Arin climb the ledge', () => {
    const w = levelWorld('1-1');
    teleport(w, 21, 19);
    run(w, 3, { right: true });
    const b = w.getEntity('stone_block_1')!;
    expect(b.x).toBe(31 * 32);
    // From the top of the block the 4-tile ledge is within jumping range.
    teleport(w, 31, 18);
    expect(w.player.grounded).toBe(true);
    jump(w, 1, 0.5, 0.6);
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(16 * 32 + 1);
  });

  it('face stone rolls down, crushes the snake and forms a step', () => {
    const w = levelWorld('1-1');
    teleport(w, 41, 15);
    run(w, 1, { right: true });
    run(w, 4, {});
    const s = w.getEntity('face_stone_1')!;
    expect(s.x).toBe(65 * 32);
    expect(w.getEntity('enemy_1')?.removed).toBe(true);
  });

  it('secret niche opens and grants the relic', () => {
    const w = levelWorld('1-1');
    teleport(w, 77, 15);
    run(w, 0.1, { right: true });
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.8, { right: true });
    expect(w.stats.secretsFound).toContain('offering_niche');
    teleport(w, 81, 15);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 1.5, {});
    expect(w.stats.relics).toBe(1);
  });

  it('reaches the exit and completes', () => {
    const w = levelWorld('1-1');
    teleport(w, 117, 19);
    run(w, 1, { right: true });
    expect(w.completed).toBe(true);
  });
});

describe('1-2 Mossy Passage', () => {
  it('pulling the stone onto the plate opens the gate and reveals the alcove', () => {
    const w = levelWorld('1-2');
    teleport(w, 19, 19);
    // Hold interact and walk right: the stone follows.
    const b = entityAt(w, 'stone_block', 18, 19);
    for (let i = 0; i < 1200 && Math.round(b.x / 32) < 28; i++) run(w, 1 / 120, { right: true, interact: true });
    run(w, 0.5, {});
    expect(w.getEntity('plate_a')?.active).toBe(true);
    run(w, 1, {});
    expect((w.getEntity('gate_a') as Gate).open).toBeGreaterThan(0.9);
    teleport(w, 18, 19);
    run(w, 0.05, { left: true });
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.6, { left: true });
    expect(w.stats.secretsFound).toContain('moss_alcove');
  });

  it('key opens the locked door; stone off the ledge opens gate b', () => {
    const w = levelWorld('1-2');
    teleport(w, 46, 10);
    expect(w.player.keys).toBe(1);
    teleport(w, 58, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 1.2, {});
    expect((w.getEntity('locked_door_1') as Gate).open).toBeGreaterThan(0.9);
    const ledgeStone = entityAt(w, 'stone_block', 64, 15);
    teleport(w, 63, 15);
    run(w, 3.2, { right: true });
    run(w, 1, {});
    expect(ledgeStone.y).toBe(19 * 32);
    run(w, 1, {});
    // The stone lands flush against the ledge wall: pull it onto the plate.
    teleport(w, 72, 19);
    const b = entityAt(w, 'stone_block', 71, 19);
    for (let i = 0; i < 900 && Math.round(b.x / 32) < 74; i++) run(w, 1 / 120, { right: true, interact: true });
    run(w, 1.5, {});
    expect(w.getEntity('plate_b')?.active).toBe(true);
    expect((w.getEntity('gate_b') as Gate).open).toBeGreaterThan(0.9);
  });
});

describe('1-5 Water Gate', () => {
  it('lever raises the basin and the float platform carries Arin to the cliff', () => {
    const w = levelWorld('1-5');
    teleport(w, 14, 10);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 8, {});
    const float = w.getEntity('float_1')!;
    expect(float.y).toBeLessThan(12 * 32);
    // Stand on the float and jump to the cliff.
    w.player.x = float.x + 20;
    w.player.y = float.y - w.player.h - 1;
    run(w, 0.3, {});
    expect(w.player.grounded).toBe(true);
    jump(w, 1, 0.5, 1);
    expect(w.player.x).toBeGreaterThan(46 * 32);
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(9 * 32 + 1);
  });

  it('cannot reach the cliff by swimming alone', () => {
    const w = levelWorld('1-5');
    teleport(w, 14, 10);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 8, {});
    w.player.x = 44 * 32;
    w.player.y = 13 * 32;
    run(w, 1, {});
    expect(w.player.state).toBe('SWIM');
    jump(w, 1, 0.5, 1.2);
    expect(w.player.x).toBeLessThan(46 * 32);
  });

  it('diving under the ripple leads to the sunken shrine', () => {
    const w = levelWorld('1-5');
    w.player.x = 19 * 32;
    w.player.y = 18 * 32;
    run(w, 1.2, { down: true, left: true });
    run(w, 2.5, { left: true });
    expect(w.stats.secretsFound).toContain('sunken_shrine');
  });

  it('the current blocks the passage until the cavern is drained', () => {
    const w = levelWorld('1-5');
    w.player.x = 64 * 32;
    w.player.y = 16 * 32;
    run(w, 3, { right: true });
    expect(w.player.x).toBeLessThan(70 * 32);
    teleport(w, 58, 20);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 7, {});
    teleport(w, 67, 17);
    run(w, 2.5, { right: true });
    expect(w.player.x).toBeGreaterThan(74 * 32);
  });
});
