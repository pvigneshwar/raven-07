import { test, expect } from '@playwright/test';

test('Game Over menu remains interactive after a second visit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForSelector('canvas');

  for (let visit = 0; visit < 2; visit++) {
    await page.evaluate(() => {
      const game = (window as unknown as { raven07: Phaser.Game }).raven07;
      game.scene.start('GameOverScene', { score: 100 });
    });
    await page.waitForFunction(() => {
      const game = (window as unknown as { raven07: Phaser.Game }).raven07;
      return game.scene.isActive('GameOverScene');
    });

    const itemCount = await page.evaluate(() => {
      const game = (window as unknown as { raven07: Phaser.Game }).raven07;
      const scene = game.scene.getScene('GameOverScene') as Phaser.Scene & {
        menuItems: Phaser.GameObjects.Text[];
      };
      return scene.menuItems.length;
    });
    expect(itemCount).toBe(2);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    // Hover both options to exercise updateMenuVisuals on the active texts.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 20);
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 50);
    await page.evaluate(() => {
      const game = (window as unknown as { raven07: Phaser.Game }).raven07;
      game.scene.start('MainMenuScene');
    });
    await page.waitForFunction(() => {
      const game = (window as unknown as { raven07: Phaser.Game }).raven07;
      return game.scene.isActive('MainMenuScene');
    });
  }

  expect(errors).toEqual([]);
});

test('Retry starts a fresh level with live moving platform bodies', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    return game.scene.isActive('LevelOneScene');
  });
  await page.evaluate(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    game.scene.start('GameOverScene', { score: 100 });
  });
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    return game.scene.isActive('GameOverScene');
  });
  const retry = await page.evaluate(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    const scene = game.scene.getScene('GameOverScene') as Phaser.Scene & {
      menuItems: Phaser.GameObjects.Text[];
    };
    const item = scene.menuItems[0];
    return { x: item.x, y: item.y, width: scene.cameras.main.width, height: scene.cameras.main.height };
  });
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + retry.x * box!.width / retry.width,
    box!.y + retry.y * box!.height / retry.height);
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    return game.scene.isActive('LevelOneScene');
  });
  await page.waitForTimeout(200);
  const platformState = await page.evaluate(() => {
    const game = (window as unknown as { raven07: Phaser.Game }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      movingPlatforms: Array<{ sprite: Phaser.Physics.Arcade.Sprite }>;
    };
    return scene.movingPlatforms.map(({ sprite }) => ({ active: sprite.active, body: !!sprite.body }));
  });
  expect(platformState).toHaveLength(3);
  expect(platformState.every(({ active, body }) => active && body)).toBe(true);
  expect(errors).toEqual([]);
});
