/**
 * HUD - Heads-up display showing HP, lives, score, and weapon info.
 * Also displays notifications and combo indicators.
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { gameState } from '../core/GameState';
import type { WeaponType } from '../config/gameConfig';
import { weaponData } from '../data/weaponData';
import { FONT, TYPE_COLOR } from './Typography';

export class HUD {
  private scene: Phaser.Scene;
  private hpText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private weaponNameText: Phaser.GameObjects.Text;
  private weaponLevelText: Phaser.GameObjects.Text;
  private notificationText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private fpsText: Phaser.GameObjects.Text;
  private panels: Phaser.GameObjects.Rectangle[] = [];
  private healthSegments: Phaser.GameObjects.Rectangle[] = [];
  private weaponIcon: Phaser.GameObjects.Image;
  private currentScore: number = 0;
  private currentCombo: number = 0;
  private debugEnabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    const leftPanel = scene.add.rectangle(73, 36, 136, 63, 0x0a1c26, 0.88)
      .setStrokeStyle(1, 0x608e89).setDepth(99).setScrollFactor(0);
    const rightPanel = scene.add.rectangle(width - 73, 27, 136, 45, 0x0a1c26, 0.88)
      .setStrokeStyle(1, 0x608e89).setDepth(99).setScrollFactor(0);
    this.panels.push(leftPanel, rightPanel);
    for (let i = 0; i < GAME_CONFIG.PLAYER_MAX_HP; i++) {
      this.healthSegments.push(scene.add.rectangle(96 + i * 10, 19, 8, 4, 0x68d98c)
        .setDepth(101).setScrollFactor(0));
    }
    this.weaponIcon = scene.add.image(width - 125, 26, 'weapon_pulse_rifle')
      .setDisplaySize(24, 12).setDepth(101).setScrollFactor(0);

    // Top-left: HP, Lives, Score
    this.hpText = scene.add.text(10, 10, 'HP: 3/3', {
      font: `700 12px ${FONT.hud}`,
      color: TYPE_COLOR.primary,
      padding: { x: 4, y: 2 },
    });
    this.hpText.setDepth(100);
    this.hpText.setScrollFactor(0);

    this.livesText = scene.add.text(10, 28, 'LIVES: 3', {
      font: `700 12px ${FONT.hud}`,
      color: TYPE_COLOR.primary,
      padding: { x: 4, y: 2 },
    });
    this.livesText.setDepth(100);
    this.livesText.setScrollFactor(0);

    this.scoreText = scene.add.text(10, 46, 'SCORE: 000000', {
      font: `700 12px ${FONT.numeric}`,
      color: TYPE_COLOR.accent,
      padding: { x: 4, y: 2 },
    });
    this.scoreText.setDepth(100);
    this.scoreText.setScrollFactor(0);

    // Top-right: Weapon info
    this.weaponNameText = scene.add.text(width - 10, 10, 'PULSE RIFLE', {
      font: `700 12px ${FONT.hud}`,
      color: TYPE_COLOR.primary,
      padding: { x: 4, y: 2 },
      align: 'right',
    });
    this.weaponNameText.setOrigin(1, 0);
    this.weaponNameText.setDepth(100);
    this.weaponNameText.setScrollFactor(0);

    this.weaponLevelText = scene.add.text(width - 10, 28, 'LVL: 0', {
      font: `700 12px ${FONT.numeric}`,
      color: TYPE_COLOR.muted,
      padding: { x: 4, y: 2 },
      align: 'right',
    });
    this.weaponLevelText.setOrigin(1, 0);
    this.weaponLevelText.setDepth(100);
    this.weaponLevelText.setScrollFactor(0);

    // Center notifications
    this.notificationText = scene.add.text(width / 2, height / 2 - 50, '', {
      font: `700 23px ${FONT.display}`,
      color: TYPE_COLOR.primary,
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center',
    });
    this.notificationText.setOrigin(0.5);
    this.notificationText.setDepth(200);
    this.notificationText.setScrollFactor(0);
    this.notificationText.setVisible(false);

    // Combo indicator (center-top)
    this.comboText = scene.add.text(width / 2, 40, '', {
      font: `700 18px ${FONT.display}`,
      color: TYPE_COLOR.warning,
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
      align: 'center',
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setDepth(200);
    this.comboText.setScrollFactor(0);
    this.comboText.setVisible(false);

    // Debug info (top-center)
    this.fpsText = scene.add.text(width / 2, 10, '', {
      font: `500 11px ${FONT.hud}`,
      color: '#88ff88',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
      align: 'center',
    });
    this.fpsText.setOrigin(0.5, 0);
    this.fpsText.setDepth(100);
    this.fpsText.setScrollFactor(0);
    this.fpsText.setVisible(false);
  }

  update(): void {
    const stats = gameState.getPlayerStats();

    // Update HP with color flash if low
    const hpColor = stats.hp <= 1 ? '#ff5555' : stats.hp <= 2 ? '#ffaa00' : '#55ff55';
    this.hpText.setText(`HP: ${stats.hp}/${stats.maxHp}`);
    this.hpText.setColor(hpColor);
    this.healthSegments.forEach((segment, index) => segment.setFillStyle(index < stats.hp ? 0x68d98c : 0x2d4850));

    this.livesText.setText(`LIVES: ${Math.max(0, stats.lives)}`);
    this.scoreText.setText(`SCORE: ${this.padScore(stats.score)}`);
  }

  private padScore(score: number): string {
    return score.toString().padStart(6, '0');
  }

  setWeapon(type: string, level: number): void {
    const config = weaponData[type as WeaponType];
    if (config) {
      this.weaponNameText.setText(config.name.toUpperCase());
      this.weaponLevelText.setText(`LVL: ${level}`);
      this.weaponIcon.setTexture(config.iconKey);
      this.scene.tweens.add({ targets: this.weaponIcon, alpha: { from: 0.35, to: 1 },
        duration: 180 });
    }
  }

  updateScore(score: number): void {
    this.currentScore = score;
    this.scoreText.setText(`SCORE: ${this.padScore(score)}`);
  }

  updateCombo(combo: number): void {
    this.currentCombo = combo;
    if (combo > 1) {
      this.comboText.setText(`COMBO x${combo}`);
      this.comboText.setVisible(true);
      this.comboText.alpha = 1;
      this.scene.tweens.add({
        targets: this.comboText,
        alpha: 0,
        duration: 500,
        yoyo: true,
      });
    } else {
      this.comboText.setVisible(false);
    }
  }

  showNotification(text: string, duration: number = 2000): void {
    this.notificationText.setText(text);
    this.notificationText.alpha = 1;
    this.notificationText.y = this.scene.cameras.main.height / 2 - 50;

    this.scene.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      y: this.scene.cameras.main.height / 2 - 70,
      duration,
    });
  }

  showNotificationPermanent(text: string): void {
    this.notificationText.setText(text);
    this.notificationText.alpha = 1;
    this.notificationText.setVisible(true);
  }

  hideNotification(): void {
    this.notificationText.setVisible(false);
  }

  /** Display a temporary center message */
  showMessage(text: string, duration: number = 3000, fontSize: string = '24px'): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const msg = this.scene.add.text(width / 2, height / 2, text, {
      font: `700 ${fontSize} ${FONT.display}`,
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 30, y: 15 },
      align: 'center',
    });
    msg.setOrigin(0.5);
    msg.setDepth(500);
    msg.setScrollFactor(0);

    this.scene.tweens.add({
      targets: msg,
      alpha: { from: 0, to: 1 },
      duration: 200,
      yoyo: true,
      repeat: 0,
    });

    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: msg,
        alpha: 0,
        y: height / 2 - 30,
        duration: 500,
        onComplete: () => msg.destroy(),
      });
    });
  }

  showCheckpointMessage(): void {
    this.showMessage('CHECKPOINT REACHED', 2000, '20px');
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.fpsText.setVisible(enabled);
  }

  updateDebugInfo(fps: number, enemyCount: number, projectileCount: number, checkpoint: number): void {
    if (!this.debugEnabled) return;

    this.fpsText.setText(`FPS: ${fps} | ENEMIES: ${enemyCount} | PROJECTILES: ${projectileCount} | CHECKPOINT: ${checkpoint}`);
  }

  updateBossBar(hp: number, maxHp: number, phase: number): void {
    // Boss health bar is handled by BossHealthBar component
    // This method exists for compatibility
  }

  destroy(): void {
    this.panels.forEach((panel) => panel.destroy());
    this.healthSegments.forEach((segment) => segment.destroy());
    this.weaponIcon.destroy();
    this.hpText.destroy();
    this.livesText.destroy();
    this.scoreText.destroy();
    this.weaponNameText.destroy();
    this.weaponLevelText.destroy();
    this.notificationText.destroy();
    this.comboText.destroy();
    this.fpsText.destroy();
  }
}
