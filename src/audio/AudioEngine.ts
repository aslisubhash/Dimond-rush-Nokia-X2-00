import type { WorldId } from '../core/types';
import { MUSIC, type MusicStyle } from './music';
import { RECIPES } from './sfx';

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
}

/**
 * Procedural WebAudio engine: positional SFX, generative per-world music and ambience.
 * Everything is created lazily after the first user gesture (browser autoplay rules).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private volumes: Volumes = { master: 0.8, music: 0.6, sfx: 0.8 };
  private style: MusicStyle | null = null;
  private styleId = '';
  private nextNote = 0;
  private step = 0;
  private timer: number | null = null;
  private ambNodes: AudioNode[] = [];
  private listenerX = 0;
  private recent = new Map<string, number>();
  /** Optional decoded buffers that replace procedural recipes (asset overrides). */
  readonly overrides = new Map<string, AudioBuffer>();

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.connect(this.master);
      this.musicBus = c.createGain();
      this.sfxBus = c.createGain();
      this.ambBus = c.createGain();
      this.musicBus.connect(comp);
      this.sfxBus.connect(comp);
      this.ambBus.connect(comp);
      this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.styleId) {
        const id = this.styleId;
        this.styleId = '';
        this.playMusic(id as WorldId);
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.35, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.05);
  }

  setListener(x: number): void {
    this.listenerX = x;
  }

  play(id: string, opts: { x?: number; volume?: number } = {}): void {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    // Rate-limit identical sounds (e.g. many coins in one frame).
    const now = c.currentTime;
    const last = this.recent.get(id) ?? -1;
    if (now - last < 0.035) return;
    this.recent.set(id, now);
    const out = c.createGain();
    let vol = opts.volume ?? 1;
    let pan = 0;
    if (opts.x !== undefined) {
      const dx = opts.x - this.listenerX;
      pan = Math.max(-0.8, Math.min(0.8, dx / 700));
      vol *= Math.max(0.15, 1 - Math.abs(dx) / 1600);
    }
    out.gain.value = vol;
    const p = c.createStereoPanner();
    p.pan.value = pan;
    out.connect(p);
    p.connect(this.sfxBus);
    const buf = this.overrides.get(id);
    if (buf) {
      const s = c.createBufferSource();
      s.buffer = buf;
      s.connect(out);
      s.start();
      return;
    }
    const r = RECIPES[id] ?? RECIPES['ui_move'];
    r?.(c, out, now + 0.002, this.noiseBuf);
    window.setTimeout(() => p.disconnect(), 4000);
  }

  playMusic(id: WorldId | 'boss' | 'title'): void {
    if (this.styleId === id) return;
    this.styleId = id;
    this.style = MUSIC[id];
    if (!this.ctx) return;
    this.step = 0;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.startAmbience(this.style.ambience);
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 50);
  }

  stopMusic(): void {
    this.styleId = '';
    this.style = null;
    this.stopAmbience();
  }

  private schedule(): void {
    const c = this.ctx;
    const s = this.style;
    if (!c || !s || c.state !== 'running') return;
    const spb = 60 / s.bpm / 2; // eighth notes
    while (this.nextNote < c.currentTime + 0.25) {
      const t = this.nextNote;
      const idx = this.step % s.pattern.length;
      const deg = s.pattern[idx] as number;
      if (deg >= 0) this.note(t, s, deg, spb);
      if (idx === 0 || idx === 8) this.pad(t, s, spb * 8, idx === 0 ? 0 : 3);
      if (this.styleId === 'boss' && idx % 2 === 0) this.drum(t, idx % 4 === 0);
      this.nextNote += spb;
      this.step++;
    }
  }

  private freq(s: MusicStyle, deg: number, octave = 0): number {
    const n = s.scale.length;
    const o = Math.floor(deg / n) + octave;
    const semi = (s.scale[((deg % n) + n) % n] as number) + o * 12;
    return s.root * Math.pow(2, semi / 12);
  }

  private note(t: number, s: MusicStyle, deg: number, dur: number): void {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = s.lead;
    o.frequency.value = this.freq(s, deg, 2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.8);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    o.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur * 2);
  }

  private pad(t: number, s: MusicStyle, dur: number, deg: number): void {
    const c = this.ctx as AudioContext;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = s.padCutoff;
    f.connect(g);
    g.connect(this.musicBus);
    for (const d of [deg, deg + 2, deg + 4]) {
      const o = c.createOscillator();
      o.type = s.pad;
      o.frequency.value = this.freq(s, d, 0);
      o.detune.value = (d % 3) * 4 - 4;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private drum(t: number, kick: boolean): void {
    const c = this.ctx as AudioContext;
    const g = c.createGain();
    g.connect(this.musicBus);
    if (kick) {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.25);
    } else {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6000;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      s.connect(f);
      f.connect(g);
      s.start(t, Math.random());
      s.stop(t + 0.08);
    }
  }

  private startAmbience(kind: MusicStyle['ambience']): void {
    const c = this.ctx;
    if (!c) return;
    this.stopAmbience();
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const cfg: Record<MusicStyle['ambience'], [BiquadFilterType, number, number]> = {
      jungle: ['bandpass', 1800, 0.05],
      desert: ['bandpass', 500, 0.07],
      cave: ['lowpass', 250, 0.06],
      lava: ['lowpass', 140, 0.12],
      wind: ['bandpass', 700, 0.09],
      sky: ['bandpass', 1100, 0.05],
    };
    const [type, freq, vol] = cfg[kind];
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.6;
    g.gain.value = vol;
    // Slow LFO for gusts.
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0.12;
    lg.gain.value = vol * 0.6;
    lfo.connect(lg);
    lg.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(this.ambBus);
    src.start();
    lfo.start();
    this.ambNodes = [src, f, g, lfo, lg];
  }

  private stopAmbience(): void {
    for (const n of this.ambNodes) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.ambNodes = [];
  }
}

/** Single shared instance (the audio graph must outlive scenes). */
export const audio = new AudioEngine();
