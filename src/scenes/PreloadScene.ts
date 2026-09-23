/**
 * PreloadScene - Generates all procedural textures and assets.
 * Since we use programmatic asset generation, this scene creates
 * all textures using Phaser's graphics system.
 */

import Phaser from 'phaser';
import { GAME_NAME, GAME_VERSION, GameState } from '../config/gameConfig';
import { gameState } from '../core/GameState';
import { generatePlayerTextures } from '../systems/AssetGenerator';
import { FONT } from '../ui/Typography';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    gameState.setGameState(GameState.LOADING);
    this.load.image('bg_jungle_panorama', '/assets/environments/jungle/dawn-panorama.png');
    this.load.image('bg_industrial_panorama', '/assets/environments/industrial/outpost-panorama.png');
    const characterArt = [
      ['art_player_idle', 'player-idle'],
      ['art_player_run_contact', 'player-run-contact'],
      ['art_player_forward', 'player-forward'],
      ['art_player_run', 'player-run'],
      ['art_player_jump', 'player-jump'],
      ['art_player_crouch', 'player-crouch'],
      ['art_player_up', 'player-up'],
      ['art_player_diagonal_up', 'player-diagonal-up'],
      ['art_player_diagonal_down', 'player-diagonal-down'],
      ['art_player_death', 'player-death'],
      ['art_player_victory', 'player-victory'],
      ['art_enemy_infantry', 'infantry'],
      ['art_enemy_infantry_walk', 'infantry-walk'],
      ['art_enemy_rifle', 'rifle-soldier'],
      ['art_enemy_rifle_walk', 'rifle-soldier-walk'],
      ['art_enemy_heavy', 'heavy-gunner'],
      ['art_enemy_heavy_walk', 'heavy-gunner-walk'],
      ['art_enemy_shield', 'shield-soldier'],
      ['art_enemy_shield_walk', 'shield-soldier-walk'],
      ['art_enemy_drone', 'flying-drone'],
      ['art_enemy_turret', 'turret'],
      ['art_boss_walker', 'jungle-siege-walker'],
    ] as const;
    characterArt.forEach(([key, name]) => this.load.image(key, `/assets/characters/${name}.png`));
    // Display loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'LOADING', {
      font: `700 18px ${FONT.display}`,
      color: '#ffffff',
      align: 'center',
    });
    loadingText.setOrigin(0.5);

    const progressBar = this.add.graphics();
    const progressBarBg = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 100, height / 2, 200 * value, 12);
    });

    this.load.on('complete', () => {
      loadingText.setText('COMPLETE');
    });
  }

  create(): void {
    // Generate all procedural textures
    generatePlayerTextures(this);
    generateEnvironmentTextures(this);
    generateEnemyTextures(this);
    generateWeaponTextures(this);
    generateEffectTextures(this);
    generateUITextures(this);
    generateBossTextures(this);
    generatePickupTextures(this);

    // Create shared animations
    this.anims.create({
      key: 'anim_player_run',
      frames: [{ key: 'player_run_0' }, { key: 'player_run_1' }],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'anim_explosion',
      frames: [
        { key: 'explosion_0' },
        { key: 'explosion_1' },
        { key: 'explosion_2' },
        { key: 'explosion_3' },
        { key: 'explosion_4' },
        { key: 'explosion_5' },
        { key: 'explosion_6' },
        { key: 'explosion_7' },
      ],
      frameRate: 16,
      repeat: 0,
    });

    // Display version info briefly
    if (import.meta.env.DEV) console.log(`${GAME_NAME} v${GAME_VERSION} - Assets generated`);

    // Transition to main menu
    this.scene.start('MainMenuScene');
  }
}

