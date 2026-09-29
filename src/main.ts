import '@fontsource/cinzel/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './core/constants';
import { BootScene } from './render/scenes/BootScene';
import { GameScene } from './render/scenes/GameScene';
import { HUDScene } from './render/scenes/HUDScene';
import { LevelSelectScene } from './render/scenes/LevelSelectScene';
import { PauseScene } from './render/scenes/PauseScene';
import { ResultsScene } from './render/scenes/ResultsScene';
import { SettingsScene } from './render/scenes/SettingsScene';
import { StoryScene } from './render/scenes/StoryScene';
import { TitleScene } from './render/scenes/TitleScene';
import { WorldMapScene } from './render/scenes/WorldMapScene';
import { GameServices } from './services';

async function start(): Promise<void> {
  // Make sure web fonts are ready before any canvas text is rasterized.
  try {
    await Promise.race([
      Promise.all(['700 32px Cinzel', '700 20px Nunito', '800 20px Nunito'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const services = new GameServices();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#07060a',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { gamepad: false, activePointers: 4 },
    fps: { target: 60, smoothStep: true },
    render: { powerPreference: 'high-performance', antialias: false },
    scene: [BootScene, TitleScene, StoryScene, WorldMapScene, GameScene, HUDScene, PauseScene, SettingsScene, ResultsScene, LevelSelectScene],
    callbacks: {
      preBoot: (g) => g.registry.set('services', services),
    },
  });
  (window as unknown as { __phaser?: Phaser.Game }).__phaser = game;
  // Resume audio on first interaction anywhere.
  const unlock = (): void => services.audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

void start();
