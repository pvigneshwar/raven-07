export type BossAttackId = 'cannon_burst' | 'spread_shot' | 'missile_rain' | 'ground_shockwave' | 'laser_sweep';

export interface BossAttackConfig {
  id: BossAttackId; weight: number; cooldown: number; telegraphDuration: number;
  executionDuration: number; recoveryDuration: number; damage: number; allowedPhases: number[];
  projectileSpeed?: number; projectileCount?: number; fireInterval?: number; spreadAngle?: number;
  minDistance?: number; maxDistance?: number; major?: boolean;
}

export interface BossPhaseDefinition {
  phase: number; healthRange: [number, number]; movementSpeed: number;
  cooldownMultiplier: number; attacks: BossAttackId[]; message: string;
}

export interface WeakPointConfig {
  id: 'left_cannon' | 'right_cannon' | 'core'; health: number; damageMultiplier: number;
  destroyable: boolean; disablesAttack?: BossAttackId;
}

export interface BossConfig {
  id: string; name: string; maxHealth: number; introDuration: number; transitionDuration: number;
  phase2Threshold: number; phase3Threshold: number; phases: BossPhaseDefinition[];
  attacks: Record<BossAttackId, BossAttackConfig>; weakPoints: WeakPointConfig[];
  deathSequence: { smallExplosions: number[]; mainExplosion: number; removeAt: number };
}

export const JUNGLE_SIEGE_WALKER_CONFIG: BossConfig = {
  id: 'jungle_siege_walker', name: 'JUNGLE SIEGE WALKER', maxHealth: 120,
  introDuration: 1800, transitionDuration: 1500, phase2Threshold: 0.65, phase3Threshold: 0.3,
  phases: [
    { phase: 1, healthRange: [1, 0.65], movementSpeed: 30, cooldownMultiplier: 1,
      attacks: ['cannon_burst', 'spread_shot', 'ground_shockwave'], message: 'CANNONS ONLINE' },
    { phase: 2, healthRange: [0.65, 0.3], movementSpeed: 46, cooldownMultiplier: 0.8,
      attacks: ['cannon_burst', 'spread_shot', 'missile_rain', 'ground_shockwave'], message: 'MISSILE SYSTEMS ONLINE' },
    { phase: 3, healthRange: [0.3, 0], movementSpeed: 62, cooldownMultiplier: 0.62,
      attacks: ['cannon_burst', 'spread_shot', 'missile_rain', 'ground_shockwave', 'laser_sweep'], message: 'ENRAGED - CORE EXPOSED' },
  ],
  attacks: {
    cannon_burst: { id: 'cannon_burst', weight: 35, cooldown: 350, telegraphDuration: 500,
      executionDuration: 650, recoveryDuration: 700, damage: 1, allowedPhases: [1, 2, 3],
      projectileSpeed: 350, projectileCount: 4, fireInterval: 120, minDistance: 160 },
    spread_shot: { id: 'spread_shot', weight: 28, cooldown: 450, telegraphDuration: 650,
      executionDuration: 250, recoveryDuration: 850, damage: 1, allowedPhases: [1, 2, 3],
      projectileSpeed: 280, projectileCount: 5, spreadAngle: 55, minDistance: 100 },
    missile_rain: { id: 'missile_rain', weight: 22, cooldown: 700, telegraphDuration: 1000,
      executionDuration: 1100, recoveryDuration: 750, damage: 1, allowedPhases: [2, 3],
      projectileCount: 4, fireInterval: 160, minDistance: 300, major: true },
    ground_shockwave: { id: 'ground_shockwave', weight: 24, cooldown: 550, telegraphDuration: 700,
      executionDuration: 500, recoveryDuration: 900, damage: 1, allowedPhases: [1, 2, 3],
      projectileSpeed: 260, projectileCount: 2, maxDistance: 430, major: true },
    laser_sweep: { id: 'laser_sweep', weight: 16, cooldown: 900, telegraphDuration: 1500,
      executionDuration: 700, recoveryDuration: 1000, damage: 1, allowedPhases: [3],
      projectileSpeed: 430, minDistance: 240, major: true },
  },
  weakPoints: [
    { id: 'left_cannon', health: 24, damageMultiplier: 1, destroyable: true, disablesAttack: 'cannon_burst' },
    { id: 'right_cannon', health: 24, damageMultiplier: 1, destroyable: true, disablesAttack: 'spread_shot' },
    { id: 'core', health: 72, damageMultiplier: 1.25, destroyable: false },
  ],
  deathSequence: { smallExplosions: [300, 700, 1100], mainExplosion: 1800, removeAt: 2500 },
};