/** Generate environment textures */
function generateEnvironmentTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Thin timber shelf: bright walkable lip, narrow dark underside, and
  // small brackets. Collision is kept separately in LevelOneScene.
  gfx.fillStyle(0x493622, 1);
  gfx.fillRect(0, 6, 160, 8);
  gfx.fillStyle(0x8a5c30, 1);
  gfx.fillRect(0, 2, 160, 7);
  gfx.fillStyle(0xb88a4b, 1);
  gfx.fillRect(0, 0, 160, 3);
  gfx.fillStyle(0x31592d, 1);
  gfx.fillRect(0, 0, 160, 1);
  for (let x = 10; x < 160; x += 28) {
    gfx.fillStyle(0x6b4527, 1);
    gfx.fillRect(x, 9, 4, 5);
    gfx.fillStyle(0x3b2b20, 1);
    gfx.fillRect(x + 2, 14, 10, 2);
  }
  gfx.lineStyle(1, 0x2c211b, 0.9);
  for (let x = 0; x < 160; x += 20) {
    gfx.lineBetween(x, 4, x, 9);
    gfx.fillStyle(0xddd0a0, 0.8);
    gfx.fillRect(x + 4, 3, 1, 1);
    gfx.fillRect(x + 15, 3, 1, 1);
  }
  gfx.lineStyle(1, 0xa97745, 0.75);
  gfx.lineBetween(0, 11, 160, 11);
  gfx.generateTexture('platform', 160, 16);
  gfx.clear();

  gfx.fillStyle(0x26363e, 1);
  gfx.fillRect(0, 5, 160, 11);
  gfx.fillStyle(0x647c80, 1);
  gfx.fillRect(0, 0, 160, 6);
  gfx.fillStyle(0xb5c4b5, 1);
  gfx.fillRect(0, 0, 160, 2);
  for (let x = 6; x < 160; x += 20) {
    gfx.fillStyle(0x3a5258, 1);
    gfx.fillRect(x, 3, 11, 2);
    gfx.fillStyle(0x839893, 1);
    gfx.fillRect(x + 5, 10, 2, 4);
  }
  gfx.lineStyle(1, 0x16282c, 1);
  for (let x = 0; x < 160; x += 16) {
    gfx.lineBetween(x, 6, x + 8, 15);
    gfx.fillStyle(0xcbd2b7, 0.9);
    gfx.fillRect(x + 3, 2, 2, 2);
  }
  gfx.lineStyle(1, 0x93aba6, 0.8);
  gfx.lineBetween(0, 7, 160, 7);
  gfx.generateTexture('platform_industrial', 160, 16);
  gfx.clear();

  gfx.fillStyle(0x4b3526, 1);
  gfx.fillRect(0, 0, 64, 64);
  gfx.fillStyle(0x6d4a2b, 1);
  gfx.fillRect(0, 7, 64, 12);
  gfx.fillStyle(0x60412a, 1);
  gfx.fillRect(0, 22, 64, 5);
  gfx.fillRect(0, 43, 64, 4);
  gfx.fillStyle(0x244f2e, 1);
  gfx.fillRect(0, 0, 64, 8);
  gfx.fillStyle(0x5d973e, 1);
  gfx.fillRect(0, 0, 64, 4);
  gfx.fillStyle(0x83ae50, 1);
  for (let x = 2; x < 64; x += 9) gfx.fillRect(x, 0, 3, 2);
  gfx.fillStyle(0x9a7042, 1);
  for (let x = 5; x < 64; x += 19) {
    gfx.fillRect(x, 17, 5, 2);
    gfx.fillRect(x + 7, 36, 3, 2);
  }
  gfx.fillStyle(0x2c251f, 0.6);
  for (let x = 9; x < 64; x += 23) gfx.fillRect(x, 53, 7, 2);
  // Embedded stone, roots, and broken soil strata. Sparse details avoid a
  // checkerboard pattern when many tiles repeat across the long level.
  for (const [x, y, w] of [[8, 31, 8], [31, 22, 5], [44, 48, 10], [17, 57, 6]] as const) {
    gfx.fillStyle(0x877353, 0.9);
    gfx.fillRect(x, y, w, 3);
    gfx.fillStyle(0x302b22, 0.65);
    gfx.fillRect(x + 2, y + 3, w - 2, 2);
  }
  gfx.lineStyle(1, 0x886a3e, 0.55);
  gfx.lineBetween(0, 26, 26, 28);
  gfx.lineBetween(29, 47, 64, 44);
  gfx.generateTexture('ground_tile', 64, 64);
  gfx.clear();

  gfx.fillStyle(0x303b3c, 1);
  gfx.fillRect(0, 0, 64, 64);
  gfx.fillStyle(0x536767, 1);
  gfx.fillRect(0, 0, 64, 9);
  gfx.fillStyle(0x9ab0a6, 1);
  gfx.fillRect(0, 0, 64, 2);
  gfx.fillStyle(0x465358, 1);
  gfx.fillRect(0, 14, 64, 9);
  gfx.fillRect(0, 40, 64, 7);
  gfx.fillStyle(0x202d31, 1);
  for (let x = 4; x < 64; x += 16) {
    gfx.fillRect(x, 5, 3, 4);
    gfx.fillRect(x + 6, 24, 4, 13);
  }
  gfx.fillStyle(0x86918a, 0.7);
  for (let x = 11; x < 64; x += 23) gfx.fillRect(x, 51, 7, 2);
  gfx.lineStyle(1, 0x13272b, 0.8);
  gfx.lineBetween(0, 12, 64, 12);
  gfx.lineBetween(0, 48, 64, 48);
  for (let x = 7; x < 64; x += 20) {
    gfx.fillStyle(0xc3bd9d, 0.8);
    gfx.fillRect(x, 5, 2, 2);
    gfx.fillRect(x + 11, 43, 2, 2);
    gfx.fillStyle(0x986645, 0.55);
    gfx.fillRect(x + 3, 32, 7, 2);
  }
  gfx.generateTexture('ground_industrial_tile', 64, 64);
  gfx.clear();

  // A continuous low-contrast sky gradient removes the old hard bands.
  for (let y = 0; y < 360; y += 4) {
    const t = y / 360;
    const r = Math.round(109 + 55 * t);
    const g = Math.round(176 + 37 * t);
    const b = Math.round(203 + 19 * t);
    gfx.fillStyle((r << 16) | (g << 8) | b, 1);
    gfx.fillRect(0, y, 640, 4);
  }
  gfx.generateTexture('bg_sky', 640, 360);
  gfx.clear();

  gfx.fillStyle(0x7898aa, 1);
  gfx.fillRect(0, 125, 640, 55);
  for (const [x, peak, width] of [[-65, 64, 170], [72, 38, 205], [248, 77, 175],
    [389, 28, 210], [565, 67, 175]] as const) {
    gfx.fillTriangle(x, 136, x + width / 2, peak, x + width, 136);
  }
  gfx.fillStyle(0xa1bbc6, 0.38);
  gfx.fillRect(0, 142, 640, 38);
  gfx.generateTexture('bg_mountains_far', 640, 180);
  gfx.clear();

  gfx.fillStyle(0x4f7180, 1);
  gfx.fillRect(0, 112, 640, 83);
  for (const [x, peak, width] of [[-75, 65, 195], [82, 15, 215], [274, 72, 165],
    [402, 39, 190], [555, 64, 165]] as const) {
    gfx.fillTriangle(x, 127, x + width / 2, peak, x + width, 127);
  }
  gfx.fillStyle(0x789393, 0.4);
  gfx.fillRect(0, 158, 640, 37);
  gfx.generateTexture('bg_mountains_mid', 640, 195);
  gfx.clear();

  gfx.fillStyle(0xc8d7ce, 0.12);
  gfx.fillEllipse(45, 42, 110, 26);
  gfx.fillEllipse(150, 48, 140, 30);
  gfx.fillEllipse(235, 39, 105, 22);
  gfx.generateTexture('bg_fog', 256, 72);
  gfx.clear();

  gfx.fillStyle(0x203d38, 1);
  gfx.fillRect(37, 41, 7, 59);
  gfx.fillTriangle(38, 68, 13, 52, 41, 57);
  gfx.fillTriangle(41, 60, 66, 43, 44, 54);
  gfx.fillStyle(0x294f45, 1);
  for (const [x, y, w, h] of [[20, 38, 30, 30], [40, 29, 35, 36], [58, 42, 29, 31],
    [31, 53, 36, 28], [50, 53, 29, 27]] as const) gfx.fillEllipse(x, y, w, h);
  gfx.fillStyle(0x396d53, 1);
  for (const [x, y] of [[14, 34], [28, 23], [47, 17], [61, 31], [67, 46], [33, 41]] as const) {
    gfx.fillTriangle(x - 8, y + 8, x, y - 5, x + 8, y + 8);
  }
  gfx.fillStyle(0x61876a, 0.5);
  gfx.fillRect(24, 38, 5, 2);
  gfx.fillRect(48, 30, 6, 2);
  gfx.generateTexture('tree_jungle', 80, 100);
  gfx.clear();

  gfx.fillStyle(0x24473a, 1);
  gfx.fillEllipse(12, 29, 22, 18);
  gfx.fillEllipse(27, 25, 26, 22);
  gfx.fillEllipse(41, 29, 20, 18);
  gfx.fillStyle(0x3b7051, 1);
  for (const [x, y] of [[8, 18], [17, 15], [28, 11], [38, 16], [46, 20]] as const) {
    gfx.fillTriangle(x - 5, y + 13, x, y - 5, x + 6, y + 13);
  }
  gfx.fillStyle(0x193b32, 1);
  gfx.fillRect(4, 34, 43, 3);
  gfx.generateTexture('bush', 50, 40);
  gfx.clear();

  gfx.fillStyle(0x132d2e, 1);
  gfx.fillRect(0, 0, 32, 32);
  gfx.fillStyle(0x4e6652, 1);
  gfx.fillRect(2, 2, 28, 28);
  gfx.fillStyle(0x29493e, 1);
  gfx.fillRect(5, 5, 22, 22);
  gfx.lineStyle(2, 0xb4bc8a, 1);
  gfx.strokeRect(3, 3, 26, 26);
  gfx.lineStyle(2, 0x152c2d, 1);
  gfx.lineBetween(5, 5, 27, 27);
  gfx.lineBetween(27, 5, 5, 27);
  gfx.fillStyle(0xd2b470, 1);
  for (const x of [3, 26]) for (const y of [3, 26]) gfx.fillRect(x, y, 3, 3);
  gfx.fillStyle(0xc7d9bc, 0.9);
  gfx.fillRect(10, 13, 12, 2);
  gfx.generateTexture('crate', 32, 32);
  gfx.clear();

  gfx.fillStyle(0x1e292c, 1);
  gfx.fillRect(0, 0, 24, 32);
  gfx.fillStyle(0x963d31, 1);
  gfx.fillRect(3, 3, 18, 26);
  gfx.fillStyle(0xb75c40, 1);
  gfx.fillRect(5, 5, 3, 22);
  gfx.fillStyle(0x2c3334, 1);
  gfx.fillRect(2, 2, 20, 4);
  gfx.fillRect(2, 26, 20, 4);
  gfx.fillStyle(0xd2b871, 1);
  gfx.fillTriangle(12, 9, 19, 22, 5, 22);
  gfx.fillStyle(0x473727, 1);
  gfx.fillRect(11, 13, 2, 5);
  gfx.fillRect(11, 20, 2, 2);
  gfx.fillStyle(0x89928a, 1);
  gfx.fillRect(7, 1, 10, 2);
  gfx.generateTexture('explosive_barrel', 24, 32);
  gfx.clear();

  gfx.fillStyle(0x172f35, 1);
  gfx.fillRect(0, 0, 32, 32);
  gfx.fillStyle(0x42605c, 1);
  gfx.fillRect(2, 2, 28, 28);
  gfx.lineStyle(2, 0xaec0a2, 1);
  gfx.strokeRect(3, 3, 26, 26);
  gfx.fillStyle(0xd9aa61, 1);
  gfx.fillRect(6, 6, 20, 4);
  gfx.fillStyle(0x1b3435, 1);
  gfx.fillRect(7, 13, 18, 13);
  gfx.fillStyle(0xd9e5bd, 1);
  gfx.fillRect(14, 15, 4, 9);
  gfx.fillRect(11, 18, 10, 3);
  gfx.fillStyle(0xc9ac71, 1);
  for (const x of [4, 26]) for (const y of [4, 26]) gfx.fillRect(x, y, 2, 2);
  gfx.generateTexture('supply_box', 32, 32);
  gfx.clear();

  // Low cover is deliberately shorter than the player; its bright top edge
  // reads as a jumpable surface while its body catches projectiles.
  gfx.fillStyle(0x27382e, 1);
  gfx.fillRect(0, 15, 48, 9);
  for (const [x, y] of [[1, 5], [18, 4], [33, 5], [8, 14], [26, 14]] as const) {
    gfx.fillStyle(0x697350, 1);
    gfx.fillRoundedRect(x, y, 16, 8, 2);
    gfx.fillStyle(0x9a9e6c, 1);
    gfx.fillRect(x + 2, y + 1, 10, 1);
    gfx.fillStyle(0x414d39, 1);
    gfx.fillRect(x + 6, y + 5, 7, 1);
  }
  gfx.generateTexture('sandbags', 48, 24);
  gfx.clear();

  gfx.fillStyle(0x172a2f, 1);
  gfx.fillRect(0, 3, 48, 25);
  gfx.fillStyle(0x546b6c, 1);
  gfx.fillRect(2, 3, 44, 22);
  gfx.fillStyle(0xb5c5ae, 1);
  gfx.fillRect(1, 2, 46, 3);
  gfx.fillStyle(0x293d42, 1);
  for (let x = 6; x < 46; x += 13) {
    gfx.fillRect(x, 6, 3, 18);
    gfx.fillStyle(0xc4a565, 1);
    gfx.fillRect(x + 4, 12, 5, 2);
    gfx.fillStyle(0x293d42, 1);
  }
  gfx.fillStyle(0x172a2f, 1);
  gfx.fillRect(0, 24, 48, 4);
  gfx.generateTexture('barricade', 48, 28);
  gfx.clear();

  gfx.fillStyle(0x8b5a2b, 1);
  gfx.fillRect(0, 10, 120, 12);
  gfx.fillStyle(0x6b3a1b, 1);
  for (let i = 0; i < 120; i += 8) {
    gfx.fillRect(i, 10, 4, 12);
  }
  gfx.fillStyle(0x5a4a3a, 1);
  gfx.fillRect(0, 22, 120, 6);
  gfx.lineStyle(1, 0xd5b77b, 0.8);
  gfx.lineBetween(0, 9, 120, 9);
  for (let x = 5; x < 120; x += 12) {
    gfx.fillStyle(0x2f2d28, 1);
    gfx.fillRect(x, 11, 2, 2);
    gfx.fillStyle(0xa7804b, 0.85);
    gfx.fillRect(x + 2, 14, 6, 1);
  }
  gfx.generateTexture('bridge', 120, 28);
  gfx.clear();

  gfx.fillStyle(0x333f4b, 1);
  gfx.fillRect(0, 5, 80, 11);
  gfx.fillStyle(0x8fa8b7, 1);
  gfx.fillRect(0, 0, 80, 6);
  gfx.fillStyle(0xc8d8d9, 1);
  gfx.fillRect(3, 1, 74, 2);
  for (let x = 8; x < 80; x += 20) {
    gfx.fillStyle(0x506a75, 1);
    gfx.fillRect(x, 8, 5, 5);
  }
  gfx.lineStyle(1, 0x182d32, 0.9);
  gfx.lineBetween(0, 7, 80, 7);
  for (let x = 3; x < 80; x += 14) {
    gfx.fillStyle(0xd9d0ad, 1);
    gfx.fillRect(x, 2, 2, 2);
    gfx.lineBetween(x + 4, 9, x + 9, 15);
  }
  gfx.generateTexture('elevator', 80, 16);
  gfx.clear();

  gfx.fillStyle(0x493622, 1);
  gfx.fillRect(0, 5, 64, 11);
  gfx.fillStyle(0x9c6c38, 1);
  gfx.fillRect(0, 1, 64, 7);
  gfx.fillStyle(0xc69a55, 1);
  gfx.fillRect(0, 0, 64, 3);
  gfx.fillStyle(0x31592d, 1);
  gfx.fillRect(0, 0, 64, 1);
  for (let x = 7; x < 64; x += 18) {
    gfx.fillStyle(0x674629, 1);
    gfx.fillRect(x, 9, 4, 5);
  }
  gfx.lineStyle(1, 0xe5c388, 0.85);
  gfx.lineBetween(0, 3, 64, 3);
  for (let x = 4; x < 64; x += 13) {
    gfx.fillStyle(0x2c332d, 1);
    gfx.fillRect(x, 5, 2, 2);
    gfx.lineStyle(1, 0x5b3d29, 1);
    gfx.lineBetween(x + 3, 9, x + 9, 15);
  }
  gfx.generateTexture('moving_platform', 64, 16);
  gfx.clear();

  // Hazard textures
  gfx.fillStyle(0x283a3c, 1);
  gfx.fillRect(0, 0, 64, 16);
  gfx.fillStyle(0xd6ab52, 1);
  gfx.fillRect(0, 0, 64, 3);
  for (let x = -8; x < 64; x += 16) {
    gfx.fillStyle(0xebb554, 1);
    gfx.fillTriangle(x, 15, x + 10, 4, x + 16, 4);
    gfx.fillStyle(0x132a2e, 1);
    gfx.fillTriangle(x + 7, 15, x + 17, 4, x + 22, 4);
  }
  gfx.generateTexture('electric_floor', 64, 16);
  gfx.clear();

  gfx.fillStyle(0x2c292c, 1);
  gfx.fillRect(0, 0, 8, 32);
  gfx.fillStyle(0xf2514b, 0.9);
  gfx.fillRect(2, 1, 4, 30);
  gfx.fillStyle(0xffd0b0, 0.85);
  gfx.fillRect(3, 2, 2, 28);
  gfx.generateTexture('laser', 8, 32);
  gfx.clear();

  gfx.fillStyle(0x301f20, 1);
  gfx.fillRect(0, 0, 64, 32);
  gfx.fillStyle(0xc54e2e, 1);
  gfx.fillRect(0, 6, 64, 20);
  gfx.fillStyle(0xee9350, 1);
  for (let x = 0; x < 64; x += 12) {
    gfx.fillTriangle(x, 6, x + 6, 1, x + 12, 6);
    gfx.fillTriangle(x + 2, 24, x + 8, 18, x + 13, 24);
  }
  gfx.fillStyle(0xf4c073, 0.75);
  gfx.fillRect(0, 13, 64, 2);
  gfx.generateTexture('lava', 64, 32);
  gfx.clear();

  // Checkpoint textures
  gfx.fillStyle(0x1b2b30, 1);
  gfx.fillRect(0, 0, 48, 48);
  gfx.fillStyle(0x46595b, 1);
  gfx.fillRect(4, 3, 40, 42);
  gfx.fillStyle(0x22363a, 1);
  gfx.fillRect(9, 8, 30, 32);
  gfx.fillStyle(0xa8b1a0, 1);
  gfx.fillRect(4, 2, 40, 3);
  gfx.fillStyle(0x9b6844, 1);
  gfx.fillRect(16, 12, 15, 4);
  gfx.lineStyle(2, 0x12292c, 1);
  gfx.lineBetween(10, 12, 25, 29);
  gfx.lineBetween(25, 29, 35, 21);
  gfx.lineBetween(22, 29, 16, 39);
  gfx.fillStyle(0xc09a65, 1);
  for (const x of [6, 39]) for (const y of [8, 38]) gfx.fillRect(x, y, 2, 2);
  gfx.generateTexture('checkpoint_broken', 48, 48);
  gfx.clear();

  gfx.fillStyle(0x1b3138, 1);
  gfx.fillRect(0, 0, 32, 48);
  gfx.fillStyle(0x68827c, 1);
  gfx.fillRect(3, 2, 26, 44);
  gfx.fillStyle(0x254b4c, 1);
  gfx.fillRect(7, 6, 18, 34);
  gfx.fillStyle(0x73ddba, 1);
  gfx.fillRect(14, 10, 4, 25);
  gfx.fillTriangle(9, 20, 16, 14, 23, 20);
  gfx.fillStyle(0xcceadb, 1);
  gfx.fillRect(15, 11, 2, 22);
  gfx.fillStyle(0x1d363a, 1);
  gfx.fillRect(2, 42, 28, 5);
  gfx.fillStyle(0xd9c38a, 1);
  gfx.fillRect(4, 6, 2, 3);
  gfx.fillRect(26, 6, 2, 3);
  gfx.generateTexture('checkpoint_active', 32, 48);
  gfx.clear();

  gfx.destroy();
}

