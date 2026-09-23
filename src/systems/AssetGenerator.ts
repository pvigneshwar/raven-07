/**
 * AssetGenerator - Generates high-fidelity procedural player textures.
 * Creates rich 16-bit retro commando sprites for Raven-07.
 */

export function generatePlayerTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  // Helper colors
  const BANDANA = 0xff2233;     // Crimson red headband/bandana
  const BANDANA_SHADOW = 0xaa1122;
  const SKIN = 0xffcc99;        // Skin tone
  const SKIN_SHADOW = 0xd49b6a;
  const VEST = 0x2e4a38;        // Military green tactical vest
  const VEST_HIGHLIGHT = 0x476b50;
  const VEST_DARK = 0x1c2e22;
  const PANTS = 0x3d4349;       // Dark combat trousers
  const PANTS_SHADOW = 0x252a2f;
  const BOOTS = 0x1a1a1a;       // Black combat boots
  const GUN_METAL = 0x778899;   // Slate gun metal
  const GUN_DARK = 0x334455;
  const GUN_MUZZLE = 0x99aabb;

  // 1. PLAYER IDLE (32x36)
  gfx.clear();
  // Bandana knot/tails
  gfx.fillStyle(BANDANA_SHADOW, 1);
  gfx.fillRect(4, 5, 4, 3);
  gfx.fillRect(2, 7, 3, 4);

  // Head & Hair/Bandana
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 3, 13, 5); // Forehead bandana band
  gfx.fillStyle(0x332211, 1); // Dark hair on top
  gfx.fillRect(9, 1, 11, 3);

  // Face
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 7, 10, 6);
  gfx.fillStyle(SKIN_SHADOW, 1);
  gfx.fillRect(17, 8, 2, 4);
  // Visor/Eye
  gfx.fillStyle(0x00f0ff, 1); // Cyan tactical ocular implant/eye
  gfx.fillRect(14, 8, 3, 2);

  // Torso / Vest
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 13, 14, 10);
  gfx.fillStyle(VEST_HIGHLIGHT, 1);
  gfx.fillRect(9, 14, 4, 8);
  gfx.fillStyle(VEST_DARK, 1);
  gfx.fillRect(17, 14, 3, 9);
  // Ammo belt strap
  gfx.fillStyle(0xcc9933, 1);
  gfx.fillRect(10, 15, 3, 2);
  gfx.fillRect(13, 18, 3, 2);

  // Arm & Gun
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(18, 14, 4, 5);
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 16, 11, 4);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(21, 15, 8, 3);
  gfx.fillStyle(GUN_MUZZLE, 1);
  gfx.fillRect(29, 16, 2, 2);

  // Belt
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(7, 23, 14, 3);
  gfx.fillStyle(0xddaa33, 1);
  gfx.fillRect(13, 23, 3, 3); // Gold belt buckle

  // Legs / Pants
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(8, 26, 5, 6);  // Left leg
  gfx.fillRect(15, 26, 5, 6); // Right leg
  gfx.fillStyle(PANTS_SHADOW, 1);
  gfx.fillRect(13, 26, 2, 6);

  // Boots
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(7, 31, 6, 4);
  gfx.fillRect(15, 31, 6, 4);
  gfx.fillStyle(0x444444, 1);
  gfx.fillRect(8, 31, 3, 2);
  gfx.fillRect(16, 31, 3, 2);

  gfx.generateTexture('player_idle', 32, 36);
  gfx.clear();

  // 2. PLAYER RUN FRAME 0 (Stride Left)
  // Head
  gfx.fillStyle(BANDANA_SHADOW, 1);
  gfx.fillRect(2, 6, 5, 3);
  gfx.fillRect(0, 8, 4, 4); // Streaming bandana tail in motion
  gfx.fillStyle(0x332211, 1);
  gfx.fillRect(9, 2, 11, 3);
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 4, 13, 5);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 8, 10, 6);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(14, 9, 3, 2);

  // Torso angled
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 14, 14, 9);
  gfx.fillStyle(VEST_HIGHLIGHT, 1);
  gfx.fillRect(9, 15, 4, 7);

  // Gun firing stance
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 15, 12, 4);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(21, 14, 9, 3);
  gfx.fillStyle(GUN_MUZZLE, 1);
  gfx.fillRect(30, 15, 2, 2);

  // Belt
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(7, 23, 14, 3);

  // Legs in stride 0
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(4, 25, 6, 6);
  gfx.fillRect(16, 25, 6, 6);
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(3, 30, 6, 4);
  gfx.fillRect(17, 30, 7, 4);

  gfx.generateTexture('player_run_0', 32, 36);
  gfx.clear();

  // 3. PLAYER RUN FRAME 1 (Stride Right)
  // Head
  gfx.fillStyle(BANDANA_SHADOW, 1);
  gfx.fillRect(3, 7, 4, 3);
  gfx.fillRect(1, 9, 4, 4);
  gfx.fillStyle(0x332211, 1);
  gfx.fillRect(9, 3, 11, 3);
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 5, 13, 5);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 9, 10, 6);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(14, 10, 3, 2);

  // Torso
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 15, 14, 9);
  gfx.fillStyle(VEST_HIGHLIGHT, 1);
  gfx.fillRect(9, 16, 4, 7);

  // Gun
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 16, 12, 4);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(21, 15, 9, 3);
  gfx.fillStyle(GUN_MUZZLE, 1);
  gfx.fillRect(30, 16, 2, 2);

  // Belt
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(7, 24, 14, 3);

  // Legs in stride 1
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(9, 25, 5, 6);
  gfx.fillRect(14, 25, 6, 5);
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(8, 30, 6, 4);
  gfx.fillRect(16, 29, 6, 4);

  gfx.generateTexture('player_run_1', 32, 36);
  gfx.clear();

  // 4. PLAYER JUMP
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 1, 13, 5);
  gfx.fillStyle(0x332211, 1);
  gfx.fillRect(9, 0, 11, 3);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 5, 10, 6);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(14, 6, 3, 2);

  // Body tucked
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 11, 14, 9);
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 12, 11, 4);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(21, 11, 8, 3);

  // Tucked legs
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(6, 20, 8, 6);
  gfx.fillRect(14, 20, 8, 6);
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(5, 25, 7, 5);
  gfx.fillRect(15, 25, 7, 5);

  gfx.generateTexture('player_jump', 32, 36);
  gfx.clear();

  // 5. PLAYER FALL
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 2, 13, 5);
  gfx.fillStyle(0x332211, 1);
  gfx.fillRect(9, 1, 11, 3);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 6, 10, 6);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(14, 7, 3, 2);

  // Body
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 12, 14, 9);
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 14, 11, 4);

  // Extended legs pointing down
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(7, 21, 5, 8);
  gfx.fillRect(15, 21, 5, 8);
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(7, 28, 6, 5);
  gfx.fillRect(15, 28, 6, 5);

  gfx.generateTexture('player_fall', 32, 36);
  gfx.clear();

  // 6. PLAYER CROUCH
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(8, 4, 13, 5);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(9, 8, 10, 5);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(14, 9, 3, 2);

  // Torso low
  gfx.fillStyle(VEST, 1);
  gfx.fillRect(7, 13, 14, 7);

  // Low gun aimed forward
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(19, 15, 12, 4);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(21, 14, 9, 3);
  gfx.fillStyle(GUN_MUZZLE, 1);
  gfx.fillRect(30, 15, 2, 2);

  // Crouched legs
  gfx.fillStyle(PANTS, 1);
  gfx.fillRect(4, 20, 14, 5);
  gfx.fillStyle(BOOTS, 1);
  gfx.fillRect(3, 23, 18, 4);

  gfx.generateTexture('player_crouch', 32, 36);
  gfx.clear();

  // 7. PLAYER DAMAGE (Flashing Red/White silhouette)
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(8, 3, 13, 10);
  gfx.fillRect(7, 13, 14, 10);
  gfx.fillRect(18, 14, 12, 6);
  gfx.fillRect(7, 23, 14, 8);
  gfx.fillRect(7, 31, 14, 4);
  gfx.fillStyle(0xff4444, 1);
  gfx.fillRect(9, 5, 11, 6);
  gfx.fillRect(8, 14, 12, 8);

  gfx.generateTexture('player_damage', 32, 36);
  gfx.clear();

  // 8. PLAYER DEATH (Fallen pose)
  gfx.fillStyle(0x663333, 1);
  gfx.fillRect(4, 18, 24, 10);
  gfx.fillStyle(BANDANA, 1);
  gfx.fillRect(2, 16, 8, 6);
  gfx.fillStyle(SKIN, 1);
  gfx.fillRect(4, 20, 6, 6);
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(22, 22, 9, 4);

  gfx.generateTexture('player_death', 32, 36);
  gfx.clear();

  // 9. PLAYER WEAPON HELD
  gfx.fillStyle(GUN_DARK, 1);
  gfx.fillRect(0, 2, 28, 6);
  gfx.fillStyle(GUN_METAL, 1);
  gfx.fillRect(4, 1, 20, 4);
  gfx.fillStyle(0x00f0ff, 1);
  gfx.fillRect(10, 3, 6, 2); // Energy cell glow
  gfx.generateTexture('player_weapon_held', 28, 8);
  gfx.clear();

  // Aim poses keep the same 32x36 footprint as the movement frames so the
  // physics body never changes when the player points the weapon vertically.
  const drawAimPose = (pose: 'up' | 'diag_up' | 'diag_down', key: string): void => {
    gfx.fillStyle(BANDANA_SHADOW, 1);
    gfx.fillRect(3, 6, 5, 3);
    gfx.fillStyle(0x332211, 1);
    gfx.fillRect(9, 1, 11, 3);
    gfx.fillStyle(BANDANA, 1);
    gfx.fillRect(8, 3, 13, 5);
    gfx.fillStyle(SKIN, 1);
    gfx.fillRect(9, 7, 10, 6);
    gfx.fillStyle(0x00f0ff, 1);
    gfx.fillRect(14, 8, 3, 2);
    gfx.fillStyle(VEST, 1);
    gfx.fillRect(7, 13, 14, 10);
    gfx.fillStyle(VEST_HIGHLIGHT, 1);
    gfx.fillRect(9, 14, 4, 8);
    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(7, 23, 14, 3);
    gfx.fillStyle(PANTS, 1);
    gfx.fillRect(8, 26, 5, 6);
    gfx.fillRect(15, 26, 5, 6);
    gfx.fillStyle(BOOTS, 1);
    gfx.fillRect(7, 31, 6, 4);
    gfx.fillRect(15, 31, 6, 4);
    gfx.fillStyle(SKIN, 1);
    gfx.fillRect(18, 13, 4, 5);
    gfx.fillStyle(GUN_DARK, 1);
    if (pose === 'up') {
      gfx.fillRect(20, 1, 5, 17);
      gfx.fillStyle(GUN_METAL, 1);
      gfx.fillRect(21, 3, 2, 13);
      gfx.fillStyle(GUN_MUZZLE, 1);
      gfx.fillRect(20, 0, 5, 2);
    } else {
      for (let step = 0; step < 4; step++) {
        const gunY = pose === 'diag_up' ? 15 - step * 3 : 16 + step * 3;
        gfx.fillRect(19 + step * 3, gunY, 6, 4);
      }
      gfx.fillStyle(GUN_METAL, 1);
      gfx.fillRect(22, pose === 'diag_up' ? 11 : 20, 5, 2);
      gfx.fillStyle(GUN_MUZZLE, 1);
      gfx.fillRect(28, pose === 'diag_up' ? 5 : 27, 3, 3);
    }
    gfx.generateTexture(key, 32, 36);
    gfx.clear();
  };
  drawAimPose('up', 'player_aim_up');
  drawAimPose('diag_up', 'player_aim_diag_up');
  drawAimPose('diag_down', 'player_aim_diag_down');

  gfx.destroy();
}
