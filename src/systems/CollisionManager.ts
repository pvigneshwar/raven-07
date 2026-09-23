/**
 * CollisionManager - Handles collision detection and response between
 * player, enemies, projectiles, pickups, hazards, environment, and explosions.
 */

import Phaser from 'phaser';
import { CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { EffectsManager } from './EffectsManager';

export class CollisionManager {
  private scene: Phaser.Scene;
  private player: Player;
  private effectsManager: EffectsManager;
  private playerBullets: Phaser.Physics.Arcade.Group;
  private enemyBullets: Phaser.Physics.Arcade.Group;
  private enemies: Phaser.Physics.Arcade.Group;
  private pickups: Phaser.Physics.Arcade.Group;
  private hazards: Phaser.Physics.Arcade.Group;
  private platforms: Phaser.Physics.Arcade.Group;
  private worldBounds: Phaser.Geom.Rectangle;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    effects: EffectsManager,
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effects;

    // Initialize collision groups
    this.playerBullets = this.scene.physics.add.group();
    this.enemyBullets = this.scene.physics.add.group();
    this.enemies = this.scene.physics.add.group();
    this.pickups = this.scene.physics.add.group();
    this.hazards = this.scene.physics.add.group();
    this.platforms = this.scene.physics.add.group();

    this.worldBounds = new Phaser.Geom.Rectangle(
      0, 0,
      this.scene.game.config.width as number * 10,
      this.scene.game.config.height as number,
    );

    this.setupCollisions();
  }

  private setupCollisions(): void {
    const physics = this.scene.physics;

    // Player bullets hit enemies
    physics.add.overlap(
      this.playerBullets,
      this.enemies,
      (bulletObj, enemyObj) => {
        this.handlePlayerBulletHit(bulletObj, enemyObj);
      },
      undefined,
      this,
    );

    // Player bullets hit boss
    physics.add.overlap(
      this.playerBullets,
      this.scene.bossGroup ?? this.enemies,
      (bulletObj) => {
        // Boss hits handled separately if boss exists
      },
      undefined,
      this,
    );

    // Enemy bullets hit player
    physics.add.overlap(
      this.enemyBullets,
      this.player,
      (bulletObj) => {
        this.handleEnemyBulletHit(bulletObj);
      },
      undefined,
      this,
    );

    // Enemies touch player
    physics.add.overlap(
      this.enemies,
      this.player,
      (enemyObj) => {
        this.handleEnemyTouch(enemyObj);
      },
      undefined,
      this,
    );

    // Player touches pickups
    physics.add.overlap(
      this.pickups,
      this.player,
      (pickupObj) => {
        this.handlePickup(pickupObj);
      },
      undefined,
      this,
    );

    // Player touches hazards
    physics.add.overlap(
      this.hazards,
      this.player,
      () => {
        this.handleHazardTouch();
      },
      undefined,
      this,
    );
  }

  /** Add platforms to collision system */
  addPlatformCollider(platforms: Phaser.Physics.Arcade.Group | Phaser.Tilemaps.Tile[]): void {
    if (Array.isArray(platforms)) {
      // Tilemap collision
      this.scene.physics.add.collider(this.player, platforms as any);
    } else {
      this.platforms = platforms;
      this.scene.physics.add.collider(this.player, platforms);
      // Also collide enemies with platforms
      this.scene.physics.add.collider(this.enemies, platforms);
    }
  }

  /** Register player bullets */
  registerPlayerBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
    this.playerBullets.add(bullet);
  }

  /** Register enemy bullets */
  registerEnemyBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
    this.enemyBullets.add(bullet);
  }

  /** Register enemy */
  registerEnemy(enemy: Enemy): void {
    this.enemies.add(enemy);
  }

  /** Register pickup */
  registerPickup(pickup: Phaser.Physics.Arcade.Sprite): void {
    this.pickups.add(pickup);
  }

  /** Register boss */
  registerBoss(boss: any): void {
    if (!boss) return;
    this.scene.physics.add.overlap(
      this.playerBullets,
      boss,
      (bulletObj) => {
        const bulletSprite = bulletObj as Phaser.Physics.Arcade.Sprite;
        if (!bulletSprite.active) return;

        const damage = (bulletSprite.getData('damage') as number) || 1;
        const weaponType = bulletSprite.getData('weaponType');

        if (boss.takeDamage) {
          boss.takeDamage(damage);
        }

        this.effectsManager.createHitSpark(bulletSprite.x, bulletSprite.y);

        if (weaponType === 'rocket_launcher') {
          this.effectsManager.createExplosion(bulletSprite.x, bulletSprite.y, 48);
        }

        bulletSprite.destroy();
      },
    );
  }

  private handlePlayerBulletHit(bullet: unknown, enemyObj: unknown): void {
    const bulletSprite = bullet as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObj as Enemy;

    if (!bulletSprite.active || !enemy || enemy.getIsDead()) return;

    // Deal weapon-specific damage
    const damage = (bulletSprite.getData('damage') as number) || 1;
    enemy.takeDamage(damage, bulletSprite.x, bulletSprite.y);

    // Hit effects
    this.effectsManager.createHitSpark(bulletSprite.x, bulletSprite.y);

    const weaponType = bulletSprite.getData('weaponType');
    if (weaponType === 'rocket_launcher') {
      this.effectsManager.createExplosion(bulletSprite.x, bulletSprite.y, 48);
    }

    // Destroy bullet
    bulletSprite.destroy();

    if (enemy.getIsDead()) {
      gameState.addScore(enemy.getScoreValue());
      this.player.addCombo();
      EventBus.emit(Events.SCORE_UPDATE, gameState.getPlayerStats().score);
    }
  }

  private handleEnemyBulletHit(bullet: unknown): void {
    const bulletSprite = bullet as Phaser.Physics.Arcade.Sprite;

    if (!bulletSprite.active) return;

    this.player.takeDamage(1, bulletSprite.x, bulletSprite.y);
    this.effectsManager.createHitSpark(bulletSprite.x, bulletSprite.y);
    bulletSprite.destroy();
  }

  private handleEnemyTouch(enemyObj: unknown): void {
    const enemy = enemyObj as Enemy;

    if (!enemy || enemy.getIsDead()) return;

    this.player.takeDamage(1, enemy.x, enemy.y);
  }

  private handlePickup(pickupObj: unknown): void {
    const pickup = pickupObj as Phaser.Physics.Arcade.Sprite;

    if (!pickup.active) return;

    // Handle based on pickup type (stored in custom property)
    const pickupType = pickup.getData('type') as string;

    if (pickupType === 'weapon') {
      const weaponType = pickup.getData('weaponType') as string;
      EventBus.emit(Events.PLAYER_WEAPON_PICKUP, weaponType, pickup.x, pickup.y);
    } else if (pickupType === 'health') {
      this.player.heal(1);
    } else if (pickupType === 'score') {
      gameState.addScore(25);
    }

    // Pickup animation
    this.scene.tweens.add({
      targets: pickup,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => pickup.destroy(),
    });

    EventBus.emit(Events.AUDIO_SFX, 'sfx_pickup');
  }

  private handleHazardTouch(): void {
    this.player.takeDamage(1);
  }

  /** Add bullet to appropriate group */
  addBullet(bullet: Phaser.Physics.Arcade.Sprite, isPlayer: boolean): void {
    if (isPlayer) {
      this.registerPlayerBullet(bullet);
    } else {
      this.registerEnemyBullet(bullet);
    }
  }

  /** Get player bullets group (for weapon integration) */
  getPlayerBullets(): Phaser.Physics.Arcade.Group {
    return this.playerBullets;
  }

  /** Get enemy bullets group */
  getEnemyBullets(): Phaser.Physics.Arcade.Group {
    return this.enemyBullets;
  }

  /** Get enemies group */
  getEnemies(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /** Get pickups group */
  getPickups(): Phaser.Physics.Arcade.Group {
    return this.pickups;
  }

  /** Get hazards group */
  getHazards(): Phaser.Physics.Arcade.Group {
    return this.hazards;
  }

  /** Check for pickups near a position */
  getNearbyPickups(x: number, range: number): Phaser.Physics.Arcade.Sprite[] {
    const pickups: Phaser.Physics.Arcade.Sprite[] = [];
    this.pickups.getChildren().forEach((child) => {
      const pickup = child as Phaser.Physics.Arcade.Sprite;
      if (Phaser.Math.Distance.Between(pickup.x, pickup.y, x, range) < range) {
        pickups.push(pickup);
      }
    });
    return pickups;
  }

  /** Clean up */
  destroy(): void {
    this.playerBullets.clear(true);
    this.enemyBullets.clear(true);
    this.enemies.clear(true);
    this.pickups.clear(true);
    this.hazards.clear(true);
  }
}

// Extend Scene to add bossGroup
declare module 'phaser' {
  interface Scene {
    bossGroup?: Phaser.Physics.Arcade.Group;
  }
}
