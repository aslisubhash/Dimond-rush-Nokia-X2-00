import { describe, expect, it } from 'vitest';
import { TILE } from '../../src/core/constants';
import type { Gate } from '../../src/core/entities/doors';
import type { FluidBody } from '../../src/core/entities/fluids';
import type { PhysicsBlock } from '../../src/core/entities/blocks';
import { Tile } from '../../src/core/levels/legend';
import { makeWorld, run, settle } from './helpers';

describe('collectibles', () => {
  it('collects crystals and coins', () => {
    const w = makeWorld(['#          #', '#  P c o c #', '############']);
    settle(w);
    run(w, 2, { right: true });
    expect(w.stats.crystals).toBe(2);
    expect(w.stats.coins).toBe(1);
    expect(w.stats.crystalsTotal).toBe(2);
  });

  it('opens a chest and receives its relic', () => {
    const w = makeWorld(['#          #', '#  P  1    #', '############'], {
      marks: { '1': { type: 'chest', id: 'ch', props: { variant: 'secret', contents: ['r1'] } } },
      entities: [{ type: 'relic', id: 'r1', x: 6, y: 1, props: { hidden: true } }],
    });
    settle(w);
    run(w, 0.3, { right: true });
    run(w, 0.05, { interactPressed: true, interact: true });
    expect(w.getEntity('ch')?.active).toBe(true);
    run(w, 1.5, {});
    expect(w.stats.relics).toBe(1);
  });
});

