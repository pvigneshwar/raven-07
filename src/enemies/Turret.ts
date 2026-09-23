/**
 * Turret - Stationary enemy that tracks and shoots the player.
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType, CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

export class Turret extends Enemy {
  private aimAngle: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.TURRET], player);
    this.createAnimations();

    // Turrets are stationary
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(true);
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_turret_idle')) return;

    this.anims.create({
      key: 'enemy_turret_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_turret_walk',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_turret_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_turret_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_turret_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.isDead) return;

    // Track player
    if (this.player && this.state !== 'HURT' && this.state !== 'DEAD') {
      const dx = this.player.x - this.x;
      const dy = this.player.y - this.y;
      this.aimAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    }
  }

  protected performAttack(): void {
    if (!this.player) return;

    // Calculate angle to player
    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const angle = Math.atan2(dy, dx);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // Fire a tracking shot
    // See FlyingDrone.performAttack() for why this can't cast the return
    // of physics.add.existing() straight to Body.
    const bulletSprite = this.scene.physics.add.existing(
      this.scene.add.sprite(this.x, this.y, 'bullet_enemy_turret'),
    ) as Phaser.Physics.Arcade.Sprite;

    const bulletBody = bulletSprite.body as Phaser.Physics.Arcade.Body;
    bulletBody.setAllowGravity(false);
    bulletBody.setVelocity(dirX * this.projectileSpeed(200), dirY * this.projectileSpeed(200));
    bulletBody.collisionCategory = CollisionGroup.ENEMY_BULLET;
    bulletBody.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT;
    bulletBody.setCollideWorldBounds(false);
    EventBus.emit(Events.ENEMY_PROJECTILE_FIRED, bulletSprite);

    this.scene.time.delayedCall(3000, () => {
      if (bulletSprite && bulletSprite.destroy) {
        bulletSprite.destroy();
      }
    });

    // Play turret firing sound
    // (handled via EventBus in scene-level collision)
  }

  getAimAngle(): number {
    return this.aimAngle;
  }
}
