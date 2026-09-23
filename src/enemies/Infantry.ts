/**
 * Infantry - Basic enemy that patrols, detects player, and fires occasionally.
 */

import Phaser from 'phaser';
import { Enemy, type EnemyState } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType } from '../config/gameConfig';
import { CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

export class Infantry extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.INFANTRY], player);

    // Create enemy animations
    this.createAnimations();

    // Override patrol range
    this.patrolRange = 80;
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_walk')) return;

    const frames: Phaser.Types.Animations.AnimationFrame[] = [];

    // Walk animation (bob slightly)
    this.anims.create({
      key: 'enemy_walk',
      frames: [
        { key: this.config.texture, frame: 0 },
      ],
      repeat: -1,
      frameRate: 2,
    });

    this.anims.create({
      key: 'enemy_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });

    this.anims.create({
      key: 'enemy_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });

    this.anims.create({
      key: 'enemy_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });

    this.anims.create({
      key: 'enemy_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  protected performAttack(): void {
    // Shoot a bullet at the player
    if (!this.player) return;

    const direction = this.getAimDirection(6);

    // See FlyingDrone.performAttack() for why this can't cast the return
    // of physics.add.existing() straight to Body.
    const bulletSprite = this.scene.physics.add.existing(
      this.scene.add.sprite(this.x, this.y, 'bullet_enemy'),
    ) as Phaser.Physics.Arcade.Sprite;

    const bulletBody = bulletSprite.body as Phaser.Physics.Arcade.Body;
    bulletBody.setAllowGravity(false);
    bulletBody.setVelocity(direction.x * this.projectileSpeed(180), direction.y * this.projectileSpeed(180));
    bulletBody.collisionCategory = CollisionGroup.ENEMY_BULLET;
    bulletBody.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT;
    bulletBody.setCollideWorldBounds(false);
    EventBus.emit(Events.ENEMY_PROJECTILE_FIRED, bulletSprite);

    // Auto-destroy
    this.scene.time.delayedCall(3000, () => {
      if (bulletSprite && bulletSprite.destroy) {
        bulletSprite.destroy();
      }
    });
  }
}
