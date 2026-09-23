/**
 * WeaponManager - Manages all weapons, switching, and firing.
 * Simplified: weapons create projectiles directly.
 */

import type Phaser from 'phaser';
import type { WeaponType, AimDirection } from '../config/gameConfig';
import { WeaponType as WT } from '../config/gameConfig';
import { weaponData, getWeaponConfig } from '../data/weaponData';
import type { BaseWeapon } from '../weapons/BaseWeapon';
import { PulseRifle } from '../weapons/PulseRifle';
import { SpreadBlaster } from '../weapons/SpreadBlaster';
import { RapidCannon } from '../weapons/RapidCannon';
import { PlasmaBeam } from '../weapons/PlasmaBeam';
import { RocketLauncher } from '../weapons/RocketLauncher';
import { EventBus, Events } from '../core/EventBus';

export class WeaponManager {
  private scene: Phaser.Scene;
  private weapons: Map<WeaponType, BaseWeapon>;
  private currentWeapon: BaseWeapon;
  private weaponOrder: WeaponType[];
  private unlockedWeapons: WeaponType[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.weapons = new Map();
    // Acquisition order is the weapon stack used by switchToNext().
    this.weaponOrder = [WT.PULSE_RIFLE];
    this.unlockedWeapons = [WT.PULSE_RIFLE];

    // Create all weapons
    this.createWeapons();

    // Start with Pulse Rifle
    this.currentWeapon = this.weapons.get(WT.PULSE_RIFLE)!;
  }

  private createWeapons(): void {
    const configs = Object.values(weaponData);

    for (const config of configs) {
      const weapon = this.createWeapon(config.type);
      this.weapons.set(config.type, weapon);
    }
  }

  private createWeapon(type: WeaponType): BaseWeapon {
    const config = getWeaponConfig(type, 0);

    switch (type) {
      case WT.PULSE_RIFLE:
        return new PulseRifle(this.scene, config);
      case WT.SPREAD_BLASTER:
        return new SpreadBlaster(this.scene, config);
      case WT.RAPID_CANNON:
        return new RapidCannon(this.scene, config);
      case WT.PLASMA_BEAM:
        return new PlasmaBeam(this.scene, config);
      case WT.ROCKET_LAUNCHER:
        return new RocketLauncher(this.scene, config);
      default:
        return new PulseRifle(this.scene, config);
    }
  }

  /** Switch to the next weapon in inventory */
  switchToNext(): void {
    if (this.weaponOrder.length <= 1) {
      this.setWeapon(WT.PULSE_RIFLE);
      return;
    }

    const currentIndex = Math.max(0, this.weaponOrder.indexOf(this.currentWeapon.getType()));
    const nextIndex = (currentIndex + 1) % this.weaponOrder.length;
    const nextType = this.weaponOrder[nextIndex];
    const nextLevel = this.weapons.get(nextType)?.getUpgradeLevel() ?? 0;

    this.setWeapon(nextType, nextLevel);
  }

  /** Pick up/upgrade a weapon */
  pickUpWeapon(type: WeaponType): void {
    if (!this.unlockedWeapons.includes(type)) {
      this.unlockedWeapons.push(type);
      this.weaponOrder.push(type);
    }

    const wasSameWeapon = this.currentWeapon.getType() === type;
    let level = this.currentWeapon.getUpgradeLevel();

    if (wasSameWeapon) {
      level = Math.min(level + 1, this.currentWeapon.maxLevel);
    } else {
      level = 0;
    }

    this.setWeapon(type, level);

    if (wasSameWeapon) {
      EventBus.emit(Events.NOTIFICATION, `${this.currentWeapon.getName()} L${level + 1}`);
    } else {
      EventBus.emit(Events.NOTIFICATION, `WEAPON: ${this.currentWeapon.getName()}`);
    }
  }

  /** Set the active weapon */
  setWeapon(type: WeaponType, level: number = 0): void {
    const weapon = this.weapons.get(type);
    if (!weapon) {
      this.setWeapon(WT.PULSE_RIFLE, 0);
      return;
    }

    weapon.setUpgradeLevel(level);
    this.currentWeapon = weapon;

    EventBus.emit(Events.WEAPON_SWITCH, type, level);
  }

  /** Set the weapon upgrade level */
  setWeaponLevel(type: WeaponType, level: number): void {
    const weapon = this.weapons.get(type);
    if (weapon) {
      weapon.setUpgradeLevel(level);
    }
  }

  /** Fire the current weapon */
  fire(x: number, y: number, aim: AimDirection, facing: 'left' | 'right'): void {
    this.currentWeapon.fire(x, y, aim, facing);
  }

  /** Get the current weapon */
  getCurrentWeapon(): BaseWeapon {
    return this.currentWeapon;
  }

  /** Get the current weapon type */
  getCurrentWeaponType(): WeaponType {
    return this.currentWeapon.getType();
  }

  /** Get the current weapon level */
  getCurrentWeaponLevel(): number {
    return this.currentWeapon.getUpgradeLevel();
  }

  /** Get the weapon name */
  getCurrentWeaponName(): string {
    return this.currentWeapon.getName();
  }

  /** Get unlocked weapons */
  getUnlockedWeapons(): WeaponType[] {
    return [...this.weaponOrder];
  }
}
