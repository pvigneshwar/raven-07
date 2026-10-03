import { test, expect } from '@playwright/test';

test('desktop and ultrawide resizing maximize the viewport without recreating gameplay', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForSelector('canvas');

  const assertCanvasFit = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    const box = await page.locator('canvas').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs((box!.width / box!.height) - (16 / 9))).toBeLessThan(0.02);
    const expectedScale = Math.min(width / 640, height / 360);
    expect(box!.width).toBeGreaterThanOrEqual(640 * expectedScale - 3);
    expect(box!.height).toBeGreaterThanOrEqual(360 * expectedScale - 3);
  };

  await assertCanvasFit(1280, 720);
  await assertCanvasFit(1366, 768);
  await assertCanvasFit(1920, 1080);
  await assertCanvasFit(2560, 1440);
  await assertCanvasFit(844, 390);

  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('LevelOneScene') === true;
  })).toBe(true);

  const before = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { resizeMarker?: string };
    scene.resizeMarker = 'same-scene';
    return Boolean(scene.children.getByName('touch-controls'));
  });
  expect(before).toBe(false);

  await page.setViewportSize({ width: 1920, height: 1080 });
  expect(await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { resizeMarker?: string };
    return scene.resizeMarker;
  })).toBe('same-scene');
});

test('fullscreen setting targets the complete game shell', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('MainMenuScene') === true;
  })).toBe(true);

  const gamePoint = await page.evaluate(() => {
    type MenuScene = Phaser.Scene & {
      menuOptions: string[];
      selectedIndex: number;
      select: () => void;
      submenuText: Phaser.GameObjects.Text;
    };
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('MainMenuScene') as MenuScene;
    scene.selectedIndex = scene.menuOptions.indexOf('SETTINGS');
    scene.select();
    const shell = document.getElementById('game-shell')!;
    (window as unknown as { requestedFullscreenTarget?: string }).requestedFullscreenTarget = undefined;
    shell.requestFullscreen = async () => {
      (window as unknown as { requestedFullscreenTarget?: string }).requestedFullscreenTarget = shell.id;
    };
    const bounds = scene.submenuText.getBounds();
    const lineHeight = bounds.height / scene.submenuText.text.split('\n').length;
    return { x: scene.cameras.main.centerX, y: bounds.top + lineHeight * 8.5 };
  });
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(
    canvas!.x + gamePoint.x / 640 * canvas!.width,
    canvas!.y + gamePoint.y / 360 * canvas!.height,
  );

  await expect.poll(async () => page.evaluate(() =>
    (window as unknown as { requestedFullscreenTarget?: string }).requestedFullscreenTarget,
  )).toBe('game-shell');
});
