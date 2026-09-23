/**
 * GameOverScene - Shows mission failed screen with retry options.
 */

import Phaser from 'phaser';
import { GAME_NAME } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { audioManager } from '../systems/AudioManager';
import { FONT } from '../ui/Typography';
import { gameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';

export class GameOverScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score?: number; reason?: string }): void {
    // Receive data from game scene
    this.scene.stop('LevelOneScene');
  }

  create(data: { score?: number }): void {
    // Phaser reuses Scene instances, but destroys their display objects on
    // shutdown. Never retain the previous visit's Text objects in this list.
    this.selectedIndex = 0;
    this.menuItems = [];
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background with red tint
    this.cameras.main.setBackgroundColor('#2a0000');

    // Main title
    const title = this.add.text(width / 2, height / 2 - 80, 'MISSION FAILED', {
      font: `700 32px ${FONT.display}`,
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 30, y: 15 },
      align: 'center',
    });
    title.setOrigin(0.5);
    title.setDepth(10);

    // Score display
    const score = data?.score ?? 0;
    const scoreText = this.add.text(width / 2, height / 2 - 30, `SCORE: ${score.toString().padStart(6, '0')}`, {
      font: `700 14px ${FONT.numeric}`,
      color: '#ffaa00',
      align: 'center',
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(10);

    this.add.image(77, height / 2 + 13, 'art_player_death')
      .setDisplaySize(106, 62).setDepth(9).setAlpha(0.85);

    // Menu options
    const options = ['RETRY', 'MAIN MENU'];
    for (let i = 0; i < options.length; i++) {
      const item = this.add.text(width / 2, height / 2 + 20 + i * 30, options[i], {
        font: `600 19px ${FONT.ui}`,
        color: i === 0 ? '#ff5555' : '#aaaaaa',
        backgroundColor: '#000000',
        padding: { x: 20, y: 5 },
        align: 'center',
      });
      item.setOrigin(0.5);
      item.setDepth(10);
      item.setInteractive({ useHandCursor: true });
      item.on('pointerover', () => {
        this.selectedIndex = i;
        this.updateMenuVisuals();
      });
      item.on('pointerdown', () => {
        this.selectedIndex = i;
        this.select();
      });
      this.menuItems.push(item);
    }

    // Instructions
    const instructions = this.add.text(width / 2, height - 20, 'Use ARROW KEYS / WASD / CLICK to select, ENTER to confirm', {
      font: `600 12px ${FONT.ui}`,
      color: '#888888',
      align: 'center',
    });
    instructions.setOrigin(0.5);
    instructions.setDepth(10);

    // Input
    const cursors = this.input.keyboard.createCursorKeys();
    const enter = this.input.keyboard.addKey('ENTER');
    const space = this.input.keyboard.addKey('SPACE');
    const w = this.input.keyboard.addKey('W');
    const s = this.input.keyboard.addKey('S');

    w.on('down', () => this.moveUp());
    s.on('down', () => this.moveDown());
    cursors.up.on('down', () => this.moveUp());
    cursors.down.on('down', () => this.moveDown());
    enter.on('down', () => this.select());
    space.on('down', () => this.select());

    // Play game over music
    audioManager.playMusic('music_game_over');
    audioManager.resumeContext();
  }

  private moveUp(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.updateMenuVisuals();
  }

  private moveDown(): void {
    this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1);
    this.updateMenuVisuals();
  }

  private updateMenuVisuals(): void {
    this.menuItems.forEach((item, index) => {
      if (item.active) item.setColor(index === this.selectedIndex ? '#ff5555' : '#aaaaaa');
    });
  }

  private select(): void {
    audioManager.playSFX('sfx_ui_click');

    switch (this.selectedIndex) {
      case 0: // RETRY
        audioManager.stopMusic();
        SaveManager.clearRun();
        gameState.resetPlayerStats();
        this.scene.start('LevelOneScene');
        break;
      case 1: // MAIN MENU
        audioManager.stopMusic();
        this.scene.start('MainMenuScene');
        break;
    }
  }
}
