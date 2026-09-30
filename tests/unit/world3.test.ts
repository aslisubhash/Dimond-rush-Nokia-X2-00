import { describe, expect, it } from 'vitest';
import { entityAt, levelWorld, run, teleport } from './helpers';

type W = ReturnType<typeof levelWorld>;
const strike = (w: W, id: string, after = 0.1): void => {
  w.getEntity(id)!.interact(w);
  run(w, after, {});
};
const open = (w: W, id: string): boolean => w.getEntity(id)?.solidKind() === null;

describe('3-1 Crystal Entrance', () => {
  it('a struck crystal opens its gate', () => {
    const w = levelWorld('3-1');
    strike(w, 'node_1', 2);
    expect(open(w, 'gate_1')).toBe(true);
  });
  it('the relay crystal beams into the receiver, which latches gate 2 open', () => {
    const w = levelWorld('3-1');
    strike(w, 'node_relay', 0.5);
    expect(w.getEntity('node_receiver')?.active).toBe(true);
    run(w, 2);
    expect(open(w, 'gate_2')).toBe(true);
  });
  it('gate 3 needs both timed crystals charged at once', () => {
    const w = levelWorld('3-1');
    strike(w, 'node_a', 7);
    strike(w, 'node_b', 2);
    expect(open(w, 'gate_3')).toBe(false);
    strike(w, 'node_a', 2);
    expect(open(w, 'gate_3')).toBe(true);
  });
});

describe('3-2 Dark Mines', () => {
  it('the mine gate opens only when all three braziers burn', () => {
    const w = levelWorld('3-2');
    const braziers = w.getEntity('gate_mine')!.requires.map((id) => w.getEntity(id)!);
    expect(braziers).toHaveLength(3);
    for (const b of braziers.slice(0, 2)) b.interact(w);
    run(w, 2);
    expect(open(w, 'gate_mine')).toBe(false);
    braziers[2]!.interact(w);
    run(w, 2);
    expect(open(w, 'gate_mine')).toBe(true);
  });
});

describe('3-3 Crystal Lift', () => {
  it('a lift rises while its crystal is charged and sinks when it fades', () => {
    const w = levelWorld('3-3');
    const lift = w.getEntity('lift1')!;
    const y0 = lift.y;
    strike(w, 'node_lift1', 5);
    expect(lift.y).toBeLessThan(y0 - 32 * 8);
    run(w, 9);
    expect(lift.y).toBeGreaterThan(y0 - 32);
  });
});

describe('3-4 Echo Cave', () => {
  it('the echo stone replays its melody on the chimes', () => {
    const w = levelWorld('3-4');
    const sounds: string[] = [];
    w.getEntity('echo_b')!.interact(w);
    for (let i = 0; i < 5 * 120; i++) {
      w.out.length = 0;
      run(w, 1 / 120);
      for (const e of w.out) if (e.kind === 'sound' && e.id.startsWith('chime_')) sounds.push(e.id);
    }
    expect(sounds).toEqual(['chime_4', 'chime_1', 'chime_5', 'chime_2']);
  });
  it('repeating the melody opens the gate; a wrong note resets the chimes', () => {
    const w = levelWorld('3-4');
    strike(w, 'chime_b1');
    expect(w.getEntity('chime_b1')?.active).toBe(false);
    for (const id of ['chime_b2', 'chime_b1', 'chime_b4', 'chime_b3']) strike(w, id);
    expect(w.getEntity('seq_echo_b')?.active).toBe(true);
    run(w, 2);
    expect(open(w, 'gate_echo_b')).toBe(true);
  });
  it('the first gate uses a two-note melody', () => {
    const w = levelWorld('3-4');
    strike(w, 'chime_a1');
    strike(w, 'chime_a2', 2);
    expect(open(w, 'gate_echo_a')).toBe(true);
  });
});

describe('3-5 Magnet Stones', () => {
  it('the lever magnet drags the stone over the spikes onto the plate', () => {
    const w = levelWorld('3-5');
    run(w, 0.5);
    w.getEntity('lev_a')!.interact(w);
    run(w, 3);
    expect(entityAt(w, 'magnet_stone', 8, 19)).toBeDefined();
    expect(open(w, 'gate_a')).toBe(true);
  });
  it('the hanging magnet lifts a stone (and Arin) up to the cliff top', () => {
    const w = levelWorld('3-5');
    run(w, 0.5);
    teleport(w, 33, 19);
    w.getEntity('lev_b')!.interact(w);
    teleport(w, 37, 18);
    run(w, 3);
    run(w, 1, { right: true });
    expect(w.player.x / 32).toBeGreaterThan(39);
    expect(Math.round((w.player.y + w.player.h) / 32)).toBe(10);
  });
  it('the plug stone lifts out of the cliff when its lever is pulled (secret)', () => {
    const w = levelWorld('3-5');
    run(w, 0.5);
    const plug = w.entities.find((e) => e.type === 'magnet_stone' && Math.floor(e.x / 32) === 50)!;
    w.getEntity('lev_s')!.interact(w);
    run(w, 2);
    expect(plug.y / 32).toBeLessThan(7);
  });
  it('repelling the far stone lands it on the plate and forms the bridge', () => {
    const w = levelWorld('3-5');
    run(w, 0.5);
    teleport(w, 73, 19);
    w.getEntity('mag_c')!.interact(w);
    run(w, 5);
    expect(w.getEntity('plate_c')?.active).toBe(true);
    expect(w.getEntity('bridge_c')?.solidKind()).toBe('top');
  });
});
