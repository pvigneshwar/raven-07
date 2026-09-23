/**
 * PauseMenu - Pause menu UI with resume, restart, and quit options.
 */

import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { audioManager } from '../systems/AudioManager';
import { SaveManager } from '../core/SaveManager';
import { gameState } from '../core/GameState';
import { FONT } from './Typography';

export class PauseMenu {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private currentIndex: number = 0;
  isVisible: boolean = false;
  private options: { text: string; action: () => void }[] = [];
  private settingsVisible: boolean = false;
  private settingsIndex: number = 0;
  private settingsText: Phaser.GameObjects.Text | null = null;
  private readonly settingsFields = ['MASTER VOLUME', 'SFX VOLUME', 'MUSIC VOLUME', 'MUTE',
    'SCREEN SHAKE', 'REDUCE FLASHES', 'FULLSCREEN', 'DIFFICULTY', 'EFFECTS', 'TUTORIAL HINTS', 'VIBRATION', 'BACK'];
  private controlsVisible: boolean = false;
  private controlsText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // Semi-transparent overlay
    this.overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.overlay.setDepth(200);
    this.overlay.setScrollFactor(0);
    this.overlay.setVisible(false);

    this.titleText = scene.add.text(width / 2, height / 2 - 60, 'PAUSED', {
      font: `700 30px ${FONT.display}`,
      color: '#ffffff',
      align: 'center',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(200);
    this.titleText.setScrollFactor(0);
    this.titleText.setVisible(false);

    this.setupMenu();
  }

  private setupMenu(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.options = [
      { text: 'RESUME', action: () => this.resume() },
      { text: 'RESTART CHECKPOINT', action: () => this.restartCheckpoint() },
      { text: 'RESTART LEVEL', action: () => this.restartLevel() },
      { text: 'CONTROLS', action: () => this.showControls() },
      { text: 'SETTINGS', action: () => this.showSettings() },
      { text: 'MAIN MENU', action: () => this.mainMenu() },
    ];

    const startY = height / 2;
    this.options.forEach((option, index) => {
      const text = this.scene.add.text(width / 2, startY + index * 30, option.text, {
        font: `600 19px ${FONT.ui}`,
        color: index === 0 ? '#ffff00' : '#aaaaaa',
        backgroundColor: index === 0 ? '#333333' : '#000000',
        padding: { x: 10, y: 5 },
        align: 'center',
      });
      text.setOrigin(0.5);
      text.setDepth(200);
      text.setScrollFactor(0);
      this.menuItems.push(text);
    });

    // Setup keyboard navigation
    const cursors = this.scene.input.keyboard.createCursorKeys();
    const enter = this.scene.input.keyboard.addKey('ENTER');
    const esc = this.scene.input.keyboard.addKey('ESC');

    cursors.up.on('down', () => {
      if (this.settingsVisible) this.settingsUp();
      else this.selectUp();
    });
    cursors.down.on('down', () => {
      if (this.settingsVisible) this.settingsDown();
      else this.selectDown();
    });
    cursors.left.on('down', () => {
      if (this.settingsVisible) this.adjustSetting(-0.1);
    });
    cursors.right.on('down', () => {
      if (this.settingsVisible) this.adjustSetting(0.1);
    });
    enter.on('down', () => {
      if (this.controlsVisible) this.closeControls();
      else if (this.settingsVisible) this.settingsConfirm();
      else this.selectCurrent();
    });
    esc.on('down', () => {
      if (this.controlsVisible) this.closeControls();
      else if (this.settingsVisible) this.closeSettings();
    });
  }

  show(): void {
    this.isVisible = true;
    this.overlay.setVisible(true);
    this.titleText.setVisible(true);
    this.menuItems.forEach((item) => item.setVisible(true));
    this.currentIndex = 0;
    this.updateSelection();

    // Pause physics
    this.scene.physics.pause();
  }

  hide(): void {
    this.isVisible = false;
    this.overlay.setVisible(false);
    this.titleText.setVisible(false);
    this.menuItems.forEach((item) => item.setVisible(false));

    // Resume physics
    this.scene.physics.resume();
  }

  private selectUp(): void {
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.updateSelection();
  }

  private selectDown(): void {
    this.currentIndex = Math.min(this.options.length - 1, this.currentIndex + 1);
    this.updateSelection();
  }

  private selectCurrent(): void {
    this.options[this.currentIndex].action();
  }

  private updateSelection(): void {
    this.menuItems.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.setColor('#ffff00');
        item.setBackgroundColor('#333333');
      } else {
        item.setColor('#aaaaaa');
        item.setBackgroundColor('#000000');
      }
    });
  }

  private resume(): void {
    EventBus.emit(Events.PAUSE_TOGGLE);
  }

  private restartCheckpoint(): void {
    // Nothing in the codebase ever listened for Events.LEVEL_START (see
    // LevelOneScene.setupEventListeners(), which intentionally omits it to
    // avoid a self-restart loop), so this button previously did nothing.
    // Transition directly, matching the pattern MainMenuScene/GameOverScene/
    // VictoryScene already use for their own scene changes (ACT-013).
    this.hide();
    this.scene.physics.resume();
    this.scene.scene.start('LevelOneScene', { action: 'checkpoint' });
  }

  private restartLevel(): void {
    this.hide();
    this.scene.physics.resume();
    SaveManager.clearRun();
    gameState.resetPlayerStats();
    this.scene.scene.start('LevelOneScene');
  }

  private showControls(): void {
    // Was previously: create the text, then register
    // this.scene.input.keyboard.once('keydown-ENTER'/'keydown-ESC', () =>
    // text.destroy()) from inside the very handler that ENTER just fired.
    // Phaser's keyboard plugin fires a Key object's own 'down' event before
    // its generic 'keydown-<CODE>' event for the same physical keypress, so
    // that freshly-registered once-listener fired again in the same pass
    // and destroyed the text before it was ever visibly rendered -- this is
    // why CONTROLS looked completely broken. Replaced with the same
    // state-flag pattern SETTINGS already uses (checked by the persistent
    // top-level enter/esc handlers in setupMenu(), not a fresh listener
    // registered mid-keypress).
    this.controlsVisible = true;
    this.menuItems.forEach((item) => item.setVisible(false));

    this.controlsText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      `A / ← Move Left
D / → Move Right
SPACE Jump
S / ↓ Crouch
J Shoot
K Switch Weapon
W / ↑ Aim Up
ESC Pause
F2 Debug

ENTER / ESC to close`,
      {
        font: `500 12px ${FONT.hud}`,
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      },
    );
    this.controlsText.setOrigin(0.5);
    this.controlsText.setDepth(300);
    this.controlsText.setScrollFactor(0);
  }

  private closeControls(): void {
    this.controlsVisible = false;
    this.controlsText?.destroy();
    this.controlsText = null;
    this.menuItems.forEach((item) => item.setVisible(true));
    this.updateSelection();
  }

  private mainMenu(): void {
    // Same dead-event issue as restartCheckpoint() above -- transition
    // directly instead of emitting an event nothing listens for.
    this.hide();
    this.scene.physics.resume();
    this.scene.scene.start('MainMenuScene');
  }

  // --- Settings (doc 08 pause-menu option) -----------------------------
  // Uses the volume/mute infrastructure that already exists in
  // AudioManager (setVolume/setMute) and SaveManager (getSettings/
  // updateSettings) -- nothing here is speculative, both were already
  // wired to persistence before this menu existed.

  private showSettings(): void {
    this.settingsVisible = true;
    this.settingsIndex = 0;
    this.menuItems.forEach((item) => item.setVisible(false));
    this.renderSettingsText();
  }

  private closeSettings(): void {
    this.settingsVisible = false;
    this.settingsText?.destroy();
    this.settingsText = null;
    this.menuItems.forEach((item) => item.setVisible(true));
    this.updateSelection();
  }

  private settingsUp(): void {
    this.settingsIndex = Math.max(0, this.settingsIndex - 1);
    this.renderSettingsText();
  }

  private settingsDown(): void {
    this.settingsIndex = Math.min(this.settingsFields.length - 1, this.settingsIndex + 1);
    this.renderSettingsText();
  }

  private settingsConfirm(): void {
    const settings = SaveManager.getSettings();
    if (this.settingsIndex === 3) {
      this.toggleMute();
    } else if (this.settingsIndex === 5) {
      SaveManager.updateSettings({ reduceFlashes: !settings.reduceFlashes });
      this.renderSettingsText();
    } else if (this.settingsIndex === 6) {
      const next = !this.scene.scale.isFullscreen;
      if (next) this.scene.scale.startFullscreen();
      else this.scene.scale.stopFullscreen();
      SaveManager.updateSettings({ fullscreen: next });
      this.renderSettingsText();
    } else if (this.settingsIndex === 8) {
      SaveManager.updateSettings({ effectsQuality: settings.effectsQuality === 'low' ? 'high' : 'low' });
      this.renderSettingsText();
    } else if (this.settingsIndex === 9) {
      SaveManager.updateSettings({ tutorialHints: !settings.tutorialHints });
      this.renderSettingsText();
    } else if (this.settingsIndex === 10) {
      SaveManager.updateSettings({ controllerVibration: !settings.controllerVibration });
      this.renderSettingsText();
    } else if (this.settingsIndex === 11) {
      this.closeSettings();
    }
  }

  private toggleMute(): void {
    const settings = SaveManager.getSettings();
    const nextMute = !settings.mute;
    audioManager.setMute(nextMute);
    SaveManager.updateSettings({ mute: nextMute });
    this.renderSettingsText();
  }

  private adjustSetting(delta: number): void {
    const settings = SaveManager.getSettings();
    const clamp = (v: number) => Math.max(0, Math.min(1, Math.round((v + delta) * 10) / 10));

    if (this.settingsIndex === 0) {
      audioManager.setVolume(clamp(settings.masterVolume), settings.sfxVolume, settings.musicVolume);
    } else if (this.settingsIndex === 1) {
      audioManager.setVolume(settings.masterVolume, clamp(settings.sfxVolume), settings.musicVolume);
    } else if (this.settingsIndex === 2) {
      audioManager.setVolume(settings.masterVolume, settings.sfxVolume, clamp(settings.musicVolume));
    } else if (this.settingsIndex === 4) {
      SaveManager.updateSettings({ screenShake: clamp(settings.screenShake) });
    } else if (this.settingsIndex === 7) {
      const levels = ['easy', 'normal', 'hard'] as const;
      const index = levels.indexOf(settings.difficulty);
      SaveManager.updateSettings({ difficulty: levels[Math.max(0, Math.min(2, index + Math.sign(delta)))] });
    } else if (this.settingsIndex === 8) {
      SaveManager.updateSettings({ effectsQuality: delta < 0 ? 'low' : 'high' });
    }
    this.renderSettingsText();
  }

  private renderSettingsText(): void {
    const settings = SaveManager.getSettings();
    const bar = (v: number) => '#'.repeat(Math.round(v * 10)).padEnd(10, '-');
    const rows = [
      `MASTER VOLUME  [${bar(settings.masterVolume)}]`,
      `SFX VOLUME     [${bar(settings.sfxVolume)}]`,
      `MUSIC VOLUME   [${bar(settings.musicVolume)}]`,
      `MUTE           [${settings.mute ? 'ON' : 'OFF'}]`,
      `SCREEN SHAKE   [${bar(settings.screenShake)}]`,
      `REDUCE FLASHES [${settings.reduceFlashes ? 'ON' : 'OFF'}]`,
      `FULLSCREEN     [${this.scene.scale.isFullscreen ? 'ON' : 'OFF'}]`,
      `DIFFICULTY     [${settings.difficulty.toUpperCase()}]`,
      `EFFECTS        [${settings.effectsQuality.toUpperCase()}]`,
      `TUTORIAL HINTS [${settings.tutorialHints ? 'ON' : 'OFF'}]`,
      `VIBRATION      [${settings.controllerVibration ? 'ON' : 'OFF'}]`,
      'BACK',
    ];
    const lines = rows.map((row, i) => (i === this.settingsIndex ? `> ${row}` : `  ${row}`));
    const text = ['SETTINGS', '', ...lines, '', '\u2190/\u2192 adjust  \u2191/\u2193 select  ENTER confirm  ESC back'].join('\n');

    if (this.settingsText) {
      this.settingsText.setText(text);
    } else {
      this.settingsText = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2,
        text,
        {
          font: `500 12px ${FONT.hud}`,
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
        },
      );
      this.settingsText.setOrigin(0.5);
      this.settingsText.setDepth(300);
      this.settingsText.setScrollFactor(0);
    }
  }

  destroy(): void {
    this.overlay.destroy();
    this.titleText.destroy();
    this.menuItems.forEach((item) => item.destroy());
    this.settingsText?.destroy();
    this.controlsText?.destroy();
  }
}
