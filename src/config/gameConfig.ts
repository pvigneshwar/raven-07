/**
 * Game-wide configuration constants for RAVEN-07: SHADOW STRIKE
 */

export const GAME_CONFIG = {
  // Display
  WIDTH: 640,
  HEIGHT: 360,
  RESOLUTION_SCALE: 2, // 1280x720 actual

  // Physics
  GRAVITY: 1200,
  MAX_FALL_SPEED: 600,
  PHYSICS_FPS: 60,

  // Player
  PLAYER_SPAWN_X: 100,
  PLAYER_SPAWN_Y: 300,
  PLAYER_MAX_HP: 3,
  PLAYER_LIVES: 3,
  PLAYER_SPEED: 250,
  PLAYER_ACCEL: 1200,
  PLAYER_DEACCEL: 1800,
  PLAYER_JUMP_FORCE: 550,
  PLAYER_JUMP_BUFFER_TIME: 120,
  PLAYER_COYOTE_TIME: 100,
  PLAYER_AIR_CONTROL: 0.85,
  PLAYER_INVINCIBLE_TIME: 1000,
  PLAYER_KNOCKBACK_FORCE: 300,
  PLAYER_KNOCKBACK_TIME: 200,

  // Weapons
  WEAPON_SWITCH_COST: 0,

  // Enemies
  ENEMY_SPAWN_COOLDOWN: 1000,

  // Checkpoints
  CHECKPOINT_SCORE_RETENTION: 0.5,

  // Combat Arena
  ARENA_LOCK_TIME: 500,
  COMBO_RESET_TIME: 1500,
  COMBO_MAX: 4,

  // Debug
  DEBUG_ENABLED: false,
} as const;

export const GAME_NAME = 'RAVEN-07: SHADOW STRIKE';
export const GAME_VERSION = '1.0.0';

// Collision groups
export enum CollisionGroup {
  PLAYER = 1,
  PLAYER_BULLET = 2,
  ENEMY = 4,
  ENEMY_BULLET = 8,
  ENVIRONMENT = 16,
  PICKUP = 32,
  HAZARD = 64,
  EXPLOSION = 128,
  BOSS = 256,
}

// Weapon types
export enum WeaponType {
  PULSE_RIFLE = 'pulse_rifle',
  SPREAD_BLASTER = 'spread_blaster',
  RAPID_CANNON = 'rapid_cannon',
  PLASMA_BEAM = 'plasma_beam',
  ROCKET_LAUNCHER = 'rocket_launcher',
}

// Enemy types
export enum EnemyType {
  INFANTRY = 'infantry',
  RIFLE_SOLDIER = 'rifle_soldier',
  HEAVY_GUNNER = 'heavy_gunner',
  FLYING_DRONE = 'flying_drone',
  TURRET = 'turret',
  SHIELD_SOLDIER = 'shield_soldier',
}

// Game states
export enum GameState {
  BOOT = 'boot',
  MENU = 'menu',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  PLAYER_DEAD = 'player_dead',
  RESPAWNING = 'respawning',
  BOSS_INTRO = 'boss_intro',
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
}

// Aim directions
export interface AimDirection {
  x: number; // normalized float, e.g. -1..1 (was incorrectly constrained to -1, 0, 1)
  y: number; // normalized float, e.g. -1..1
  isUp: boolean;
  isDown: boolean;
}
