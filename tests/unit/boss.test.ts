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
