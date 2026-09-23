/**
 * VictoryScene - Shows mission complete screen with stats and options.
 */

import Phaser from 'phaser';
import { GAME_NAME } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { audioManager } from '../systems/AudioManager';
import { SaveManager } from '../core/SaveManager';
import { FONT } from '../ui/Typography';

export class VictoryScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: { score?: number }): void {
    this.selectedIndex = 0;
    this.menuItems = [];
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Victory background
    this.cameras.main.setBackgroundColor('#002200');

    // Main title
    const title = this.add.text(width / 2, height / 2 - 100, 'MISSION COMPLETE', {
      font: `700 32px ${FONT.display}`,
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 30, y: 15 },
      align: 'center',
    });
    title.setOrigin(0.5);
    title.setDepth(10);

    // Get stats
    const stats = gameState.getPlayerStats();
    const elapsed = gameState.getElapsedTime();

    // Stats display
    const statsText = this.add.text(width / 2, height / 2 - 40, [
      `SCORE: ${stats.score.toString().padStart(6, '0')}`,
      `ENEMIES DEFEATED: ${stats.enemiesDefeated}`,
      `DEATHS: ${stats.deaths}`,
      `TIME: ${this.formatTime(elapsed)}`,
      `HIGHEST COMBO: x${stats.highestCombo}`,
    ], {
      font: `700 13px ${FONT.numeric}`,
      color: '#00ff88',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
    });
    statsText.setOrigin(0.5, 0);
    statsText.setDepth(10);

    const victor = this.add.image(width - 63, height / 2 + 7, 'art_player_victory')
      .setDisplaySize(61, 92).setDepth(9);
    this.tweens.add({ targets: victor, y: victor.y - 3, duration: 850, yoyo: true, repeat: -1 });

    // Menu options
    const options = ['PLAY AGAIN', 'MAIN MENU'];
    for (let i = 0; i < options.length; i++) {
      const item = this.add.text(width / 2, height / 2 + 90 + i * 30, options[i], {
        font: `600 19px ${FONT.ui}`,
        color: i === 0 ? '#00ff00' : '#aaaaaa',
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

    // Save progress
    gameState.saveProgress();
    SaveManager.completeMission('level_1');
    SaveManager.clearRun();

    // Play victory music
    audioManager.playMusic('music_victory');
    audioManager.resumeContext();
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      item.setColor(index === this.selectedIndex ? '#00ff00' : '#aaaaaa');
    });
  }

  private select(): void {
    audioManager.playSFX('sfx_ui_click');

    switch (this.selectedIndex) {
      case 0: // PLAY AGAIN
        audioManager.stopMusic();
        this.scene.start('LevelOneScene');
        break;
      case 1: // MAIN MENU
        audioManager.stopMusic();
        this.scene.start('MainMenuScene');
        break;
    }
  }
}
