/**
 * Rifle Soldier - Medium-range attacker, maintains distance, fires controlled bursts.
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType, CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

export class RifleSoldier extends Enemy {
  private burstCount: number = 0;
  private readonly burstSize: number = 3;
  private readonly burstDelay: number = 150;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.RIFLE_SOLDIER], player);
    this.createAnimations();
    this.patrolRange = 50;
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_rifle_walk')) return;

    this.anims.create({
      key: 'enemy_rifle_walk',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
      frameRate: 2,
    });
    this.anims.create({
      key: 'enemy_rifle_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_rifle_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_rifle_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_rifle_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  protected performAttack(): void {
    if (!this.player) return;

    // Fires 3-shot burst
    for (let i = 0; i < this.burstSize; i++) {
      const direction = this.getAimDirection(3);

      // See FlyingDrone.performAttack() for why this can't cast the return
      // of physics.add.existing() straight to Body.
      const bulletSprite = this.scene.physics.add.existing(
        this.scene.add.sprite(this.x, this.y, 'bullet_enemy'),
      ) as Phaser.Physics.Arcade.Sprite;

      const bulletBody = bulletSprite.body as Phaser.Physics.Arcade.Body;
      bulletBody.setAllowGravity(false);
      bulletBody.setVelocity(direction.x * this.projectileSpeed(220), direction.y * this.projectileSpeed(220));
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
}
