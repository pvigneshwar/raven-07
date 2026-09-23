import { test, expect } from '@playwright/test';

async function startLevel(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as Phaser.Scene & { introActive: boolean };
    return level && !level.introActive && game.scene.isActive('LevelOneScene');
  }, undefined, { timeout: 10000 });
}

test('keyboard and mouse shots make the player face the projectile direction', async ({ page }) => {
  await startLevel(page);
  const state = () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite & { facing: string; aimDirection: { x: number; y: number } };
      bulletGroup: Phaser.Physics.Arcade.Group;
    };
    const bullet = level.bulletGroup.getChildren().filter((child) => child.active).at(-1) as Phaser.Physics.Arcade.Sprite | undefined;
    return { facing: level.player.facing, flipped: level.player.flipX,
      texture: level.player.texture.key, aim: level.player.aimDirection,
      bulletVx: (bullet?.body as Phaser.Physics.Arcade.Body | undefined)?.velocity.x ?? null };
  });

  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(90);
  let shot = await state();
  expect(shot.facing).toBe('left');
  expect(shot.flipped).toBe(true);
  expect(shot.bulletVx).toBeLessThan(0);
  await page.keyboard.up('KeyJ');
  await page.keyboard.up('KeyA');

  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(70);
  shot = await state();
  expect(shot.texture).toBe('player_aim_up');
  expect(shot.aim.y).toBeLessThan(-0.9);
  await page.keyboard.up('KeyJ');
  await page.keyboard.up('KeyW');

  const target = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & { player: Phaser.Physics.Arcade.Sprite };
    return { x: level.player.x - level.cameras.main.scrollX + 90,
      y: level.player.y - level.cameras.main.scrollY,
      width: level.cameras.main.width, height: level.cameras.main.height };
  });
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  await page.keyboard.down('KeyA');
  await page.mouse.move(box!.x + target.x * box!.width / target.width,
    box!.y + target.y * box!.height / target.height);
  await page.mouse.down();
  await page.waitForTimeout(350);
  shot = await state();
  expect(shot.facing).toBe('right');
  expect(shot.flipped).toBe(false);
  expect(shot.aim.x).toBeGreaterThan(0);
  expect(shot.bulletVx).toBeGreaterThan(0);
  await page.mouse.up();
  await page.keyboard.up('KeyA');
});

test('player bullets destroy barrels and boss bomb projectiles once', async ({ page }) => {
  await startLevel(page);
  const prepared = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite & { getWeaponManager: () => {
        fire: (x: number, y: number, aim: { x: number; y: number; isUp: boolean; isDown: boolean }, facing: 'left' | 'right') => void;
      } };
      destructibleBombs: Phaser.Physics.Arcade.StaticGroup;
      effectsManager: { createSmallExplosion: (x: number, y: number) => void };
      bombShotEffects: number;
    };
    level.bombShotEffects = 0;
    const effect = level.effectsManager.createSmallExplosion.bind(level.effectsManager);
    level.effectsManager.createSmallExplosion = (x, y) => {
      level.bombShotEffects++;
      effect(x, y);
    };
    const barrel = level.destructibleBombs.getChildren()[0] as Phaser.Physics.Arcade.Sprite;
    // Keep the player out of the barrel's contact overlap; only the shot may hit it.
    level.player.setPosition(100, 300);
    level.player.getWeaponManager().fire(barrel.x - 50, barrel.y + 2,
      { x: 1, y: 0, isUp: false, isDown: false }, 'right');
    return { barrelX: barrel.x };
  });
  await page.waitForFunction((barrelX) => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      destructibleBombs: Phaser.Physics.Arcade.StaticGroup;
    };
    return !level.destructibleBombs.getChildren().some((child) => child.active && child.x === barrelX);
  }, prepared.barrelX, { timeout: 2000 });
  await page.waitForTimeout(275);

  const missile = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite & { getWeaponManager: () => {
        fire: (x: number, y: number, aim: { x: number; y: number; isUp: boolean; isDown: boolean }, facing: 'left' | 'right') => void;
      } };
      spawnBoss: () => void;
      boss: { spawnProjectile: (x: number, y: number, angle: number, speed: number,
        texture: string, width: number, height: number, damage: number) => Phaser.Physics.Arcade.Sprite };
      bombProjectiles: Phaser.Physics.Arcade.Group;
    };
    // Register the shot before the missile exists: the overlap must notice
    // bombs added to its group later, not only those present at fire time.
    level.player.getWeaponManager().fire(450, 300,
      { x: 1, y: 0, isUp: false, isDown: false }, 'right');
    level.spawnBoss();
    const bomb = level.boss.spawnProjectile(500, 300, 0, 0, 'boss_missile', 20, 8, 1);
    return { x: bomb.x, registered: level.bombProjectiles.contains(bomb),
      gravity: (bomb.body as Phaser.Physics.Arcade.Body).allowGravity };
  });
  expect(missile.registered).toBe(true);
  expect(missile.gravity).toBe(false);
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      bombProjectiles: Phaser.Physics.Arcade.Group;
    };
    return level.bombProjectiles.getChildren().length === 0;
  }, undefined, { timeout: 2000 });
  const effects = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & { bombShotEffects: number };
    return level.bombShotEffects;
  });
  expect(effects).toBe(2);
});
