import { test, expect } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 844, height: 390 },
});

test('mobile twin-stick controls support movement, aim/fire, and jump', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas?.height).toBeGreaterThanOrEqual(380);
  expect(canvas?.width).toBeGreaterThanOrEqual(675);
  for (const viewport of [
    { width: 800, height: 400 },
    { width: 867, height: 400 },
    { width: 889, height: 400 },
    { width: 933, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    const fitted = await page.locator('canvas').boundingBox();
    expect(Math.abs((fitted!.width / fitted!.height) - (16 / 9))).toBeLessThan(0.02);
    expect(fitted!.height).toBeGreaterThanOrEqual(397);
  }
  await page.setViewportSize({ width: 844, height: 390 });
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
      getInputState: () => { right: boolean; jump: boolean; switchWeapon: boolean; pause: boolean };
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

    const weaponSwitch = { id: 13, x: 582, y: 72, wasTouch: true };
    manager.touchControls.onPointerDown(weaponSwitch);
    const switching = manager.getInputState();

    const pause = { id: 14, x: 320, y: 24, wasTouch: true };
    manager.touchControls.onPointerDown(pause);
    const pausing = manager.getInputState();

    manager.touchControls.onPointerUp(move);
    manager.touchControls.onPointerUp(aim);
    manager.touchControls.onPointerUp(jump);
    manager.touchControls.onPointerUp(weaponSwitch);
    manager.touchControls.onPointerUp(pause);
    return { movement, shooting, direction, jumping, switching, pausing };
  });

  expect(states.movement.right).toBe(true);
  expect(states.shooting).toBe(true);
  expect(states.direction.x).toBeGreaterThan(0.6);
  expect(states.direction.y).toBeLessThan(-0.6);
  expect(states.jumping.jump).toBe(true);
  expect(states.switching.switchWeapon).toBe(true);
  expect(states.pausing.pause).toBe(true);

  await page.evaluate(() => {
    type PlayerAccess = {
      getWeaponManager: () => {
        pickUpWeapon: (type: string) => void;
        getCurrentWeaponType: () => string;
      };
    };
    type TouchAccess = { onPointerDown: (pointer: { id: number; x: number; y: number; wasTouch: boolean }) => void };
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: PlayerAccess;
      inputManager: { touchControls: TouchAccess };
    };
    scene.player.getWeaponManager().pickUpWeapon('spread_blaster');
    scene.inputManager.touchControls.onPointerDown({ id: 20, x: 582, y: 72, wasTouch: true });
  });
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: { getWeaponManager: () => { getCurrentWeaponType: () => string } };
      hud: { weaponNameText: Phaser.GameObjects.Text };
    };
    return {
      weapon: scene.player.getWeaponManager().getCurrentWeaponType(),
      hud: scene.hud.weaponNameText.text,
    };
  })).toEqual({ weapon: 'pulse_rifle', hud: 'PULSE RIFLE' });
});

test('mobile settings rows respond to taps', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('MainMenuScene') === true;
  })).toBe(true);

  const changed = await page.evaluate(() => {
    type MenuScene = Phaser.Scene & {
      menuOptions: string[];
      selectedIndex: number;
      select: () => void;
      settingsVisible: boolean;
      settingsIndex: number;
      submenuText: Phaser.GameObjects.Text;
      handleSettingsTap: (pointer: { x: number; y: number }) => void;
      cameras: Phaser.Cameras.Scene2D.CameraManager;
    };
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('MainMenuScene') as MenuScene;
    scene.selectedIndex = scene.menuOptions.indexOf('SETTINGS');
    scene.select();
    const wasOpen = scene.settingsVisible;
    const bounds = scene.submenuText.getBounds();
    const lineHeight = bounds.height / scene.submenuText.text.split('\n').length;
    scene.handleSettingsTap({ x: scene.cameras.main.centerX, y: bounds.top + lineHeight * 7.5 });
    return { wasOpen, stayedOpen: scene.settingsVisible, selectedRow: scene.settingsIndex };
  });

  expect(changed.wasOpen).toBe(true);
  expect(changed.stayedOpen).toBe(true);
  expect(changed.selectedRow).toBe(5);
});