/** Generate enemy textures */
function generateEnemyTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // 1. Infantry Soldier (24x28) - Red beret commando
  gfx.clear();
  gfx.fillStyle(0xcc2222, 1);
  gfx.fillRect(7, 2, 10, 4);
  gfx.fillRect(15, 3, 3, 5);
  gfx.fillStyle(0xd49b6a, 1);
  gfx.fillRect(8, 6, 8, 6);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(12, 8, 3, 2);
  gfx.fillStyle(0x355e3b, 1);
  gfx.fillRect(6, 12, 12, 8);
  gfx.fillStyle(0x234027, 1);
  gfx.fillRect(6, 12, 3, 8);
  gfx.fillStyle(0x222222, 1);
  gfx.fillRect(2, 14, 8, 3);
  gfx.fillStyle(0x2b332b, 1);
  gfx.fillRect(7, 20, 4, 5);
  gfx.fillRect(13, 20, 4, 5);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(6, 25, 5, 3);
  gfx.fillRect(13, 25, 5, 3);
  gfx.generateTexture('enemy_infantry', 24, 28);
  gfx.clear();

  // 2. Rifle Soldier (24x28) - Blue helmet sniper
  gfx.fillStyle(0x2d4d6b, 1);
  gfx.fillRect(6, 2, 12, 5);
  gfx.fillStyle(0x00ffff, 1);
  gfx.fillRect(10, 7, 7, 2);
  gfx.fillStyle(0xd49b6a, 1);
  gfx.fillRect(8, 7, 3, 4);
  gfx.fillStyle(0x3d5a80, 1);
  gfx.fillRect(6, 11, 12, 9);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(0, 13, 12, 3);
  gfx.fillStyle(0xff3333, 1);
  gfx.fillRect(0, 14, 2, 1);
  gfx.fillStyle(0x293241, 1);
  gfx.fillRect(7, 20, 4, 5);
  gfx.fillRect(13, 20, 4, 5);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(6, 25, 5, 3);
  gfx.fillRect(13, 25, 5, 3);
  gfx.generateTexture('enemy_rifle', 24, 28);
  gfx.clear();

  // 3. Heavy Gunner (32x32) - Bulky armor with minigun
  gfx.fillStyle(0x5e2b2b, 1);
  gfx.fillRect(10, 2, 12, 6);
  gfx.fillStyle(0xff6600, 1);
  gfx.fillRect(14, 5, 6, 2);
  gfx.fillStyle(0x8a3333, 1);
  gfx.fillRect(5, 8, 6, 6);
  gfx.fillRect(21, 8, 6, 6);
  gfx.fillStyle(0x732929, 1);
  gfx.fillRect(9, 8, 14, 12);
  gfx.fillStyle(0xffaa00, 1);
  gfx.fillRect(12, 10, 8, 3);
  gfx.fillStyle(0x222222, 1);
  gfx.fillRect(0, 13, 10, 3);
  gfx.fillRect(0, 17, 10, 3);
  gfx.fillStyle(0x555555, 1);
  gfx.fillRect(8, 12, 6, 9);
  gfx.fillStyle(0x3a1e1e, 1);
  gfx.fillRect(8, 20, 6, 7);
  gfx.fillRect(18, 20, 6, 7);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(7, 27, 7, 5);
  gfx.fillRect(18, 27, 7, 5);
  gfx.generateTexture('enemy_heavy', 32, 32);
  gfx.clear();

  // 4. Flying Drone (36x24) - Sleek hover attack drone
  gfx.fillStyle(0x404b5c, 1);
  gfx.fillEllipse(18, 12, 28, 14);
  gfx.fillStyle(0x607088, 1);
  gfx.fillEllipse(18, 10, 20, 8);
  gfx.fillStyle(0xff0044, 1);
  gfx.fillEllipse(18, 12, 6, 6);
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(17, 11, 2, 2);
  gfx.fillStyle(0x222222, 1);
  gfx.fillRect(2, 8, 5, 8);
  gfx.fillRect(29, 8, 5, 8);
  gfx.fillStyle(0x00ddff, 1);
  gfx.fillRect(0, 10, 2, 4);
  gfx.fillRect(34, 10, 2, 4);
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(16, 19, 4, 5);
  gfx.generateTexture('enemy_drone', 36, 24);
  gfx.clear();

  // 5. Turret (32x32) - Rotating mechanical bunker turret
  gfx.fillStyle(0x333b48, 1);
  gfx.fillRect(4, 22, 24, 10);
  gfx.fillStyle(0x242a33, 1);
  gfx.fillRect(8, 18, 16, 4);
  gfx.fillStyle(0xffaa00, 1);
  gfx.fillRect(6, 24, 4, 6);
  gfx.fillRect(14, 24, 4, 6);
  gfx.fillRect(22, 24, 4, 6);
  gfx.fillStyle(0x556270, 1);
  gfx.fillEllipse(16, 12, 20, 14);
  gfx.fillStyle(0xff0033, 1);
  gfx.fillRect(10, 10, 4, 4);
  gfx.fillStyle(0x1a1a1a, 1);
  gfx.fillRect(0, 8, 12, 3);
  gfx.fillRect(0, 13, 12, 3);
  gfx.generateTexture('enemy_turret', 32, 32);
  gfx.clear();

  // 6. Shield Soldier (28x28) - Commando with tactical riot shield
  gfx.fillStyle(0x2d4d6b, 1);
  gfx.fillRect(12, 4, 8, 6);
  gfx.fillStyle(0x3d5a80, 1);
  gfx.fillRect(10, 10, 10, 10);
  gfx.fillStyle(0x293241, 1);
  gfx.fillRect(10, 20, 5, 5);
  gfx.fillRect(16, 20, 5, 5);
  gfx.fillStyle(0x1a2e3b, 1);
  gfx.fillRect(2, 3, 8, 22);
  gfx.lineStyle(2, 0x00f0ff, 0.8);
  gfx.strokeRect(2, 3, 8, 22);
  gfx.fillStyle(0x00ffff, 1);
  gfx.fillRect(4, 6, 4, 4);
  gfx.fillRect(4, 16, 4, 4);
  gfx.generateTexture('enemy_shield', 28, 28);
  gfx.clear();

  // Distinct enemy fire: infantry/rifle tracer, heavy slug, drone energy,
  // and turret penetrator. All remain short enough to read at game speed.
  gfx.fillStyle(0xa32e3a, 1);
  gfx.fillRect(0, 2, 11, 4);
  gfx.fillStyle(0xffb589, 1);
  gfx.fillRect(4, 3, 7, 2);
  gfx.generateTexture('bullet_enemy', 11, 8);
  gfx.clear();

  gfx.fillStyle(0x652c2b, 1);
  gfx.fillRect(0, 1, 14, 8);
  gfx.fillStyle(0xff8f5b, 1);
  gfx.fillRect(5, 2, 8, 6);
  gfx.fillStyle(0xffdd9b, 1);
  gfx.fillRect(10, 4, 3, 2);
  gfx.generateTexture('bullet_enemy_heavy', 14, 10);
  gfx.clear();

  gfx.fillStyle(0xa13572, 0.8);
  gfx.fillEllipse(6, 6, 12, 12);
  gfx.fillStyle(0xffb9df, 1);
  gfx.fillEllipse(6, 6, 5, 5);
  gfx.generateTexture('bullet_enemy_drone', 12, 12);
  gfx.clear();

  gfx.fillStyle(0x9f3b3c, 1);
  gfx.fillRect(0, 2, 16, 5);
  gfx.fillStyle(0xffcf9d, 1);
  gfx.fillRect(6, 3, 10, 3);
  gfx.generateTexture('bullet_enemy_turret', 16, 9);
  gfx.clear();

  gfx.fillStyle(0x89372e, 1);
  gfx.fillRect(0, 1, 17, 8);
  gfx.fillStyle(0xff9d68, 1);
  gfx.fillRect(6, 3, 11, 4);
  gfx.generateTexture('bullet_boss_cannon', 17, 10);
  gfx.clear();

  // 8. Enemy death particle
  gfx.fillStyle(0xff4422, 1);
  gfx.fillRect(0, 0, 4, 4);
  gfx.fillStyle(0xffff44, 1);
  gfx.fillRect(1, 1, 2, 2);
  gfx.generateTexture('enemy_death_particle', 4, 4);
  gfx.clear();

  gfx.destroy();
}

