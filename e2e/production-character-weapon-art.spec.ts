import { test, expect } from '@playwright/test';

async function startLevel(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } })
    .raven07?.scene?.isActive('MainMenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07?: { scene?: Phaser.Scenes.SceneManager } }).raven07;
    const level = game?.scene?.getScene('LevelOneScene') as (Phaser.Scene & { introActive: boolean }) | undefined;
    return !!game?.scene?.isActive('LevelOneScene') && !!level && !level.introActive;
  }, undefined, { timeout: 10000 });
}

test('bundled typography and compact character art render without changing player collision', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startLevel(page);
  const state = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        player: Phaser.Physics.Arcade.Sprite & { characterArt: Phaser.GameObjects.Image };
      };
    const body = level.player.body as Phaser.Physics.Arcade.Body;
    const keys = ['art_player_forward', 'art_player_up', 'art_player_diagonal_up',
      'art_enemy_infantry', 'art_enemy_rifle', 'art_enemy_heavy', 'art_enemy_shield',
      'art_enemy_drone', 'art_enemy_turret', 'art_boss_walker'];
    return {
      fonts: [document.fonts.check('700 24px RavenDisplay'),
        document.fonts.check('500 14px RavenMono')],
      textures: keys.map((key) => ({ key, exists: level.textures.exists(key),
        width: level.textures.get(key).getSourceImage().width })),
      playerArt: level.player.characterArt.texture.key,
      body: { width: body.width, height: body.height },
    };
  });
  expect(state.fonts).toEqual([true, true]);
  expect(state.textures.every((texture) => texture.exists && texture.width <= 256)).toBe(true);
  expect(state.playerArt).toMatch(/^art_player_/);
  expect(state.body).toEqual({ width: 24, height: 28 });
  expect(errors).toEqual([]);
});

test('plasma pierces distinct enemies and rocket splash reaches nearby targets', async ({ page }) => {
  await startLevel(page);
  const result = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        enemySpawner: { getEnemyGroup: () => Phaser.Physics.Arcade.Group };
        handlePlayerBulletHit: (bullet: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) => void;
      };
    const enemies = level.enemySpawner.getEnemyGroup().getChildren()
      .filter((child) => child.active) as Phaser.Physics.Arcade.Sprite[];
    const [first, second] = enemies;
    const plasma = level.physics.add.sprite(first.x, first.y, 'bullet_plasma');
    plasma.setData('damage', 1).setData('weaponType', 'plasma_beam');
    level.handlePlayerBulletHit(plasma, first);
    const afterFirst = plasma.active;
    level.handlePlayerBulletHit(plasma, first);
    const oneTargetOnly = (plasma.getData('piercedEnemies') as Set<unknown>).size === 1;
    level.handlePlayerBulletHit(plasma, second);
    const afterSecond = plasma.active;
    const distinctTargets = (plasma.getData('piercedEnemies') as Set<unknown>).size;
    plasma.destroy();

    const rocket = level.physics.add.sprite(second.x, second.y, 'bullet_rocket');
    rocket.setData('damage', 2).setData('weaponType', 'rocket_launcher');
    first.setPosition(second.x + 20, second.y);
    (first.body as Phaser.Physics.Arcade.Body).reset(first.x, first.y);
    const hpBefore = (first as unknown as { hp: number }).hp;
    level.handlePlayerBulletHit(rocket, second);
    const splashDamaged = (first as unknown as { hp: number }).hp < hpBefore;
    return { enemyCount: enemies.length, afterFirst, afterSecond, oneTargetOnly,
      distinctTargets, splashDamaged };
  });
  expect(result.enemyCount).toBeGreaterThanOrEqual(2);
  expect(result.afterFirst).toBe(true);
  expect(result.afterSecond).toBe(true);
  expect(result.oneTargetOnly).toBe(true);
  expect(result.distinctTargets).toBe(2);
  expect(result.splashDamaged).toBe(true);
});

test('boss artwork follows its collision rig into the arena', async ({ page }) => {
  await startLevel(page);
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { player: Phaser.Physics.Arcade.Sprite };
    level.player.setPosition(10450, 300);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(10450, 300);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { boss?: Phaser.Physics.Arcade.Sprite };
    return Boolean(level.boss?.active);
  });
  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & { player: Phaser.Physics.Arcade.Sprite };
    level.player.setPosition(12180, 300);
    (level.player.body as Phaser.Physics.Arcade.Body).reset(12180, 300);
    level.cameras.main.centerOn(12200, 300);
  });
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene
      .getScene('LevelOneScene') as Phaser.Scene & {
        boss: Phaser.Physics.Arcade.Sprite & { walkerArt: Phaser.GameObjects.Image };
      };
    const art = level.boss.walkerArt;
    return { key: art.texture.key, visible: art.visible, alpha: art.alpha,
      dx: Math.abs(art.x - level.boss.x), dy: Math.abs(art.y - level.boss.y),
      width: art.displayWidth, height: art.displayHeight };
  });
  expect(state.key).toBe('art_boss_walker');
  expect(state.visible).toBe(true);
  expect(state.alpha).toBeGreaterThan(0.5);
  expect(state.dx).toBeLessThan(2);
  expect(state.dy).toBeLessThan(2);
  expect(state.width).toBe(210);
  expect(state.height).toBe(157);
});
