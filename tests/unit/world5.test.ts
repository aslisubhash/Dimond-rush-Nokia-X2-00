import { describe, expect, it } from 'vitest';
import { climbTo, entityAt, hopTo, levelWorld, run, teleport, walkTo } from './helpers';

type W = ReturnType<typeof levelWorld>;
const feet = (w: W): number => (w.player.y + w.player.h) / 32;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const until = (w: W, f: () => boolean, max = 12): void => {
  for (let i = 0; i < max * 120 && !f(); i++) run(w, 1 / 120);
};

describe('5-1 Snow Approach', () => {
  it('ice keeps Arin sliding after releasing the run', () => {
    const w = levelWorld('5-1');
    run(w, 0.5);
    teleport(w, 4, 17);
    run(w, 0.6, { right: true });
    const x0 = w.player.x;
    run(w, 0.25);
    const snowStop = w.player.x - x0;
    teleport(w, 9, 17);
    run(w, 0.3, { right: true });
    const x1 = w.player.x;
    run(w, 0.25);
    expect(w.player.x - x1).toBeGreaterThan(snowStop * 1.5);
  });
  it('the ice block glides onto the plate and opens the gate', () => {
    const w = levelWorld('5-1');
    run(w, 0.5);
    teleport(w, 55, 17);
    run(w, 0.4, { right: true });
    run(w, 3);
    expect(w.getEntity('plate_gate')?.active).toBe(true);
    run(w, 2);
    expect(w.getEntity('gate_ice')?.solidKind()).toBeNull();
  });
  it('the thin ice breaks and the pond leads down to the relic cave', () => {
    const w = levelWorld('5-1');
    run(w, 0.5);
    teleport(w, 36, 17);
    run(w, 1.5);
    expect(feet(w)).toBeGreaterThan(18.5);
    for (let i = 0; i < 360 && w.player.x / 32 > 25; i++) run(w, 1 / 120, { left: true, down: true });
    expect(w.player.x / 32).toBeLessThan(26);
    expect(w.stats.deaths).toBe(0);
  });
});

describe('5-2 Ice Slides', () => {
  it('the first ice block slides against the cliff and becomes a step', () => {
    const w = levelWorld('5-2');
    run(w, 0.5);
    run(w, 0.7, { right: true });
    run(w, 2);
    expect(entityAt(w, 'ice_block', 14, 17)).toBeDefined();
    walkTo(w, 13);
    hopTo(w, 14);
    hopTo(w, 16);
    expect(feet(w)).toBeCloseTo(14, 1);
  });
  it('an ice block pushed without a stopper slides past the plates', () => {
    const w = levelWorld('5-2');
    run(w, 0.5);
    teleport(w, 24, 17);
    run(w, 0.7, { right: true });
    run(w, 3);
    const ice = w.getEntity('ice_plate')!;
    expect(ice.x / 32).toBeGreaterThan(40);
    expect(w.getEntity('gate_plates')?.solidKind()).toBe('full');
  });
  it('park the stone on the far plate, then slide the ice block onto the near one', () => {
    const w = levelWorld('5-2');
    w.invulnerable = true; // the frost bat overhead would knock Arin around
    run(w, 0.5);
    teleport(w, 46, 17);
    const stone = w.entities.find((e) => e.type === 'stone_block')!;
    for (let i = 0; i < 1200 && stone.x > 39 * 32 + 1; i++) run(w, 1 / 120, { left: true });
    run(w, 0.5);
    expect(w.getEntity('plate_b')?.active).toBe(true);
    teleport(w, 24, 17);
    run(w, 0.7, { right: true });
    run(w, 3);
    expect(w.getEntity('plate_a')?.active).toBe(true);
    run(w, 2);
    expect(w.getEntity('gate_plates')?.solidKind()).toBeNull();
  });
  it('lighting the brazier melts the ice sealing the doorway', () => {
    const w = levelWorld('5-2');
    run(w, 0.5);
    w.getEntity('brazier_door')!.interact(w);
    run(w, 3);
    expect(w.entities.filter((e) => e.type === 'ice_block' && !e.removed && Math.floor(e.x / 32) === 60)).toHaveLength(0);
  });
  it('walking over the pale ice drops into the hidden cave, and the ladder leads back out', () => {
    const w = levelWorld('5-2');
    run(w, 0.5);
    teleport(w, 84, 17);
    walkTo(w, 87);
    run(w, 1.2);
    expect(feet(w)).toBeCloseTo(22, 0);
    walkTo(w, 91);
    climbTo(w, 18);
    run(w, 0.7, { right: true });
    expect(feet(w)).toBeCloseTo(18, 0);
  });
});
