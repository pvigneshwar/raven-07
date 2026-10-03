/**
 * RAVEN-07: SHADOW STRIKE
 * Entry point - Bootstraps the Phaser game
 */

import Phaser from 'phaser';
import './fonts.css';
import { GAME_CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelOneScene } from './scenes/LevelOneScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { GAME_NAME } from './config/gameConfig';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  title: GAME_NAME,
  parent: 'app',
  // Keep the logical game size separate from backing-store resolution.
  // Mixing 1280x720 here with a 640x360 Scale Manager size made mobile
  // browsers render the canvas at roughly half of the available viewport.
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GAME_CONFIG.GRAVITY },
      fps: GAME_CONFIG.PHYSICS_FPS,
      debug: GAME_CONFIG.DEBUG_ENABLED,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    expandParent: true,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  audio: {
    noAudio: false,
  },
  input: { gamepad: true, activePointers: 4 },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelOneScene,
    GameOverScene,
    VictoryScene,
  ],
};

class Game {
  private game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game(config);
    this.game.scene.start('BootScene');
  }

  get scene() {
    return this.game.scene;
  }

  get scale() {
    return this.game.scale;
  }
}

// Phaser rasterizes Text objects at creation time, so load the bundled type
// families before BootScene creates any labels.
await Promise.all([
  document.fonts.load('400 16px RavenDisplay'),
  document.fonts.load('600 16px RavenDisplay'),
  document.fonts.load('700 24px RavenDisplay'),
  document.fonts.load('500 14px RavenMono'),
  document.fonts.load('700 14px RavenMono'),
]);

const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
const requestMobileLandscape = async (): Promise<void> => {
  if (!isTouchDevice) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch { /* Some mobile browsers expose fullscreen only for installed apps. */ }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
    await orientation.lock?.('landscape');
  } catch { /* iOS and embedded browsers may require the user to rotate manually. */ }
  window.setTimeout(() => game.scale.refresh(), 100);
};

// Fullscreen and orientation lock require a user gesture. The first touch is
// the earliest standards-compliant point at which the browser can grant both.
document.addEventListener('pointerdown', () => { void requestMobileLandscape(); }, { once: true, capture: true });
document.getElementById('enter-landscape')?.addEventListener('click', () => { void requestMobileLandscape(); });

// Initialize game
const game = new Game();

// Browser automation and development inspection only; production does not
// publish the live game object (and its scene internals) on window.
if (import.meta.env.DEV) (window as unknown as { raven07: Game }).raven07 = game;

export { game };
