import Phaser from 'phaser';
import { TerrainType } from '../terrain/TerrainType';

const LANDING_EPSILON = 3;
const FOOT_INSET = 3;

export function isTopOnlyTerrain(object: Phaser.GameObjects.GameObject): boolean {
  const type = object.getData('terrainType') as TerrainType | undefined;
  return type === TerrainType.ONE_WAY_PLATFORM || type === TerrainType.MOVING_PLATFORM || type === TerrainType.BOSS_FLOOR;
}

/** Swept top-surface test used as Arcade's process callback. */
export function canLandOnTerrain(
  actor: Phaser.Physics.Arcade.Sprite,
  terrain: Phaser.GameObjects.GameObject,
  ignoredTerrainId?: string | null,
): boolean {
  const actorBody = actor.body as Phaser.Physics.Arcade.Body | null;
  const terrainBody = terrain.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
  if (!actorBody || !terrainBody || !terrainBody.enable) return false;

  const type = terrain.getData('terrainType') as TerrainType | undefined;
  if (!isTopOnlyTerrain(terrain)) return type !== TerrainType.HAZARD;
  if (ignoredTerrainId && terrain.getData('terrainId') === ignoredTerrainId) return false;

  const previousBottom = actorBody.prev.y + actorBody.height;
  const currentBottom = actorBody.y + actorBody.height;
  const platformTop = terrainBody.top;
  const horizontallyOverlapping =
    actorBody.right - FOOT_INSET > terrainBody.left && actorBody.left + FOOT_INSET < terrainBody.right;

  return actorBody.velocity.y >= 0 &&
    previousBottom <= platformTop + LANDING_EPSILON &&
    currentBottom >= platformTop - LANDING_EPSILON &&
    horizontallyOverlapping;
}
