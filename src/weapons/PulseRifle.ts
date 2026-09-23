/**
 * Pulse Rifle - Default weapon. Moderate damage, fast projectile, unlimited ammo.
 */

import type { AimDirection } from '../config/gameConfig';
import type { WeaponConfig } from '../data/weaponData';
import { BaseWeapon } from './BaseWeapon';

export class PulseRifle extends BaseWeapon {
  constructor(scene: import('phaser').Scene, config: WeaponConfig) {
    super(scene, config);
  }

  protected onFire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const dirX = aim.x;
    const dirY = aim.y;

    const muzzle = this.getMuzzlePosition(x, y, aim, facing);
    this.spawnProjectile(muzzle.x, muzzle.y, dirX, dirY, 'bullet_player');
  }
}
