import { describe, expect, it } from 'vitest';
import { climbTo, hopTo, levelWorld, run, teleport, walkTo } from './helpers';

type W = ReturnType<typeof levelWorld>;
const feet = (w: W): number => (w.player.y + w.player.h) / 32;
const until = (w: W, f: () => boolean, max = 12): void => {
  for (let i = 0; i < max * 120 && !f(); i++) run(w, 1 / 120);
};
export const helpers = { climbTo };

describe('6-1 Floating Islands', () => {
  it('falling off an island costs a heart and returns Arin to safe ground', () => {
    const w = levelWorld('6-1');
    run(w, 0.5);
    walkTo(w, 11);
    run(w, 0.6, { right: true });
    run(w, 3);
    expect(w.player.health).toBe(w.player.maxHealth - 1);
    expect(feet(w)).toBeLessThan(19);
  });
  it('the islands, clouds, ferry and crumbling clouds lead to the exit', () => {
    const w = levelWorld('6-1');
    w.invulnerable = true;
    run(w, 0.5);
    walkTo(w, 12); hopTo(w, 17);
    walkTo(w, 24); hopTo(w, 29);
    walkTo(w, 30); hopTo(w, 35);
    walkTo(w, 36); hopTo(w, 41);
    walkTo(w, 52);
    const ferry = w.getEntity('sky_ferry')!;
    until(w, () => ferry.x / 32 < 54.2);
    hopTo(w, 55);
    until(w, () => ferry.x / 32 > 63.8);
    hopTo(w, 68);
    walkTo(w, 78); hopTo(w, 82);
    walkTo(w, 88); hopTo(w, 93);
    walkTo(w, 104); hopTo(w, 109);
    walkTo(w, 114);
    expect(w.player.state).toBe('VICTORY');
  });
  it('the drifting service platform carries Arin under the island to its belly cave', () => {
    const w = levelWorld('6-1');
    w.invulnerable = true;
    run(w, 0.5);
    const lift = w.getEntity('belly_lift')!;
    teleport(w, 54, 19);
    until(w, () => lift.x / 32 > 52.9 && (lift as unknown as { pause: number }).pause > 0.6);
    run(w, 0.05, { down: true, jump: true, jumpPressed: true });
    run(w, 0.6);
    expect(feet(w)).toBeCloseTo(23, 0);
    until(w, () => lift.x / 32 < 45.1);
    walkTo(w, 46, 1);
    hopTo(w, 45, 0.5);
    expect(feet(w)).toBeCloseTo(20, 0);
    expect(w.player.x / 32).toBeLessThan(46.5);
  });
});
