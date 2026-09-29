/**
 * Procedural sound recipes. Each recipe schedules WebAudio nodes on `dest` at time `t`.
 * Real recorded assets can replace any id via AudioEngine.overrides.
 */
export type Recipe = (ctx: AudioContext, dest: AudioNode, t: number, noise: AudioBuffer) => void;

function env(ctx: AudioContext, dest: AudioNode, t: number, a: number, d: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(dest);
  return g;
}

function tone(ctx: AudioContext, dest: AudioNode, t: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number, attack = 0.005): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(ctx, dest, t, attack, dur, vol));
  o.start(t);
  o.stop(t + dur + attack + 0.05);
}

function noise(ctx: AudioContext, dest: AudioNode, t: number, buf: AudioBuffer, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1): void {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  s.connect(f);
  f.connect(env(ctx, dest, t, 0.004, dur, vol));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

function chime(i: number): Recipe {
  const f = NOTES[i % NOTES.length] as number;
  return (c, d, t) => {
    tone(c, d, t, f, f, 1.2, 'sine', 0.25);
    tone(c, d, t, f * 2.01, f * 2, 0.8, 'sine', 0.08);
    tone(c, d, t, f * 3.02, f * 3, 0.4, 'triangle', 0.04);
  };
}

export const RECIPES: Record<string, Recipe> = {
  jump: (c, d, t) => tone(c, d, t, 220, 520, 0.12, 'square', 0.06),
  land: (c, d, t, n) => noise(c, d, t, n, 0.08, 0.2, 'lowpass', 600, 200),
  bump: (c, d, t) => tone(c, d, t, 140, 90, 0.08, 'square', 0.05),
  attack: (c, d, t, n) => noise(c, d, t, n, 0.12, 0.18, 'bandpass', 2400, 600, 2),
  hurt: (c, d, t) => {
    tone(c, d, t, 420, 140, 0.25, 'sawtooth', 0.12);
    tone(c, d, t + 0.02, 300, 100, 0.2, 'square', 0.06);
  },
  death: (c, d, t) => {
    for (let i = 0; i < 4; i++) tone(c, d, t + i * 0.12, 440 / (i + 1), 200 / (i + 1), 0.2, 'triangle', 0.12);
  },
  respawn: (c, d, t) => [392, 523, 659].forEach((f, i) => tone(c, d, t + i * 0.07, f, f, 0.25, 'sine', 0.1)),
  splash: (c, d, t, n) => noise(c, d, t, n, 0.35, 0.25, 'bandpass', 1800, 400, 0.8),
  swim: (c, d, t, n) => noise(c, d, t, n, 0.18, 0.12, 'bandpass', 900, 300, 1),
  crystal: (c, d, t) => [1318, 1760, 2093].forEach((f, i) => tone(c, d, t + i * 0.045, f, f, 0.35, 'sine', 0.12)),
  coin: (c, d, t) => {
    tone(c, d, t, 988, 988, 0.08, 'square', 0.05);
    tone(c, d, t + 0.07, 1319, 1319, 0.2, 'square', 0.05);
  },
  relic: (c, d, t) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, d, t + i * 0.09, f, f, 0.6, 'triangle', 0.1)),
  key: (c, d, t) => [880, 1175].forEach((f, i) => tone(c, d, t + i * 0.08, f, f, 0.25, 'triangle', 0.1)),
  heart: (c, d, t) => [659, 880].forEach((f, i) => tone(c, d, t + i * 0.08, f, f, 0.2, 'sine', 0.12)),
  seal: (c, d, t) => [392, 494, 587, 784, 988].forEach((f, i) => tone(c, d, t + i * 0.12, f, f, 1.2, 'triangle', 0.12)),
  chest_open: (c, d, t, n) => {
    noise(c, d, t, n, 0.25, 0.15, 'lowpass', 900, 300);
    [523, 784, 1047].forEach((f, i) => tone(c, d, t + 0.15 + i * 0.07, f, f, 0.4, 'sine', 0.1));
  },
  switch: (c, d, t) => {
    tone(c, d, t, 300, 300, 0.05, 'square', 0.08);
    tone(c, d, t + 0.05, 600, 600, 0.06, 'square', 0.06);
  },
  lever: (c, d, t, n) => {
    noise(c, d, t, n, 0.2, 0.2, 'lowpass', 500, 200);
    tone(c, d, t + 0.12, 180, 120, 0.15, 'square', 0.08);
  },
  plate_down: (c, d, t, n) => {
    noise(c, d, t, n, 0.15, 0.2, 'lowpass', 400, 150);
    tone(c, d, t, 110, 80, 0.15, 'sine', 0.2);
  },
  plate_up: (c, d, t) => tone(c, d, t, 90, 130, 0.12, 'sine', 0.12),
  tick: (c, d, t) => tone(c, d, t, 1800, 1800, 0.02, 'square', 0.04),
  torch_light: (c, d, t, n) => noise(c, d, t, n, 0.4, 0.2, 'bandpass', 700, 2500, 0.7),
  extinguish: (c, d, t, n) => noise(c, d, t, n, 0.35, 0.15, 'highpass', 3000, 800),
  crystal_chime: chime(4),
  crystal_fade: (c, d, t) => tone(c, d, t, 880, 440, 0.5, 'sine', 0.06),
  crystal_dull: (c, d, t) => tone(c, d, t, 200, 160, 0.12, 'triangle', 0.1),
  chime_0: chime(0),
  chime_1: chime(1),
  chime_2: chime(2),
  chime_3: chime(3),
  chime_4: chime(4),
  chime_5: chime(5),
  echo_hum: (c, d, t) => {
    tone(c, d, t, 110, 110, 1.4, 'sine', 0.15, 0.2);
    tone(c, d, t, 165, 165, 1.4, 'sine', 0.06, 0.2);
  },
  puzzle_solved: (c, d, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, d, t + i * 0.1, f, f, 0.5, 'triangle', 0.1)),
  wrong: (c, d, t) => {
    tone(c, d, t, 200, 180, 0.18, 'square', 0.08);
    tone(c, d, t + 0.18, 150, 130, 0.25, 'square', 0.08);
  },
  door: (c, d, t, n) => {
    noise(c, d, t, n, 1.1, 0.18, 'lowpass', 300, 120);
    tone(c, d, t, 60, 45, 1.1, 'sawtooth', 0.05, 0.1);
  },
  secret_door: (c, d, t, n) => noise(c, d, t, n, 1.3, 0.2, 'lowpass', 250, 100),
  bridge_form: (c, d, t) => [784, 988, 1175].forEach((f, i) => tone(c, d, t + i * 0.05, f, f * 1.5, 0.3, 'sine', 0.08)),
  bridge_fade: (c, d, t) => tone(c, d, t, 1175, 500, 0.4, 'sine', 0.06),
  unlock: (c, d, t) => [660, 990].forEach((f, i) => tone(c, d, t + i * 0.09, f, f, 0.15, 'square', 0.06)),
  locked: (c, d, t) => tone(c, d, t, 160, 150, 0.15, 'square', 0.08),
  exit_open: (c, d, t) => [392, 523, 659, 784].forEach((f, i) => tone(c, d, t + i * 0.08, f, f, 0.6, 'sine', 0.1)),
  stone_push: (c, d, t, n) => noise(c, d, t, n, 0.18, 0.12, 'lowpass', 300, 200),
  stone_roll: (c, d, t, n) => noise(c, d, t, n, 0.6, 0.2, 'lowpass', 220, 120),
  stone_hit: (c, d, t, n) => {
    noise(c, d, t, n, 0.25, 0.3, 'lowpass', 500, 100);
    tone(c, d, t, 80, 50, 0.25, 'sine', 0.3);
  },
  stone_land: (c, d, t, n) => {
    noise(c, d, t, n, 0.3, 0.3, 'lowpass', 400, 80);
    tone(c, d, t, 70, 40, 0.3, 'sine', 0.3);
  },
  boulder: (c, d, t, n) => noise(c, d, t, n, 1.5, 0.25, 'lowpass', 180, 90),
  sizzle: (c, d, t, n) => noise(c, d, t, n, 0.6, 0.2, 'highpass', 4000, 2000),
  melt: (c, d, t, n) => noise(c, d, t, n, 1.2, 0.12, 'highpass', 3000, 1500),
  water_rise: (c, d, t, n) => noise(c, d, t, n, 2.2, 0.18, 'lowpass', 400, 900),
  water_drain: (c, d, t, n) => noise(c, d, t, n, 2.2, 0.18, 'lowpass', 900, 300),
  lava_rumble: (c, d, t, n) => noise(c, d, t, n, 1.2, 0.2, 'lowpass', 120, 60),
  waterfall_on: (c, d, t, n) => noise(c, d, t, n, 1, 0.2, 'bandpass', 800, 1400, 0.5),
  waterfall_off: (c, d, t, n) => noise(c, d, t, n, 0.8, 0.15, 'bandpass', 1200, 400, 0.5),
  mirror: (c, d, t) => {
    tone(c, d, t, 1400, 1400, 0.05, 'triangle', 0.06);
    tone(c, d, t + 0.05, 2100, 2100, 0.2, 'sine', 0.05);
  },
  light_on: (c, d, t) => tone(c, d, t, 600, 1200, 0.4, 'sine', 0.08),
  light_off: (c, d, t) => tone(c, d, t, 1200, 600, 0.3, 'sine', 0.06),
  light_receive: (c, d, t) => [784, 1175, 1568].forEach((f, i) => tone(c, d, t + i * 0.06, f, f, 0.6, 'sine', 0.08)),
  laser_on: (c, d, t) => tone(c, d, t, 200, 900, 0.2, 'sawtooth', 0.05),
  laser_off: (c, d, t) => tone(c, d, t, 900, 150, 0.25, 'sawtooth', 0.05),
  magnet: (c, d, t) => {
    tone(c, d, t, 90, 180, 0.35, 'sawtooth', 0.06);
    tone(c, d, t, 92, 182, 0.35, 'sawtooth', 0.06);
  },
  wind_gust: (c, d, t, n) => noise(c, d, t, n, 1.4, 0.15, 'bandpass', 400, 1200, 0.6),
  spikes_out: (c, d, t, n) => noise(c, d, t, n, 0.08, 0.2, 'highpass', 3000, 3000),
  fire_jet: (c, d, t, n) => noise(c, d, t, n, 0.8, 0.25, 'bandpass', 600, 300, 0.7),
  ice_crack: (c, d, t, n) => noise(c, d, t, n, 0.15, 0.25, 'highpass', 5000, 2500),
  ice_break: (c, d, t, n) => {
    noise(c, d, t, n, 0.4, 0.3, 'highpass', 4000, 1500);
    [2400, 3100, 2800].forEach((f, i) => tone(c, d, t + i * 0.03, f, f, 0.2, 'triangle', 0.04));
  },
  crumble_warn: (c, d, t, n) => noise(c, d, t, n, 0.3, 0.12, 'lowpass', 900, 300),
  crumble: (c, d, t, n) => noise(c, d, t, n, 0.5, 0.25, 'lowpass', 500, 100),
  platform_start: (c, d, t, n) => noise(c, d, t, n, 0.5, 0.12, 'lowpass', 250, 180),
  ring_rotate: (c, d, t, n) => {
    noise(c, d, t, n, 1.2, 0.15, 'lowpass', 300, 150);
    tone(c, d, t, 196, 196, 1.2, 'triangle', 0.04, 0.2);
  },
  checkpoint: (c, d, t) => [523, 784, 1047, 1568].forEach((f, i) => tone(c, d, t + i * 0.07, f, f, 0.7, 'sine', 0.09)),
  secret: (c, d, t) => [392, 440, 494, 587, 784, 988].forEach((f, i) => tone(c, d, t + i * 0.085, f, f, 0.5, 'triangle', 0.08)),
  level_complete: (c, d, t) => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(c, d, t + i * 0.11, f, f, 0.5, 'square', 0.05)),
  enemy_hit: (c, d, t, n) => {
    noise(c, d, t, n, 0.1, 0.2, 'bandpass', 1500, 800, 1);
    tone(c, d, t, 300, 150, 0.1, 'square', 0.06);
  },
  enemy_die: (c, d, t, n) => {
    noise(c, d, t, n, 0.35, 0.2, 'lowpass', 1500, 200);
    tone(c, d, t, 500, 80, 0.35, 'square', 0.06);
  },
  enemy_spawn: (c, d, t) => tone(c, d, t, 150, 600, 0.4, 'sawtooth', 0.05),
  stomp: (c, d, t) => tone(c, d, t, 400, 120, 0.12, 'square', 0.08),
  shoot_seed: (c, d, t) => tone(c, d, t, 700, 300, 0.1, 'square', 0.04),
  shoot_spear: (c, d, t, n) => noise(c, d, t, n, 0.15, 0.12, 'highpass', 2000, 800),
  shoot_fireball: (c, d, t, n) => noise(c, d, t, n, 0.3, 0.18, 'bandpass', 500, 200, 0.8),
  shoot_snowball: (c, d, t, n) => noise(c, d, t, n, 0.15, 0.12, 'lowpass', 1500, 500),
  shoot_orb: (c, d, t) => tone(c, d, t, 900, 1300, 0.25, 'sine', 0.06),
  deflect: (c, d, t) => tone(c, d, t, 1800, 1200, 0.1, 'triangle', 0.08),
  thunk: (c, d, t) => tone(c, d, t, 110, 80, 0.08, 'sine', 0.2),
  hollow: (c, d, t) => {
    tone(c, d, t, 220, 200, 0.4, 'sine', 0.2);
    tone(c, d, t + 0.12, 220, 200, 0.4, 'sine', 0.08);
  },
  wall_break: (c, d, t, n) => {
    noise(c, d, t, n, 0.8, 0.35, 'lowpass', 1200, 100);
    tone(c, d, t, 90, 40, 0.5, 'sine', 0.2);
  },
  boss_roar: (c, d, t, n) => {
    noise(c, d, t, n, 1.6, 0.35, 'lowpass', 500, 90, 3);
    tone(c, d, t, 90, 50, 1.6, 'sawtooth', 0.12, 0.2);
  },
  boss_stun: (c, d, t) => [1047, 784, 1047, 784].forEach((f, i) => tone(c, d, t + i * 0.08, f, f, 0.12, 'square', 0.06)),
  boss_hit: (c, d, t, n) => {
    noise(c, d, t, n, 0.3, 0.35, 'lowpass', 2000, 200);
    tone(c, d, t, 200, 60, 0.3, 'square', 0.12);
  },
  boss_defeat: (c, d, t, n) => {
    noise(c, d, t, n, 2.5, 0.35, 'lowpass', 800, 60);
    tone(c, d, t, 120, 30, 2.5, 'sawtooth', 0.1);
  },
  explosion: (c, d, t, n) => noise(c, d, t, n, 0.6, 0.35, 'lowpass', 900, 60),
  spit: (c, d, t, n) => noise(c, d, t, n, 0.2, 0.15, 'bandpass', 1500, 600, 1),
  hiss: (c, d, t, n) => noise(c, d, t, n, 0.5, 0.15, 'highpass', 5000, 3000),
  bite: (c, d, t) => tone(c, d, t, 300, 80, 0.15, 'square', 0.1),
  sand_wave: (c, d, t, n) => noise(c, d, t, n, 1, 0.2, 'lowpass', 600, 200),
  rumble: (c, d, t, n) => noise(c, d, t, n, 1, 0.25, 'lowpass', 120, 50),
  stomp_heavy: (c, d, t, n) => {
    noise(c, d, t, n, 0.5, 0.35, 'lowpass', 300, 50);
    tone(c, d, t, 60, 30, 0.5, 'sine', 0.35);
  },
  crystal_throw: (c, d, t) => [1568, 2093].forEach((f, i) => tone(c, d, t + i * 0.04, f, f / 2, 0.2, 'triangle', 0.05)),
  fire_breath: (c, d, t, n) => noise(c, d, t, n, 0.6, 0.25, 'bandpass', 400, 900, 0.6),
  frost_breath: (c, d, t, n) => noise(c, d, t, n, 0.7, 0.2, 'highpass', 2500, 5000),
  celestial: (c, d, t) => [880, 1320].forEach((f, i) => tone(c, d, t + i * 0.05, f, f, 0.5, 'sine', 0.06)),
  ui_move: (c, d, t) => tone(c, d, t, 660, 660, 0.04, 'square', 0.04),
  ui_select: (c, d, t) => [660, 990].forEach((f, i) => tone(c, d, t + i * 0.05, f, f, 0.1, 'square', 0.05)),
  ui_back: (c, d, t) => tone(c, d, t, 440, 330, 0.1, 'square', 0.05),
};
