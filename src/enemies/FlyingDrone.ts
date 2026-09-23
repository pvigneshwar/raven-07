/**
 * Flying Drone - Airborne enemy with sinusoidal movement that fires downward.
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType, CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

export class FlyingDrone extends Enemy {
  private sineOffset: number;
  private readonly amplitude: number = 50;
  private readonly frequency: number = 0.002;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.FLYING_DRONE], player);
    this.createAnimations();
    this.sineOffset = Math.random() * Math.PI * 2;

    // Drones don't use standard gravity-based physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(false);
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_drone_fly')) return;

    this.anims.create({
      key: 'enemy_drone_fly',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
      frameRate: 4,
    });
    this.anims.create({
      key: 'enemy_drone_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_drone_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_drone_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_drone_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.isDead) return;

    // Sinusoidal movement
    const body = this.body as Phaser.Physics.Arcade.Body;
    const offset = Math.sin(time * this.frequency + this.sineOffset) * this.amplitude;
    body.setVelocityY(offset * 0.5);

    // Move toward player slightly
    if (this.player) {
      const dir = Phaser.Math.Clamp((this.player.x - this.x) / 200, -0.5, 0.5);
      body.setVelocityX(dir * this.config.speed);
    }
  }

  protected performAttack(): void {
    if (!this.player) return;

    // Aim at the player's current position with a little drone inaccuracy.
    const direction = this.getAimDirection(5);

    // physics.add.existing(gameObject) returns the GameObject itself (now
    // carrying a .body property), not the Body -- casting that straight to
    // Body and calling bullet.setVelocity() on it crashed with "setVelocity
    // is not a function" the moment any drone attacked, since Sprite has no
    // such method (only sprite.body does). Also emit the bullet on EventBus
    // so LevelOneScene can add it to the enemy-bullet group and actually
    // make it hurt the player -- previously nothing did.
    const bulletSprite = this.scene.physics.add.existing(
      this.scene.add.sprite(this.x, this.y + 10, 'bullet_enemy_drone'),
    ) as Phaser.Physics.Arcade.Sprite;

    const bulletBody = bulletSprite.body as Phaser.Physics.Arcade.Body;
    bulletBody.setAllowGravity(false);
    bulletBody.setVelocity(direction.x * this.projectileSpeed(150), direction.y * this.projectileSpeed(150));
    bulletBody.collisionCategory = CollisionGroup.ENEMY_BULLET;
    bulletBody.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT;
    bulletBody.setCollideWorldBounds(false);
    EventBus.emit(Events.ENEMY_PROJECTILE_FIRED, bulletSprite);

    this.scene.time.delayedCall(3000, () => {
      if (bulletSprite && bulletSprite.destroy) {
        bulletSprite.destroy();
      }
    });
  }
}
