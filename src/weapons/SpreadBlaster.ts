/**
 * Spread Blaster - Fires multiple projectiles in a spread pattern.
 * Level 1: 3 projectiles, Level 2: 5, Level 3: 7
 */

import type { AimDirection } from '../config/gameConfig';
import type { WeaponConfig } from '../data/weaponData';
import { BaseWeapon } from './BaseWeapon';

export class SpreadBlaster extends BaseWeapon {
  constructor(scene: import('phaser').Scene, config: WeaponConfig) {
    super(scene, config);
  }

  protected onFire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const count = this.getProjectileCount(); // 3 + level * 2
    const spreadAngle = this.config.spread * (Math.PI / 180);

    const baseDirX = aim.x;
    const baseDirY = aim.y;
    const angle = Math.atan2(baseDirY, baseDirX);

    const muzzle = this.getMuzzlePosition(x, y, aim, facing);

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spreadAngle;
      const projAngle = angle + offset;
      const dirX = Math.cos(projAngle);
      const dirY = Math.sin(projAngle);

      this.spawnProjectile(muzzle.x, muzzle.y, dirX, dirY, 'bullet_spread');
    }
  }
}
