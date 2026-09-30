import { describe, expect, it } from 'vitest';
import { hopTo, levelWorld, run, teleport } from './helpers';

type W = ReturnType<typeof levelWorld>;
const feet = (w: W): number => (w.player.y + w.player.h) / 32;
const until = (w: W, f: () => boolean, max = 12): void => {
  for (let i = 0; i < max * 120 && !f(); i++) run(w, 1 / 120);
};

describe('4-1 Lava Entrance', () => {
  it('the falling platforms carry Arin across the lava lake', () => {
    const w = levelWorld('4-1');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 32, 17);
    const log: string[] = [];
    for (const tx of [35.5, 39.5, 43.5, 47.5, 51]) {
      hopTo(w, tx);
      log.push(`${(w.player.x / 32).toFixed(1)},${feet(w).toFixed(1)}`);
    }
    expect(w.player.dead, log.join(' ')).toBe(false);
    expect(w.player.x / 32, log.join(' ')).toBeGreaterThan(50);
  });
  it('lava is lethal', () => {
    const w = levelWorld('4-1');
    run(w, 0.5);
    teleport(w, 40, 17);
    run(w, 1.5);
    expect(w.stats.deaths).toBe(1);
  });
  it('basalt stepping stones cross the second lake', () => {
    const w = levelWorld('4-1');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 61, 17);
    for (const tx of [64.5, 69.5, 74.5, 79.5, 84.5, 89]) hopTo(w, tx);
    expect(w.stats.deaths).toBe(0);
    expect(w.player.x / 32).toBeGreaterThan(87);
  });
  it('the cracked mesa face breaks open to the relic cache', () => {
    const w = levelWorld('4-1');
    run(w, 0.5);
    teleport(w, 61, 17);
    run(w, 0.1, { left: true });
    run(w, 1 / 120, { attackPressed: true });
    run(w, 0.6);
    expect(w.map.isSolid(60, 16)).toBe(false);
  });
});

describe('4-2 Moving Platforms', () => {
  it('ferry, lift, twin wheels and the lever ferry cross the lava sea', () => {
    const w = levelWorld('4-2');
    w.invulnerable = true;
    run(w, 0.5);
    const e = (id: string) => w.getEntity(id)!;
    teleport(w, 9, 17);
    until(w, () => e('ferry_1').x / 32 < 12.2);
    hopTo(w, 13);
    until(w, () => e('ferry_1').x / 32 > 20.8);
    hopTo(w, 26);
    expect(feet(w)).toBeCloseTo(18, 1);
    teleport(w, 34, 17);
    until(w, () => e('lift_1').y / 32 > 16.9);
    hopTo(w, 38);
    until(w, () => e('lift_1').y / 32 < 10.2);
    hopTo(w, 42);
    expect(feet(w)).toBeCloseTo(11, 1);
    // Wheels.
    teleport(w, 55, 10);
    const wheels = w.entities.filter((x) => x.type === 'rotating_platform');
    const w1 = wheels.filter((p) => p.id.startsWith('wheel_1'));
    const w2 = wheels.filter((p) => p.id.startsWith('wheel_2'));
    const cx = (p: { x: number; w: number }): number => (p.x + p.w / 2) / 32;
    until(w, () => w1.some((p) => cx(p) < 60 && p.y / 32 > 11 && p.y / 32 < 14));
    hopTo(w, cx(w1.find((p) => cx(p) < 60)!) - 0.5);
    until(w, () => (w.player.x + 10) / 32 > 64.5 && w2.some((p) => cx(p) < 70.5 && Math.abs(p.y / 32 - feet(w)) < 1.2), 20);
    hopTo(w, cx(w2.find((p) => cx(p) < 70.5)!) + 0.5);
    until(w, () => (w.player.x + 10) / 32 > 74.5 && feet(w) < 14, 20);
    hopTo(w, 79);
    expect(feet(w)).toBeCloseTo(13, 1);
    // Lever ferry.
    teleport(w, 82, 12);
    e('lv_ferry').interact(w);
    run(w, 0.3, { right: true });
    hopTo(w, 88.5);
    until(w, () => e('ferry_2').x / 32 > 98.8);
    hopTo(w, 103);
    expect(w.player.x / 32).toBeGreaterThan(101);
    expect(w.stats.deaths).toBe(0);
  });
  it('the timed switch lift waits a moment, then carries Arin to the shelf cache', () => {
    const w = levelWorld('4-2');
    run(w, 0.5);
    teleport(w, 84, 12);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.25, { right: true });
    until(w, () => w.getEntity('lift_shelf')!.y / 32 < 7.05, 4);
    run(w, 0.8, { left: true });
    expect(feet(w)).toBeCloseTo(7, 1);
    expect(w.player.x / 32).toBeLessThan(82);
  });
});

describe('4-3 Lava Flow', () => {
  it('the first valve drains pool 1, opening the tunnel and the key vault', () => {
    const w = levelWorld('4-3');
    w.invulnerable = true; // route check only (the fire bat harasses the pool)
    run(w, 0.5);
    expect(w.getEntity('gate_tunnel')?.solidKind()).toBe('full');
    teleport(w, 7, 13);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 5);
    expect((w.getEntity('pool_1') as unknown as { surfaceY: number }).surfaceY).toBeGreaterThanOrEqual(20 * 32 - 1);
    expect(w.getEntity('gate_tunnel')?.solidKind()).toBeNull();
    // Drop into the dry pool and walk left into the vault.
    teleport(w, 11, 19);
    run(w, 1.5, { left: true });
    expect(w.player.x / 32).toBeLessThan(8);
    expect(w.stats.deaths).toBe(0);
    // Then right through the tunnel into cave B.
    run(w, 9, { right: true });
    expect(w.player.x / 32).toBeGreaterThan(41);
    expect(w.stats.deaths).toBe(0);
  });
  it('the second valve empties the pit so it can be walked and climbed out of', () => {
    const w = levelWorld('4-3');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 54, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 3);
    run(w, 3, { right: true });
    run(w, 4, { up: true, right: true });
    run(w, 1, { right: true });
    expect(feet(w)).toBeCloseTo(16, 0);
    expect(w.player.x / 32).toBeGreaterThan(70);
    expect(w.stats.deaths).toBe(0);
  });
});
