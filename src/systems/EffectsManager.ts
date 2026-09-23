/**
 * EffectsManager - Manages particle effects, screen effects, and visual feedback.
 */

import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { GAME_CONFIG } from '../config/gameConfig';
import { SaveManager } from '../core/SaveManager';
import { FONT } from '../ui/Typography';

export class EffectsManager {
  private scene: Phaser.Scene;
  private particleGroups: Map<string, Phaser.Physics.Arcade.Group>;
  private screenFlash: Phaser.GameObjects.Rectangle | null = null;
  private flashAlpha: number = 0;
  private flashColor: number = 0;
  private flashDuration: number = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private activeParticles = 0;
  private effectPool: Phaser.GameObjects.Sprite[] = [];
  private get maxParticles(): number { return SaveManager.getSettings().effectsQuality === 'low' ? 36 : 96; }

  private acquireEffect(x: number, y: number, texture: string): Phaser.GameObjects.Sprite {
    const sprite = this.effectPool.pop() ?? this.scene.add.sprite(x, y, texture);
    return sprite.setTexture(texture).setPosition(x, y).setActive(true).setVisible(true)
      .setAlpha(1).setScale(1).setRotation(0).setFlipX(false).clearTint();
  }

  private releaseEffect(sprite: Phaser.GameObjects.Sprite): void {
    if (!sprite.scene) return;
    sprite.stop().setActive(false).setVisible(false);
    if (this.effectPool.length < 128) this.effectPool.push(sprite);
    else sprite.destroy();
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particleGroups = new Map();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventUnsubscribers.push(EventBus.on(Events.PARTICLE_EMIT, (type: string, x: number, y: number, params?: Record<string, unknown>) => {
      this.emitParticles(type, x, y, params);
    }));

    this.eventUnsubscribers.push(EventBus.on(Events.EXPLOSION, (x: number, y: number, radius: number) => {
      this.createExplosion(x, y, radius);
    }));

    this.eventUnsubscribers.push(EventBus.on(Events.CAMERA_SHAKE, (intensity: number, duration: number) => {
      this.shakeCamera(intensity, duration);
    }));

    this.eventUnsubscribers.push(EventBus.on(Events.SCREEN_FLASH, (color: number, duration: number) => {
      this.screenFlashEffect(color, duration);
    }));
  }

