/**
 * MainMenuScene - Main menu with START GAME, HOW TO PLAY, SETTINGS, and CREDITS.
 */

import Phaser from 'phaser';
import { GAME_NAME, GameState } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { audioManager } from '../systems/AudioManager';
import { gameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { FONT, TYPE_COLOR } from '../ui/Typography';
import { levelData } from '../data/levelData';

export class MainMenuScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private titleText: Phaser.GameObjects.Text;
  private submenuVisible: boolean = false;
  private submenuType: string = '';
  private submenuText: Phaser.GameObjects.Text;
  private submenuShade: Phaser.GameObjects.Rectangle;
  private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  private settingsVisible = false;
  private settingsIndex = 0;
  private menuOptions: string[] = [];

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.selectedIndex = 0;
    this.submenuVisible = false;
    this.settingsVisible = false;
    this.settingsIndex = 0;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#132b39');
    this.add.image(width / 2, height / 2, 'bg_jungle_panorama')
      .setDisplaySize(height * 2, height).setDepth(-10);
    this.add.rectangle(width / 2, height / 2, width, height, 0x07131d, 0.42).setDepth(-9);

    // Title
    this.titleText = this.add.text(width / 2, height / 2 - 80, GAME_NAME, {
      font: `700 30px ${FONT.display}`,
      color: TYPE_COLOR.primary,
      backgroundColor: '#0a1c26',
      padding: { x: 20, y: 10 },
      align: 'center',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(10);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 35, 'MISSION 01: OPERATION EMERALD STRIKE', {
      font: `600 13px ${FONT.ui}`,
      color: TYPE_COLOR.warning,
      align: 'center',
    });
    subtitle.setOrigin(0.5);
    subtitle.setDepth(10);

    this.submenuShade = this.add.rectangle(width / 2, height / 2, width, height, 0x07131d, 0.88)
      .setDepth(11).setVisible(false);

    // Menu items
    this.menuOptions = ['START GAME', ...(SaveManager.getRun() ? ['CONTINUE'] : []),
      'HOW TO PLAY', 'SETTINGS', 'CREDITS'];
    this.menuItems = [];

    for (let i = 0; i < this.menuOptions.length; i++) {
      const item = this.add.text(width / 2, height / 2 - 5 + i * 27, this.menuOptions[i], {
        font: `600 19px ${FONT.ui}`,
        color: i === 0 ? TYPE_COLOR.accent : TYPE_COLOR.muted,
        backgroundColor: '#0a1c26',
        padding: { x: 15, y: 5 },
        align: 'center',
      });
      item.setOrigin(0.5);
      item.setDepth(10);
      item.setInteractive({ useHandCursor: true });
      item.on('pointerover', () => {
        if (!this.submenuVisible) {
          this.selectedIndex = i;
          this.updateMenuVisuals();
        }
      });
      item.on('pointerdown', () => {
        if (!this.submenuVisible) {
          this.selectedIndex = i;
          this.select();
        }
      });
      this.menuItems.push(item);
    }

    // Submenu text (hidden by default)
    this.submenuText = this.add.text(width / 2, height / 2 + 100, '', {
      font: `500 13px ${FONT.hud}`,
      color: TYPE_COLOR.primary,
      backgroundColor: '#0a1c26',
      padding: { x: 15, y: 5 },
      align: 'center',
      maxLines: 10,
      wordWrap: { width: 480 },
    });
    this.submenuText.setOrigin(0.5, 0);
    this.submenuText.setDepth(12);
    this.submenuText.setVisible(false);
    this.submenuText.setInteractive({ useHandCursor: true });
    this.submenuText.on('pointerdown', () => {
      this.hideSubmenu();
    });

    // Instructions
    const instructions = this.add.text(width / 2, height - 30, 'Use ARROW KEYS / WASD / MOUSE to navigate. PRESS ENTER or CLICK to select.', {
      font: `600 12px ${FONT.ui}`,
      color: TYPE_COLOR.muted,
      align: 'center',
    });
    instructions.setOrigin(0.5);
    instructions.setDepth(10);

    // Input setup
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    const wKey = this.input.keyboard.addKey('W');
    const sKey = this.input.keyboard.addKey('S');
    const enterKey = this.input.keyboard.addKey('ENTER');
    const spaceKey = this.input.keyboard.addKey('SPACE');
    const escKey = this.input.keyboard.addKey('ESC');

    wKey.on('down', () => this.moveUp());
    sKey.on('down', () => this.moveDown());
    this.cursorKeys.up.on('down', () => this.moveUp());
    this.cursorKeys.down.on('down', () => this.moveDown());
    this.cursorKeys.left.on('down', () => this.adjustSetting(-0.1));
    this.cursorKeys.right.on('down', () => this.adjustSetting(0.1));
    enterKey.on('down', () => this.select());
    spaceKey.on('down', () => this.select());
    escKey.on('down', () => {
      if (this.submenuVisible) this.hideSubmenu();
    });

    // Play menu music
    audioManager.playMusic('music_menu');
    audioManager.resumeContext();

    // Reset game state
    gameState.resetPlayerStats();
    gameState.setGameState(GameState.MENU);
  }

  private moveUp(): void {
    if (this.settingsVisible) {
      this.settingsIndex = Math.max(0, this.settingsIndex - 1);
      this.renderSettings();
      return;
    }
    if (this.submenuVisible) {
      this.hideSubmenu();
      return;
    }
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.updateMenuVisuals();
  }

  private moveDown(): void {
    if (this.settingsVisible) {
      this.settingsIndex = Math.min(11, this.settingsIndex + 1);
      this.renderSettings();
      return;
    }
    if (this.submenuVisible) return;
    this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1);
    this.updateMenuVisuals();
  }

  private updateMenuVisuals(): void {
    this.menuItems.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.setColor(TYPE_COLOR.accent);
      } else {
        item.setColor(TYPE_COLOR.muted);
      }
    });
  }

  private select(): void {
    if (this.settingsVisible) {
      this.confirmSetting();
      return;
    }
    if (this.submenuVisible) {
      this.hideSubmenu();
      return;
    }

    audioManager.playSFX('sfx_ui_click');

    switch (this.menuOptions[this.selectedIndex]) {
      case 'START GAME':
        audioManager.stopMusic();
        SaveManager.clearRun();
        gameState.resetPlayerStats();
        this.scene.start('LevelOneScene');
        break;
      case 'CONTINUE': {
        const run = SaveManager.getRun();
        const checkpoint = levelData.checkpoints.find((entry) => entry.id === run?.checkpoint);
        if (!run || !checkpoint) {
          this.showSubmenu('Saved checkpoint is unavailable. Start a new game.');
          break;
        }
        gameState.restoreRun(run, { id: checkpoint.id, x: checkpoint.x, y: checkpoint.y,
          weapon: null, weaponLevel: 0, score: run.score });
        audioManager.stopMusic();
        this.scene.start('LevelOneScene', { action: 'continue' });
        break;
      }
      case 'HOW TO PLAY':
        this.showSubmenu('CONTROLS:\n\nA / ← Move Left\nD / → Move Right\nSPACE Jump\nS / ↓ Crouch\nJ Shoot\nK Switch Weapon\nW / ↑ Aim Up\nMouse: Alternate aim/fire\nESC Pause\n\nDEFEAT ALL ENEMIES AND THE BOSS TO WIN!');
        break;
      case 'SETTINGS':
        this.showSettings();
        break;
      case 'CREDITS':
        this.showSubmenu('CREDITS:\n\nRAVEN-07: SHADOW STRIKE\n\nGame Engine: Phaser 3\nRuntime: TypeScript + Vite\n\nOriginal game inspired by\nthe classic run-and-gun genre.\nOriginal artwork and procedural effects.');
        break;
    }
  }

  private showSubmenu(text: string): void {
    this.submenuVisible = true;
    this.submenuShade.setVisible(true);
    this.submenuText.setPosition(this.cameras.main.width / 2, 60);
    this.submenuText.setText(text);
    this.submenuText.setVisible(true);
    this.submenuText.alpha = 0;

    this.tweens.add({
      targets: this.submenuText,
      alpha: 1,
      duration: 200,
    });

    // Hide menu items
    this.menuItems.forEach((item) => item.setVisible(false));
  }

  private hideSubmenu(): void {
    this.submenuVisible = false;
    this.settingsVisible = false;
    this.submenuShade.setVisible(false);
    this.submenuText.setVisible(false);
    this.menuItems.forEach((item) => item.setVisible(true));
    this.updateMenuVisuals();
  }

  private showSettings(): void {
    this.settingsVisible = true;
    this.settingsIndex = 0;
    this.submenuVisible = true;
    this.submenuShade.setVisible(true);
    this.menuItems.forEach((item) => item.setVisible(false));
    this.submenuText.setPosition(this.cameras.main.width / 2, 60);
    this.submenuText.setVisible(true).setAlpha(1);
    this.renderSettings();
  }

  private renderSettings(): void {
    const settings = SaveManager.getSettings();
    const bar = (value: number) => '#'.repeat(Math.round(value * 10)).padEnd(10, '-');
    const rows = [
      `MASTER VOLUME  [${bar(settings.masterVolume)}]`,
      `SFX VOLUME     [${bar(settings.sfxVolume)}]`,
      `MUSIC VOLUME   [${bar(settings.musicVolume)}]`,
      `MUTE           [${settings.mute ? 'ON' : 'OFF'}]`,
      `SCREEN SHAKE   [${bar(settings.screenShake)}]`,
      `REDUCE FLASHES [${settings.reduceFlashes ? 'ON' : 'OFF'}]`,
      `FULLSCREEN     [${this.scale.isFullscreen ? 'ON' : 'OFF'}]`,
      `DIFFICULTY     [${settings.difficulty.toUpperCase()}]`,
      `EFFECTS        [${settings.effectsQuality.toUpperCase()}]`,
      `TUTORIAL HINTS [${settings.tutorialHints ? 'ON' : 'OFF'}]`,
      `VIBRATION      [${settings.controllerVibration ? 'ON' : 'OFF'}]`,
      'BACK',
    ];
    this.submenuText.setText(['SETTINGS', '', ...rows.map((row, index) =>
      `${index === this.settingsIndex ? '>' : ' '} ${row}`), '',
      'ARROWS adjust/select  ENTER confirm  ESC back'].join('\n'));
  }

  private adjustSetting(delta: number): void {
    if (!this.settingsVisible) return;
    const settings = SaveManager.getSettings();
    const clamp = (value: number) => Math.max(0, Math.min(1, Math.round((value + delta) * 10) / 10));
    if (this.settingsIndex === 0) audioManager.setVolume(clamp(settings.masterVolume), settings.sfxVolume, settings.musicVolume);
    if (this.settingsIndex === 1) audioManager.setVolume(settings.masterVolume, clamp(settings.sfxVolume), settings.musicVolume);
    if (this.settingsIndex === 2) audioManager.setVolume(settings.masterVolume, settings.sfxVolume, clamp(settings.musicVolume));
    if (this.settingsIndex === 4) SaveManager.updateSettings({ screenShake: clamp(settings.screenShake) });
    if (this.settingsIndex === 7) {
      const levels = ['easy', 'normal', 'hard'] as const;
      const index = levels.indexOf(settings.difficulty);
      SaveManager.updateSettings({ difficulty: levels[Math.max(0, Math.min(2, index + Math.sign(delta)))] });
    }
    if (this.settingsIndex === 8) SaveManager.updateSettings({ effectsQuality: delta < 0 ? 'low' : 'high' });
    this.renderSettings();
  }

  private confirmSetting(): void {
    const settings = SaveManager.getSettings();
    if (this.settingsIndex === 3) {
      audioManager.setMute(!settings.mute);
      SaveManager.updateSettings({ mute: !settings.mute });
    } else if (this.settingsIndex === 5) {
      SaveManager.updateSettings({ reduceFlashes: !settings.reduceFlashes });
    } else if (this.settingsIndex === 6) {
      const next = !this.scale.isFullscreen;
      if (next) this.scale.startFullscreen();
      else this.scale.stopFullscreen();
      SaveManager.updateSettings({ fullscreen: next });
    } else if (this.settingsIndex === 8) {
      SaveManager.updateSettings({ effectsQuality: settings.effectsQuality === 'low' ? 'high' : 'low' });
    } else if (this.settingsIndex === 9) {
      SaveManager.updateSettings({ tutorialHints: !settings.tutorialHints });
    } else if (this.settingsIndex === 10) {
      SaveManager.updateSettings({ controllerVibration: !settings.controllerVibration });
    } else if (this.settingsIndex === 11) {
      this.hideSubmenu();
      return;
    }
    this.renderSettings();
  }
}