test('portrait overlay pauses layout and rotation preserves the active scene', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#rotate-device')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-device')).toBeHidden();
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('MainMenuScene') === true;
  })).toBe(true);

  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game?.scene.getScene('LevelOneScene') as (Phaser.Scene & { viewportMarker?: string }) | undefined;
    if (!scene?.sys.isActive()) return false;
    scene.viewportMarker = 'preserved';
    return true;
  })).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-device')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-device')).toBeHidden();
  expect(await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { viewportMarker?: string };
    return scene.viewportMarker;
  })).toBe('preserved');
});

test('real two-finger run and jump keeps both actions active', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('MainMenuScene') === true;
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('LevelOneScene') === true;
  })).toBe(true);
  await page.waitForTimeout(2500);

  const canvas = await page.locator('canvas').boundingBox();
  const point = (x: number, y: number, id: number) => ({
    x: canvas!.x + x / 640 * canvas!.width,
    y: canvas!.y + y / 360 * canvas!.height,
    id,
  });
  const client = await page.context().newCDPSession(page);
  const moveCenter = point(72, 286, 1);
  const moveRight = point(112, 286, 1);
  const jump = point(500, 213, 2);

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moveCenter] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moveRight] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moveRight, jump] });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite;
      inputManager: { touchControls: { moveStick: { pointerId: number | null }; jumpPointerId: number | null } };
    };
    const body = scene.player.body as Phaser.Physics.Arcade.Body;
    return {
      moving: scene.inputManager.touchControls.moveStick.pointerId !== null && body.velocity.x > 0,
      jumped: scene.inputManager.touchControls.jumpPointerId !== null && body.velocity.y < 0,
    };
  })).toEqual({ moving: true, jumped: true });

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [jump] });
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      inputManager: { touchControls: {
        moveStick: { pointerId: number | null };
        jumpPointerId: number | null;
      } };
    };
    return {
      moving: scene.inputManager.touchControls.moveStick.pointerId !== null,
      jumping: scene.inputManager.touchControls.jumpPointerId !== null,
    };
  })).toEqual({ moving: true, jumping: false });

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [moveRight] });
});

test('pause settings are reachable and tappable on mobile', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('MainMenuScene') === true;
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07?: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene.isActive('LevelOneScene') === true;
  })).toBe(true);

  const canvas = await page.locator('canvas').boundingBox();
  const tapGame = async (x: number, y: number) => page.touchscreen.tap(
    canvas!.x + x / 640 * canvas!.width,
    canvas!.y + y / 360 * canvas!.height,
  );
  await tapGame(320, 24);
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { pauseMenu: { isVisible: boolean } };
    return scene.pauseMenu.isVisible;
  })).toBe(true);

  await tapGame(320, 300);
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      pauseMenu: { settingsVisible: boolean; settingsText: Phaser.GameObjects.Text };
    };
    return scene.pauseMenu.settingsVisible && scene.pauseMenu.settingsText.visible;
  })).toBe(true);

  const rowPoint = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      pauseMenu: { settingsText: Phaser.GameObjects.Text };
    };
    const text = scene.pauseMenu.settingsText;
    const bounds = text.getBounds();
    const lineHeight = bounds.height / text.text.split('\n').length;
    return { x: scene.cameras.main.centerX, y: bounds.top + lineHeight * 7.5 };
  });
  await tapGame(rowPoint.x, rowPoint.y);
  expect(await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const scene = game.scene.getScene('LevelOneScene') as Phaser.Scene & { pauseMenu: { settingsIndex: number } };
    return scene.pauseMenu.settingsIndex;
  })).toBe(5);
});
