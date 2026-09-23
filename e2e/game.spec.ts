import { test, expect, chromium } from '@playwright/test';

test.describe('RAVEN-07: SHADOW STRIKE', () => {
  test('Game loads and launches in browser', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    test.setTimeout(30000);

    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Check for Phaser startup
    const bootMessages = consoleMessages.filter((m) => m.includes('Phaser v3'));
    expect(bootMessages.length).toBeGreaterThan(0);

    // Check assets generated
    const assetMessage = consoleMessages.find((m) => m.includes('Assets generated'));
    expect(assetMessage).toBeDefined();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/game-initial-load.png', fullPage: true });

    // Verify no critical errors (audio context warnings are expected)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('AudioContext') &&
      !err.includes('ReadPixels')
    );

    console.log('Critical errors:', criticalErrors);
    expect(criticalErrors.length).toBe(0);
  });

  test('Game can start from main menu', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    test.setTimeout(30000);

    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Click anywhere or press Enter to start
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Take screenshot after starting
    await page.screenshot({ path: 'e2e/screenshots/menu-started.png', fullPage: true });

    // Filter non-critical errors
    const criticalErrors = errors.filter(
      (err) => !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('AudioContext') &&
      !err.includes('ReadPixels')
    );

    console.log('START MENU errors:', criticalErrors);
    expect(criticalErrors.length).toBe(0);
  });

  test('Player can move and jump', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    test.setTimeout(30000);

    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Try to move and jump
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');

    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Try shooting
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyJ');

    await page.waitForTimeout(2000);

    // Take screenshot of gameplay
    await page.screenshot({ path: 'e2e/screenshots/gameplay-test.png', fullPage: true });

    // Verify no critical errors during gameplay
    const criticalErrors = errors.filter(
      (err) => !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('AudioContext') &&
      !err.includes('ReadPixels')
    );

    console.log('MOVE/JUMP errors:', criticalErrors);
    expect(criticalErrors.length).toBe(0);
  });

  test('Pause menu works', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Toggle pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/pause-menu.png', fullPage: true });

    // Resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});
