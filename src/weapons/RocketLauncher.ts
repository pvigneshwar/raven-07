/**
 * Rocket Launcher - Slow projectile, high damage, area-of-effect explosion.
 */

import type { AimDirection } from '../config/gameConfig';
import type { WeaponConfig } from '../data/weaponData';
import { BaseWeapon } from './BaseWeapon';

export class RocketLauncher extends BaseWeapon {
  constructor(scene: import('phaser').Scene, config: WeaponConfig) {
    super(scene, config);
  }

  protected onFire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const muzzle = this.getMuzzlePosition(x, y, aim, facing);
    const dirX = aim.x;
    const dirY = aim.y;

    // Rockets are slower but more damaging
    this.spawnProjectile(muzzle.x, muzzle.y, dirX, dirY, 'bullet_rocket', 250, this.config.damage);
  }
}
