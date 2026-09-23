/**
 * Heavy Gunner - Slow but heavily armored with sustained automatic fire.
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType, CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

export class HeavyGunner extends Enemy {
  private sustainedFireTimer: number = 0;
  private readonly fireDuration: number = 800;
  private readonly fireInterval: number = 200;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.HEAVY_GUNNER], player);
    this.createAnimations();
    this.patrolRange = 40;
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_heavy_walk')) return;

    this.anims.create({
      key: 'enemy_heavy_walk',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
      frameRate: 1,
    });
    this.anims.create({
      key: 'enemy_heavy_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_heavy_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_heavy_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_heavy_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  protected performAttack(): void {
    if (!this.player) return;

    // Sustained automatic fire - fires multiple bullets over time
    this.sustainedFireTimer = this.fireDuration;

    // Fire a burst of shots
    const numShots = 5;
    for (let i = 0; i < numShots; i++) {
      this.scene.time.delayedCall(i * this.fireInterval, () => {
        if (this.isDead || !this.canSeePlayer()) return;

        const direction = this.getAimDirection(4);

        // See FlyingDrone.performAttack() for why this can't cast the
        // return of physics.add.existing() straight to Body.
        const bulletSprite = this.scene.physics.add.existing(
          this.scene.add.sprite(this.x, this.y, 'bullet_enemy_heavy'),
        ) as Phaser.Physics.Arcade.Sprite;

        const bulletBody = bulletSprite.body as Phaser.Physics.Arcade.Body;
        bulletBody.setAllowGravity(false);
        bulletBody.setVelocity(direction.x * this.projectileSpeed(180), direction.y * this.projectileSpeed(180));
        bulletBody.collisionCategory = CollisionGroup.ENEMY_BULLET;
        bulletBody.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT;
        bulletBody.setCollideWorldBounds(false);
        EventBus.emit(Events.ENEMY_PROJECTILE_FIRED, bulletSprite);

        this.scene.time.delayedCall(3000, () => {
          if (bulletSprite && bulletSprite.destroy) {
            bulletSprite.destroy();
          }
        });
      });
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Update sustained fire
    if (this.sustainedFireTimer > 0) {
      this.sustainedFireTimer -= delta;
    }
  }
}
