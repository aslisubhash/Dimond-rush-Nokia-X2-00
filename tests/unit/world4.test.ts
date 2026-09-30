import { describe, expect, it } from 'vitest';
import { climbTo, hopTo, levelWorld, run, teleport, walkTo } from './helpers';

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

describe('4-4 Fire Shafts', () => {
  const vents = (w: W, y: number): { active: boolean; x: number }[] => w.entities.filter((e) => e.type === 'fire_jet' && Math.floor(e.y / 32) === y) as never;
  it('the floor vents fire as a wave that can be followed', () => {
    const w = levelWorld('4-4');
    run(w, 0.5);
    teleport(w, 9, 41);
    // Wait until the first vent has just gone quiet, then walk behind the wave.
    const first = vents(w, 41).sort((a, b) => a.x - b.x)[0]!;
    until(w, () => first.active);
    until(w, () => !first.active);
    run(w, 3.2, { right: true });
    expect(w.player.x / 32).toBeGreaterThan(29);
    expect(w.player.health).toBe(w.player.maxHealth);
  });
  it('the shaft can be climbed by pausing on the landings between side bursts', () => {
    const w = levelWorld('4-4');
    run(w, 0.5);
    teleport(w, 46, 41);
    const side = w.entities.filter((e) => e.type === 'fire_jet' && e.str('dir', '') === 'right').sort((a, b) => b.y - a.y);
    const climbTo = (row: number): void => {
      for (let i = 0; i < 600 && feet(w) > row + 0.05; i++) run(w, 1 / 120, { up: true });
    };
    const climbPast = (jet: (typeof side)[number], landingRow: number): void => {
      climbTo(jet.y / 32 + 2.6); // hold on just below the vent
      until(w, () => jet.active);
      until(w, () => !jet.active);
      climbTo(landingRow);
      run(w, 0.1);
    };
    climbPast(side[0]!, 29);
    climbPast(side[1]!, 21);
    climbPast(side[2]!, 9);
    run(w, 0.5, { right: true });
    expect(feet(w)).toBeCloseTo(9, 0);
    expect(w.player.health).toBe(w.player.maxHealth);
  });
  it('the timed switch silences the last vents long enough to reach the exit', () => {
    const w = levelWorld('4-4');
    run(w, 0.5);
    teleport(w, 51, 8);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.4);
    run(w, 3.5, { right: true });
    expect(w.player.state).toBe('VICTORY');
    expect(w.player.health).toBe(w.player.maxHealth);
  });
  it('lighting the braziers in the carved order opens the cache', () => {
    const w = levelWorld('4-4');
    run(w, 0.5);
    for (const id of ['brazier_2', 'brazier_1', 'brazier_3']) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1);
    }
    run(w, 2);
    expect(w.getEntity('sd_cache')?.solidKind()).toBeNull();
  });
});

describe('4-5 Heat Maze', () => {
  it('the blocking flame wheel burns until the valve douses it', () => {
    const w = levelWorld('4-5');
    run(w, 0.5);
    teleport(w, 33, 23);
    run(w, 1.5, { right: true });
    expect(w.player.health).toBeLessThan(w.player.maxHealth);
    const w2 = levelWorld('4-5');
    run(w2, 0.5);
    teleport(w2, 30, 23);
    run(w2, 0.05, { interact: true, interactPressed: true });
    run(w2, 1.6, { right: true });
    expect(w2.player.x / 32).toBeGreaterThan(42);
    expect(w2.player.health).toBe(w2.player.maxHealth);
  });
  it('the dead-end stone dropped down the ladder shaft lands on the plate and opens the relic door', () => {
    const w = levelWorld('4-5');
    run(w, 0.5);
    teleport(w, 50, 15);
    run(w, 1.8, { left: true });
    run(w, 1.5);
    expect(w.getEntity('plate_shaft')?.active).toBe(true);
    run(w, 2);
    expect(w.getEntity('sd_relic')?.solidKind()).toBeNull();
  });
  it('the maze can be climbed from the start to the exit', () => {
    const w = levelWorld('4-5');
    w.invulnerable = true;
    run(w, 0.5);
    walkTo(w, 12);
    climbTo(w, 24);
    walkTo(w, 30);
    run(w, 0.05, { interact: true, interactPressed: true });
    walkTo(w, 44);
    climbTo(w, 16);
    walkTo(w, 6);
    climbTo(w, 8);
    walkTo(w, 56);
    expect(w.player.state).toBe('VICTORY');
  });
});

describe('4-6 Rising Lava', () => {
  const climb = (w: W): void => {
    walkTo(w, 11); hopTo(w, 13);
    walkTo(w, 18); hopTo(w, 20);
    walkTo(w, 24); hopTo(w, 27);
    walkTo(w, 31); climbTo(w, 50);
    walkTo(w, 22); hopTo(w, 19);
    walkTo(w, 14); hopTo(w, 11);
    walkTo(w, 6); hopTo(w, 4);
    hopTo(w, 6); walkTo(w, 20); hopTo(w, 23);
    walkTo(w, 27);
    const lift = w.getEntity('tower_lift') as unknown as { y: number; pause: number };
    until(w, () => lift.y / 32 > 33.9 && lift.pause > 0.9);
    hopTo(w, 30);
    until(w, () => lift.y / 32 < 24.05);
    hopTo(w, 25);
    walkTo(w, 8); climbTo(w, 14);
    walkTo(w, 14); hopTo(w, 17);
    walkTo(w, 22); hopTo(w, 25);
    walkTo(w, 31, 3);
  };
  it('the tower can be climbed ahead of the magma', () => {
    const w = levelWorld('4-6');
    w.invulnerable = true; // enemies aside, the magma must never catch a steady climb
    run(w, 0.5);
    climb(w);
    expect(w.player.state).toBe('VICTORY');
    expect(w.stats.deaths).toBe(0);
  });
  it('the magma starts rising once the climb begins and catches anyone who waits', () => {
    const w = levelWorld('4-6');
    run(w, 0.5);
    const magma = w.getEntity('magma') as unknown as { surfaceY: number };
    const y0 = magma.surfaceY;
    run(w, 3);
    expect(magma.surfaceY).toBe(y0);
    teleport(w, 30, 58);
    run(w, 20);
    expect(w.stats.deaths).toBeGreaterThan(0);
  });
});
