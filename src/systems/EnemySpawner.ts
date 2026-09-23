/**
 * EnemySpawner - Spawns enemies based on level data and activation zones.
 * Uses activation zones to keep distant enemies inactive for performance.
 */

import Phaser from 'phaser';
import { EnemyType } from '../config/gameConfig';
import { Enemy } from '../entities/Enemy';
import { Infantry } from '../enemies/Infantry';
import { RifleSoldier } from '../enemies/RifleSoldier';
import { HeavyGunner } from '../enemies/HeavyGunner';
import { FlyingDrone } from '../enemies/FlyingDrone';
import { Turret } from '../enemies/Turret';
import { ShieldSoldier } from '../enemies/ShieldSoldier';
import type { enemySpawnPoints } from '../data/levelData';
import { EventBus, Events } from '../core/EventBus';

interface EnemySpawnConfig {
  type: EnemyType;
  x: number;
  y: number;
  id?: string;
}

interface Encounter {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  enemyIds: string[];
  lockArena: boolean;
  unlockCondition: 'all_defeated' | 'timer' | 'boss_phase';
}

export class EnemySpawner {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private enemies: Map<string, Enemy> = new Map();
  private enemyGroup: Phaser.Physics.Arcade.Group;
  private pendingSpawns: EnemySpawnConfig[] = [];
  private encounters: Encounter[] = [];
  private activeEncounters: Set<string> = new Set();
  private defeatedEncounters: Set<string> = new Set();
  private lockedZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private enabled = true;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;

    // Enemy group for physics
    this.enemyGroup = this.scene.physics.add.group({
      classType: Enemy,
    });

    // Convert level data encounters to internal format
    this.initializeEncounters();

