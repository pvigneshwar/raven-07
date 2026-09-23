import { TerrainType, type MovingPlatformConfig, type PlatformConfig } from '../terrain/TerrainType';

const TOP_ONLY = { top: true, bottom: false, left: false, right: false } as const;
const SOLID = { top: true, bottom: true, left: true, right: true } as const;

const raised = [
  [200, 370, 300], [500, 350, 100], [700, 330, 150], [900, 360, 200],
  [1200, 320, 100], [1500, 350, 200], [1700, 310, 80], [2000, 340, 250],
  [2700, 370, 150], [2950, 340, 120], [3500, 370, 100], [3950, 350, 200],
  [4200, 320, 120], [4500, 360, 200], [4800, 300, 100], [5100, 340, 300],
  [5600, 370, 200], [5900, 350, 120], [6200, 320, 100], [6600, 360, 250],
  [6900, 300, 80], [7200, 340, 200], [8500, 370, 300], [8900, 330, 120],
  [9200, 350, 200], [9500, 310, 100], [10100, 370, 300], [10400, 340, 200],
  [10700, 360, 250],
] as const;

// Short, readable route choices layered over the baseline platforms. All are
// one-way: the player can approach through their sides and jump from below.
const routePlatforms: PlatformConfig[] = [
  { id: 'jungle_step', x: 2190, y: 372, width: 120, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
  { id: 'jungle_overlook', x: 2300, y: 302, width: 130, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
  { id: 'bridge_upper_span', x: 3800, y: 320, width: 180, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
  { id: 'lab_overlook', x: 7550, y: 292, width: 180, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
  { id: 'escape_step', x: 8180, y: 365, width: 130, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
  { id: 'escape_overlook', x: 8380, y: 302, width: 170, height: 16,
    type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY },
];

export const STATIC_TERRAIN: PlatformConfig[] = [
  // The pit from 3750..3850 is a genuine collision gap rather than a
  // decorative hazard painted over an otherwise continuous floor.
  { id: 'ground_west', x: 1875, y: 432, width: 3750, height: 64, type: TerrainType.SOLID_GROUND, collision: SOLID },
  { id: 'ground_east', x: 9425, y: 432, width: 11150, height: 64, type: TerrainType.SOLID_GROUND, collision: SOLID },
  ...raised.map(([x, y, width], index): PlatformConfig => ({
    id: `platform_${String(index + 1).padStart(2, '0')}`,
    x, y, width, height: 16, type: TerrainType.ONE_WAY_PLATFORM, collision: TOP_ONLY,
  })),
  ...routePlatforms,
  { id: 'boss_floor', x: 11500, y: 380, width: 3000, height: 16, type: TerrainType.BOSS_FLOOR, collision: TOP_ONLY },
];

export const MOVING_TERRAIN: MovingPlatformConfig[] = [
  { id: 'moving_horizontal', x: 1300, y: 300, endX: 1400, endY: 300, width: 160, height: 20,
    type: TerrainType.MOVING_PLATFORM, collision: TOP_ONLY, speed: 50, waitTime: 0, loopMode: 'pingpong' },
  { id: 'moving_vertical', x: 8700, y: 330, endX: 8700, endY: 250, width: 160, height: 20,
    type: TerrainType.MOVING_PLATFORM, collision: TOP_ONLY, speed: 27, waitTime: 0, loopMode: 'pingpong' },
  { id: 'research_elevator', x: 5450, y: 360, endX: 5450, endY: 300, width: 96, height: 20,
    type: TerrainType.MOVING_PLATFORM, collision: TOP_ONLY, speed: 15, waitTime: 0, loopMode: 'pingpong' },
];
