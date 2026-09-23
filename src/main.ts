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
  width: GAME_CONFIG.WIDTH * GAME_CONFIG.RESOLUTION_SCALE,
  height: GAME_CONFIG.HEIGHT * GAME_CONFIG.RESOLUTION_SCALE,
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
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  audio: {
    noAudio: false,
  },
  input: { gamepad: true },
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

// Initialize game
const game = new Game();

// Browser automation and development inspection only; production does not
// publish the live game object (and its scene internals) on window.
if (import.meta.env.DEV) (window as unknown as { raven07: Game }).raven07 = game;

export { game };