  private emitParticles(type: string, x: number, y: number, params?: Record<string, unknown>): void {
    const count = Math.min((params?.count as number) || 5, this.maxParticles - this.activeParticles);

    for (let i = 0; i < count; i++) {
      this.activeParticles++;
      const particle = this.acquireEffect(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        this.getParticleTexture(type),
      );
      particle.setDepth(15);
      particle.setDisplaySize(4, 4);

      // Random velocity
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(50, 200);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * 0.5,
        y: y + Math.sin(angle) * speed * 0.5,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => {
          this.activeParticles--;
          this.releaseEffect(particle);
        },
      });
    }
  }

  private getParticleTexture(type: string): string {
    switch (type) {
      case 'enemy_death':
        return 'enemy_death_particle';
      case 'boss_damage':
      case 'boss_explosion':
        return 'boss_explosion_particle';
      case 'damage':
        return 'particle_damage';
      case 'dust':
        return 'particle_dust';
      case 'debris':
        return 'particle_debris';
      default:
        return 'particle_damage';
    }
  }

  createExplosion(x: number, y: number, radius: number = 40): void {
    const explosion = this.scene.add.sprite(x, y, 'explosion_0');
    explosion.setDepth(15);
    explosion.setDisplaySize(radius * 2, radius * 2);

    if (this.scene.anims.exists('anim_explosion')) {
      explosion.play('anim_explosion');
      explosion.on('animationcomplete', () => {
        explosion.destroy();
      });
    } else {
      this.scene.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => explosion.destroy(),
      });
    }

    // Camera shake
    this.shakeCamera(5, 200);

    // Screen flash
    this.screenFlashEffect(0xff5500, 100);

    // Particles
    this.emitParticles('debris', x, y, { count: 10 });
  }

  createSmallExplosion(x: number, y: number): void {
    const explosion = this.acquireEffect(x, y, 'explosion_small');
    explosion.setDepth(15);
    explosion.setDisplaySize(32, 32);

    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => this.releaseEffect(explosion),
    });

    this.emitParticles('damage', x, y, { count: 5 });
  }

  private shakeCamera(intensity: number, duration: number): void {
    const strength = SaveManager.getSettings().screenShake;
    if (strength > 0) this.scene.cameras.main.shake(duration, intensity * strength / 100);
  }

  private screenFlashEffect(color: number, duration: number): void {
    if (!this.screenFlash) {
      this.screenFlash = this.scene.add.rectangle(
        0, 0,
        this.scene.cameras.main.width * 2,
        this.scene.cameras.main.height * 2,
        color,
        0.3,
      );
      this.screenFlash.setDepth(100);
      this.screenFlash.setOrigin(0.5);
    }

    this.flashColor = color;
    this.flashDuration = duration;
    this.flashAlpha = SaveManager.getSettings().reduceFlashes ? 0.08 : 0.3;

    this.screenFlash.setFillStyle(color, this.flashAlpha);
    this.screenFlash.setVisible(true);

    this.scene.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration,
      onComplete: () => {
        if (this.screenFlash) {
          this.screenFlash.setVisible(false);
        }
      },
    });
  }

  /** Update called each frame */
  preUpdate(delta: number): void {
    if (this.flashDuration > 0) {
      this.flashDuration -= delta;
    }
  }

  /** Create muzzle flash */
  createMuzzleFlash(x: number, y: number, facing: 'left' | 'right' = 'right'): void {
    const flash = this.scene.add.sprite(x, y, 'effect_muzzle');
    flash.setDepth(10);
    flash.setFlipX(facing === 'left');
    flash.setDisplaySize(12, 6);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  /** Create hit spark effect */
  createHitSpark(x: number, y: number, weaponType: string = 'pulse_rifle'): void {
    const styles: Record<string, { color: number; scale: number; count: number }> = {
      pulse_rifle: { color: 0x8bd9ff, scale: 1.2, count: 2 },
      rapid_cannon: { color: 0x6ff1b0, scale: 0.8, count: 1 },
      spread_blaster: { color: 0xffb76a, scale: 1.4, count: 3 },
      plasma_beam: { color: 0xda9aff, scale: 1.8, count: 3 },
      rocket_launcher: { color: 0xffa072, scale: 2, count: 4 },
    };
    const style = styles[weaponType] ?? styles.pulse_rifle;
    const count = SaveManager.getSettings().effectsQuality === 'low' ? 1 : style.count;
    for (let i = 0; i < count; i++) {
      const spark = this.acquireEffect(x, y, 'effect_hit_spark')
        .setDepth(15).setTint(style.color).setScale(style.scale);
      const angle = i * (Math.PI * 2 / count) + Math.random() * 0.5;
      this.scene.tweens.add({ targets: spark,
        x: x + Math.cos(angle) * (5 + style.scale * 3),
        y: y + Math.sin(angle) * (5 + style.scale * 3),
        alpha: 0, scale: style.scale * 0.3, duration: 170,
        onComplete: () => this.releaseEffect(spark),
      });
    }
  }

  /** Create damage text popup */
  createDamageText(x: number, y: number, damage: number): void {
    const text = this.scene.add.text(x, y, `-${damage}`, {
      font: `700 15px ${FONT.display}`,
      color: '#ff5555',
      align: 'center',
    });
    text.setDepth(15);
    text.setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  /** Create dust particles on landing */
  createLandingDust(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const p = this.acquireEffect(x, y, 'particle_dust');
      p.setDepth(5);
      p.setDisplaySize(3, 3);

      const angle = Phaser.Math.FloatBetween(0, Math.PI);
      const speed = Phaser.Math.FloatBetween(50, 150);

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed * 0.3,
        y: y + Math.sin(angle) * speed * 0.3,
        alpha: 0,
        duration: 500,
        onComplete: () => this.releaseEffect(p),
      });
    }
  }

  destroy(): void {
    this.eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.eventUnsubscribers = [];
    if (this.screenFlash) {
      this.screenFlash.destroy();
    }
    this.effectPool.forEach((effect) => effect.destroy());
    this.effectPool = [];
  }

  getParticleCount(): number {
    return this.activeParticles;
  }
}
