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

describe('1-3 Hidden Chamber', () => {
  const light = (w: ReturnType<typeof levelWorld>, id: string, tx: number): void => {
    teleport(w, tx - 1, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 0.1, {});
    void id;
  };
  it('wrong order resets, mural order (tall → short) opens the gate', () => {
    const w = levelWorld('1-3');
    light(w, 't_sun', 41);
    expect(w.getEntity('t_sun')?.active).toBe(false);
    light(w, 't_eye', 57);
    light(w, 't_sun', 41);
    light(w, 't_ankh', 49);
    expect(w.getEntity('seq_torch')?.active).toBe(true);
    run(w, 2, {});
    expect((w.getEntity('gate_main') as Gate).open).toBeGreaterThan(0.9);
  });
  it('the lone torch opens the vault only after the sequence', () => {
    const w = levelWorld('1-3');
    light(w, 't_lone', 71);
    run(w, 1.5, {});
    expect((w.getEntity('sd_vault') as Gate).open).toBe(0);
    for (const [id, x] of [['t_eye', 57], ['t_sun', 41], ['t_ankh', 49]] as const) light(w, id, x);
    run(w, 2, {});
    expect((w.getEntity('sd_vault') as Gate).open).toBeGreaterThan(0.9);
  });
});

describe('1-4 Rotating Stones', () => {
  it('stone rolls down the stairs into the plate slot', () => {
    const w = levelWorld('1-4');
    teleport(w, 9, 13);
    run(w, 0.6, { right: true });
    run(w, 3, {});
    expect(w.getEntity('p1')?.active).toBe(true);
    run(w, 1, {});
    expect((w.getEntity('g1') as Gate).open).toBeGreaterThan(0.9);
  });
  it('two stones from opposite sides fill both slots', () => {
    const w = levelWorld('1-4');
    teleport(w, 33, 19);
    run(w, 0.6, { right: true });
    run(w, 2, {});
    expect(w.getEntity('pA')?.active).toBe(true);
    teleport(w, 60, 15);
    run(w, 0.8, { left: true });
    run(w, 3, {});
    expect(w.getEntity('pB')?.active).toBe(true);
    run(w, 1, {});
    expect((w.getEntity('g2') as Gate).open).toBeGreaterThan(0.9);
  });
  it('one stone bridges the trap slot, the other becomes a step at the wall', () => {
    const w = levelWorld('1-4');
    const s3 = entityAt(w, 'face_stone', 72, 19);
    const s4 = entityAt(w, 'face_stone', 80, 15);
    teleport(w, 70, 19);
    run(w, 0.6, { right: true });
    run(w, 2.5, {});
    expect(s3.x).toBe(88 * 32);
    teleport(w, 78, 15);
    run(w, 0.6, { right: true });
    run(w, 3, {});
    expect(s4.x).toBe(99 * 32);
    expect(s4.y).toBe(19 * 32);
  });
});

describe('1-6 Vine Lift', () => {
  it('climbs the first vine into the gallery and the ladder into the lift hall', () => {
    const w = levelWorld('1-6');
    teleport(w, 10, 37);
    run(w, 3.2, { up: true });
    run(w, 0.4, { up: true, left: true });
    run(w, 0.6, { left: true });
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(30 * 32 + 1);
    teleport(w, 28, 29);
    run(w, 5, { up: true });
    run(w, 0.5, { right: true });
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(22 * 32 + 1);
  });

  it('the lever raises the vine lift to the landing', () => {
    const w = levelWorld('1-6');
    teleport(w, 32, 21);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 5, {});
    const lift = w.getEntity('lift')!;
    expect(lift.y).toBe(12 * 32);
  });

  it('vine traverse from the landing reaches the exit room', () => {
    const w = levelWorld('1-6');
    teleport(w, 32, 21);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 5, {});
    teleport(w, 37, 11);
    // Leap to the first vine, then hop vine to vine holding up to grab.
    run(w, 1 / 120, { left: true, up: true, jump: true, jumpPressed: true });
    run(w, 0.7, { left: true, up: true, jump: true });
    expect(w.player.state).toBe('CLIMB');
    for (let i = 0; i < 7 && w.player.x > 15 * 32; i++) {
      run(w, 0.5, { up: true });
      run(w, 1 / 120, { left: true, jump: true, jumpPressed: true });
      // Hold up to grab the next vine, and let go of left once holding on.
      for (let k = 0; k < 60 && !(w.player.state === 'CLIMB' && k > 4); k++) run(w, 1 / 60, { left: true, up: true, jump: true });
    }
    run(w, 1.2, { left: true });
    expect(w.player.x).toBeLessThan(13 * 32);
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(7 * 32 + 1);
  });
});