/** Generate weapon textures */
function generateWeaponTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Each pickup has its own recognizable silhouette inside a rugged casing.
  const drawWeaponIcon = (name1: string, name2: string, color: number, kind: string) => {
    gfx.clear();
    gfx.fillStyle(0x14272d, 1);
    gfx.fillRect(1, 1, 30, 14);
    gfx.lineStyle(1, color, 1);
    gfx.strokeRect(1, 1, 30, 14);
    gfx.fillStyle(0x728886, 1);
    gfx.fillRect(4, 7, 21, 3);
    gfx.fillStyle(0x27393c, 1);
    gfx.fillRect(7, 5, 13, 2);
    gfx.fillRect(11, 10, 4, 4);
    gfx.fillStyle(color, 1);
    if (kind === 'pulse') {
      gfx.fillRect(24, 6, 5, 5);
      gfx.fillRect(9, 6, 4, 1);
    } else if (kind === 'spread') {
      gfx.fillRect(22, 4, 7, 2);
      gfx.fillRect(22, 7, 7, 2);
      gfx.fillRect(22, 10, 7, 2);
    } else if (kind === 'rapid') {
      for (let x = 6; x < 21; x += 5) gfx.fillRect(x, 4, 2, 7);
      gfx.fillRect(24, 6, 5, 5);
    } else if (kind === 'plasma') {
      gfx.fillEllipse(24, 8, 8, 7);
      gfx.fillRect(12, 4, 4, 8);
    } else {
      gfx.fillTriangle(21, 4, 30, 8, 21, 12);
      gfx.fillRect(5, 10, 5, 3);
    }
    gfx.fillStyle(0xd4dfd0, 0.85);
    gfx.fillRect(3, 3, 2, 2);
    gfx.generateTexture(name1, 32, 16);
    gfx.generateTexture(name2, 32, 16);
  };

  drawWeaponIcon('weapon_pulse_rifle', 'weapon_pulse', 0x67bcff, 'pulse');
  drawWeaponIcon('weapon_spread_blaster', 'weapon_spread', 0xffae66, 'spread');
  drawWeaponIcon('weapon_rapid_cannon', 'weapon_rapid', 0x69efb9, 'rapid');
  drawWeaponIcon('weapon_plasma_beam', 'weapon_plasma', 0xd28cff, 'plasma');
  drawWeaponIcon('weapon_rocket_launcher', 'weapon_rocket', 0xff725c, 'rocket');

  gfx.clear();

  // Player bullets with bright glowing centers
  // 1. Sharp kinetic pulse tracer
  gfx.fillStyle(0x297db5, 0.9);
  gfx.fillRect(0, 1, 12, 4);
  gfx.fillStyle(0x9de4ff, 1);
  gfx.fillRect(3, 2, 9, 2);
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(8, 2, 4, 1);
  gfx.generateTexture('bullet_player', 12, 6);
  gfx.clear();

  // 2. Three-pronged blast shard
  gfx.fillStyle(0xf16b34, 1);
  gfx.fillTriangle(0, 4, 12, 0, 12, 8);
  gfx.fillStyle(0xffd28a, 1);
  gfx.fillTriangle(4, 4, 11, 2, 11, 6);
  gfx.generateTexture('bullet_spread', 12, 8);
  gfx.clear();

  // 3. Narrow rapid tracer
  gfx.fillStyle(0x3aab7b, 1);
  gfx.fillRect(0, 1, 10, 3);
  gfx.fillStyle(0xd0ffe5, 1);
  gfx.fillRect(4, 2, 6, 1);
  gfx.generateTexture('bullet_rapid', 10, 5);
  gfx.clear();

  // 4. Contained plasma bolt with bright white core
  gfx.fillStyle(0x7e52bd, 0.7);
  gfx.fillEllipse(10, 5, 20, 10);
  gfx.fillStyle(0xd78dff, 1);
  gfx.fillEllipse(11, 5, 14, 6);
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(7, 4, 9, 2);
  gfx.generateTexture('bullet_plasma', 20, 10);
  gfx.clear();

  // 5. Fin-stabilized rocket with exposed exhaust
  gfx.fillStyle(0xffaf60, 0.85);
  gfx.fillTriangle(0, 4, 5, 1, 5, 7);
  gfx.fillStyle(0x536766, 1);
  gfx.fillRect(4, 2, 13, 5);
  gfx.fillStyle(0xaabbb0, 1);
  gfx.fillRect(6, 2, 8, 2);
  gfx.fillStyle(0xd95c46, 1);
  gfx.fillTriangle(16, 1, 23, 4, 16, 8);
  gfx.fillStyle(0x28383d, 1);
  gfx.fillTriangle(7, 1, 13, 1, 8, 0);
  gfx.fillTriangle(7, 8, 13, 8, 8, 9);
  gfx.generateTexture('bullet_rocket', 23, 9);
  gfx.clear();

  gfx.destroy();
}

