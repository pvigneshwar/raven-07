/**
 * BootScene - Initial scene that sets up basic game configuration.
 * Runs before PreloadScene. Minimal, fast.
 */

import Phaser from 'phaser';
import { GAME_NAME, GameState } from '../config/gameConfig';
import { gameState } from '../core/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  init(): void {
    // Basic setup
  }

  create(): void {
    gameState.setGameState(GameState.BOOT);
    if (import.meta.env.DEV) console.log(`${GAME_NAME} - Booting...`);
    this.cameras.main.setBackgroundColor('#000000');
    this.scene.start('PreloadScene');
  }
}
