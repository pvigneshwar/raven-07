import { test, expect } from '@playwright/test';

test('sound bank has distinct, bounded music and effects with clean loop edges', async ({ page }) => {
  await page.goto('/');
  const audio = await page.evaluate(async () => {
    const { audioManager } = await import('/src/systems/AudioManager.ts');
    const bank = (audioManager as unknown as { soundCache: Map<string, AudioBuffer> }).soundCache;
    const tracks = ['music_level', 'music_boss', 'music_menu', 'music_game_over', 'music_victory'];
    const effects = ['sfx_rifle', 'sfx_spread', 'sfx_rapid', 'sfx_plasma', 'sfx_rocket', 'sfx_explosion'];
    const inspect = (key: string) => {
      const sound = bank.get(key);
      if (!sound) return null;
      const samples = sound.getChannelData(0);
      let peak = 0;
      let energy = 0;
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
        energy += samples[i] * samples[i];
      }
      return {
        duration: sound.duration,
        peak,
        rms: Math.sqrt(energy / samples.length),
        seam: Math.abs(samples[0] - samples[samples.length - 1]),
        signature: Array.from(samples.slice(3000, 3016)),
      };
    };
    return {
      tracks: Object.fromEntries(tracks.map((key) => [key, inspect(key)])),
      effects: Object.fromEntries(effects.map((key) => [key, inspect(key)])),
    };
  });
  for (const track of Object.values(audio.tracks)) {
    expect(track).not.toBeNull();
    expect(track!.duration).toBeGreaterThan(6);
    expect(track!.peak).toBeLessThanOrEqual(1);
    expect(track!.rms).toBeGreaterThan(0.01);
    expect(track!.seam).toBeLessThan(0.02);
  }
  for (const effect of Object.values(audio.effects)) {
    expect(effect).not.toBeNull();
    expect(effect!.peak).toBeLessThanOrEqual(1);
    expect(effect!.rms).toBeGreaterThan(0.005);
  }
  expect(audio.tracks.music_level!.signature).not.toEqual(audio.tracks.music_boss!.signature);
  expect(audio.tracks.music_menu!.signature).not.toEqual(audio.tracks.music_victory!.signature);
  expect(audio.effects.sfx_rifle!.signature).not.toEqual(audio.effects.sfx_rocket!.signature);
});

test('menu settings persist and audio listeners survive level restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as unknown as { audioStarts: number }).audioStarts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      (window as unknown as { audioStarts: number }).audioStarts++;
      return start.apply(this, args);
    };
  });
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene?.isActive('MainMenuScene');
  });

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const menuSettings = await page.evaluate(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    const menu = game.scene.getScene('MainMenuScene') as Phaser.Scene & {
      settingsVisible: boolean; submenuText: Phaser.GameObjects.Text;
    };
    return { visible: menu.settingsVisible, text: menu.submenuText.text };
  });
  expect(menuSettings.visible).toBe(true);
  expect(menuSettings.text).toContain('SCREEN SHAKE');
  expect(menuSettings.text).toContain('REDUCE FLASHES');

  await page.keyboard.press('ArrowLeft');
  const settings = await page.evaluate(async () => {
    const { SaveManager } = await import('/src/core/SaveManager.ts');
    return SaveManager.getSettings();
  });
  expect(settings.masterVolume).toBeLessThan(0.8);
  await page.keyboard.press('Escape');

  for (let run = 0; run < 2; run++) {
    await page.evaluate(() => {
      const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
      game.scene.start('LevelOneScene');
    });
    await page.waitForFunction(() => {
      const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
      const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
        movingPlatforms: unknown[]; introActive: boolean;
      };
      return game.scene.isActive('LevelOneScene') && level.movingPlatforms?.length === 3 && level.introActive;
    });
    await page.waitForFunction(() => {
      const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
      const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & { introActive: boolean };
      return !level.introActive;
    }, undefined, { timeout: 7000 });
    const beforeShot = await page.evaluate(() => (window as unknown as { audioStarts: number }).audioStarts);
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyJ');
    const afterShot = await page.evaluate(() => (window as unknown as { audioStarts: number }).audioStarts);
    expect(afterShot).toBeGreaterThan(beforeShot);
    if (run === 0) {
      await page.evaluate(() => {
        const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
        const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
          player: Phaser.Physics.Arcade.Sprite; industrialBackground: Phaser.GameObjects.Image;
        };
        level.player.setPosition(5700, 300);
        (level.player.body as Phaser.Physics.Arcade.Body).reset(5700, 300);
        level.cameras.main.centerOn(5700, 300);
      });
      await page.waitForFunction(() => {
        const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
        const level = game.scene.getScene('LevelOneScene') as Phaser.Scene & {
          industrialBackground: Phaser.GameObjects.Image;
        };
        return level.industrialBackground.alpha === 1;
      });
    }
    await page.evaluate(() => {
      const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
      game.scene.start('MainMenuScene');
    });
    await page.waitForFunction(() => {
      const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
      return game.scene.isActive('MainMenuScene');
    });
  }
  expect(errors).toEqual([]);
});

test('the game remains visible and interactive in a 16:10 viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene?.isActive('MainMenuScene');
  });
  const canvas = page.locator('canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(1280);
  expect(bounds!.height).toBeLessThanOrEqual(800);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as unknown as { raven07: { scene: Phaser.Scenes.SceneManager } }).raven07;
    return game?.scene?.isActive('LevelOneScene');
  });
  expect(errors).toEqual([]);
});
