/**
 * Shield Soldier - Blocks frontal projectiles, vulnerable from behind.
 * Explosions bypass the directional shield.
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyData } from '../data/enemyData';
import { EnemyType, CollisionGroup } from '../config/gameConfig';

export class ShieldSoldier extends Enemy {
  private shieldActive: boolean = true;
  private shieldDirection: 'left' | 'right' = 'left';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, enemyData[EnemyType.SHIELD_SOLDIER], player);
    this.createAnimations();
    this.patrolRange = 60;
  }

  private createAnimations(): void {
    if (this.anims.exists('enemy_shield_walk')) return;

    this.anims.create({
      key: 'enemy_shield_walk',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
      frameRate: 2,
    });
    this.anims.create({
      key: 'enemy_shield_idle',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy_shield_attack',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_shield_hurt',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
    this.anims.create({
      key: 'enemy_shield_dead',
      frames: [{ key: this.config.texture, frame: 0 }],
      repeat: 0,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.isDead) return;

    // Face the player (shield direction)
    if (this.player) {
      this.shieldDirection = this.player.x > this.x ? 'right' : 'left';
      this.facing = this.shieldDirection;
    }
  }

  /** Override: Only take damage from behind or explosions */
  takeDamage(damage: number, sourceX?: number, sourceY?: number): void {
    if (this.isDead) return;

    // Check if damage is from front (shielded)
    if (sourceX !== undefined && this.shieldActive) {
      const facingDir = this.facing === 'left' ? -1 : 1;
      const attackDir = sourceX < this.x ? -1 : 1;

      // If attack is from the front, block it
      if (attackDir === facingDir) {
        // Blocked! Show shield flash
        const flash = this.scene.add.sprite(sourceX, sourceY || this.y, 'effect_hit_spark');
        flash.setDepth(5);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 1.5,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
        return;
      }
    }

    // Damage is from behind or shield is down
    super.takeDamage(damage, sourceX, sourceY);
  }

  protected performAttack(): void {
    if (!this.player) return;

    // Charge attack
    const dir = this.player.x > this.x ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isApproachingLedge(dir)) {
      body.setVelocityX(0);
      return;
    }
    body.setVelocityX(dir * 150);

    this.scene.time.delayedCall(300, () => {
      if (!this.isDead && !this.isApproachingLedge(dir)) {
        body.setVelocityX(dir * 50);
      } else if (!this.isDead) {
        body.setVelocityX(0);
      }
    });
  }

  /** Deactivate shield (for explosions) */
  deactivateShield(): void {
    this.shieldActive = false;
    // Shield will reactivate after delay
    this.scene.time.delayedCall(2000, () => {
      this.shieldActive = true;
    });
  }
}
