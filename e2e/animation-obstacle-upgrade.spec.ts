import { test, expect } from '@playwright/test';

async function startLevel(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } })
    .raven07?.scene?.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as (Phaser.Scene & {
      introActive: boolean; player?: Phaser.Physics.Arcade.Sprite;
    }) | undefined;
    return !!game?.scene?.isActive('LevelOneScene') && !!level?.player && !level.introActive;
  }, undefined, { timeout: 10000 });
}

test('player art stays grounded and legacy collider sprite stays hidden after respawn', async ({ page }) => {
  await startLevel(page);
  const state = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & {
          characterArt: Phaser.GameObjects.Image;
          respawnAtCheckpoint: () => void;
        };
        handlePlayerRespawn: () => void;
      };
    level.player.respawnAtCheckpoint();
    level.handlePlayerRespawn();
    level.player.preUpdate(level.time.now, 16);
    const art = level.player.characterArt;
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    return { rigVisible: level.player.visible, artKey: art.texture.key,
      originY: art.originY, artWidth: art.displayWidth, artHeight: art.displayHeight,
      footGap: Math.abs(art.y - body.bottom) };
  });
  expect(state.rigVisible).toBe(false);
  expect(state.artKey).toMatch(/^art_player_/);
  expect(state.originY).toBe(1);
  expect(state.artWidth).toBe(32);
  expect(state.artHeight).toBe(36);
  expect(state.footGap).toBeLessThanOrEqual(1);
});

test('player passes cover sides and an actual shot removes a crate collider', async ({ page }) => {
  await startLevel(page);
  const crateX = 2600;
  await page.evaluate((x) => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { resetTerrainState: () => void };
      };
    level.player.resetTerrainState();
    level.player.setPosition(x - 72, 380);
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    body.reset(level.player.x, level.player.y);
    body.setAllowGravity(false).setVelocity(0, 0);
  }, crateX);
  await page.keyboard.down('KeyD');
  await page.waitForFunction((x) => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { player: Phaser.Physics.Arcade.Sprite };
    return level.player.x > x + 5;
  }, crateX, { timeout: 2500 });
  await page.keyboard.up('KeyD');

  await page.evaluate((x) => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { getWeaponManager: () => {
          fire: (x: number, y: number, aim: { x: number; y: number; isUp: boolean; isDown: boolean },
            facing: 'left' | 'right') => void;
        } };
      };
    level.player.getWeaponManager().fire(x - 75, 390,
      { x: 1, y: 0, isUp: false, isDown: false }, 'right');
  }, crateX);
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { obstacles: Phaser.Physics.Arcade.StaticGroup };
    const crate = level.obstacles.getChildren().find((child) => child.getData('obstacleId') === 'jungle_crate');
    return !crate || !crate.active;
  }, undefined, { timeout: 1500 });
});

test('cover, destructible crates, checkpoints and timed hazards are functional', async ({ page }) => {
  await startLevel(page);
  const state = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        obstacles: Phaser.Physics.Arcade.StaticGroup;
        hazardFields: Array<{ sprite: Phaser.GameObjects.TileSprite }>;
        checkpoints: Phaser.GameObjects.Zone[];
        checkpointVisuals: Phaser.GameObjects.Sprite[];
        currentCheckpoint: number;
        handleCheckpoint: (zone: Phaser.GameObjects.Zone) => void;
        updateHazards: (time: number) => void;
        handleObstacleShot: (bullet: Phaser.GameObjects.Sprite, obstacle: Phaser.GameObjects.Sprite) => void;
      };
    const obstacles = level.obstacles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const crate = obstacles.find((item) => item.getData('obstacleId') === 'jungle_crate')!;
    const bullet = level.physics.add.sprite(crate.x, crate.y, 'bullet_player');
    level.handleObstacleShot(bullet, crate);
    const destroyed = !crate.active && !(crate.body as Phaser.Physics.Arcade.StaticBody).enable && !bullet.active;
    level.updateHazards(100);
    const hazardOn = level.hazardFields.every(({ sprite }) => (sprite.body as Phaser.Physics.Arcade.StaticBody).enable);
    level.updateHazards(2000);
    const electricOff = !(level.hazardFields[0].sprite.body as Phaser.Physics.Arcade.StaticBody).enable;
    level.handleCheckpoint(level.checkpoints[0]);
    return { obstacleCount: obstacles.length, destroyed, hazardOn, electricOff,
      checkpoint: level.currentCheckpoint, beacon: level.checkpointVisuals[0].texture.key };
  });
  expect(state).toEqual({ obstacleCount: 8, destroyed: true, hazardOn: true,
    electricOff: true, checkpoint: 0, beacon: 'checkpoint_active' });
});

test('cover blocks sight and an energized floor damages the player', async ({ page }) => {
  await startLevel(page);
  const sight = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite;
        enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group; setEnabled: (enabled: boolean) => void };
        obstacles: Phaser.Physics.Arcade.StaticGroup;
      };
    level.enemySpawner.setEnabled(false);
    const enemy = level.enemySpawner.getEnemyGroup().getChildren()[0] as Phaser.Physics.Arcade.Sprite & {
      hasClearLineOfSight: () => boolean;
    };
    const crate = level.obstacles.getChildren().find((item) => item.getData('obstacleId') === 'jungle_crate') as Phaser.Physics.Arcade.Sprite;
    enemy.setPosition(2550, 380);
    (enemy.body as Phaser.Physics.Arcade.Body).reset(enemy.x, enemy.y);
    level.player.setPosition(2650, 380);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(level.player.x, level.player.y);
    const blocked = !enemy.hasClearLineOfSight();
    (crate.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    const clearAfterRemoval = enemy.hasClearLineOfSight();
    return { blocked, clearAfterRemoval };
  });
  expect(sight).toEqual({ blocked: true, clearAfterRemoval: true });

  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { hazardFields: Array<{ sprite: Phaser.GameObjects.TileSprite }> };
    return (level.hazardFields[0].sprite.body as Phaser.Physics.Arcade.StaticBody).enable;
  });
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite;
        hazardFields: Array<{ sprite: Phaser.GameObjects.TileSprite }>;
      };
    const floor = level.hazardFields[0].sprite;
    level.player.setPosition(floor.x, floor.y - 10);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(level.player.x, level.player.y);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { getHp: () => number };
      };
    return level.player.getHp() < 3;
  }, undefined, { timeout: 1500 });
});
