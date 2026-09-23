/**
 * Level data for Operation Emerald Strike.
 * Defines the level layout, enemy spawns, checkpoints, and encounter zones.
 */

export interface LevelSegment {
  id: string;
  name: string;
  x: number; // start x position
  width: number; // segment width
  segmentType: 'intro' | 'ground' | 'platform' | 'combat' | 'hazard' | 'boss';
}

export interface EncounterZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  enemyIds: string[];
  lockArena: boolean;
  unlockCondition: 'all_defeated' | 'timer' | 'boss_phase';
  duration?: number; // for timer-based
}

export interface CheckpointSpec {
  id: number;
  x: number;
  y: number;
  weapon?: string;
  weaponLevel?: number;
}

export interface HazardSpec {
  type: 'explosive_barrel' | 'electric_floor' | 'laser' | 'pit' | 'lava' | 'falling_debris';
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: Record<string, unknown>;
}

export interface ObstacleSpec {
  id: string;
  type: 'crate' | 'supply_box' | 'sandbags' | 'barricade';
  x: number;
  footY: number;
  width: number;
  height: number;
  destructible: boolean;
}

export interface PickupSpec {
  type: 'weapon' | 'health' | 'ammo' | 'score';
  weaponType?: string;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
}

export interface LevelData {
  id: string;
  name: string;
  displayName: string;
  width: number;
  height: number;
  segments: LevelSegment[];
  checkpoints: CheckpointSpec[];
  encounters: EncounterZone[];
  hazards: HazardSpec[];
  obstacles: ObstacleSpec[];
  pickups: PickupSpec[];
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  backgroundColor: string;
  backgroundLayers: BackgroundLayer[];
  musicKey?: string;
}

export interface BackgroundLayer {
  texture: string;
  speed: number; // parallax factor (0-1)
  repeatX: boolean;
  repeatY: boolean;
}

export const levelData: LevelData = {
  id: 'level_1',
  name: 'operation_emerald_strike',
  displayName: 'OPERATION EMERALD STRIKE',
  width: 15000,
  height: 600,
  startPosition: { x: 100, y: 300 },
  endPosition: { x: 14500, y: 300 },
  backgroundColor: '#87ceeb',
  backgroundLayers: [
    { texture: 'bg_sky', speed: 0, repeatX: true, repeatY: false },
    { texture: 'bg_mountains_far', speed: 0.1, repeatX: true, repeatY: false },
    { texture: 'bg_mountains_mid', speed: 0.3, repeatX: true, repeatY: false },
  ],
  segments: [
    // 0: Dropship intro / landing zone
    { id: 'intro_lz', name: 'Landing Zone', x: 0, width: 800, segmentType: 'intro' },
    // 1: Jungle path with patrols
    { id: 'jungle_path', name: 'Jungle Path', x: 800, width: 2000, segmentType: 'ground' },
    // 2: Destroyed checkpoint
    { id: 'destroyed_cp', name: 'Destroyed Checkpoint', x: 2800, width: 800, segmentType: 'ground' },
    // 3: Broken bridge gap
    { id: 'bridge', name: 'Broken Bridge', x: 3600, width: 600, segmentType: 'platform' },
    // 4: Combat arena
    { id: 'arena', name: 'Combat Arena', x: 4200, width: 1200, segmentType: 'combat' },
    // 5: Underground research entrance
    { id: 'research_entrance', name: 'Research Entrance', x: 5400, width: 1000, segmentType: 'ground' },
    // 6: Enemy laboratory
    { id: 'lab', name: 'Enemy Laboratory', x: 6400, width: 2000, segmentType: 'combat' },
    // 7: Facility alarm / escape
    { id: 'escape', name: 'Escape Route', x: 8400, width: 2000, segmentType: 'ground' },
    // 8: Boss arena
    { id: 'boss_arena', name: 'Boss Arena', x: 10400, width: 4600, segmentType: 'boss' },
  ],
  checkpoints: [
    { id: 1, x: 2400, y: 300, weapon: undefined, weaponLevel: undefined },
    { id: 2, x: 5350, y: 300, weapon: undefined, weaponLevel: undefined },
  ],
  encounters: [
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
  ],
  hazards: [
    { type: 'explosive_barrel', x: 2900, y: 300 },
    { type: 'explosive_barrel', x: 2950, y: 300 },
    { type: 'pit', x: 3800, y: 300, width: 100, height: 300 },
    { type: 'explosive_barrel', x: 4600, y: 300 },
    { type: 'electric_floor', x: 7000, y: 350, width: 200, height: 50 },
    { type: 'laser', x: 7600, y: 200, width: 10, height: 200 },
    { type: 'explosive_barrel', x: 9200, y: 300 },
  ],
  obstacles: [
    // Low, jumpable cover establishes a gentle opening combat rhythm.
    { id: 'lz_cover', type: 'sandbags', x: 1000, footY: 400, width: 48, height: 24, destructible: false },
    { id: 'overlook_cache', type: 'supply_box', x: 2300, footY: 284, width: 32, height: 32, destructible: true },
    { id: 'jungle_crate', type: 'crate', x: 2600, footY: 400, width: 32, height: 32, destructible: true },
    { id: 'arena_barricade', type: 'barricade', x: 4330, footY: 400, width: 48, height: 28, destructible: false },
    { id: 'lab_equipment', type: 'supply_box', x: 6180, footY: 400, width: 32, height: 32, destructible: true },
    { id: 'lab_cover', type: 'sandbags', x: 7420, footY: 400, width: 48, height: 24, destructible: false },
    { id: 'escape_crate', type: 'crate', x: 8330, footY: 400, width: 32, height: 32, destructible: true },
    { id: 'boss_approach_cover', type: 'barricade', x: 9900, footY: 400, width: 48, height: 28, destructible: false },
  ],
  pickups: [
    { type: 'weapon', weaponType: 'spread_blaster', x: 1300, y: 280 },
    { type: 'weapon', weaponType: 'rapid_cannon', x: 4800, y: 250 },
    { type: 'weapon', weaponType: 'plasma_beam', x: 7200, y: 250 },
    { type: 'weapon', weaponType: 'rocket_launcher', x: 9600, y: 200 },
    { type: 'health', x: 3500, y: 280 },
    { type: 'health', x: 6200, y: 280 },
    { type: 'health', x: 8500, y: 280 },
  ],
};

/** Spawn points for enemies (defined separately for precise positioning) */
export const enemySpawnPoints = {
  // Encounter 1
  inf_1: { x: 1400, y: 300 },
  rifle_1: { x: 1600, y: 300 },

  // Encounter 2
  inf_2: { x: 3100, y: 300 },
  inf_3: { x: 3300, y: 300 },
  shield_1: { x: 3500, y: 300 },

  // Encounter 3
  rifle_2: { x: 4500, y: 300 },
  rifle_3: { x: 4800, y: 300 },
  heavy_1: { x: 5100, y: 300 },

  // Encounter 4
  drone_1: { x: 6900, y: 200 },
  drone_2: { x: 7100, y: 220 },
  turret_1: { x: 7300, y: 340 },

  // Encounter 5
  shield_2: { x: 9100, y: 300 },
  heavy_2: { x: 9500, y: 300 },
  inf_4: { x: 9800, y: 300 },
};

export interface EnemySpawnPoint {
  x: number;
  y: number;
}
