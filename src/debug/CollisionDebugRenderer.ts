import Phaser from 'phaser';
import { TerrainType } from '../terrain/TerrainType';

export class CollisionDebugRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private enabled = false;

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(200);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.graphics.clear();
  }

  draw(terrain: Iterable<Phaser.GameObjects.GameObject>, player: Phaser.Physics.Arcade.Sprite): void {
    if (!this.enabled) return;
    this.graphics.clear();
    for (const object of terrain) {
      const body = object.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
      if (!body) continue;
      const type = object.getData('terrainType') as TerrainType;
      if (type === TerrainType.SOLID_GROUND || type === TerrainType.SOLID_PLATFORM) {
        this.graphics.lineStyle(2, 0x00ff66, 0.9).strokeRect(body.left, body.top, body.width, body.height);
      } else {
        const color = type === TerrainType.MOVING_PLATFORM ? 0x00bbff : type === TerrainType.BOSS_FLOOR ? 0xff3355 : 0xffdd00;
        this.graphics.lineStyle(3, color, 1).lineBetween(body.left, body.top, body.right, body.top);
      }
    }
    const body = player.body as Phaser.Physics.Arcade.Body;
    this.graphics.fillStyle(0xffffff, 1).fillCircle(player.x, body.bottom, 3);
    this.graphics.fillStyle(0xff00ff, 1).fillCircle(player.x, body.prev.y + body.height, 3);
  }

  destroy(): void { this.graphics.destroy(); }
}
