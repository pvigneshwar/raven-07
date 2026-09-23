/**
 * Plasma Beam - Slow fire rate, high damage, can penetrate weaker enemies.
 */

import type { AimDirection } from '../config/gameConfig';
import type { WeaponConfig } from '../data/weaponData';
import { BaseWeapon } from './BaseWeapon';

export class PlasmaBeam extends BaseWeapon {
  constructor(scene: import('phaser').Scene, config: WeaponConfig) {
    super(scene, config);
  }

  protected onFire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    const muzzle = this.getMuzzlePosition(x, y, aim, facing);
    const dirX = aim.x;
    const dirY = aim.y;

    const damage = this.config.damage + this.upgradeLevel;

    this.spawnProjectile(muzzle.x, muzzle.y, dirX, dirY, 'bullet_plasma', 450, damage);
  }
}
