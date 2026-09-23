import { test, expect } from '@playwright/test';

test('final boss spawns with its feet on the arena and stays above ground', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } })
    .raven07?.scene?.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as (Phaser.Scene & {
      player?: Phaser.Physics.Arcade.Sprite;
    }) | undefined;
    return !!game?.scene?.isActive('LevelOneScene') && !!level?.player;
  });

  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite;
    };
    level.player.setPosition(10450, 300);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(10450, 300);
  });

  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07?.scene?.getScene('LevelOneScene') as Phaser.Scene & {
      boss?: { active: boolean };
    };
    return level?.boss?.active === true;
  });
  await page.waitForTimeout(500);

  const readBoss = () => page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: Phaser.Physics.Arcade.Sprite & { getBodyParts: () => Phaser.GameObjects.Sprite[] };
      getPlatforms: () => Phaser.Physics.Arcade.StaticGroup;
    };
    const boss = level.boss;
    const platformTops = level.getPlatforms().getChildren()
      .map((object) => (object as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody)
      .filter((body) => boss.x >= body.left && boss.x <= body.right)
      .map((body) => body.top);
    const platformTop = platformTops.reduce((closest, top) =>
      Math.abs(top - (boss.y + 80)) < Math.abs(closest - (boss.y + 80)) ? top : closest,
    );
    return {
      x: boss.x,
      y: boss.y,
      platformTop,
      feetBottom: Math.max(...boss.getBodyParts().map((part) => part.getBounds().bottom)),
      allowGravity: (boss.body as Phaser.Physics.Arcade.Body).allowGravity,
    };
  });

  const initial = await readBoss();
  expect(initial.allowGravity).toBe(false);
  expect(Math.abs(initial.feetBottom - initial.platformTop)).toBeLessThanOrEqual(1);

  await page.waitForTimeout(3000);
  const later = await readBoss();
  expect(later.y).toBeCloseTo(initial.y, 1);
  expect(later.feetBottom).toBeLessThanOrEqual(later.platformTop + 1);
  expect(later.x).toBeGreaterThanOrEqual(10000);
  expect(later.x).toBeLessThanOrEqual(13008);
});
