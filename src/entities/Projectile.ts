/**
 * Projectile - Represents a bullet, rocket, or energy projectile.
 * Supports pooling for performance.
 */

import Phaser from 'phaser';
import type { ProjectileParams } from '../weapons/BaseWeapon';
import { CollisionGroup } from '../config/gameConfig';
import type { Poolable } from '../systems/ObjectPool';

export class Projectile extends Phaser.Physics.Arcade.Sprite implements Poolable {
  private params: ProjectileParams;
  private velocity: { x: number; y: number };
  private life: number = 0;
  private maxLife: number = 5000; // ms before auto-despawn
  private penetratedCount: number = 0;
  private _isPlayerProjectile: boolean;
  private _damage: number;
  private _penetration: boolean;
  private _explosionRadius?: number;
  private _weaponType: string;

  constructor(
    scene: Phaser.Scene,
    params: ProjectileParams,
  ) {
    super(scene, params.x, params.y, params.weaponType === 'rocket_launcher' ? 'bullet_rocket' : params.weaponType === 'plasma_beam' ? 'bullet_plasma' : params.weaponType === 'rapid_cannon' ? 'bullet_rapid' : params.weaponType === 'spread_blaster' ? 'bullet_spread' : 'bullet_player');

    this.params = params;
    this._isPlayerProjectile = params.isPlayerProjectile;
    this._damage = params.damage;
    this._penetration = params.penetration;
    this._weaponType = params.weaponType;

    if (params.weaponType === 'rocket_launcher') {
      this._explosionRadius = 60;
    }

    // Calculate velocity
    const angle = Math.atan2(params.directionY, params.directionX);
    const speed = Math.max(params.speed, 100);
    this.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };

    this.setDepth(5);
    this.setActive(true);
    this.setVisible(true);

    // Set collision
    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.max(this.width, this.height) / 2);
    body.setVelocity(this.velocity.x, this.velocity.y);

    if (this._isPlayerProjectile) {
      body.collisionCategory = CollisionGroup.PLAYER_BULLET;
      body.collisionMask = CollisionGroup.ENEMY | CollisionGroup.BOSS | CollisionGroup.ENVIRONMENT;
    } else {
      body.collisionCategory = CollisionGroup.ENEMY_BULLET;
      body.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT;
    }

    body.setCollideWorldBounds(false);

    // Auto-despawn timer
    this.scene.time.delayedCall(this.maxLife, () => {
      this.kill();
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.life += delta;

    if (this.life > this.maxLife) {
      this.kill();
    }

    // Rotate projectile to match direction
    this.rotation = Phaser.Math.DegToRad(Phaser.Math.RadToDeg(Math.atan2(this.velocity.y, this.velocity.x)));
  }

  /** Handle hitting something */
  hit(target: { x: number; y: number }): void {
    if (!this.active) return;

    if (this._penetration) {
      this.penetratedCount++;
      if (this.penetratedCount > 3) {
        this.kill();
      }
    } else {
      this.kill();
    }
  }

  /** Kill and reset the projectile */
  kill(): void {
    this.active = false;
    this.setVisible(false);
    this.setActive(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /** Reset the projectile for pooling */
  reset(): void {
    this.active = true;
    this.life = 0;
    this.penetratedCount = 0;
    this.setVisible(true);
    this.setActive(true);
  }

  /** Get damage value */
  getDamage(): number {
    return this._damage;
  }

  /** Check if this is a player projectile */
  isPlayerProjectile(): boolean {
    return this._isPlayerProjectile;
  }

  /** Get explosion radius if applicable */
  getExplosionRadius(): number | undefined {
    return this._explosionRadius;
  }

  /** Check if this projectile has splash damage */
  hasSplash(): boolean {
    return this._weaponType === 'rocket_launcher';
  }

  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}
