import { test, expect } from '@playwright/test';

test('ground enemies remain on their spawn platform while patrolling', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner?: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    return (level?.enemySpawner?.getEnemyGroup().getChildren().length ?? 0) >= 2;
  });

  // Give the initial patrol pair enough time to reach both platform edges
  // more than once. This caught the original walk-off-and-fall regression.
  await page.waitForTimeout(9000);

  const enemies = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };

    return level.enemySpawner.getEnemyGroup().getChildren().map((object) => {
      const enemy = object as Phaser.Physics.Arcade.Sprite & {
        getType: () => string;
        supportSurface?: { left: number; right: number; top: number };
      };
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      return {
        type: enemy.getType(),
        x: enemy.x,
        bodyBottom: body.bottom,
        support: enemy.supportSurface ?? null,
      };
    });
  });

  expect(enemies).toHaveLength(2);
  for (const enemy of enemies) {
    expect(enemy.support, `${enemy.type} never acquired a support platform`).not.toBeNull();
    expect(enemy.x).toBeGreaterThanOrEqual(enemy.support!.left);
    expect(enemy.x).toBeLessThanOrEqual(enemy.support!.right);
    expect(Math.abs(enemy.bodyBottom - enemy.support!.top)).toBeLessThanOrEqual(8);
  }
});
