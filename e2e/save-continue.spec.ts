import { expect, test } from '@playwright/test';

test('corrupt save data never blocks the main menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('raven-07-save',
    JSON.stringify({ settings: { masterVolume: 'broken' }, unlockedLevels: null, run: { checkpoint: -99 } })));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  const options = await page.evaluate(() => {
    const menu = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('MainMenuScene') as Phaser.Scene & { menuItems: Phaser.GameObjects.Text[] };
    return menu.menuItems.map((item) => item.text);
  });
  expect(options).toContain('START GAME');
  expect(options).not.toContain('CONTINUE');
  expect(errors).toEqual([]);
});

test('a checkpoint creates a Continue option that restores lives, score and position', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('LevelOneScene'));
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { introActive: boolean };
    return !level.introActive;
  });
  await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      checkpoints: Phaser.GameObjects.Zone[];
      handleCheckpoint: (zone: Phaser.GameObjects.Zone) => void;
      player: { takeDamage: (value: number) => void };
    };
    level.handleCheckpoint(level.checkpoints[0]);
    level.player.takeDamage(999);
  });
  await page.waitForTimeout(1600);
  await page.evaluate(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.start('MainMenuScene'));
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  const options = await page.evaluate(() => {
    const menu = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('MainMenuScene') as Phaser.Scene & { menuItems: Phaser.GameObjects.Text[] };
    return menu.menuItems.map((item) => item.text);
  });
  expect(options).toContain('CONTINUE');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('LevelOneScene'));
  const restored = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { getLives: () => number };
        currentCheckpoint: number;
      };
    return { lives: level.player.getLives(), x: level.player.x, checkpoint: level.currentCheckpoint };
  });
  expect(restored.lives).toBe(2);
  expect(restored.x).toBe(2400);
  expect(restored.checkpoint).toBe(0);
  expect(errors).toEqual([]);
});