/** Generate effect textures */
function generateEffectTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Muzzle flash
  gfx.fillStyle(0xffff00, 1);
  gfx.fillTriangle(0, 0, 10, 2, 0, 4);
  gfx.fillStyle(0xffaa00, 1);
  gfx.fillRect(0, 0, 6, 4);
  gfx.generateTexture('effect_muzzle', 10, 4);
  gfx.clear();

  // Hit spark
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(0, 0, 4, 4);
  gfx.fillStyle(0xffaa00, 1);
  gfx.fillRect(1, 1, 2, 2);
  gfx.generateTexture('effect_hit_spark', 4, 4);
  gfx.clear();

  // Explosion frames
  for (let i = 0; i < 8; i++) {
    const radius = 8 + i * 2;
    gfx.fillStyle(0xff5500 + i * 0x222200, 1);
    gfx.fillEllipse(16, 16, radius, radius);
    gfx.fillStyle(0xffff00, 1);
    gfx.fillEllipse(16, 16, radius / 2, radius / 2);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(16 - 2, 16 - 2, 4, 4);
    gfx.generateTexture(`explosion_${i}`, 32, 32);
    gfx.clear();
  }

  // Small explosion
  gfx.fillStyle(0xffaa00, 1);
  gfx.fillEllipse(8, 8, 12, 12);
  gfx.fillStyle(0xffff00, 1);
  gfx.fillEllipse(8, 8, 6, 6);
  gfx.generateTexture('explosion_small', 16, 16);
  gfx.clear();

  // Particles
  gfx.fillStyle(0x886644, 1);
  gfx.fillRect(0, 0, 3, 3);
  gfx.generateTexture('particle_dust', 3, 3);
  gfx.clear();

  gfx.fillStyle(0xff5555, 1);
  gfx.fillRect(0, 0, 3, 3);
  gfx.generateTexture('particle_damage', 3, 3);
  gfx.clear();

  gfx.fillStyle(0x8b5a2b, 1);
  gfx.fillRect(0, 0, 5, 3);
  gfx.generateTexture('particle_debris', 5, 3);
  gfx.clear();

  gfx.destroy();
}

