import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.keyboard.press('Enter');
});

test('player projectiles damage enemies instead of passing through', async ({ page }) => {
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner?: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    return (level?.enemySpawner?.getEnemyGroup().getChildren().length ?? 0) >= 2;
  });
  await page.waitForTimeout(300);

  const initialHp = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite & {
        getWeaponManager: () => {
          fire: (x: number, y: number, aim: { x: number; y: number; isUp: boolean; isDown: boolean }, facing: 'left' | 'right') => void;
        };
      };
      enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    const enemy = level.enemySpawner.getEnemyGroup().getChildren()[0] as Phaser.Physics.Arcade.Sprite & {
      getHp: () => number;
    };
    const player = level.player;
    const firingX = enemy.x - 80;
    player.setPosition(firingX, enemy.y);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    playerBody.reset(firingX, enemy.y);
    playerBody.setAllowGravity(false);
    player.getWeaponManager().fire(firingX, enemy.y, { x: 1, y: 0, isUp: false, isDown: false }, 'right');
    return enemy.getHp();
  });

  await page.waitForTimeout(500);

  const remainingHp = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    const enemy = level.enemySpawner.getEnemyGroup().getChildren()[0] as { getHp: () => number };
    return enemy.getHp();
  });

  expect(remainingHp).toBeLessThan(initialHp);
});

test('weapon pickup joins the acquisition-order stack and K cycles it', async ({ page }) => {
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite;
    };
    level.player.setPosition(1300, 280);
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    body.reset(1300, 280);
    body.setAllowGravity(false);
  });

  await page.waitForTimeout(250);

  const afterPickup = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: { getWeaponManager: () => { getCurrentWeaponType: () => string; getUnlockedWeapons: () => string[] } };
    };
    const manager = level.player.getWeaponManager();
    return { current: manager.getCurrentWeaponType(), order: manager.getUnlockedWeapons() };
  });

  expect(afterPickup).toEqual({
    current: 'spread_blaster',
    order: ['pulse_rifle', 'spread_blaster'],
  });

  await page.keyboard.press('KeyK');
  await page.waitForTimeout(100);
  const afterFirstSwitch = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: { getWeaponManager: () => { getCurrentWeaponType: () => string } };
    };
    return level.player.getWeaponManager().getCurrentWeaponType();
  });
  expect(afterFirstSwitch).toBe('pulse_rifle');

  await page.keyboard.press('KeyK');
  await page.waitForTimeout(100);
  const afterSecondSwitch = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: { getWeaponManager: () => { getCurrentWeaponType: () => string } };
    };
    return level.player.getWeaponManager().getCurrentWeaponType();
  });
  expect(afterSecondSwitch).toBe('spread_blaster');
});
