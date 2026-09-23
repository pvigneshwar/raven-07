import { test, expect } from '@playwright/test';

type TerrainScene = Phaser.Scene & {
  player: Phaser.Physics.Arcade.Sprite & {
    resetTerrainState: () => void;
    getCurrentGround: () => Phaser.GameObjects.GameObject | null;
    getPlayerState: () => string;
  };
  platforms: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: Array<{ sprite: Phaser.Physics.Arcade.Sprite }>;
  introActive: boolean;
};

async function startLevel(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } })
    .raven07?.scene?.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    return !!game?.scene?.getScene('LevelOneScene');
  });
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as TerrainScene;
    return game.scene.isActive('LevelOneScene') && level.introActive === false
      && !!level.platforms && !!level.player;
  }, undefined, { timeout: 6000 });
}

test.beforeEach(async ({ page }) => startLevel(page));

test('moving platform collision bounds match the visible platforms throughout travel', async ({ page }) => {
  for (let sample = 0; sample < 3; sample++) {
    const platforms = await page.evaluate(() => {
      const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
      return level.movingPlatforms.map(({ sprite }) => {
        const visible = sprite.getBounds();
        const body = sprite.body as Phaser.Physics.Arcade.Body;
        return { id: sprite.getData('terrainId') as string,
          visible: { left: visible.left, right: visible.right, top: visible.top, bottom: visible.bottom },
          collision: { left: body.left, right: body.right, top: body.top, bottom: body.bottom } };
      });
    });
    expect(platforms).toHaveLength(3);
    for (const { id, visible, collision } of platforms) {
      for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
        expect(Math.abs(visible[edge] - collision[edge]), `${id} ${edge} at sample ${sample}`).toBeLessThanOrEqual(2);
      }
    }
    await page.waitForTimeout(500);
  }
});

test('terrain uses merged ground and one collider per raised platform', async ({ page }) => {
  const terrain = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.platforms.getChildren().map((object) => ({
      id: object.getData('terrainId') as string,
      type: object.getData('terrainType') as string,
      width: (object.body as Phaser.Physics.Arcade.StaticBody).width,
    }));
  });
  expect(terrain.filter((item) => item.type === 'solid-ground')).toHaveLength(2);
  expect(terrain.filter((item) => item.type === 'one-way-platform')).toHaveLength(35);
  expect(new Set(terrain.map((item) => item.id)).size).toBe(terrain.length);
  expect(terrain.find((item) => item.id === 'ground_west')?.width).toBe(3750);
});

test('player passes platform sides, jumps through, lands, and drops through', async ({ page }) => {
  const platform = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const terrain = level.platforms.getChildren().find((item) => item.getData('terrainId') === 'platform_19')!;
    const terrainBody = terrain.body as Phaser.Physics.Arcade.StaticBody;
    const playerBody = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    level.player.setPosition(terrainBody.left - 30, terrainBody.top + 10);
    playerBody.reset(level.player.x, level.player.y);
    playerBody.setAllowGravity(false).setVelocity(0, 0);
    return { left: terrainBody.left, right: terrainBody.right, top: terrainBody.top, bottom: terrainBody.bottom };
  });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const afterSide = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.x;
  });
  // Crossing well inside the platform bounds proves its left face did not
  // resolve as a wall; clearing the full width is input-duration dependent.
  expect(afterSide).toBeGreaterThan(platform.left + 20);

  await page.keyboard.down('Space');
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const terrain = level.platforms.getChildren().find((item) => item.getData('terrainId') === 'platform_19')!;
    const terrainBody = terrain.body as Phaser.Physics.Arcade.StaticBody;
    const playerBody = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    level.player.setPosition((terrainBody.left + terrainBody.right) / 2, terrainBody.bottom + 45);
    playerBody.reset(level.player.x, level.player.y);
    playerBody.setAllowGravity(true).setVelocityY(-550);
  });
  await page.waitForTimeout(500);
  await page.keyboard.up('Space');
  await page.waitForTimeout(1000);
  const landed = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    const ground = level.player.getCurrentGround();
    return { id: ground?.getData('terrainId') ?? null, feet: body.bottom,
      top: ground?.body ? (ground.body as Phaser.Physics.Arcade.StaticBody).top : null };
  });
  expect(landed.id).toBe('platform_19');
  expect(landed.top).not.toBeNull();
  expect(Math.abs(landed.feet - landed.top!)).toBeLessThanOrEqual(2);

  await page.keyboard.down('KeyS');
  await page.keyboard.press('Space');
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(450);
  const dropped = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return { y: level.player.y, ground: level.player.getCurrentGround()?.getData('terrainId') ?? null };
  });
  expect(dropped.y).toBeGreaterThan(platform.bottom);
  expect(dropped.ground).not.toBe('platform_19');
});

