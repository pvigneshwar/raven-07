export enum TerrainType {
  SOLID_GROUND = 'solid-ground',
  ONE_WAY_PLATFORM = 'one-way-platform',
  SOLID_PLATFORM = 'solid-platform',
  MOVING_PLATFORM = 'moving-platform',
  HAZARD = 'hazard',
  BOSS_FLOOR = 'boss-floor',
}

export interface TerrainCollisionSides {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface PlatformConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: TerrainType;
  collision: TerrainCollisionSides;
}

export interface MovingPlatformConfig extends PlatformConfig {
  endX: number;
  endY: number;
  speed: number;
  waitTime: number;
  loopMode: 'pingpong' | 'loop';
}
