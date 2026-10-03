import { test, expect } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 844, height: 390 },
});

test('mobile twin-stick controls support movement, aim/fire, and jump', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.keyboard.press('Enter');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game?.scene.getScene('LevelOneScene');
    return scene?.children.getByName('touch-controls')?.active === true;
  })).toBe(true);

  const states = await page.evaluate(() => {
    type TestPointer = { id: number; x: number; y: number; wasTouch: boolean };
    type Controls = {
      onPointerDown: (pointer: TestPointer) => void;
      onPointerUp: (pointer: TestPointer) => void;
    };
    type Manager = {
      touchControls: Controls;
      getInputState: () => { right: boolean; jump: boolean };
      getShootInput: () => boolean;
      getAimDirection: (x: number, y: number, camera: Phaser.Cameras.Scene2D.Camera) => { x: number; y: number };
    };
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { inputManager: Manager };
    const manager = scene.inputManager;

    const move = { id: 10, x: 112, y: 286, wasTouch: true };
    manager.touchControls.onPointerDown(move);
    const movement = manager.getInputState();

    const aim = { id: 11, x: 598, y: 256, wasTouch: true };
    manager.touchControls.onPointerDown(aim);
    const shooting = manager.getShootInput();
    const direction = manager.getAimDirection(0, 0, scene.cameras.main);

    const jump = { id: 12, x: 500, y: 213, wasTouch: true };
    manager.touchControls.onPointerDown(jump);
    const jumping = manager.getInputState();

    manager.touchControls.onPointerUp(move);
    manager.touchControls.onPointerUp(aim);
    manager.touchControls.onPointerUp(jump);
    return { movement, shooting, direction, jumping };
  });

  expect(states.movement.right).toBe(true);
  expect(states.shooting).toBe(true);
  expect(states.direction.x).toBeGreaterThan(0.6);
  expect(states.direction.y).toBeLessThan(-0.6);
  expect(states.jumping.jump).toBe(true);
});
