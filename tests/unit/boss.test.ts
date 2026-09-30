import { describe, expect, it } from 'vitest';
import type { Boss } from '../../src/core/bosses/Boss';
import { levelWorld, run, teleport } from './helpers';

function strike(w: ReturnType<typeof levelWorld>, id: string): void {
  const e = w.getEntity(id)!;
  e.interact(w);
}

describe('1-8 Giant Serpent', () => {
  it('cannot be damaged before the puzzle is solved', () => {
    const w = levelWorld('1-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 22, 16);
    run(w, 3, {});
    expect(boss.state).toBe('fight');
    expect(boss.exposed).toBe(false);
    // Striking the (still moss-covered) crystal does nothing.
    strike(w, 'cr_heart');
    run(w, 0.2, {});
    expect(w.getEntity('cr_heart')?.active).toBe(false);
  });

  it('is defeated through water → waterfall → crystal → stun → weak point', () => {
    const w = levelWorld('1-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 22, 16);
    run(w, 3, {});
    // 1. activate water
    teleport(w, 23, 16);
    run(w, 0.05, { interact: true, interactPressed: true });
    expect(w.getEntity('sw_water')?.active).toBe(true);
    // 2. redirect the waterfall
    teleport(w, 49, 10);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.2, {});
    expect(w.getEntity('falls_b')?.active).toBe(true);
    expect(boss.phaseIndex).toBe(1);
    let hits = 0;
    for (let cycle = 0; cycle < 12 && boss.state === 'fight'; cycle++) {
      // 3/4. wait for the serpent to rise, then charge the crystal
      for (let i = 0; i < 1200 && !((boss.brain.pose['emerge'] ?? 0) > 0.8 && boss.stun <= 0); i++) run(w, 1 / 120, {});
      teleport(w, 56, 16);
      strike(w, 'cr_heart');
      run(w, 0.1, {});
      if (boss.stun <= 0) continue;
      // 5/6. the stunned head slumps onto the bank — strike its gem
      const wp = boss.brain.weakPoint(boss)!;
      w.player.x = wp.x - w.player.w - 6;
      w.player.y = 17 * 32 - w.player.h;
      w.player.facing = 1;
      run(w, 0.1, {});
      run(w, 1 / 120, { attackPressed: true });
      run(w, 0.4, {});
      hits = boss.hitsTaken;
      run(w, 1.2, {});
    }
    expect(hits).toBeGreaterThanOrEqual(4);
    run(w, 4, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
    expect(w.getEntity('gate_in')?.solidKind()).toBeNull();
    const exit = w.entities.find((e) => e.type === 'exit_gate')!;
    expect(exit.active).toBe(true);
  });

  it('resets the arena when Arin dies mid-fight', () => {
    const w = levelWorld('1-8');
    const boss = w.boss as Boss;
    teleport(w, 22, 16);
    run(w, 3, {});
    teleport(w, 23, 16);
    run(w, 0.05, { interact: true, interactPressed: true });
    expect(w.getEntity('sw_water')?.active).toBe(true);
    w.killPlayer('test');
    run(w, 2.5, {});
    expect(boss.state).toBe('dormant');
    expect(w.getEntity('sw_water')?.active).toBe(false);
    expect(w.getEntity('gate_in')?.solidKind()).toBeNull();
  });
});

describe('2-8 Sand King', () => {
  it('is defeated by routing sunlight into the disk after every mirror sabotage', () => {
    const w = levelWorld('2-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 20, 19);
    run(w, 3, {});
    expect(boss.state).toBe('fight');
    const m = (id: string): { orient: number; rotate: (x: unknown) => void } => w.getEntity(id) as unknown as { orient: number; rotate: (x: unknown) => void };
    // Correct orientations: m1 '\\' (1), m2 '/' (0), m3 '/' (0).
    const want: Record<string, number> = { m1: 1, m2: 0, m3: 0 };
    for (let cycle = 0; cycle < 10 && boss.state === 'fight'; cycle++) {
      run(w, 0.3, {});
      for (const id of ['m1', 'm2', 'm3']) if (m(id).orient !== want[id]) m(id).rotate(w);
      for (let i = 0; i < 60 && boss.stun <= 0; i++) run(w, 1 / 60, {});
      expect(boss.stun).toBeGreaterThan(0);
      // Strike the gem from the dais.
      w.player.x = 49 * 32 - w.player.w - 1;
      w.player.y = 18 * 32 - w.player.h;
      w.player.facing = 1;
      run(w, 0.8, {});
      run(w, 1 / 120, { attackPressed: true });
      run(w, 0.5, {});
      for (let i = 0; i < 600 && boss.stun > 0 && boss.state === 'fight'; i++) run(w, 1 / 60, {});
      run(w, 0.3, {});
    }
    run(w, 4, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
  });
});

describe('3-8 Crystal Titan', () => {
  it('is stunned only by the melody of the current phase and falls after three songs', () => {
    const w = levelWorld('3-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 62, 19);
    run(w, 3, {});
    expect(boss.state).toBe('fight');
    const strike = (id: string): void => {
      w.getEntity(id)!.interact(w);
      run(w, 0.1, {});
    };
    // A wrong order does nothing.
    strike('chime_2');
    run(w, 2, {});
    expect(boss.stun).toBe(0);
    for (let guard = 0; guard < 8 && boss.state === 'fight'; guard++) {
      const phase = boss.phase!;
      const order = phase.hint ?? [];
      run(w, 1.6, {}); // let every chime fade
      for (const id of order) {
        // Repeated notes need the crystal to fade first.
        for (let i = 0; i < 240 && w.getEntity(id)!.active; i++) run(w, 1 / 120, {});
        strike(id);
      }
      run(w, 0.2, {});
      expect(boss.stun).toBeGreaterThan(0);
      const wp = boss.brain.weakPoint(boss)!;
      run(w, 0.6, {});
      w.player.x = wp.x - w.player.w - 4;
      w.player.y = 19 * 32 + 32 - w.player.h;
      w.player.facing = 1;
      run(w, 0.1, {});
      run(w, 1 / 120, { attackPressed: true });
      run(w, 0.5, {});
      if (boss.state === 'fight' && boss.stun > 0 && boss.phaseHits > 0) {
        // Needs another hit this phase: wait for the stun to end and play the song again.
        for (let i = 0; i < 900 && boss.stun > 0; i++) run(w, 1 / 120, {});
      }
    }
    run(w, 4.5, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
  });

  it('a failed stun window resets the melody so it can be replayed', () => {
    const w = levelWorld('3-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 62, 19);
    run(w, 3, {});
    for (const id of ['chime_1', 'chime_3', 'chime_2']) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1, {});
    }
    run(w, 0.2, {});
    expect(boss.stun).toBeGreaterThan(0);
    run(w, 7, {});
    expect(boss.stun).toBe(0);
    expect(w.getEntity('seq_p1')?.active).toBe(false);
    run(w, 1.6, {});
    for (const id of ['chime_1', 'chime_3', 'chime_2']) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1, {});
    }
    run(w, 0.2, {});
    expect(boss.stun).toBeGreaterThan(0);
  });
});

describe('4-8 Fire Dragon', () => {
  const strikeHead = (w: ReturnType<typeof levelWorld>, boss: Boss): void => {
    for (let i = 0; i < 120 && ((boss.brain.pose['grounded'] ?? 0) < 0.95); i++) run(w, 1 / 60, {});
    const wp = boss.brain.weakPoint(boss)!;
    const fromLeft = (boss.brain.pose['facing'] ?? -1) < 0;
    w.player.x = fromLeft ? wp.x - w.player.w - 4 : wp.x + wp.w + 4;
    w.player.y = 22 * 32 - w.player.h;
    w.player.facing = fromLeft ? 1 : -1;
    run(w, 0.15, {});
    run(w, 1 / 120, { attackPressed: true });
    run(w, 0.6, {});
  };
  it('is grounded by opening both cooling valves during each flood and then struck', () => {
    const w = levelWorld('4-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 24, 21);
    run(w, 3, {});
    expect(boss.state).toBe('fight');
    run(w, 16, {});
    expect(boss.phase?.id).toBe('flood1');
    run(w, 3, {});
    const lava = w.getEntity('lava_arena') as unknown as { surfaceY: number };
    expect(lava.surfaceY).toBeLessThan(21 * 32);
    // Climb to safety and turn both valves.
    teleport(w, 25, 9);
    w.getEntity('valve_a')!.interact(w);
    run(w, 0.2, {});
    expect(boss.phase?.id).toBe('flood1');
    w.getEntity('valve_b')!.interact(w);
    run(w, 0.3, {});
    expect(boss.phase?.id).toBe('down1');
    run(w, 3, {}); // lava drains, dragon crashes
    for (let k = 0; k < 4 && boss.phase?.id === 'down1'; k++) strikeHead(w, boss);
    expect(boss.phase?.id).toBe('flood2');
    expect(w.getEntity('valve_a')?.active).toBe(false);
    teleport(w, 25, 9);
    run(w, 2, {});
    w.getEntity('valve_a')!.interact(w);
    w.getEntity('valve_b')!.interact(w);
    run(w, 3.5, {});
    for (let k = 0; k < 4 && boss.phase?.id === 'down2'; k++) strikeHead(w, boss);
    run(w, 4.5, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
  });
  it('the flooded floor is deadly', () => {
    const w = levelWorld('4-8');
    const boss = w.boss as Boss;
    teleport(w, 24, 21);
    run(w, 3, {});
    w.invulnerable = true;
    run(w, 15.5, {});
    w.invulnerable = false;
    expect(boss.phase?.id).toBe('flood1');
    teleport(w, 45, 21);
    run(w, 4, {});
    expect(w.stats.deaths).toBeGreaterThan(0);
  });
});

describe('5-8 Ice Dragon', () => {
  const strike = (w: ReturnType<typeof levelWorld>, boss: Boss): void => {
    // Wait until the stunned dragon has crashed to the ground.
    for (let i = 0; i < 180 && boss.brain.weakPoint(boss)!.y < 23 * 32 - 90; i++) run(w, 1 / 60, {});
    const wp = boss.brain.weakPoint(boss)!;
    const fromLeft = (boss.brain.pose['facing'] ?? -1) < 0;
    w.player.x = fromLeft ? wp.x - w.player.w - 4 : wp.x + wp.w + 4;
    w.player.y = 23 * 32 - w.player.h;
    w.player.facing = fromLeft ? 1 : -1;
    run(w, 0.1, {});
    run(w, 1 / 120, { attackPressed: true });
    run(w, 0.6, {});
  };
  it('is grounded by the great icicle above its perch and struck on the head', () => {
    const w = levelWorld('5-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 21, 22);
    run(w, 3.5, {});
    expect(boss.state).toBe('fight');
    const drop = (sw: string): void => {
      teleport(w, 36, 16);
      w.getEntity(sw)!.interact(w);
      for (let i = 0; i < 240 && boss.stun <= 0; i++) run(w, 1 / 120, {});
    };
    drop('sw_a');
    expect(boss.stun).toBeGreaterThan(0);
    strike(w, boss);
    expect(boss.phase?.id).toBe('perch_b');
    run(w, 2.5, {});
    drop('sw_a');
    expect(boss.stun).toBe(0); // wrong perch: the icicle misses
    run(w, 3.5, {});
    drop('sw_b');
    expect(boss.stun).toBeGreaterThan(0);
    strike(w, boss);
    expect(boss.phase?.id).toBe('storm');
    for (let k = 0; k < 4 && boss.state === 'fight'; k++) {
      run(w, 3.5, {});
      drop('sw_a');
      strike(w, boss);
    }
    run(w, 4.5, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
  });
});

describe('6-8 Sky Deity', () => {
  it('storm, pylons, shield beam, ring mirrors, then the Heart Seal', () => {
    const w = levelWorld('6-8');
    w.invulnerable = true;
    const boss = w.boss as Boss;
    teleport(w, 12, 23);
    run(w, 3.5, {});
    expect(boss.state).toBe('fight');
    expect(boss.phase?.id).toBe('barrage');
    // Pylons are dull until the deity awakens them.
    w.getEntity('pylon_1')!.interact(w);
    run(w, 0.2, {});
    expect(w.getEntity('pylon_1')?.active).toBe(false);
    run(w, 12.5, {});
    expect(boss.phase?.id).toBe('pylons');
    for (const id of ['pylon_1', 'pylon_2', 'pylon_3', 'pylon_4']) {
      w.getEntity(id)!.interact(w);
      run(w, 0.2, {});
    }
    run(w, 0.5, {});
    expect(boss.phase?.id).toBe('beams');
    (w.getEntity('mirror_floor') as unknown as { rotate: (x: unknown) => void }).rotate(w);
    run(w, 0.5, {});
    expect(boss.phase?.id).toBe('rings');
    w.getEntity('ring_lever_1')!.interact(w);
    run(w, 0.3, {});
    expect(boss.phase?.id).toBe('rings');
    w.getEntity('ring_lever_2')!.interact(w);
    run(w, 0.5, {});
    expect(boss.phase?.id).toBe('expose');
    run(w, 3.5, {});
    expect(boss.phase?.id).toBe('final');
    run(w, 3, {}); // the seal descends
    for (let k = 0; k < 6 && boss.state === 'fight'; k++) {
      const wp = boss.brain.weakPoint(boss)!;
      w.player.x = wp.x - w.player.w - 4;
      w.player.y = 24 * 32 - w.player.h;
      w.player.facing = 1;
      run(w, 0.1, {});
      run(w, 1 / 120, { attackPressed: true });
      run(w, 0.6, {});
    }
    run(w, 4.5, {});
    expect(boss.state).toBe('dead');
    expect(w.getEntity('chest_seal')?.powered).toBe(true);
  });
});
