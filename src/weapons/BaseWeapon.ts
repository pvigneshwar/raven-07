/**
 * BaseWeapon - Abstract base class for all weapons.
 * Handles firing logic, projectile creation, and weapon stats.
 */

import Phaser from 'phaser';
import type { WeaponConfig } from '../data/weaponData';
import { getSpreadProjectileCount } from '../data/weaponData';
import type { AimDirection } from '../config/gameConfig';
import { WeaponType, CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import type { Projectile } from '../entities/Projectile';

export interface ProjectileParams {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  damage: number;
  speed: number;
  penetration: boolean;
  isPlayerProjectile: boolean;
  weaponType: WeaponType;
  upgradeLevel: number;
  texture: string;
}

export abstract class BaseWeapon {
  protected config: WeaponConfig;
  protected scene: Phaser.Scene;
  protected lastFireTime: number = 0;
  protected cooldownTimer: number = 0;
  protected upgradeLevel: number = 0;
  protected maxUpgradeLevel: number;
  protected projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene, config: WeaponConfig) {
    this.scene = scene;
    this.config = config;
    this.maxUpgradeLevel = config.maxUpgradeLevel;
  }

  /** Fire the weapon */
  fire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const now = this.scene.time.now;
    if (now - this.lastFireTime < this.config.fireRate) return;

    this.lastFireTime = now;
    this.onFire(x, y, aim, facing);
    const muzzle = this.getMuzzlePosition(x, y, aim, facing);
    this.spawnMuzzleFlash(muzzle.x, muzzle.y, aim);
    EventBus.emit(Events.AUDIO_SFX, this.config.sound);
    if (this.config.type === WeaponType.ROCKET_LAUNCHER) EventBus.emit(Events.CAMERA_SHAKE, 2.5, 100);
    else if (this.config.type === WeaponType.SPREAD_BLASTER) EventBus.emit(Events.CAMERA_SHAKE, 1.2, 70);
  }

  /** Override this in subclasses for specific firing behavior */
  protected abstract onFire(
    x: number,
    y: number,
    aim: AimDirection,
    facing: 'left' | 'right',
  ): void;

  /** Shared muzzle geometry keeps sprites, projectiles, and flashes aligned. */
  protected getMuzzlePosition(x: number, y: number, aim: AimDirection,
    facing: 'left' | 'right'): { x: number; y: number } {
    const horizontal = Math.abs(aim.x) < 0.25 ? (facing === 'left' ? -5 : 5) : aim.x * 16;
    return { x: x + horizontal, y: y - 6 + aim.y * 14 };
  }

  /** Set the weapon upgrade level */
  setUpgradeLevel(level: number): void {
    this.upgradeLevel = Math.min(level, this.maxUpgradeLevel);
    this.config = { ...this.config, upgradeLevel: this.upgradeLevel };
  }

  /** Get the current weapon level */
  getUpgradeLevel(): number {
    return this.upgradeLevel;
  }

  /** Get the weapon name */
  getName(): string {
    return this.config.name;
  }

  /** Get the weapon type */
  getType(): WeaponType {
    return this.config.type;
  }

  /** Get the weapon icon key */
  getIconKey(): string {
    return this.config.iconKey;
  }

  /** Get the fire rate */
  getFireRate(): number {
    return this.config.fireRate;
  }

  /** Get the damage */
  getDamage(): number {
    return this.config.damage;
  }

  /** Check if weapon is ready to fire */
  isReady(): boolean {
    const now = this.scene.time.now;
    return now - this.lastFireTime >= this.config.fireRate;
  }

  /** Get number of projectiles for spread weapons */
  protected getProjectileCount(): number {
    return getSpreadProjectileCount(this.config.type, this.upgradeLevel);
  }

  /** Create a projectile at the given position with the given direction */
  protected spawnProjectile(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    texture: string,
    speed: number = this.config.projectileSpeed,
    damage: number = this.config.damage,
  ): void {
    // Normalize direction
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    if (length === 0) {
      dirX = 1;
    } else {
      dirX = dirX / length;
      dirY = dirY / length;
    }

    const sprite = this.scene.physics.add.sprite(x, y, texture);
    sprite.setDepth(12);
    sprite.setRotation(Math.atan2(dirY, dirX));
    sprite.setData('damage', damage);
    sprite.setData('weaponType', this.config.type);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      body.setVelocity(dirX * speed, dirY * speed);
      body.setCollideWorldBounds(false);
      body.collisionCategory = CollisionGroup.PLAYER_BULLET;
      body.collisionMask =
        CollisionGroup.ENEMY |
        CollisionGroup.ENEMY_BULLET |
        CollisionGroup.BOSS |
        CollisionGroup.ENVIRONMENT;
    }

    // Auto-destroy when far or after timeout
    this.scene.time.delayedCall(2500, () => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });

    // Notify scene / collision manager
    EventBus.emit(Events.PROJECTILE_FIRED, sprite);

  }

  /** Spawn muzzle flash effect */
  protected spawnMuzzleFlash(x: number, y: number, aim: AimDirection): void {
    const style = {
      [WeaponType.PULSE_RIFLE]: { tint: 0xaaddff, scale: 0.85 },
      [WeaponType.SPREAD_BLASTER]: { tint: 0xffb66b, scale: 1.5 },
      [WeaponType.RAPID_CANNON]: { tint: 0x77ffd0, scale: 0.7 },
      [WeaponType.PLASMA_BEAM]: { tint: 0xd9a0ff, scale: 1.3 },
      [WeaponType.ROCKET_LAUNCHER]: { tint: 0xff8a47, scale: 1.8 },
    }[this.config.type];
    const flash = this.scene.add.sprite(x, y, 'effect_muzzle');
    flash.setDepth(14).setTint(style.tint).setScale(style.scale)
      .setRotation(Math.atan2(aim.y, aim.x));

    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      scale: { from: style.scale, to: style.scale * 1.5 },
      duration: 110,
      onComplete: () => flash.destroy(),
    });

    if (this.config.type === WeaponType.PULSE_RIFLE || this.config.type === WeaponType.RAPID_CANNON) {
      const shell = this.scene.add.sprite(x, y + 2, 'particle_debris').setDepth(12).setTint(0xc6a971);
      this.scene.tweens.add({ targets: shell, x: x - 10, y: y + 16, alpha: 0,
        duration: 260, onComplete: () => shell.destroy() });
    }
  }

  /** Get the max upgrade level */
  get maxLevel(): number {
    return this.maxUpgradeLevel;
  }
}
