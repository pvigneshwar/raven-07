import { expect, test } from '@playwright/test';

test('difficulty, effects, hints and vibration settings persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  const first = await page.evaluate(() => {
    const menu = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('MainMenuScene') as Phaser.Scene & {
        showSettings: () => void; adjustSetting: (delta: number) => void;
        confirmSetting: () => void; settingsIndex: number; submenuText: Phaser.GameObjects.Text;
      };
    menu.showSettings();
    menu.settingsIndex = 7; menu.adjustSetting(0.1);
    menu.settingsIndex = 8; menu.adjustSetting(-0.1);
    menu.settingsIndex = 9; menu.confirmSetting();
    menu.settingsIndex = 10; menu.confirmSetting();
    return menu.submenuText.text;
  });
  expect(first).toContain('DIFFICULTY     [HARD]');
  expect(first).toContain('EFFECTS        [LOW]');
  expect(first).toContain('TUTORIAL HINTS [OFF]');
  expect(first).toContain('VIBRATION      [ON]');
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  const restored = await page.evaluate(() => {
    const menu = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('MainMenuScene') as Phaser.Scene & {
        showSettings: () => void; submenuText: Phaser.GameObjects.Text;
      };
    menu.showSettings();
    return menu.submenuText.text;
  });
  expect(restored).toContain('DIFFICULTY     [HARD]');
  expect(restored).toContain('EFFECTS        [LOW]');
  expect(restored).toContain('TUTORIAL HINTS [OFF]');
  expect(restored).toContain('VIBRATION      [ON]');
  expect(errors).toEqual([]);
});
