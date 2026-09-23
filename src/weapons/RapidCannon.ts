/**
 * Rapid Cannon - Very fast fire rate, lower individual damage, slight spread.
 */

import type { AimDirection } from '../config/gameConfig';
import type { WeaponConfig } from '../data/weaponData';
import { BaseWeapon } from './BaseWeapon';

export class RapidCannon extends BaseWeapon {
  constructor(scene: import('phaser').Scene, config: WeaponConfig) {
    super(scene, config);
  }

  protected onFire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const muzzle = this.getMuzzlePosition(x, y, aim, facing);
    const dirX = aim.x;
    const dirY = aim.y;

    // Slight random spread
    const spread = this.config.spread * (Math.PI / 180) * (Math.random() - 0.5) * 2;
    const angle = Math.atan2(dirY, dirX) + spread;
    const spreadDirX = Math.cos(angle);
    const spreadDirY = Math.sin(angle);

    this.spawnProjectile(muzzle.x, muzzle.y, spreadDirX, spreadDirY, 'bullet_rapid', 550, 1);
  }
}
