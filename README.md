# RAVEN-07: SHADOW STRIKE

A playable 2D side-scrolling run-and-gun game built with TypeScript, Vite, and Phaser 3. Character art is bundled; terrain and many effects are generated at load time.

## Description

RAVEN-07: SHADOW STRIKE is an original run-and-gun game inspired by classic arcade shooters. Players control an elite operative through a jungle battlefield filled with enemies, hazards, and a mechanical boss walker.

The first campaign level, **Operation Emerald Strike**, includes:
- Intro sequence with dropship arrival
- Jungle platforming with moving platforms and hazards
- Six distinct enemy types with AI behavior
- Five weapon types with upgrade system
- Two checkpoint systems
- Combat arenas that lock down
- Boss fight with three phases
- Victory and Game Over screens

## Controls

### Keyboard
```
A / Left Arrow    Move Left
D / Right Arrow   Move Right
Space             Jump
S / Down Arrow    Crouch
J                 Shoot
K                 Switch Weapon
W / Up Arrow      Aim Up
Escape            Pause
F2                Debug Mode (development only)
```

### Gamepad

Left stick moves, right stick aims, A jumps, right trigger fires, Y switches weapons, and Start pauses.

### Mouse
- Left Mouse Button — Shoot in the mouse direction

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The game will be available at `http://localhost:5173` (or the next available port).

## Production

```bash
npm run build
npm run preview
npm run test:production
```

`npm test` runs the gameplay browser suite. `npm run test:production` builds the actual production bundle and runs a browser smoke test against it.

## Technology

- **TypeScript** — Type-safe game logic
- **Vite** — Build tool and dev server
- **Phaser 3.90.0** — Game framework (WebGL + Web Audio)
- **HTML5 Canvas / WebGL** — Rendering
- **Web Audio API** — Procedural sound generation
- **Playwright** — E2E browser testing

## Folder Overview

```
raven-07/
├── public/
│   └── assets/          # Static asset directories
├── src/
│   ├── config/          # Game configuration constants
│   ├── core/            # EventBus, GameState, SaveManager
│   ├── entities/        # Player, Enemy, Projectile base classes
│   ├── enemies/         # 6 enemy type implementations
│   ├── bosses/          # BaseBoss, JungleSiegeWalker
│   ├── weapons/         # BaseWeapon + 5 weapon subclasses
│   ├── systems/         # AudioManager, EffectsManager, InputManager,
│   │                    # EnemySpawner, CollisionManager, WeaponManager,
│   │                    # ObjectPool, AssetGenerator
│   ├── scenes/          # Boot, Preload, MainMenu, LevelOne,
│   │                    # GameOver, Victory scenes
│   ├── ui/              # HUD, BossHealthBar, PauseMenu
│   ├── data/            # weaponData, enemyData, levelData
│   ├── utils/           # Helper functions
│   └── main.ts          # Entry point
├── e2e/                 # Playwright browser tests
└── index.html
```

## Game Features

### Weapons
- **Pulse Rifle** — Default weapon, unlimited ammo
- **Spread Blaster** — 3-5-7 projectile spread, up to 3 levels
- **Rapid Cannon** — Fast fire rate, up to 2 levels
- **Plasma Beam** — Penetrating energy beam, up to 3 levels
- **Rocket Launcher** — Explosive area damage

### Enemies
- **Infantry** — Patrol, detect, and shoot
- **Rifle Soldier** — Medium-range burst attacks
- **Heavy Gunner** — High health, sustained fire
- **Flying Drone** — Airborne with sinusoidal movement
- **Turret** — Stationary, tracks player
- **Shield Soldier** — Blocks frontal attacks

### Boss — Jungle Siege Walker
- **Phase 1:** Machine gun burst, forward cannon, ground stomp
- **Phase 2 (~65% HP):** Faster attacks, missiles, drone deployment
- **Phase 3 (~30% HP):** Laser sweep, aggressive movement, spark effects

### Additional Features
- Combo scoring system
- Parallax scrolling backgrounds
- Screen effects (camera shake, damage flash)
- Particle effects for explosions and impacts
- Procedural sound generation (no external audio files needed)
- Versioned, validated browser-local checkpoint saves with Continue
- Persistent audio, difficulty, effects, tutorial-hint, and vibration settings
- Debug mode (F2) with FPS and entity counters in development only

## Known Limitations

- Single level campaign (additional levels planned)
- All audio is procedurally generated via Web Audio API
- Save data is browser-local storage only
- Browser VSync is browser-managed; integer pixel-scale selection is not exposed in the menus.
- Pooling currently covers short-lived visual effects, not every projectile type.

## Credits

- **Game Design & Development:** Claude Code
- **Game Engine:** Phaser 3.90.0
- **Runtime:** TypeScript + Vite
