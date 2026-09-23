import { test, expect } from '@playwright/test';

test('boss runs intro, weak-point combat, phases, reset-safe death sequence', async ({ page }) => {
  test.setTimeout(45000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

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
      boss?: { getBossState: () => string };
    };
    return level?.boss?.getBossState() === 'INTRO';
  });

  const intro = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getBossState: () => string; getHp: () => number; getMaxHp: () => number; takeDamage: (damage: number) => boolean };
    };
    return {
      state: level.boss.getBossState(),
      hp: level.boss.getHp(),
      maxHp: level.boss.getMaxHp(),
      acceptedDamage: level.boss.takeDamage(10),
    };
  });
  expect(intro).toEqual({ state: 'INTRO', hp: 120, maxHp: 120, acceptedDamage: false });

  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getBossState: () => string };
    };
    return ['IDLE', 'TARGETING', 'ATTACKING', 'RECOVERY'].includes(level.boss.getBossState());
  }, undefined, { timeout: 12000 });

  const hpBeforeShot = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      player: Phaser.Physics.Arcade.Sprite & { getWeaponManager: () => { fire: (x: number, y: number, aim: { x: number; y: number; isUp: boolean; isDown: boolean }, facing: 'left' | 'right') => void } };
      boss: Phaser.Physics.Arcade.Sprite & { getHp: () => number };
    };
    const { player, boss } = level;
    player.setPosition(boss.x - 100, boss.y + 10);
    (player.body as Phaser.Physics.Arcade.Body).reset(boss.x - 100, boss.y + 10);
    player.getWeaponManager().fire(player.x, player.y, { x: 1, y: 0, isUp: false, isDown: false }, 'right');
    return boss.getHp();
  });
  await page.waitForTimeout(500);
  const hpAfterShot = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getHp: () => number };
    };
    return level.boss.getHp();
  });
  expect(hpAfterShot).toBeLessThan(hpBeforeShot);

  const weakPointResult = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { damageWeakPoint: (id: string, damage: number) => boolean; getWeakPointHealth: () => Record<string, number>; getWeakPointSprites: () => Phaser.GameObjects.Sprite[] };
    };
    level.boss.damageWeakPoint('left_cannon', 30);
    return {
      health: level.boss.getWeakPointHealth().left_cannon,
      stillTargetable: level.boss.getWeakPointSprites().some((sprite) => sprite.getData('weakPointId') === 'left_cannon'),
    };
  });
  expect(weakPointResult).toEqual({ health: 0, stillTargetable: false });

  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { takeDamage: (damage: number) => boolean };
    };
    level.boss.takeDamage(55);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getPhase: () => number };
    };
    return level.boss.getPhase() >= 1;
  }, undefined, { timeout: 6000 });

  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getBossState: () => string };
    };
    return ['IDLE', 'TARGETING', 'ATTACKING', 'RECOVERY'].includes(level.boss.getBossState());
  }, undefined, { timeout: 4000 });

  await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { takeDamage: (damage: number) => boolean };
    };
    level.boss.takeDamage(60);
  });
  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getPhase: () => number };
    };
    return level.boss.getPhase() === 2;
  }, undefined, { timeout: 6000 });

  await page.waitForFunction(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { getBossState: () => string };
    };
    return level.boss.getBossState() === 'ENRAGED';
  }, undefined, { timeout: 4000 });

  const deathState = await page.evaluate(() => {
    const level = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07.scene.getScene('LevelOneScene') as Phaser.Scene & {
      boss: { takeDamage: (damage: number) => boolean; getBossState: () => string };
    };
    level.boss.takeDamage(999);
    return level.boss.getBossState();
  });
  expect(deathState).toBe('DYING');
  await page.waitForTimeout(600);
  expect(runtimeErrors).toEqual([]);
});
