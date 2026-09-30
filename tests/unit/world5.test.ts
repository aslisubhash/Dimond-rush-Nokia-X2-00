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

describe('5-3 Frozen Lake', () => {
  it('icy water hurts the longer Arin swims', () => {
    const w = levelWorld('5-3');
    run(w, 0.5);
    teleport(w, 22, 18);
    run(w, 1.5);
    expect(w.player.health).toBe(w.player.maxHealth);
    run(w, 1.5);
    expect(w.player.health).toBe(w.player.maxHealth - 1);
  });
  it('the lake can be crossed on the ice sheets and floes', () => {
    const w = levelWorld('5-3');
    w.invulnerable = true; // route check; the frost bat is fought separately
    run(w, 0.5);
    const floe = w.getEntity('floe')!;
    walkTo(w, 9);
    hopTo(w, 13);
    walkTo(w, 17);
    hopTo(w, 20);
    hopTo(w, 25);
    hopTo(w, 29);
    walkTo(w, 33);
    until(w, () => floe.x / 32 < 35.3);
    hopTo(w, 36.5);
    until(w, () => floe.x / 32 > 42.7);
    hopTo(w, 48);
    walkTo(w, 52);
    hopTo(w, 55);
    hopTo(w, 61);
    expect(feet(w)).toBeCloseTo(14, 0);
    expect(w.player.x / 32).toBeGreaterThan(58.5);
    expect(w.player.state).not.toBe('SWIM');
  });
  it('the dam drains the lake and unseals the key cave', () => {
    const w = levelWorld('5-3');
    run(w, 0.5);
    w.getEntity('lv_dam')!.interact(w);
    run(w, 6);
    expect((w.getEntity('lake') as unknown as { surfaceY: number }).surfaceY).toBeGreaterThanOrEqual(23 * 32 - 1);
    expect(w.getEntity('gate_cave')?.solidKind()).toBeNull();
    teleport(w, 59, 17);
    climbTo(w, 23);
    walkTo(w, 6);
    expect(w.player.x / 32).toBeLessThan(8);
    expect(w.player.health).toBe(w.player.maxHealth);
  });
  it('raising the pond floats Arin up to the exit cliff', () => {
    const w = levelWorld('5-3');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 67, 13);
    run(w, 0.05, { interact: true, interactPressed: true });
    teleport(w, 83, 13);
    run(w, 5);
    expect(feet(w)).toBeLessThan(11.2);
    hopTo(w, 88);
    expect(feet(w)).toBeCloseTo(10, 0);
  });
});

describe('5-4 Wind Cavern', () => {
  it('a gust shoves Arin back mid-jump; jumping between gusts clears the pit', () => {
    const gustOn = (w: W): boolean => !!w.getEntity('gust_a')?.active;
    const w = levelWorld('5-4');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 21, 31);
    until(w, () => gustOn(w));
    until(w, () => (w.getEntity('gust_a') as unknown as { gust: number }).gust >= 1);
    hopTo(w, 25);
    expect(w.player.x / 32).toBeLessThan(24);
    const w2 = levelWorld('5-4');
    run(w2, 0.5);
    teleport(w2, 20, 31);
    until(w2, () => gustOn(w2));
    until(w2, () => !gustOn(w2));
    walkTo(w2, 21);
    hopTo(w2, 25);
    expect(w2.player.x / 32).toBeGreaterThan(24);
    expect(w2.player.health).toBe(w2.player.maxHealth);
  });
  it('the updraft lifts Arin up the shaft to the upper cavern', () => {
    const w = levelWorld('5-4');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 39, 31);
    run(w, 0.4, { right: true });
    run(w, 3.5);
    expect(feet(w)).toBeLessThan(11);
    run(w, 1.5, { right: true });
    expect(feet(w)).toBeCloseTo(12, 0);
    expect(w.player.x / 32).toBeGreaterThan(46);
  });
  it('hovering at the top of the updraft, the cracked wall can be struck open', () => {
    const w = levelWorld('5-4');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 42, 31);
    run(w, 3.5);
    run(w, 0.3, { left: true });
    run(w, 1 / 120, { left: true, attackPressed: true });
    run(w, 0.5, { left: true });
    expect(w.map.isSolid(40, 9)).toBe(false);
  });
  it('stepping onto the sail wakes the fan, which carries Arin across the chasm', () => {
    const w = levelWorld('5-4');
    w.invulnerable = true; // the frost bat over the chasm is a separate threat
    run(w, 0.5);
    teleport(w, 51, 11);
    walkTo(w, 54);
    hopTo(w, 56);
    const sail = w.getEntity('sail')!;
    until(w, () => sail.x / 32 > 71.9, 10);
    expect(feet(w)).toBeCloseTo(11, 0);
    hopTo(w, 77);
    expect(feet(w)).toBeCloseTo(12, 0);
    expect(w.stats.deaths).toBe(0);
  });
});

