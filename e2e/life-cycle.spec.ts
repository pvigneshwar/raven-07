import { expect, test } from '@playwright/test';

async function startLevel(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & { introActive: boolean };
    return game.scene.isActive('LevelOneScene') && !level.introActive;
  });
}

async function killPlayer(page: import('@playwright/test').Page): Promise<{ lives: number; hp: number }> {
  return page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & {
          takeDamage: (damage: number) => boolean; getLives: () => number; getHp: () => number;
        };
      };
    level.player.takeDamage(999);
    // Same-frame overlapping damage must not spend another life.
    level.player.takeDamage(999);
    return { lives: level.player.getLives(), hp: level.player.getHp() };
  });
}

test('one death spends exactly one life and checkpoint respawn restores HP', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startLevel(page);
  expect(await killPlayer(page)).toEqual({ lives: 2, hp: 0 });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: { getHp: () => number; getLives: () => number };
      };
    return level.player.getHp() === 3 && level.player.getLives() === 2;
  }, undefined, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('zero lives triggers one Game Over and Retry starts a clean run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startLevel(page);
  for (const expectedLives of [2, 1]) {
    const death = await killPlayer(page);
    expect(death.lives).toBe(expectedLives);
    await page.waitForFunction((lives) => {
      const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
        .getScene('LevelOneScene') as Phaser.Scene & {
          player: { getHp: () => number; getLives: () => number };
        };
      return level.player.getHp() === 3 && level.player.getLives() === lives;
    }, expectedLives, { timeout: 5000 });
    // Wait out spawn invulnerability before the next deliberate fatal hit.
    await page.waitForTimeout(1600);
  }
  expect(await killPlayer(page)).toEqual({ lives: 0, hp: 0 });
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('GameOverScene'), undefined, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } })
    .raven07.scene.isActive('LevelOneScene'));
  const fresh = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: { getHp: () => number; getLives: () => number };
        enemyBulletGroup: Phaser.Physics.Arcade.Group;
        currentCheckpoint: number;
      };
    return { hp: level.player.getHp(), lives: level.player.getLives(),
      bullets: level.enemyBulletGroup.countActive(), checkpoint: level.currentCheckpoint };
  });
  expect(fresh).toEqual({ hp: 3, lives: 3, bullets: 0, checkpoint: -1 });
  expect(errors).toEqual([]);
});

test('dying during a boss attack clears hostile shots without a second life loss', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startLevel(page);
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        spawnBoss: () => void;
        player: Phaser.Physics.Arcade.Sprite & { invincible: boolean };
      };
    level.player.setPosition(12300, 340);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(12300, 340);
    level.player.invincible = true;
    level.spawnBoss();
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { boss: { getDebugInfo: () => string } };
    return level.boss?.getDebugInfo().includes('ATTACKING');
  }, undefined, { timeout: 18000 });
  const state = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: { takeDamage: (damage: number) => void; getLives: () => number; invincible: boolean };
        enemyBulletGroup: Phaser.Physics.Arcade.Group;
      };
    level.player.invincible = false;
    level.player.takeDamage(999);
    level.player.takeDamage(999);
    return { lives: level.player.getLives(), bullets: level.enemyBulletGroup.countActive() };
  });
  expect(state).toEqual({ lives: 2, bullets: 0 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: { getLives: () => number };
        enemyBulletGroup: Phaser.Physics.Arcade.Group;
      };
    return { lives: level.player.getLives(), bullets: level.enemyBulletGroup.countActive() };
  });
  expect(after).toEqual({ lives: 2, bullets: 0 });
  expect(errors).toEqual([]);
});

test('pause checkpoint and level restarts restore the intended run state', async ({ page }) => {
  test.setTimeout(50000);
  await startLevel(page);
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        checkpoints: Phaser.GameObjects.Zone[];
        handleCheckpoint: (zone: Phaser.GameObjects.Zone) => void;
        pauseMenu: { options: Array<{ text: string; action: () => void }> };
      };
    level.handleCheckpoint(level.checkpoints[0]);
    level.pauseMenu.options.find((option) => option.text === 'RESTART CHECKPOINT')!.action();
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite;
        currentCheckpoint: number;
      };
    return level.player?.x === 2400 && level.currentCheckpoint === 0;
  });
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        pauseMenu: { options: Array<{ text: string; action: () => void }> };
      };
    level.pauseMenu.options.find((option) => option.text === 'RESTART LEVEL')!.action();
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { getLives: () => number };
        currentCheckpoint: number;
      };
    return level.player?.x === 100 && level.player.getLives() === 3 && level.currentCheckpoint === -1;
  });
});
