import { test, expect } from '@playwright/test';

test('engaged enemies approach while shooting without bullet-hit errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner?: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    return (level?.enemySpawner?.getEnemyGroup().getChildren().length ?? 0) >= 2;
  });

  const initial = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite;
      enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    const player = level.player;
    player.setPosition(1500, 300);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    playerBody.reset(1500, 300);
    playerBody.setAllowGravity(false);

    return level.enemySpawner.getEnemyGroup().getChildren().map((object) => ({
      x: (object as Phaser.Physics.Arcade.Sprite).x,
    }));
  });

  await page.waitForTimeout(400);

  const engaged = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
      enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
    };
    return level.enemySpawner.getEnemyGroup().getChildren().map((object) => {
      const enemy = object as Phaser.Physics.Arcade.Sprite & {
        aiState: string;
        attackCooldown: number;
      };
      return { x: enemy.x, state: enemy.aiState, cooldown: enemy.attackCooldown };
    });
  });

  // Entering encounter 1 also queues its configured reinforcement copies;
  // verify the original pair captured above.
  for (let index = 0; index < initial.length; index++) {
    expect(Math.abs(engaged[index].x - 1500)).toBeLessThan(Math.abs(initial[index].x - 1500));
    expect(engaged[index].state).toBe('CHASE');
    expect(engaged[index].cooldown).toBeGreaterThan(0);
  }

  // Let several projectiles overlap the player. The former implementation
  // threw here because physics.add.existing(Sprite) does not add the
  // Arcade.Sprite.disableBody method to that ordinary Sprite instance.
  await page.waitForTimeout(2500);
  expect(pageErrors).toEqual([]);
});