/** Generate UI textures */
function generateUITextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 120, 32);
  gfx.fillStyle(0x7a7a9a, 1);
  gfx.fillRect(2, 2, 116, 28);
  gfx.generateTexture('ui_button', 120, 32);
  gfx.clear();

  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(0, 0, 120, 32);
  gfx.fillStyle(0x8aaa9a, 1);
  gfx.fillRect(2, 2, 116, 28);
  gfx.generateTexture('ui_button_hover', 120, 32);
  gfx.clear();

  gfx.fillStyle(0x000000, 0.8);
  gfx.fillRect(0, 0, 200, 100);
  gfx.lineStyle(2, 0x3a3a5a, 1);
  gfx.strokeRect(0, 0, 200, 100);
  gfx.generateTexture('ui_panel', 200, 100);
  gfx.clear();

  gfx.fillStyle(0x3a3a5a, 1);
  gfx.fillRect(0, 0, 40, 40);
  gfx.lineStyle(2, 0xffffff, 1);
  gfx.strokeRect(0, 0, 40, 40);
  gfx.generateTexture('ui_weapon_slot', 40, 40);
  gfx.clear();

  gfx.destroy();
}

/** Generate boss textures */
function generateBossTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Boss leg
  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 40, 80);
  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(8, 8, 32, 20);
  gfx.generateTexture('boss_leg', 40, 80);
  gfx.clear();

  // Boss body
  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 100, 60);
  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(10, 10, 80, 40);
  gfx.fillStyle(0xaa5555, 1);
  gfx.fillRect(20, 20, 60, 20);
  gfx.generateTexture('boss_body', 100, 60);
  gfx.clear();

  // Boss hip
  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 60, 40);
  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(5, 5, 50, 30);
  gfx.generateTexture('boss_hip', 60, 40);
  gfx.clear();

  // Boss arms
  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 20, 50);
  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(4, 4, 12, 42);
  gfx.generateTexture('boss_upper_arm', 20, 50);
  gfx.clear();

  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillRect(0, 0, 16, 30);
  gfx.fillStyle(0x6a6a8a, 1);
  gfx.fillRect(3, 3, 10, 24);
  gfx.generateTexture('boss_lower_arm', 16, 30);
  gfx.clear();

  // Boss head
  gfx.fillStyle(0x5a5a7a, 1);
  gfx.fillEllipse(32, 32, 64, 56);
  gfx.fillStyle(0x00ffff, 1);
  gfx.fillEllipse(32, 28, 40, 24);
  gfx.fillStyle(0xff5555, 1);
  gfx.fillEllipse(32, 32, 24, 16);
  gfx.generateTexture('boss_head', 64, 64);
  gfx.clear();

  // Boss cannon
  gfx.fillStyle(0x7a7a9a, 1);
  gfx.fillRect(0, 0, 40, 16);
  gfx.fillStyle(0x8aaa9a, 1);
  gfx.fillRect(4, 4, 32, 8);
  gfx.fillStyle(0xff5555, 1);
  gfx.fillRect(30, 2, 8, 12);
  gfx.generateTexture('boss_cannon', 40, 16);
  gfx.clear();

  // Boss missile
  gfx.fillStyle(0xff9b50, 0.9);
  gfx.fillTriangle(0, 4, 5, 1, 5, 7);
  gfx.fillStyle(0x43545b, 1);
  gfx.fillRect(4, 2, 12, 5);
  gfx.fillStyle(0xb8b8a7, 1);
  gfx.fillRect(6, 2, 8, 2);
  gfx.fillStyle(0xd36040, 1);
  gfx.fillTriangle(15, 0, 20, 4, 15, 8);
  gfx.generateTexture('boss_missile', 20, 8);
  gfx.clear();

  // Boss laser
  gfx.fillStyle(0x9d252f, 0.8);
  gfx.fillRect(0, 0, 16, 8);
  gfx.fillStyle(0xff7771, 0.95);
  gfx.fillRect(0, 2, 16, 4);
  gfx.fillStyle(0xfff0d2, 0.95);
  gfx.fillRect(2, 3, 12, 2);
  gfx.generateTexture('boss_laser', 16, 8);
  gfx.clear();

  // Boss weak point
  gfx.fillStyle(0x302426, 1);
  gfx.fillEllipse(8, 8, 16, 16);
  gfx.fillStyle(0xd55a32, 1);
  gfx.fillEllipse(8, 8, 13, 13);
  gfx.fillStyle(0xffb45b, 1);
  gfx.fillEllipse(8, 8, 8, 8);
  gfx.fillStyle(0xffecb8, 1);
  gfx.fillEllipse(8, 8, 3, 3);
  gfx.generateTexture('boss_weakpoint', 16, 16);
  gfx.clear();

  // Ground shockwave has a low jagged silhouette, not a stretched barrel.
  gfx.fillStyle(0x4a3e36, 0.9);
  gfx.fillRect(0, 9, 42, 5);
  gfx.fillStyle(0xe08048, 1);
  for (let x = 0; x < 42; x += 8) gfx.fillTriangle(x, 11, x + 4, 2, x + 8, 11);
  gfx.fillStyle(0xffd291, 0.85);
  gfx.fillRect(3, 9, 36, 2);
  gfx.generateTexture('boss_shockwave', 42, 14);
  gfx.clear();

  // Boss explosion particle
  gfx.fillStyle(0xff5500, 1);
  gfx.fillRect(0, 0, 6, 6);
  gfx.generateTexture('boss_explosion_particle', 6, 6);
  gfx.clear();

  gfx.destroy();
}

