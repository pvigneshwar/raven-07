/**
 * Enemy data definitions - Configuration for all enemy types.
 */

import { EnemyType } from '../config/gameConfig';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  detectionRange: number; // pixels player must be within to detect
  attackRange: number; // pixels for optimal attack
  attackCooldown: number; // ms between attacks
  texture: string;
  width: number;
  height: number;
  offsetX: number; // collision box offset
  offsetY: number;
  scoreValue: number;
  dropsWeapon: boolean;
  weaponDropChance: number; // 0-1
}

export const enemyData: Record<EnemyType, EnemyConfig> = {
  [EnemyType.INFANTRY]: {
    type: EnemyType.INFANTRY,
    name: 'Infantry',
    hp: 2,
    speed: 60,
    damage: 1,
    detectionRange: 200,
    attackRange: 120,
    attackCooldown: 1500,
    texture: 'enemy_infantry',
    width: 20,
    height: 20,
    offsetX: 0,
    offsetY: 0,
    scoreValue: 100,
    dropsWeapon: true,
    weaponDropChance: 0.05,
  },
  [EnemyType.RIFLE_SOLDIER]: {
    type: EnemyType.RIFLE_SOLDIER,
    name: 'Rifle Soldier',
    hp: 3,
    speed: 50,
    damage: 1,
    detectionRange: 250,
    attackRange: 180,
    attackCooldown: 800,
    texture: 'enemy_rifle',
    width: 20,
    height: 20,
    offsetX: 0,
    offsetY: 0,
    scoreValue: 150,
    dropsWeapon: true,
    weaponDropChance: 0.08,
  },
  [EnemyType.HEAVY_GUNNER]: {
    type: EnemyType.HEAVY_GUNNER,
    name: 'Heavy Gunner',
    hp: 8,
    speed: 35,
    damage: 2,
    detectionRange: 300,
    attackRange: 200,
    attackCooldown: 400,
    texture: 'enemy_heavy',
    width: 24,
    height: 24,
    offsetX: 0,
    offsetY: 0,
    scoreValue: 300,
    dropsWeapon: true,
    weaponDropChance: 0.3,
  },
  [EnemyType.FLYING_DRONE]: {
    type: EnemyType.FLYING_DRONE,
    name: 'Flying Drone',
    hp: 3,
    speed: 80,
    damage: 1,
    detectionRange: 220,
    attackRange: 150,
    attackCooldown: 700,
    texture: 'enemy_drone',
    width: 40,
    height: 32,
    offsetX: 0,
    offsetY: -10,
    scoreValue: 150,
    dropsWeapon: true,
    weaponDropChance: 0.15,
  },
  [EnemyType.TURRET]: {
    type: EnemyType.TURRET,
    name: 'Turret',
    hp: 5,
    speed: 0,
    damage: 1,
    detectionRange: 300,
    attackRange: 280,
    attackCooldown: 600,
    texture: 'enemy_turret',
    width: 32,
    height: 40,
    offsetX: 0,
    offsetY: 0,
    scoreValue: 200,
    dropsWeapon: false,
    weaponDropChance: 0,
  },
  [EnemyType.SHIELD_SOLDIER]: {
    type: EnemyType.SHIELD_SOLDIER,
    name: 'Shield Soldier',
    hp: 4,
    speed: 70,
    damage: 1,
    detectionRange: 250,
    attackRange: 100,
    attackCooldown: 1200,
    texture: 'enemy_shield',
    width: 20,
    height: 20,
    offsetX: 0,
    offsetY: 0,
    scoreValue: 250,
    dropsWeapon: true,
    weaponDropChance: 0.1,
  },
};

export interface BossPhaseConfig {
  phase: number;
  hpThreshold: number; // percentage (0-100)
  attacks: string[];
  attackSpeed: number; // multiplier
  message: string;
}

export const jungleSiegeWalkerPhases: BossPhaseConfig[] = [
  {
    phase: 1,
    hpThreshold: 100,
    attacks: ['machine_gun', 'forward_cannon', 'ground_stomp'],
    attackSpeed: 1.0,
    message: 'Jungle Siege Walker engaged!',
  },
  {
    phase: 2,
    hpThreshold: 65,
    attacks: ['machine_gun', 'forward_cannon', 'missiles', 'deploy_drones'],
    attackSpeed: 1.3,
    message: 'Phase 2: Adding missile launchers!',
  },
  {
    phase: 3,
    hpThreshold: 30,
    attacks: ['machine_gun', 'laser_sweep', 'missiles', 'ground_stomp'],
    attackSpeed: 1.6,
    message: 'Phase 3: Critical damage! Going berserk!',
  },
];
