/**
 * Weapon data definitions - Configuration for all weapons.
 */

import { WeaponType } from '../config/gameConfig';

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  description: string;
  damage: number;
  fireRate: number; // ms between shots
  projectileSpeed: number;
  projectileTexture: string;
  projectileSize: { width: number; height: number };
  spread: number; // angle in degrees for projectile spread
  penetrates: boolean;
  projectileCount?: number;
  explosionRadius?: number; // for explosive weapons
  ammo?: number; // limited ammo; undefined = infinite
  upgradeLevel: number; // 0 = base
  maxUpgradeLevel: number;
  sound: string;
  iconKey: string;
}

export const weaponData: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PULSE_RIFLE]: {
    type: WeaponType.PULSE_RIFLE,
    name: 'Pulse Rifle',
    description: 'Balanced assault weapon with unlimited ammo.',
    damage: 1,
    fireRate: 250,
    projectileSpeed: 500,
    projectileTexture: 'bullet_player',
    projectileSize: { width: 8, height: 3 },
    spread: 0,
    penetrates: false,
    ammo: undefined,
    upgradeLevel: 0,
    maxUpgradeLevel: 0,
    sound: 'sfx_rifle',
    iconKey: 'weapon_pulse_rifle',
  },
  [WeaponType.SPREAD_BLASTER]: {
    type: WeaponType.SPREAD_BLASTER,
    name: 'Spread Blaster',
    description: 'Fires multiple projectiles in a spread pattern.',
    damage: 1,
    fireRate: 400,
    projectileSpeed: 400,
    projectileTexture: 'bullet_spread',
    projectileSize: { width: 6, height: 3 },
    spread: 15,
    penetrates: false,
    ammo: undefined,
    upgradeLevel: 0,
    maxUpgradeLevel: 3,
    sound: 'sfx_spread',
    iconKey: 'weapon_spread',
  },
  [WeaponType.RAPID_CANNON]: {
    type: WeaponType.RAPID_CANNON,
    name: 'Rapid Cannon',
    description: 'High fire rate with lower individual damage.',
    damage: 1,
    fireRate: 70,
    projectileSpeed: 550,
    projectileTexture: 'bullet_rapid',
    projectileSize: { width: 6, height: 2 },
    spread: 1,
    penetrates: false,
    ammo: undefined,
    upgradeLevel: 0,
    maxUpgradeLevel: 2,
    sound: 'sfx_rapid',
    iconKey: 'weapon_rapid',
  },
  [WeaponType.PLASMA_BEAM]: {
    type: WeaponType.PLASMA_BEAM,
    name: 'Plasma Beam',
    description: 'High-damage penetrating energy beam.',
    damage: 3,
    fireRate: 350,
    projectileSpeed: 450,
    projectileTexture: 'bullet_plasma',
    projectileSize: { width: 12, height: 3 },
    spread: 0,
    penetrates: true,
    ammo: undefined,
    upgradeLevel: 0,
    maxUpgradeLevel: 2,
    sound: 'sfx_plasma',
    iconKey: 'weapon_plasma',
  },
  [WeaponType.ROCKET_LAUNCHER]: {
    type: WeaponType.ROCKET_LAUNCHER,
    name: 'Rocket Launcher',
    description: 'Slow but powerful explosive weapon.',
    damage: 10,
    fireRate: 600,
    projectileSpeed: 250,
    projectileTexture: 'bullet_rocket',
    projectileSize: { width: 16, height: 6 },
    spread: 0,
    penetrates: false,
    explosionRadius: 60,
    ammo: undefined,
    upgradeLevel: 0,
    maxUpgradeLevel: 2,
    sound: 'sfx_rocket',
    iconKey: 'weapon_rocket',
  },
} as const;

export function getWeaponConfig(type: WeaponType, upgradeLevel: number): WeaponConfig {
  const base = { ...weaponData[type] };
  let config = { ...base, upgradeLevel };

  switch (type) {
    case WeaponType.SPREAD_BLASTER:
      config = { ...base, upgradeLevel };
      // Spread blaster level 1: 3 projectiles, level 2: 5, level 3: 7
      const projCount = 3 + upgradeLevel * 2;
      config.projectileCount = projCount;
      break;

    case WeaponType.RAPID_CANNON:
      // Faster fire rate with upgrades
      config.fireRate = base.fireRate * (1 - upgradeLevel * 0.15);
      break;

    case WeaponType.PLASMA_BEAM:
      // More damage with upgrades
      config.damage = base.damage + upgradeLevel;
      config.penetrates = true;
      break;

    case WeaponType.ROCKET_LAUNCHER:
      // Bigger explosion with upgrades
      config.explosionRadius = (base.explosionRadius ?? 60) + upgradeLevel * 10;
      break;

    default:
      break;
  }

  return config;
}

export function getSpreadProjectileCount(weapon: WeaponType, level: number): number {
  if (weapon === WeaponType.SPREAD_BLASTER) {
    return 3 + level * 2; // Level 0 = 3, Level 1 = 5, Level 2 = 7
  }
  return 1;
}