describe('puzzle objects', () => {
  it('pushing a stone onto a pressure plate opens a door', () => {
    const w = makeWorld(['#                 #', '#                 #', '#                 #', '#  P B  _    3    #', '###################'], {
      marks: {
        _: { type: 'pressure_plate', id: 'plate', props: { weightRequired: 2 }, outputs: ['door'] },
        '3': { type: 'gate', id: 'door' },
      },
    });
    settle(w);
    const door = w.getEntity('door') as Gate;
    expect(door.solidKind()).toBe('full');
    const block = w.getEntity('stone_block_1') as PhysicsBlock;
    // Push until the stone reaches the plate.
    for (let i = 0; i < 600 && block.x < 8 * TILE - 2; i++) run(w, 1 / 120, { right: true });
    run(w, 0.1, {});
    // The player alone (weight 1) is not heavy enough; the stone (weight 2) is.
    expect(w.getEntity('plate')?.active).toBe(true);
    run(w, 2, {});
    expect(door.open).toBeGreaterThan(0.9);
    expect(door.solidKind()).toBeNull();
  });

  it('face stones roll until they hit a wall and crush enemies', () => {
    const w = makeWorld(['#                  #', '#                  #', '#  P R      e     ##', '####################'], { world: 'jungle' });
    settle(w);
    run(w, 1.2, { right: true });
    run(w, 3, {});
    const stone = w.getEntity('face_stone_1') as PhysicsBlock;
    expect(stone.x).toBe(17 * TILE);
    const enemy = w.getEntity('enemy_1');
    expect(enemy?.removed).toBe(true);
  });

  it('face stones drop into single-tile gaps', () => {
    const w = makeWorld(['#                 #', '#                 #', '#  P R            #', '########^#########', '##################'], {});
    settle(w);
    run(w, 1.2, { right: true });
    run(w, 2, {});
    const stone = w.getEntity('face_stone_1') as PhysicsBlock;
    expect(stone.x).toBe(8 * TILE);
    expect(stone.y).toBe(3 * TILE);
  });

  it('keys open locked doors', () => {
    const w = makeWorld(['#            #', '#            #', '#            #', '#  P k  D    #', '##############']);
    settle(w);
    run(w, 1.2, { right: true });
    expect(w.player.keys).toBe(1);
    run(w, 0.05, { interactPressed: true, interact: true });
    run(w, 1.2, {});
    expect(w.player.keys).toBe(0);
    expect((w.getEntity('locked_door_1') as Gate).open).toBeGreaterThan(0.9);
  });

  it('secret walls open on interaction and mark the secret when entered', () => {
    const w = makeWorld(['#########', '#    ?  #', '#  P ?  #', '#########'], {
      secrets: [
        { id: 's', type: 'false_wall', why: '', clue: '', discoveryMethod: '', requiredMechanic: '', reward: 'x', room: [6, 1, 2, 2], difficulty: 1 },
      ],
    });
    settle(w);
    run(w, 0.4, { right: true });
    run(w, 0.05, { interactPressed: true, interact: true });
    expect(w.map.get(5, 1)).toBe(Tile.Empty);
    run(w, 1, { right: true });
    expect(w.stats.secretsFound).toContain('s');
  });

  it('switch raises water and a float platform rides it', () => {
    const map = [
      '#              #',
      '#              #',
      '#              #',
      '#              #',
      '#  P 1         #',
      '######      ####',
      '######      ####',
      '######  F   ####',
      '################',
    ];
    const w = makeWorld(map, {
      marks: {
        '1': { type: 'lever', id: 'lever', outputs: ['water'] },
        F: { type: 'float_platform', id: 'float' },
      },
      entities: [{ type: 'water_body', id: 'water', x: 6, y: 5, w: 6, h: 3, props: { levels: [8, 5], level: 0 } }],
    });
    settle(w);
    const float = w.getEntity('float')!;
    const low = float.y;
    run(w, 0.25, { right: true });
    run(w, 0.05, { interactPressed: true, interact: true });
    run(w, 3, {});
    const water = w.getEntity('water') as FluidBody;
    expect(water.levelIndex).toBe(1);
    expect(float.y).toBeLessThan(low - 2 * TILE);
  });

  it('mirrors route light into a receiver that opens a gate', () => {
    const w = makeWorld(
      ['#            #', '# S    /     #', '#            #', '#      R     #', '#  P      3  #', '##############'],
      {
        marks: {
          S: { type: 'light_source', id: 'sun', props: { dir: 'right' } },
          '/': { type: 'mirror', id: 'm', props: { orient: '/' } },
          R: { type: 'light_receiver', id: 'rx', outputs: ['g'] },
          '3': { type: 'gate', id: 'g', h: 2 },
        },
      },
    );
    settle(w);
    // '/' reflects the rightward beam upward: receiver unlit.
    expect(w.getEntity('rx')?.active).toBe(false);
    (w.getEntity('m') as unknown as { rotate: (x: unknown) => void }).rotate(w);
    run(w, 0.2, {});
    expect(w.getEntity('rx')?.active).toBe(true);
    run(w, 1, {});
    expect(w.beams.count).toBeGreaterThanOrEqual(2);
  });

  it('lasers hurt the player and are disabled by switches', () => {
    const w = makeWorld(['#            #', '#            #', '#L  P    1   #', '##############'], {
      marks: { L: { type: 'laser', id: 'laser', props: { dir: 'right' } }, '1': { type: 'switch', id: 'sw', outputs: ['laser'] } },
    });
    run(w, 0.5, {});
    expect(w.player.health).toBeLessThan(w.player.maxHealth);
    const w2 = makeWorld(['#            #', '#            #', '#L   #   1 P #', '##############'], {
      marks: { L: { type: 'laser', id: 'laser', props: { dir: 'right' } }, '1': { type: 'switch', id: 'sw', outputs: ['laser'] } },
    });
    settle(w2);
    expect(w2.beams.count).toBe(1);
    run(w2, 0.3, { left: true });
    run(w2, 0.05, { interactPressed: true, interact: true });
    run(w2, 0.2, {});
    expect(w2.beams.count).toBe(0);
  });

  it('magnets pull magnet stones', () => {
    const w = makeWorld(['#              #', '#              #', '#M       N  P  #', '################'], {
      marks: { M: { type: 'magnet', id: 'mag', props: { dir: 'right', range: 12, on: false } }, N: { type: 'magnet_stone', id: 'ms' } },
    });
    settle(w);
    const stone = w.getEntity('ms')!;
    const x0 = stone.x;
    (w.getEntity('mag') as unknown as { interact: (x: unknown) => void }).interact(w);
    run(w, 2, {});
    expect(stone.x).toBeLessThan(x0 - 4 * TILE);
  });

  it('heat melts ice blocks', () => {
    const w = makeWorld(['#            #', '#            #', '#  P  1 Z    #', '##############'], {
      marks: { '1': { type: 'fire_source', id: 'fire' }, Z: { type: 'ice_block', id: 'ice', props: { slides: false } } },
    });
    settle(w);
    run(w, 0.3, { right: true });
    run(w, 0.05, { interactPressed: true, interact: true });
    run(w, 2.5, {});
    expect(w.getEntity('ice')?.removed).toBe(true);
  });

  it('wind pushes the player', () => {
    const w = makeWorld(['#                    #', '#                    #', '#  P                 #', '######################'], {
      entities: [{ type: 'wind_source', id: 'wind', x: 1, y: 0, w: 20, h: 3, props: { dir: 'right', strength: 1400 } }],
    });
    settle(w);
    const x0 = w.player.x;
    run(w, 1, {});
    expect(w.player.x).toBeGreaterThan(x0 + TILE);
  });

  it('sequence locks require the correct order and reset on mistakes', () => {
    const w = makeWorld(['#               #', '#  P  1  2  3   #', '#################'], {
      marks: {
        '1': { type: 'torch', id: 't1' },
        '2': { type: 'torch', id: 't2' },
        '3': { type: 'torch', id: 't3' },
      },
      entities: [{ type: 'sequence_lock', id: 'seq', x: 0, y: 0, props: { order: ['t2', 't1', 't3'] } }],
    });
    settle(w);
    const light = (id: string): void => {
      (w.getEntity(id) as unknown as { interact: (x: unknown) => void }).interact(w);
      run(w, 0.1, {});
    };
    light('t1');
    expect(w.getEntity('t1')?.active).toBe(false); // reset after wrong first torch
    light('t2');
    light('t1');
    light('t3');
    expect(w.getEntity('seq')?.active).toBe(true);
  });

  it('crumbling blocks collapse after being stepped on', () => {
    const w = makeWorld(['#          #', '#  P       #', '###%%%%#####', '#          #', '############']);
    settle(w);
    run(w, 1.5, { right: true, walk: true });
    const any = ['crumbling_block_1', 'crumbling_block_2'].some((id) => (w.getEntity(id) as unknown as { state: string }).state !== 'solid');
    expect(any).toBe(true);
  });

  it('pulling a stone with interact held', () => {
    const w = makeWorld(['#              #', '#              #', '#       PB     #', '################']);
    settle(w);
    const b = w.getEntity('stone_block_1')!;
    const x0 = b.x;
    run(w, 1, { left: true, interact: true });
    expect(b.x).toBeLessThan(x0 - TILE);
  });
});

describe('face stone ledges', () => {
  it('rolls off a ledge and keeps rolling to the wall', () => {
    const w = makeWorld([
      '#                    #',
      '#                    #',
      '# P R                #',
      '#####                #',
      '#####             e ##',
      '######################',
    ]);
    settle(w);
    run(w, 1, { right: true });
    run(w, 3, {});
    const s = w.getEntity('face_stone_1')!;
    expect(s.x).toBe(19 * 32);
    expect(w.getEntity('enemy_1')?.removed).toBe(true);
  });
});