describe('1-7 Collapsing Floor', () => {
  it('the trigger releases the boulder, which chases Arin and falls through the collapsing floor', () => {
    const w = levelWorld('1-7');
    const boulder = w.getEntity('boulder')!;
    teleport(w, 60, 19);
    run(w, 1.1, { right: true });
    expect(w.getEntity('chase_zone')?.active).toBe(true);
    // Run and hop the low obstacles.
    for (let i = 0; i < 12; i++) {
      run(w, 1 / 120, { right: true, jump: true, jumpPressed: true });
      run(w, 0.3, { right: true, jump: true });
    }
    run(w, 0.3, { right: true });
    expect(w.player.x).toBeGreaterThan(97 * 32);
    expect(w.player.health).toBe(w.player.maxHealth);
    run(w, 2, {});
    expect(boulder.removed).toBe(true);
  });

  it('stopping on the cracked slab drops Arin into the hidden room; the vine leads back up', () => {
    const w = levelWorld('1-7');
    teleport(w, 109, 17);
    run(w, 1.5, {});
    expect(w.stats.secretsFound).toContain('hollow_slab');
    teleport(w, 112, 21);
    run(w, 2.5, { up: true });
    run(w, 0.3, {});
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(18 * 32 + 1);
  });
});

describe('2-2 Shifting Sands', () => {
  it('column A lifts Arin to the first ledge', () => {
    const w = levelWorld('2-2');
    teleport(w, 15, 19);
    for (let i = 0; i < 900 && w.player.y + w.player.h > 14 * 32 + 1; i++) run(w, 1 / 120, {});
    run(w, 1, { right: true });
    expect(w.player.x).toBeGreaterThan(18 * 32);
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(14 * 32 + 1);
  });
  it('the low-tide hollow can be entered when the last column is low', () => {
    const w = levelWorld('2-2');
    const e = w.getEntity('col_e')!;
    for (let i = 0; i < 2000 && e.y < 18.9 * 32; i++) run(w, 1 / 120, {});
    w.player.x = 56 * 32;
    w.player.y = e.y - w.player.h - 1;
    run(w, 1.2, { left: true });
    expect(w.stats.secretsFound).toContain('low_tide_cache');
  });
});

describe('2-3 Sunken Tomb', () => {
  it('two face stones fill the vents and drain the sand plug', () => {
    const w = levelWorld('2-3');
    teleport(w, 18, 9);
    run(w, 0.6, { right: true });
    run(w, 3, {});
    expect(w.getEntity('vent_a')?.active).toBe(true);
    teleport(w, 71, 9);
    run(w, 0.6, { left: true });
    run(w, 4, {});
    expect(w.getEntity('vent_b')?.active).toBe(true);
    run(w, 3, {});
    const plug = w.getEntity('sand_plug')!;
    expect(plug.h).toBeLessThan(16);
    teleport(w, 61, 11);
    run(w, 1.5, {});
    expect(w.player.y + w.player.h).toBeGreaterThan(18.5 * 32);
  });
});