describe('5-5 Falling Ice', () => {
  it('running through the icicle gallery outpaces the falling ice', () => {
    const w = levelWorld('5-5');
    run(w, 0.5);
    walkTo(w, 30);
    expect(w.player.health).toBe(w.player.maxHealth);
    const fallen = w.entities.filter((e) => e.type === 'icicle' && (e as unknown as { state: string }).state !== 'hang');
    expect(fallen.length).toBeGreaterThanOrEqual(5);
  });
  it('an icicle crushes an enemy that walks beneath it', () => {
    const w = levelWorld('5-5');
    w.invulnerable = true;
    run(w, 0.5);
    const foe = w.entities.find((e) => e.type === 'enemy' && Math.abs(e.x / 32 - 43) < 3)! as unknown as { alive: boolean; x: number };
    const ice = w.entities.find((e) => e.type === 'icicle' && Math.floor(e.x / 32) === 46)!;
    // Hold the enemy right under the icicle and shake it loose.
    ice.handleAction(w, { type: 'START' });
    for (let i = 0; i < 240 && foe.alive; i++) {
      foe.x = ice.x - 4;
      run(w, 1 / 120);
    }
    expect(foe.alive).toBe(false);
  });
  it('the lever drops the great icicle down the chimney and shatters the ice pillar', () => {
    const w = levelWorld('5-5');
    run(w, 0.5);
    expect(w.getEntity('ice_pillar')?.removed).toBe(false);
    w.getEntity('lv_chimney')!.interact(w);
    run(w, 2);
    expect(w.getEntity('ice_pillar')?.removed).toBe(true);
    teleport(w, 60, 17);
    walkTo(w, 72);
    expect(w.player.x / 32).toBeGreaterThan(71);
  });
  it('shaking the lone icicle loose and stepping aside shatters the ice plug', () => {
    const w = levelWorld('5-5');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 47, 17);
    walkTo(w, 49);
    walkTo(w, 51);
    run(w, 2);
    expect(w.getEntity('ice_plug')?.removed).toBe(true);
    walkTo(w, 49);
    climbTo(w, 23);
    expect(feet(w)).toBeGreaterThan(22);
    walkTo(w, 45);
    expect(w.player.x / 32).toBeLessThan(46);
  });
});

