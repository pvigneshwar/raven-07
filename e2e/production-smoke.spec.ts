import { expect, test } from '@playwright/test';

test('built production game starts, moves and keeps debug internals private', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  expect(await page.evaluate(() => 'raven07' in window)).toBe(false);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  await expect(canvas).toBeVisible();
  expect(errors).toEqual([]);
});