    // Queue initial spawns
    this.queueInitialSpawns();
  }

  private initializeEncounters(): void {
    // Hardcoded encounters from level data
    this.encounters = [
      {
        id: 'enc_1',
        x: 1200,
        y: 200,
        width: 400,
        height: 200,
        enemyIds: ['inf_1', 'rifle_1'],
        lockArena: true,
        unlockCondition: 'all_defeated',
      },
      {
        id: 'enc_2',
        x: 3000,
        y: 200,
        width: 400,
        height: 200,
        enemyIds: ['inf_2', 'inf_3', 'shield_1'],
        lockArena: true,
        unlockCondition: 'all_defeated',
      },
      {
        id: 'enc_3',
        x: 4400,
        y: 150,
        width: 600,
        height: 250,
        enemyIds: ['rifle_2', 'rifle_3', 'heavy_1'],
        lockArena: true,
        unlockCondition: 'all_defeated',
      },
      {
        id: 'enc_4',
        x: 6800,
        y: 150,
        width: 500,
        height: 250,
        enemyIds: ['drone_1', 'drone_2', 'turret_1'],
        lockArena: true,
        unlockCondition: 'all_defeated',
      },
      {
        id: 'enc_5',
        x: 9000,
        y: 150,
        width: 500,
        height: 250,
        enemyIds: ['shield_2', 'heavy_2', 'inf_4'],
        lockArena: true,
        unlockCondition: 'all_defeated',
      },
    ];
  }

  private queueInitialSpawns(): void {
    // Spawn enemies for first encounter immediately
    // Other encounters spawn as player approaches
    this.queueEncounterEnemies('enc_1');
  }

  /** Queue enemies for a specific encounter */
  private queueEncounterEnemies(encounterId: string): void {
    const encounter = this.encounters.find((e) => e.id === encounterId);
    if (!encounter) return;

    const spawnConfigs = this.getSpawnConfigsForEncounter(encounterId);

    for (const config of spawnConfigs) {
      this.spawnEnemyDelayed(config, 100);
    }
  }

  /** Get spawn configs for an encounter */
  private getSpawnConfigsForEncounter(encounterId: string): EnemySpawnConfig[] {
    const configs: EnemySpawnConfig[] = [];
    const encounter = this.encounters.find((e) => e.id === encounterId);
    if (!encounter) return configs;

    const spawnPoints: Record<string, { x: number; y: number }> = {
      // Keep spawns inside platform edges. Exact edge spawns could be
      // separated outward by Arcade physics before their first AI update.
      inf_1: { x: 1430, y: 300 },
      rifle_1: { x: 1570, y: 300 },
      inf_2: { x: 3100, y: 300 },
      inf_3: { x: 3300, y: 300 },
      shield_1: { x: 3500, y: 300 },
      rifle_2: { x: 4500, y: 300 },
      // This platform is centered at y=300; spawning at the same y put the
      // enemy inside the collider and could resolve it downward into void.
      rifle_3: { x: 4800, y: 250 },
      heavy_1: { x: 5100, y: 300 },
      drone_1: { x: 6900, y: 200 },
      drone_2: { x: 7100, y: 220 },
      turret_1: { x: 7270, y: 290 },
      shield_2: { x: 9130, y: 300 },
      heavy_2: { x: 9500, y: 260 },
      inf_4: { x: 9800, y: 300 },
    };

    const enemyTypeMap: Record<string, EnemyType> = {
      inf_1: EnemyType.INFANTRY,
      rifle_1: EnemyType.RIFLE_SOLDIER,
      inf_2: EnemyType.INFANTRY,
      inf_3: EnemyType.INFANTRY,
      shield_1: EnemyType.SHIELD_SOLDIER,
      rifle_2: EnemyType.RIFLE_SOLDIER,
      rifle_3: EnemyType.RIFLE_SOLDIER,
      heavy_1: EnemyType.HEAVY_GUNNER,
      drone_1: EnemyType.FLYING_DRONE,
      drone_2: EnemyType.FLYING_DRONE,
      turret_1: EnemyType.TURRET,
      shield_2: EnemyType.SHIELD_SOLDIER,
      heavy_2: EnemyType.HEAVY_GUNNER,
      inf_4: EnemyType.INFANTRY,
    };

    for (const id of encounter.enemyIds) {
      const type = enemyTypeMap[id] || EnemyType.INFANTRY;
      const pos = spawnPoints[id];
      if (pos) {
        configs.push({ type, x: pos.x, y: pos.y, id });
      }
    }

    return configs;
  }

  private spawnEnemyDelayed(config: EnemySpawnConfig, delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      this.spawnEnemy(config);
    });
  }

  private spawnEnemy(config: EnemySpawnConfig): void {
    let enemy: Enemy;

    switch (config.type) {
      case EnemyType.INFANTRY:
        enemy = new Infantry(this.scene, config.x, config.y, this.player);
        break;
      case EnemyType.RIFLE_SOLDIER:
        enemy = new RifleSoldier(this.scene, config.x, config.y, this.player);
        break;
      case EnemyType.HEAVY_GUNNER:
        enemy = new HeavyGunner(this.scene, config.x, config.y, this.player);
        break;
      case EnemyType.FLYING_DRONE:
        enemy = new FlyingDrone(this.scene, config.x, config.y, this.player);
        break;
      case EnemyType.TURRET:
        enemy = new Turret(this.scene, config.x, config.y, this.player);
        break;
      case EnemyType.SHIELD_SOLDIER:
        enemy = new ShieldSoldier(this.scene, config.x, config.y, this.player);
        break;
      default:
        enemy = new Infantry(this.scene, config.x, config.y, this.player);
    }

    this.enemyGroup.add(enemy);

    // Register collision on the concrete body at spawn time. The previous
    // group-vs-platform collider was created while this dynamic group was
    // empty and did not pick up its later manually-constructed Enemy
    // children reliably, allowing every ground enemy to fall through.
    const levelScene = this.scene as Phaser.Scene & {
      getPlatforms?: () => Phaser.Physics.Arcade.StaticGroup;
    };
    const platforms = levelScene.getPlatforms?.();
    if (platforms && config.type !== EnemyType.FLYING_DRONE) {
      this.scene.physics.add.collider(enemy, platforms);
    }

    if (config.id) {
      this.enemies.set(config.id, enemy);
    }

    EventBus.emit(Events.ENEMY_SPAWNED, enemy);
  }

  update(): void {
    if (!this.enabled) return;
    const playerX = this.player.x;
    const camera = this.scene.cameras.main;

    // Spawn enemies when player enters encounter zones
    for (const encounter of this.encounters) {
      if (
        !this.activeEncounters.has(encounter.id) &&
        !this.defeatedEncounters.has(encounter.id) &&
        this.isPlayerInEncounter(encounter, playerX)
      ) {
        this.activateEncounter(encounter);
      }
    }
  }

  private isPlayerInEncounter(encounter: Encounter, playerX: number): boolean {
    return playerX >= encounter.x - 100 && playerX <= encounter.x + encounter.width + 100;
  }

  private activateEncounter(encounter: Encounter): void {
    this.activeEncounters.add(encounter.id);

    // Lock the arena
    if (encounter.lockArena) {
      EventBus.emit(Events.ARENA_LOCK, encounter.x, encounter.y, encounter.width, encounter.height);
    }

    // Spawn enemies
    this.queueEncounterEnemies(encounter.id);

    // Check for unlock after spawn
    this.scene.time.delayedCall(200, () => {
      this.checkEncounterCompletion(encounter.id);
    });
  }

  private checkEncounterCompletion(encounterId: string): void {
    const encounter = this.encounters.find((e) => e.id === encounterId);
    if (!encounter) return;

    // Check if all enemies in this encounter are defeated
    const allDead = encounter.enemyIds.every((id) => {
      const enemy = this.enemies.get(id);
      return !enemy || enemy.getIsDead();
    });

    if (allDead) {
      this.completeEncounter(encounterId);
    } else {
      // Check again in 500ms
      this.scene.time.delayedCall(500, () => {
        if (!this.defeatedEncounters.has(encounterId)) {
          this.checkEncounterCompletion(encounterId);
        }
      });
    }
  }

  private completeEncounter(encounterId: string): void {
    this.defeatedEncounters.add(encounterId);
    this.activeEncounters.delete(encounterId);

    EventBus.emit(Events.ARENA_UNLOCK);
    EventBus.emit(Events.NOTIFICATION, `COMBAT CLEAR - Score bonus!`);
  }

  /** Get the enemy group for collision detection */
  getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemyGroup;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  resetForRespawn(): void {
    this.enemyGroup.children.iterate((child: Phaser.GameObjects.GameObject) => {
      (child as Enemy).resetEncounterState();
      return true;
    });
  }

  /** Get count of alive enemies */
  getAliveEnemyCount(): number {
    let count = 0;
    this.enemyGroup.children.iterate((child: Phaser.GameObjects.GameObject) => {
      if (child) {
        const enemy = child as Enemy;
        if (!enemy.getIsDead()) {
          count++;
        }
      }
      return true;
    });
    return count;
  }

  /** Destroy all enemies */
  clear(): void {
    this.enemyGroup.clear(true, true);
    this.enemies.clear();
  }
}