describe('5-6 Ice Lifts', () => {
  const e = (w: W, id: string): { x: number; y: number; pause: number } => w.getEntity(id) as unknown as { x: number; y: number; pause: number };
  it('the tower can be climbed on its lifts and the summit updraft', () => {
    const w = levelWorld('5-6');
    w.invulnerable = true; // frost bats aside
    run(w, 0.5);
    walkTo(w, 8);
    until(w, () => e(w, 'ice_lift_1').y / 32 > 56.9 && e(w, 'ice_lift_1').pause > 0.5);
    hopTo(w, 10);
    until(w, () => e(w, 'ice_lift_1').y / 32 < 47.1);
    hopTo(w, 14);
    walkTo(w, 24);
    until(w, () => e(w, 'ice_lift_2a').y / 32 > 44.9 && e(w, 'ice_lift_2a').pause > 0.4);
    hopTo(w, 28);
    until(w, () => e(w, 'ice_lift_2a').y / 32 < 39.1);
    hopTo(w, 33);
    until(w, () => e(w, 'ice_lift_2b').y / 32 < 33.1);
    hopTo(w, 37);
    walkTo(w, 44);
    run(w, 0.05, { interact: true, interactPressed: true });
    walkTo(w, 38);
    until(w, () => e(w, 'ice_lift_3').y / 32 < 22.1);
    walkTo(w, 34);
    expect(feet(w)).toBeCloseTo(22, 0);
    walkTo(w, 24);
    run(w, 3);
    run(w, 1.2, { left: true });
    walkTo(w, 5);
    expect(w.player.state).toBe('VICTORY');
    expect(w.stats.deaths).toBe(0);
  });
  it('the quick ice lift flicks Arin up to the hidden alcove', () => {
    const w = levelWorld('5-6');
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 36, 21);
    until(w, () => e(w, 'flick_lift').y / 32 > 21.9 && e(w, 'flick_lift').pause > 0.2);
    hopTo(w, 41);
    until(w, () => e(w, 'flick_lift').y / 32 < 16.1);
    walkTo(w, 45, 1);
    expect(feet(w)).toBeCloseTo(16, 0);
    expect(w.player.x / 32).toBeGreaterThan(43);
  });
});

describe('5-7 Blizzard Path', () => {
  const gust = (w: W): number => (w.getEntity('blizzard') as unknown as { gust: number }).gust;
  it('rocks shelter their lee side from the blizzard', () => {
    const w = levelWorld('5-7');
    run(w, 0.5);
    until(w, () => gust(w) >= 1);
    expect(w.windAt(27 * 32, 17 * 32).ax).toBe(0); // right behind the rock at x28
    expect(w.windAt(34 * 32, 17 * 32).ax).toBeLessThan(0); // out in the open
  });
  it('a gust blows exposed braziers out, but sheltered ones keep burning', () => {
    const w = levelWorld('5-7');
    run(w, 0.5);
    until(w, () => gust(w) === 0);
    w.getEntity('hut_fire_1')!.interact(w);
    w.getEntity('hut_fire_2')!.interact(w);
    until(w, () => gust(w) >= 1);
    run(w, 0.2);
    expect(w.getEntity('hut_fire_1')?.active).toBe(true);
    expect(w.getEntity('hut_fire_2')?.active).toBe(false);
  });
  it('lighting all three braziers in one lull opens the hut for good', () => {
    const w = levelWorld('5-7');
    run(w, 0.5);
    until(w, () => gust(w) >= 1);
    until(w, () => gust(w) === 0);
    for (const id of ['hut_fire_1', 'hut_fire_2', 'hut_fire_3']) w.getEntity(id)!.interact(w);
    run(w, 2);
    expect(w.getEntity('sd_hut')?.solidKind()).toBeNull();
    until(w, () => gust(w) >= 1);
    run(w, 2);
    expect(w.getEntity('hut_fire_2')?.active).toBe(false);
    expect(w.getEntity('sd_hut')?.solidKind()).toBeNull();
  });
  it('the ridge can be crossed dashing from lee to lee between gusts', () => {
    const w = levelWorld('5-7');
    w.invulnerable = true;
    run(w, 0.5);
    const lull = (): void => {
      until(w, () => gust(w) >= 1);
      until(w, () => gust(w) === 0);
    };
    walkTo(w, 13);
    // [pillar to vault, pit to jump, next lee]
    const legs: [number, number, number][] = [[14, 20, 27], [28, 0, 45], [46, 54, 57], [58, 65, 71], [72, 80, 87], [88, 95, 103]];
    for (const [obstacle, pit, lee] of legs) {
      lull();
      hopTo(w, obstacle + (obstacle === 46 ? 2 : 3));
      if (obstacle === 46) walkTo(w, 51, 1);
      if (pit) {
        walkTo(w, pit - 1, 1.5);
        hopTo(w, pit + 3);
      }
      walkTo(w, lee, 2);
      expect(w.player.x / 32, `leg ${obstacle}`).toBeGreaterThan(lee - 0.6);
    }
    lull();
    hopTo(w, 107);
    walkTo(w, 118, 3);
    expect(w.player.state).toBe('VICTORY');
  });
});