describe('2-4 Sand Falls', () => {
  it('climbing between pours works; a pour knocks climbers off', () => {
    const w = levelWorld('2-4');
    const fall = w.getEntity('fall_1')!;
    teleport(w, 12, 27);
    // Wait for the pour to stop, then climb.
    for (let i = 0; i < 1200 && (fall.active || (fall as unknown as { flow: number }).flow > 0.1); i++) run(w, 1 / 120, {});
    run(w, 1.6, { up: true });
    run(w, 0.4, { right: true, up: true });
    run(w, 0.4, { right: true });
    expect(w.player.y + w.player.h).toBeLessThanOrEqual(22 * 32 + 1);
    // Climbing into an active pour knocks Arin down.
    const w2 = levelWorld('2-4');
    const f2 = w2.getEntity('fall_1')!;
    teleport(w2, 12, 27);
    for (let i = 0; i < 1200 && !f2.active; i++) run(w2, 1 / 120, {});
    run(w2, 0.3, {});
    run(w2, 1.2, { up: true });
    expect(w2.player.y + w2.player.h).toBeGreaterThan(26 * 32);
  });
});

describe('2-5 Mirror Hall', () => {
  const rotate = (w: ReturnType<typeof levelWorld>, tx: number, ty: number): void => {
    (entityAt(w, 'mirror', tx, ty) as unknown as { rotate: (x: unknown) => void }).rotate(w);
  };
  it('room 3: five correct rotations route the sun into the disk', () => {
    const w = levelWorld('2-5');
    for (const [x, y] of [[58, 13], [66, 18], [66, 11], [74, 11], [74, 16]] as const) rotate(w, x, y);
    run(w, 0.3, {});
    expect(w.getEntity('rx_3')?.active).toBe(true);
    expect(w.getEntity('rx_hidden')?.active).toBe(false);
  });
  it('misrouting the lower mirror lights the forgotten disk and forms the bridge', () => {
    const w = levelWorld('2-5');
    rotate(w, 58, 13);
    rotate(w, 58, 18);
    run(w, 0.5, {});
    expect(w.getEntity('rx_hidden')?.active).toBe(true);
    run(w, 1, {});
    expect(w.getEntity('sun_bridge')?.solidKind()).toBe('top');
  });
  it('mirror A can be reached and rotated from the stepping platforms', () => {
    const w = levelWorld('2-5');
    teleport(w, 58, 14);
    expect(w.prompt?.textKey).toBe('prompt.rotateMirror');
  });
});

describe('2-6 Moving Walls', () => {
  it('the lever raises the first wall; the timed switch holds the end wall open', () => {
    const w = levelWorld('2-6');
    teleport(w, 7, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 2, {});
    expect(w.getEntity('wall_1')!.y).toBeLessThan(12 * 32);
    teleport(w, 22, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    run(w, 1.5, {});
    expect(w.getEntity('wall_end')!.y).toBeLessThan(11 * 32);
    run(w, 8, {});
    expect(w.getEntity('wall_end')!.y).toBe(15 * 32);
  });
});

describe('2-7 Ankh Puzzle', () => {
  const press = (w: ReturnType<typeof levelWorld>, id: string): void => {
    w.getEntity(id)!.interact(w);
    run(w, 0.1, {});
  };
  it('the carved order (eye, bird, ankh, sun) opens the gate; a wrong press resets', () => {
    const w = levelWorld('2-7');
    press(w, 'g_ankh');
    expect(w.getEntity('g_ankh')?.active).toBe(false);
    for (const id of ['g_eye', 'g_bird', 'g_ankh', 'g_sun']) press(w, id);
    expect(w.getEntity('seq_glyphs')?.active).toBe(true);
    run(w, 2, {});
    expect(w.getEntity('gate_ankh')?.solidKind()).toBeNull();
  });
  it('the hasty door can be reached before the timer runs out', () => {
    const w = levelWorld('2-7');
    teleport(w, 27, 19);
    run(w, 0.05, { interact: true, interactPressed: true });
    // Run across the stepping stones and up to the ledge.
    run(w, 0.25, { right: true });
    for (let i = 0; i < 4; i++) jump(w, 1, 0.4, 0.2);
    run(w, 0.6, { right: true });
    expect(w.getEntity('sd_hurry')?.solidKind()).toBeNull();
  });
});