/** Generate pickup textures */
function generatePickupTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Health pickup
  gfx.fillStyle(0x1f3537, 1);
  gfx.fillRect(4, 5, 24, 22);
  gfx.fillStyle(0x5f9683, 1);
  gfx.fillRect(6, 7, 20, 18);
  gfx.lineStyle(2, 0xb3d4b5, 1);
  gfx.strokeRect(5, 6, 22, 20);
  gfx.fillStyle(0xe7f4d4, 1);
  gfx.fillRect(14, 10, 4, 13);
  gfx.fillRect(10, 14, 12, 4);
  gfx.fillStyle(0x8de5b4, 0.8);
  gfx.fillRect(3, 13, 2, 8);
  gfx.fillRect(27, 13, 2, 8);
  gfx.generateTexture('pickup_health', 32, 32);
  gfx.clear();

  // Ammo pickup
  gfx.fillStyle(0x1a3037, 1);
  gfx.fillRect(3, 4, 26, 24);
  gfx.fillStyle(0x3e6974, 1);
  gfx.fillRect(5, 6, 22, 20);
  gfx.fillStyle(0xaac9c8, 1);
  gfx.fillRect(7, 8, 18, 3);
  gfx.fillRect(7, 22, 18, 2);
  for (const x of [10, 15, 20]) {
    gfx.fillStyle(0xe4c074, 1);
    gfx.fillRect(x, 12, 3, 9);
    gfx.fillStyle(0xf5e3aa, 1);
    gfx.fillRect(x, 12, 3, 2);
  }
  gfx.generateTexture('pickup_ammo', 32, 32);
  gfx.clear();

  // Score pickup
  gfx.fillStyle(0x233b3d, 1);
  gfx.fillEllipse(16, 16, 28, 28);
  gfx.fillStyle(0xc6a05d, 1);
  gfx.fillEllipse(16, 16, 23, 23);
  gfx.fillStyle(0x594c32, 1);
  gfx.fillEllipse(16, 16, 17, 17);
  gfx.fillStyle(0xf1d492, 1);
  gfx.fillRect(11, 12, 10, 2);
  gfx.fillRect(11, 16, 10, 2);
  gfx.fillRect(11, 20, 10, 2);
  gfx.fillRect(9, 14, 2, 6);
  gfx.generateTexture('pickup_score', 32, 32);
  gfx.clear();

  gfx.destroy();
}
