import { describe, expect, it } from 'vitest';
import { climbTo, entityAt, hopTo, levelWorld, run, teleport, walkTo } from './helpers';

type W = ReturnType<typeof levelWorld>;
const feet = (w: W): number => (w.player.y + w.player.h) / 32;
const until = (w: W, f: () => boolean, max = 12): void => {
  for (let i = 0; i < max * 120 && !f(); i++) run(w, 1 / 120);
};
void climbTo;
void walkTo;
void hopTo;
void entityAt;
void until;
void feet;

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
