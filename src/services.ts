import type Phaser from 'phaser';
import { audio, type AudioEngine } from './audio/AudioEngine';
import { Progression } from './core/progression';
import { SaveManager } from './core/save/SaveManager';
import { LEVELS } from './data/levels';
import { setLanguage } from './i18n';
import { InputManager } from './input/InputManager';

/** Long-lived services shared by all scenes (stored in the Phaser registry, not globals). */
export class GameServices {
  readonly save: SaveManager;
  readonly input: InputManager;
  readonly audio: AudioEngine = audio;
  readonly progression = new Progression(LEVELS);
  readonly levels = LEVELS;
  /** Developer tools are compiled out of production builds. */
  readonly devTools: boolean = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
  debug = { overlay: false, invulnerable: false, levelSelect: false };

  constructor() {
    this.save = new SaveManager();
    this.input = new InputManager(this.save.data.settings.bindings);
    this.input.attach(window);
    setLanguage(this.save.data.settings.language);
    this.applyAudio();
  }

  applyAudio(): void {
    const s = this.save.data.settings;
    this.audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume });
  }

  static get(scene: Phaser.Scene): GameServices {
    return scene.registry.get('services') as GameServices;
  }
}
