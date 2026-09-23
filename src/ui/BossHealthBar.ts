/**
 * BossHealthBar - Visual boss health bar with phase indicator.
 */

import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { FONT } from './Typography';

export class BossHealthBar {
  private scene: Phaser.Scene;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private barBorder: Phaser.GameObjects.Rectangle;
  private phaseText: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  private maxHp: number = 120;
  private currentHp: number = 120;
  private currentPhase: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const width = scene.cameras.main.width;
    const barY = 40;

    // Background bar
    this.barBg = scene.add.rectangle(width / 2, barY, 300, 20, 0x333333, 0.7);
    this.barBg.setDepth(100);
    this.barBg.setScrollFactor(0);

    // Health fill
    this.barFill = scene.add.rectangle(width / 2 - 149, barY, 298, 18, 0xff0000, 0.9);
    this.barFill.setDepth(101);
    this.barFill.setScrollFactor(0);
    this.barFill.setOrigin(0, 0.5);

    // Border
    this.barBorder = scene.add.rectangle(width / 2, barY, 300, 22, 0xffffff, 0.8);
    this.barBorder.setDepth(99);
    this.barBorder.setStrokeStyle(1, 0xffffff);
    this.barBorder.setScrollFactor(0);

    // Phase text
    this.phaseText = scene.add.text(width / 2 + 160, barY, 'PHASE 1', {
      font: `700 15px ${FONT.display}`,
      color: '#ff5555',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.phaseText.setOrigin(1, 0.5);
    this.phaseText.setDepth(100);
    this.phaseText.setScrollFactor(0);

    this.nameText = scene.add.text(width / 2 - 150, barY - 25, 'JUNGLE SIEGE WALKER', {
      font: `700 13px ${FONT.hud}`, color: '#ffffff', backgroundColor: '#000000', padding: { x: 4, y: 2 },
    });
    this.nameText.setDepth(100).setScrollFactor(0);

    this.setVisible(false);

    // Listen to boss events
    EventBus.on(Events.BOSS_PHASE_CHANGE, (phase: number) => {
      this.setPhase(phase);
    });
  }

  update(hp: number, maxHp: number, phase: number): void {
    if (!this.isVisible) return;

    this.currentHp = hp;
    this.maxHp = maxHp;
    this.currentPhase = phase;

    const hpPercent = Math.max(0, hp / maxHp);
    this.barFill.setSize(Math.max(1, 298 * hpPercent), 18);

    // Color based on health
    if (hpPercent > 0.66) {
      this.barFill.setFillStyle(0x00ff88);
    } else if (hpPercent > 0.33) {
      this.barFill.setFillStyle(0xffbb00);
    } else {
      this.barFill.setFillStyle(0xff3333);
    }

    this.phaseText.setText(`PHASE ${phase + 1}`);
  }

  show(): void {
    this.isVisible = true;
    this.setVisible(true);
  }

  hide(): void {
    this.isVisible = false;
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.barBg.setVisible(visible);
    this.barFill.setVisible(visible);
    this.barBorder.setVisible(visible);
    this.phaseText.setVisible(visible);
    this.nameText.setVisible(visible);
  }

  setPhase(phase: number): void {
    this.currentPhase = phase;
    this.phaseText.setText(`PHASE ${phase + 1}`);

    // Flash effect
    this.scene.tweens.add({
      targets: this.barBorder,
      alpha: { from: 1, to: 0.3 },
      yoyo: true,
      repeat: 3,
      duration: 200,
    });
  }

  destroy(): void {
    this.barBg.destroy();
    this.barFill.destroy();
    this.barBorder.destroy();
    this.phaseText.destroy();
    this.nameText.destroy();
  }
}