test('moving platform carries its rider without permanent attachment', async ({ page }) => {
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const platform = level.movingPlatforms[0].sprite;
    const platformBody = platform.body as Phaser.Physics.Arcade.Body;
    const playerBody = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    // Isolate platform carry from the armed encounter beside this lift.
    (level.player as unknown as { invincible: boolean; invincibleTimer: number }).invincible = true;
    (level.player as unknown as { invincible: boolean; invincibleTimer: number }).invincibleTimer = 10000;
    const footOffset = playerBody.bottom - level.player.y;
    level.player.setPosition(platform.x, platformBody.top - footOffset);
    playerBody.reset(level.player.x, level.player.y);
    playerBody.setAllowGravity(true).setVelocity(0, 0);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.getCurrentGround()?.getData('terrainId') === 'moving_horizontal';
  });
  const before = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.x - level.movingPlatforms[0].sprite.x;
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.x - level.movingPlatforms[0].sprite.x;
  });
  expect(Math.abs(after - before)).toBeLessThan(16);

  await page.keyboard.down('Space');
  await page.waitForTimeout(180);
  await page.keyboard.up('Space');
  const jumped = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    const platformBody = level.movingPlatforms[0].sprite.body as Phaser.Physics.Arcade.Body;
    return { feet: body.bottom, platformTop: platformBody.top,
      ground: level.player.getCurrentGround()?.getData('terrainId') ?? null };
  });
  expect(jumped.feet).toBeLessThan(jumped.platformTop - 10);
  expect(jumped.ground).not.toBe('moving_horizontal');
});

test('vertical lift carries the player and Down + Jump releases it', async ({ page }) => {
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const platform = level.movingPlatforms[1].sprite;
    const platformBody = platform.body as Phaser.Physics.Arcade.Body;
    const playerBody = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    (level.player as unknown as { invincible: boolean; invincibleTimer: number }).invincible = true;
    (level.player as unknown as { invincible: boolean; invincibleTimer: number }).invincibleTimer = 10000;
    const footOffset = playerBody.bottom - level.player.y;
    level.player.setPosition(platform.x, platformBody.top - footOffset);
    playerBody.reset(level.player.x, level.player.y);
    playerBody.setAllowGravity(true).setVelocity(0, 0);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.getCurrentGround()?.getData('terrainId') === 'moving_vertical';
  });
  const before = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.y - level.movingPlatforms[1].sprite.y;
  });
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.y - level.movingPlatforms[1].sprite.y;
  });
  expect(Math.abs(after - before)).toBeLessThan(8);

  await page.keyboard.down('KeyS');
  await page.keyboard.press('Space');
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(400);
  const dropped = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    const platformBody = level.movingPlatforms[1].sprite.body as Phaser.Physics.Arcade.Body;
    return { top: body.top, platformBottom: platformBody.bottom,
      ground: level.player.getCurrentGround()?.getData('terrainId') ?? null };
  });
  expect(dropped.top).toBeGreaterThan(dropped.platformBottom);
  expect(dropped.ground).not.toBe('moving_vertical');
});

test('high-speed fall uses the swept top check instead of tunneling', async ({ page }) => {
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const terrain = level.platforms.getChildren().find((item) => item.getData('terrainId') === 'platform_08')!;
    const terrainBody = terrain.body as Phaser.Physics.Arcade.StaticBody;
    const playerBody = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    level.player.setPosition((terrainBody.left + terrainBody.right) / 2, terrainBody.top - 130);
    playerBody.reset(level.player.x, level.player.y);
    playerBody.setAllowGravity(true).setVelocity(0, 600);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.getCurrentGround()?.getData('terrainId') === 'platform_08';
  }, undefined, { timeout: 1500 });
  const gap = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    return Math.abs(body.bottom - (level.player.getCurrentGround()!.body as Phaser.Physics.Arcade.StaticBody).top);
  });
  expect(gap).toBeLessThanOrEqual(2);
});

test('pit is a real gap and crossing the kill boundary triggers death', async ({ page }) => {
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    level.player.resetTerrainState();
    level.player.setPosition(3800, 390);
    body.reset(3800, 390);
    body.setAllowGravity(true).setVelocity(0, 100);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as TerrainScene;
    return level.player.getPlayerState() === 'death';
  }, undefined, { timeout: 2500 });
});
