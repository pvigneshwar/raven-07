/**
 * LevelOneScene - The main game level: Operation Emerald Strike.
 * A complete run-and-gun campaign level with combat, platforming,
 * checkpoints, hazards, and a boss fight.
 */

import Phaser from 'phaser';
import { CollisionGroup, GameState, WeaponType } from '../config/gameConfig';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';
import { InputManager } from '../systems/InputManager';
import { WeaponManager } from '../systems/WeaponManager';
import { EnemySpawner } from '../systems/EnemySpawner';
import { EffectsManager } from '../systems/EffectsManager';
import { HUD } from '../ui/HUD';
import type { Enemy } from '../entities/Enemy';
import { BossHealthBar } from '../ui/BossHealthBar';
import { PauseMenu } from '../ui/PauseMenu';
import { Player } from '../entities/Player';
import { JungleSiegeWalker } from '../bosses/JungleSiegeWalker';
import { BossState } from '../bosses/BossState';
import { STATIC_TERRAIN, MOVING_TERRAIN } from '../config/levelCollision';
import { TerrainType } from '../terrain/TerrainType';
import { canLandOnTerrain } from '../physics/TerrainCollision';
import { CollisionDebugRenderer } from '../debug/CollisionDebugRenderer';
import { levelData, type PickupSpec, type ObstacleSpec } from '../data/levelData';
import { audioManager } from '../systems/AudioManager';
import { GameFlowManager, GameFlowState } from '../core/GameFlowManager';
import { FONT } from '../ui/Typography';
import { SaveManager } from '../core/SaveManager';

export class LevelOneScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private weaponManager!: WeaponManager;
  private enemySpawner!: EnemySpawner;
  private effectsManager!: EffectsManager;
  private hud!: HUD;
  private bossHealthBar!: BossHealthBar;
  private pauseMenu!: PauseMenu;
  private boss: JungleSiegeWalker | null = null;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private backgroundLayers: Array<{ sprite: Phaser.GameObjects.TileSprite; factor: number }> = [];
  private industrialBackground!: Phaser.GameObjects.Image;
  private levelWidth: number = 0;
  private levelHeight: number = 0;
  private checkpoints: Phaser.GameObjects.Zone[] = [];
  private currentCheckpoint: number = -1;
  private weaponPickups: Phaser.Physics.Arcade.Group;
  private combatZones: Phaser.GameObjects.Zone[] = [];
  private isArenaLocked: boolean = false;
  private debugEnabled: boolean = false;
  private debugText: Phaser.GameObjects.Text;
  private introActive: boolean = false;
  private introSequence: Phaser.GameObjects.Container;
  private worldBounds: Phaser.Geom.Rectangle;
  private hasSpawnedBoss: boolean = false;
  private bulletGroup: Phaser.Physics.Arcade.Group;
  private enemyBulletGroup: Phaser.Physics.Arcade.Group;
  private bombProjectiles!: Phaser.Physics.Arcade.Group;
  private destructibleBombs!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private hazardFields: Array<{ sprite: Phaser.GameObjects.TileSprite;
    kind: 'electric_floor' | 'laser'; offset: number }> = [];
  private checkpointVisuals: Phaser.GameObjects.Sprite[] = [];
  private gameFlowManager: GameFlowManager;
  private lockedArenaLeft: number | null = null;
  private lockedArenaRight: number | null = null;
  private movingPlatforms: Array<{
    sprite: Phaser.Physics.Arcade.Sprite;
    startX: number; startY: number; endX: number; endY: number; speed: number; direction: 1 | -1;
  }> = [];
  private terrainDebugRenderer!: CollisionDebugRenderer;
  private ridingPlatform: Phaser.Physics.Arcade.Sprite | null = null;
  private ridingOffsetX = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private nextProjectileTrailAt = 0;
  private startAtCheckpoint = false;

  constructor() {
    super({ key: 'LevelOneScene' });
  }

  init(data?: { action?: string; restart?: boolean; checkpoint?: number }): void {
    this.eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.eventUnsubscribers = [];
    this.startAtCheckpoint = data?.action === 'continue' || data?.action === 'checkpoint';
  }

  create(): void {
    // Game Over pauses Arcade physics before leaving; a reused scene must
    // explicitly resume it so Retry starts with live bodies.
    this.physics.resume();
    // Phaser restarts this same Scene instance after Retry. Its old game
    // objects have been destroyed, so every run-scoped reference must be
    // cleared before the level is rebuilt.
    this.backgroundLayers = [];
    this.checkpoints = [];
    this.checkpointVisuals = [];
    this.hazardFields = [];
    this.combatZones = [];
    this.movingPlatforms = [];
    this.ridingPlatform = null;
    this.ridingOffsetX = 0;
    this.boss = null;
    this.currentCheckpoint = -1;
    this.isArenaLocked = false;
    this.hasSpawnedBoss = false;
    this.lockedArenaLeft = null;
    this.lockedArenaRight = null;
    this.debugEnabled = false;
    this.nextProjectileTrailAt = 0;
    this.gameFlowManager = new GameFlowManager(GameFlowState.INTRO);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.levelWidth = levelData.width;
    this.levelHeight = levelData.height;
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, this.levelWidth, this.levelHeight);

    // Set world bounds
    this.physics.world.setBounds(0, 0, this.levelWidth, this.levelHeight, true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);

    // Set background
    this.cameras.main.setBackgroundColor(levelData.backgroundColor);

    // Create parallax backgrounds
    this.createBackgrounds();

    // Create input manager
    this.inputManager = new InputManager(this);

    // Create the player BEFORE any level geometry. createPlatforms() (via
    // createMovingPlatforms()/createElevators()) registers
    // physics.add.collider(this.player, ...) for moving platforms and the
    // elevator. If this.player hasn't been assigned yet, those calls pass
    // `undefined` as the collider's first object, which crashes
    // World.collideObjects on the very first physics step with
    // "Cannot read properties of undefined (reading 'isParent')" --
    // reproducing immediately on clicking Start, before the player has done
    // anything. Player must exist before any collider referencing it is set up.
    this.createPlayer();

    // Create level geometry (platforms)
    this.createPlatforms();

    // Create effects manager
    this.effectsManager = new EffectsManager(this);

    // Cover belongs to combat/traversal, not foreground decoration.
    this.createObstacles();

    // Create weapon pickups
    this.weaponPickups = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      allowGravity: false,
      immovable: true,
    });

    // Create weapon pickups from level data
    this.createWeaponPickups();

    // Create checkpoints
    this.createCheckpoints();
    if (this.startAtCheckpoint) {
      const checkpoint = gameState.getCurrentCheckpoint();
      if (checkpoint) {
        this.currentCheckpoint = levelData.checkpoints.findIndex((entry) => entry.id === checkpoint.id);
        this.checkpointVisuals.forEach((visual, index) => {
          if (index <= this.currentCheckpoint) visual.setTexture('checkpoint_active');
        });
        const y = this.getSafePlayerY(checkpoint.x, checkpoint.y);
        this.player.setPosition(checkpoint.x, y);
        (this.player.body as Phaser.Physics.Arcade.Body).reset(checkpoint.x, y);
      }
    }

    // Create hazards
    this.createHazards();

    // Create enemy spawner
    this.enemySpawner = new EnemySpawner(this, this.player);

    // Create combat zones (arena locks)
    this.createCombatZones();

    // Set up HUD
    this.hud = new HUD(this);

    // Set up boss health bar (hidden initially)
    this.bossHealthBar = new BossHealthBar(this);
    this.bossHealthBar.hide();

    // Set up pause menu
    this.pauseMenu = new PauseMenu(this);
    this.pauseMenu.hide();

    // Create debug overlay
    this.createDebugOverlay();
    this.terrainDebugRenderer = new CollisionDebugRenderer(this);

    // Initialize bullet groups (must be before setupCollisions).
    // allowGravity: false here is required: Phaser.Physics.Arcade.Group
    // re-applies its `defaults` (allowGravity: true by default, among
    // others) to every member's body whenever one is added via .add(), not
    // just ones created via .create(). See the PROJECTILE_FIRED/
    // ENEMY_PROJECTILE_FIRED listeners below for why that's not the whole
    // fix -- velocity gets reset too, and that can't be configured away
    // since it's per-bullet.
    this.bulletGroup = this.physics.add.group({ allowGravity: false });
    this.enemyBulletGroup = this.physics.add.group({ allowGravity: false });
    this.bombProjectiles = this.physics.add.group({ allowGravity: false });
    this.bombProjectiles.collisionCategory = CollisionGroup.ENEMY_BULLET;
    this.bombProjectiles.collisionMask = CollisionGroup.PLAYER | CollisionGroup.PLAYER_BULLET;

    // Set up camera follow
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Set up collision handlers
    this.setupCollisions();

    // Play level music
    audioManager.playMusic('music_level');
    audioManager.playAmbience('ambience_jungle');

    // Set up event listeners
    this.setupEventListeners();

    // Start intro sequence
    this.startIntro();

    // A plain method named `destroy()` on a Scene subclass is never called
    // automatically by Phaser -- scene teardown happens through the scene's
    // own event emitter, not by invoking an instance method of that name.
    // Without this, the cleanup below (HUD/bossHealthBar/pauseMenu/
    // effectsManager destruction and scene-owned event unsubscription) never
    // ran on scene transition, despite being written as if it would (see
    // doc 10's "On scene shutdown" requirement).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    // Set up level bounds for player
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(500, 0);
    body.setMaxVelocity(300, 600);
  }

  private createBackgrounds(): void {
    const viewportWidth = this.cameras.main.width;
    const viewportHeight = this.cameras.main.height;
    this.add.image(viewportWidth / 2, viewportHeight / 2, 'bg_jungle_panorama')
      .setDisplaySize(viewportHeight * 2, viewportHeight)
      .setScrollFactor(0).setDepth(-11);
    this.industrialBackground = this.add.image(viewportWidth / 2, viewportHeight / 2, 'bg_industrial_panorama')
      .setDisplaySize(viewportHeight * 3, viewportHeight)
      .setScrollFactor(0).setDepth(-10).setAlpha(0);
    const layers = [
      { y: 105, height: 180, texture: 'bg_mountains_far', depth: -9, factor: 0.07 },
      { y: 165, height: 195, texture: 'bg_mountains_mid', depth: -8, factor: 0.18 },
      { y: 252, height: 72, texture: 'bg_fog', depth: -7, factor: 0.26 },
    ];
    for (const layer of layers) {
      const sprite = this.add.tileSprite(0, layer.y, this.cameras.main.width, layer.height, layer.texture)
        .setOrigin(0, 0).setDepth(layer.depth).setScrollFactor(0)
        .setAlpha(layer.depth === -9 ? 0.12 : layer.depth === -8 ? 0.18 : 0.45);
      this.backgroundLayers.push({ sprite, factor: layer.factor });
    }

    // Uneven spacing and scale keep the jungle silhouette from reading as
    // a repeated stamp. These are decoration only, behind all collision.
    for (let x = 0; x < 5000; x += 230) {
      const variation = ((x / 230) * 37) % 5;
      if (variation !== 1) {
        const tree = this.add.sprite(x + variation * 11, 350, 'tree_jungle');
        tree.setDepth(-5).setAlpha(0.85);
        tree.setDisplaySize(66 + variation * 7, 86 + variation * 9);
      }
      if (variation !== 3) {
        const bush = this.add.sprite(x + 80 + variation * 5, 381, 'bush');
        bush.setDepth(-4).setAlpha(0.8);
        bush.setDisplaySize(39 + variation * 4, 30 + variation * 3);
      }
    }

  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    const supports = this.add.graphics().setDepth(-3);
    const surfaceDetails = this.add.graphics().setDepth(0);
    for (const spec of STATIC_TERRAIN) {
      if (spec.type === TerrainType.SOLID_GROUND) {
        const left = spec.x - spec.width / 2;
        for (let offset = 0; offset < spec.width;) {
          const worldX = left + offset;
          const toIndustrial = worldX < 5000 ? 5000 - worldX : Infinity;
          const width = Math.min(1024, spec.width - offset, toIndustrial);
          const texture = worldX < 5000 ? 'ground_tile' : 'ground_industrial_tile';
          this.add.tileSprite(worldX, spec.y - spec.height / 2, width, spec.height, texture)
            .setOrigin(0, 0).setTilePosition(offset, 0).setDepth(-1);
          offset += width;
        }
      } else {
        const texture = spec.x < 5000 ? 'platform' : 'platform_industrial';
        this.add.tileSprite(spec.x - spec.width / 2, spec.y - 18, spec.width, 16, texture)
          .setOrigin(0, 0).setDepth(-2);
        if (spec.type !== TerrainType.BOSS_FLOOR) {
          const bottom = spec.y - 2;
          const supportHeight = Math.max(0, 400 - bottom);
          if (supportHeight > 12 && (spec.x < 3710 || spec.x > 3890)) {
            const industrial = spec.x >= 5000;
            supports.fillStyle(industrial ? 0x3e555b : 0x51432b, 0.85);
            for (const side of [-0.31, 0.31]) {
              supports.fillRect(Math.round(spec.x + spec.width * side), bottom, 4, supportHeight);
            }
            supports.lineStyle(2, industrial ? 0x536d70 : 0x685335, 0.65);
            supports.lineBetween(spec.x - spec.width * 0.31, bottom + 10,
              spec.x + spec.width * 0.31, Math.min(398, bottom + 35));
          }
        }
      }

      const collisionY = spec.type === TerrainType.SOLID_GROUND ? spec.y : spec.y - 18 + spec.height / 2;
      const collider = this.add.rectangle(spec.x, collisionY, spec.width, spec.height, 0x000000, 0);
      collider.setData('terrainId', spec.id).setData('terrainType', spec.type).setData('collision', spec.collision);
      this.physics.add.existing(collider, true);
      this.platforms.add(collider);
      this.configureEnvironmentBody(collider);
    }

    // Sparse material cues break the long flat ground strip without adding
    // invisible colliders or obscuring platform edges.
    for (let x = 90; x < this.levelWidth - 90; x += 187) {
      if (x > 3735 && x < 3865) continue;
      if (x < 5000) {
        surfaceDetails.fillStyle(0x6c9c48, 0.7);
        surfaceDetails.fillRect(x, 396, 5, 4);
        surfaceDetails.fillRect(x + 7, 398, 3, 2);
        surfaceDetails.fillStyle(0x8a7757, 0.75);
        surfaceDetails.fillRect(x + 60, 408, 9, 3);
      } else {
        surfaceDetails.fillStyle(0xabc0b3, 0.65);
        surfaceDetails.fillRect(x, 400, 3, 2);
        surfaceDetails.fillRect(x + 65, 400, 3, 2);
        surfaceDetails.fillStyle(0x25383e, 0.8);
        surfaceDetails.fillRect(x + 35, 418, 22, 2);
      }
    }

    // Add moving platforms
    this.createMovingPlatforms();

  }

  private createMovingPlatforms(): void {
    for (const spec of MOVING_TERRAIN) {
      const texture = spec.id === 'research_elevator' ? 'elevator' : 'moving_platform';
      const platform = this.physics.add.sprite(spec.x, spec.y, texture).setDisplaySize(spec.width, spec.height);
      platform.setData('terrainId', spec.id).setData('terrainType', spec.type).setData('collision', spec.collision);
      const body = platform.body as Phaser.Physics.Arcade.Body;
      // Arcade scales body dimensions with the sprite. Use texture-space
      // dimensions here; passing the display size scales the collider twice
      // and leaves an invisible ledge beside the artwork.
      body.setSize(platform.width, platform.height, true).setAllowGravity(false).setImmovable(true);
      this.configureEnvironmentBody(platform);
      this.movingPlatforms.push({ sprite: platform, startX: spec.x, startY: spec.y,
        endX: spec.endX, endY: spec.endY, speed: spec.speed, direction: 1 });
      this.physics.add.collider(this.player, platform,
        (_player, terrain) => this.handleTerrainLanding(terrain as Phaser.GameObjects.GameObject),
        this.shouldPlayerLandOnPlatform, this);
    }
  }

  private createObstacles(): void {
    this.obstacles = this.physics.add.staticGroup();
    for (const spec of levelData.obstacles) {
      const obstacle = this.obstacles.create(spec.x, spec.footY - spec.height / 2, spec.type) as Phaser.Physics.Arcade.Sprite;
      obstacle.setDisplaySize(spec.width, spec.height).setDepth(6);
      obstacle.setData('obstacleId', spec.id);
      obstacle.setData('destructible', spec.destructible);
      obstacle.setData('terrainType', TerrainType.ONE_WAY_PLATFORM);
      obstacle.setData('collision', { top: true, bottom: false, left: false, right: false });
      (obstacle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      this.configureEnvironmentBody(obstacle);
    }
    // Cover blocks shots but offers only a one-way landing to the player.
    // A running player never meets a solid side wall.
    this.physics.add.collider(this.player, this.obstacles,
      (_player, obstacle) => this.handleTerrainLanding(obstacle as Phaser.GameObjects.GameObject),
      this.shouldPlayerLandOnPlatform, this);
  }

  getSightBlockers(): Phaser.GameObjects.GameObject[] {
    return [...this.platforms.getChildren(), ...this.obstacles.getChildren()];
  }

  private configureEnvironmentBody(platform: Phaser.GameObjects.GameObject): void {
    const body = platform.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    body.collisionCategory = CollisionGroup.ENVIRONMENT;
    body.collisionMask =
      CollisionGroup.PLAYER |
      CollisionGroup.ENEMY |
      CollisionGroup.PLAYER_BULLET |
      CollisionGroup.ENEMY_BULLET |
      CollisionGroup.BOSS;
  }

  private createPlayer(): void {
    const startPos = levelData.startPosition;
    // Player registers itself with the scene's display list and physics
    // system inside its own constructor (see Player.ts), so no need to
    // call this.add.existing() here again.
    this.player = new Player(this, startPos.x, startPos.y, this.inputManager);

    // Store on scene for access
    (this as unknown as { playerRef: Player }).playerRef = this.player;
  }

  private createWeaponPickups(): void {
    // Already created the group above, but let's add from level data
    // Weapon pickups will be spawned by the level setup
    this.createLevelPickups();
  }

  private createLevelPickups(): void {
    const pickups = levelData.pickups;
    for (const pickup of pickups) {
      this.spawnPickup(pickup);
    }
  }

  private spawnPickup(pickup: PickupSpec): void {
    let texture: string;
    let depth: number = 5;

    if (pickup.type === 'weapon') {
      texture = `weapon_${pickup.weaponType}`;
      depth = 5;
    } else if (pickup.type === 'health') {
      texture = 'pickup_health';
      depth = 5;
    } else if (pickup.type === 'score') {
      texture = 'pickup_score';
      depth = 5;
    } else {
      texture = 'pickup_health';
      depth = 5;
    }

    const gameObj = this.physics.add.existing(
      this.add.sprite(pickup.x, pickup.y, texture),
    ) as Phaser.GameObjects.Sprite;
    gameObj.setDepth(depth);
    gameObj.setData('type', pickup.type);
    if (pickup.weaponType) {
      gameObj.setData('weaponType', pickup.weaponType);
    }

    this.weaponPickups.add(gameObj);
  }

  private createCheckpoints(): void {
    for (const cp of levelData.checkpoints) {
      const safeY = this.getSafePlayerY(cp.x, cp.y);
      const zone = this.add.zone(cp.x, safeY, 34, 42);
      this.physics.world.enable(zone);
      (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      (zone.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.checkpoints.push(zone);

      // Add visual indicator
      const surface = this.findPlatformSurfaceAt(cp.x, cp.y);
      const visual = this.add.sprite(cp.x, (surface?.top ?? 400) - 24, 'checkpoint_broken');
      visual.setDepth(5);
      this.checkpointVisuals.push(visual);
    }
  }

  private createHazards(): void {
    // Explosive barrels
    this.destructibleBombs = this.physics.add.staticGroup();
    this.destructibleBombs.collisionCategory = CollisionGroup.ENVIRONMENT;
    this.destructibleBombs.collisionMask = CollisionGroup.PLAYER | CollisionGroup.PLAYER_BULLET;
    for (const hazard of levelData.hazards) {
      if (hazard.type === 'explosive_barrel') {
        const support = this.findPlatformSurfaceAt(hazard.x, hazard.y + 16);
        const barrel = this.destructibleBombs.create(hazard.x, (support?.top ?? 400) - 16, 'explosive_barrel');
        barrel.setDepth(5);
        barrel.setData('destructibleBomb', true);
        const body = barrel.body as Phaser.Physics.Arcade.StaticBody;
        body.collisionCategory = CollisionGroup.ENVIRONMENT;
        body.collisionMask = CollisionGroup.PLAYER | CollisionGroup.PLAYER_BULLET;
      } else if (hazard.type === 'electric_floor') {
        const top = this.findPlatformSurfaceAt(hazard.x, 400)?.top ?? 400;
        const floor = this.add.tileSprite(hazard.x, top - 6, hazard.width ?? 200, 12, 'electric_floor')
          .setDepth(7);
        this.physics.add.existing(floor, true);
        this.hazardFields.push({ sprite: floor, kind: 'electric_floor', offset: 0 });
      } else if (hazard.type === 'laser') {
        const top = this.findPlatformSurfaceAt(hazard.x, 400)?.top ?? 400;
        const laser = this.add.tileSprite(hazard.x, top - 58, 8, 116, 'laser').setDepth(7);
        this.physics.add.existing(laser, true);
        this.hazardFields.push({ sprite: laser, kind: 'laser', offset: 900 });
      }
    }

    // Collide player with hazards
    this.physics.add.overlap(this.player, this.destructibleBombs, (_player, bomb) => {
      this.destroyBomb(bomb as Phaser.GameObjects.Sprite, true);
    });

    for (const { sprite } of this.hazardFields) {
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      body.collisionCategory = CollisionGroup.HAZARD;
      body.collisionMask = CollisionGroup.PLAYER;
      this.physics.add.overlap(this.player, sprite, () => {
        if (body.enable && this.player.getPlayerState() !== 'death') {
          this.player.takeDamage(1, sprite.x, sprite.y);
        }
      });
    }
  }

  private updateHazards(time: number): void {
    for (const { sprite, kind, offset } of this.hazardFields) {
      const phase = (time + offset) % 2800;
      const energized = phase < 1550;
      const warning = phase > 2350;
      (sprite.body as Phaser.Physics.Arcade.StaticBody).enable = energized;
      sprite.setAlpha(energized ? 1 : warning ? 0.65 : 0.22);
      sprite.setTint(energized ? 0xffffff : warning ? 0xffc66c : 0x688186);
      if (kind === 'electric_floor') sprite.tilePositionX = -Math.floor(time / 85) % 64;
    }
  }

  private createCombatZones(): void {
    // Create invisible activation zones for encounters
    for (const encounter of levelData.encounters || []) {
      const zone = this.add.zone(encounter.x, encounter.y, encounter.width, encounter.height);
      this.physics.world.enable(zone);
      this.combatZones.push(zone);
    }
  }

  private setupCollisions(): void {
    // Raised platforms only catch the player while landing from above.
    // Treating every platform as a fully solid rectangle made the many
    // low platforms overlap the player's walking height and stop forward
    // movement at their side faces. Ground tiles remain fully solid.
    this.physics.add.collider(
      this.player,
      this.platforms,
      (_player, terrain) => this.handleTerrainLanding(terrain as Phaser.GameObjects.GameObject),
      this.shouldPlayerLandOnPlatform,
      this,
    );

    // Each ground enemy receives its own platform collider at spawn time in
    // EnemySpawner. A collider registered against the initially-empty group
    // failed to include manually constructed children added later.

    // Projectile overlaps are registered against each concrete bullet when
    // it is fired. Empty group-vs-group overlaps do not reliably pick up
    // the manually created sprites added to these groups later.

    // Player vs enemies
    this.physics.add.overlap(
      this.player,
      this.enemySpawner.getEnemyGroup(),
      (playerObj, enemyObj) => {
        if (this.player.isInvincible()) return;
        this.player.handleEnemyCollision((enemyObj as Enemy).x, (enemyObj as Enemy).y);
      },
      undefined,
      this,
    );

    // Player vs weapon pickups
    this.physics.add.overlap(
      this.player,
      this.weaponPickups,
      (playerObj, pickupObj) => {
        this.handlePickup(playerObj, pickupObj);
      },
      undefined,
      this,
    );

    // Player vs checkpoints
    this.physics.add.overlap(
      this.player,
      this.physics.add.group(this.checkpoints),
      (playerObj, checkpointZone) => {
        this.handleCheckpoint(checkpointZone as Phaser.GameObjects.Zone);
      },
      undefined,
      this,
    );

    // Note: there used to be a bulletGroup-vs-platforms overlap here with
    // no callback. It served no gameplay purpose, and because it ran
    // *after* the bulletGroup-vs-enemyGroup overlap above (which can
    // destroy() a bullet mid-frame), it would occasionally touch a bullet
    // whose Arcade body had already been torn down in this same physics
    // step, crashing World.collideObjects with "reading 'isParent'" on
    // undefined. Removed rather than reintroduced.
  }

  /** Platform group, exposed read-only so Enemy's line-of-sight check can
   * test against solid geometry (platforms are private above; enemies
   * don't get their own reference wired through the constructor). */
  getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  private shouldPlayerLandOnPlatform(playerObject: unknown, platformObject: unknown): boolean {
    const player = playerObject as Phaser.Physics.Arcade.Sprite;
    const platform = platformObject as Phaser.GameObjects.GameObject;
    return canLandOnTerrain(player, platform, this.player.getIgnoredTerrainId());
  }

  private handleTerrainLanding(terrain: Phaser.GameObjects.GameObject): void {
    this.player.recordTerrainLanding(terrain);
    if (terrain.getData('terrainType') === TerrainType.MOVING_PLATFORM) {
      const platform = terrain as Phaser.Physics.Arcade.Sprite;
      if (this.ridingPlatform !== platform) this.ridingOffsetX = this.player.x - platform.x;
      this.ridingPlatform = platform;
    }
  }

  private handleEnemyBulletHit(bulletObj: unknown): void {
    const bullet = bulletObj as Phaser.GameObjects.Sprite;

    // Same defensive guard as handlePlayerBulletHit(): don't act twice on a
    // bullet already consumed earlier in this physics step.
    if (!bullet.active || !bullet.body) return;

    if (!this.player.isInvincible()) {
      this.player.handleEnemyCollision(bullet.x, bullet.y);
    }

    this.deactivateBullet(bullet);
    this.time.delayedCall(0, () => bullet.destroy());
  }

  private deactivateBullet(bullet: Phaser.GameObjects.Sprite): void {
    // Bullets are created as ordinary GameObjects.Sprite instances and only
    // receive an Arcade body through physics.add.existing(). That does not
    // change their prototype into Arcade.Sprite, so disableBody() is absent.
    if (bullet.body) {
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      body.setVelocity(0, 0);
    }
    bullet.setActive(false);
    bullet.setVisible(false);
  }

  private destroyBomb(bomb: Phaser.GameObjects.Sprite, largeEffect = false): void {
    if (!bomb.active || !bomb.body || bomb.getData('bombDestroyed')) return;
    bomb.setData('bombDestroyed', true);
    const body = bomb.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    if (body instanceof Phaser.Physics.Arcade.Body) body.setVelocity(0, 0);
    bomb.setActive(false).setVisible(false);
    if (largeEffect) this.effectsManager.createExplosion(bomb.x, bomb.y, 40);
    else this.effectsManager.createSmallExplosion(bomb.x, bomb.y);
    EventBus.emit(Events.AUDIO_SFX, largeEffect ? 'sfx_explosion' : 'sfx_bomb_small');
    // Never remove an Arcade body during the same collision traversal.
    this.time.delayedCall(0, () => bomb.destroy());
  }

  private handleBombShot(bulletObject: unknown, bombObject: unknown): void {
    const bullet = bulletObject as Phaser.GameObjects.Sprite;
    const bomb = bombObject as Phaser.GameObjects.Sprite;
    if (!bullet.active || !bullet.body || !bomb.active || !bomb.body) return;
    const weaponType = bullet.getData('weaponType') as string | undefined;
    this.effectsManager.createHitSpark(bomb.x, bomb.y, weaponType);
    this.destroyBomb(bomb, weaponType === WeaponType.ROCKET_LAUNCHER);
    if (bullet.getData('weaponType') !== WeaponType.PLASMA_BEAM) {
      this.deactivateBullet(bullet);
      this.time.delayedCall(0, () => bullet.destroy());
    }
  }

  private handleObstacleShot(bulletObject: unknown, obstacleObject: unknown): void {
    const bullet = bulletObject as Phaser.GameObjects.Sprite;
    const obstacle = obstacleObject as Phaser.GameObjects.Sprite;
    if (!bullet.active || !bullet.body || !obstacle.active || !obstacle.body) return;
    this.effectsManager.createHitSpark(bullet.x, bullet.y, bullet.getData('weaponType') as string | undefined);
    if (obstacle.getData('destructible') && !obstacle.getData('destroyed')) {
      obstacle.setData('destroyed', true);
      (obstacle.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      obstacle.setActive(false).setVisible(false);
      EventBus.emit(Events.PARTICLE_EMIT, 'debris', obstacle.x, obstacle.y, { count: 8 });
      EventBus.emit(Events.AUDIO_SFX, 'sfx_impact_metal');
      this.time.delayedCall(0, () => obstacle.destroy());
    }
    this.deactivateBullet(bullet);
    this.time.delayedCall(0, () => bullet.destroy());
  }

  private handleEnemyBulletCoverHit(bulletObject: unknown): void {
    const bullet = bulletObject as Phaser.GameObjects.Sprite;
    if (!bullet.active || !bullet.body) return;
    this.effectsManager.createHitSpark(bullet.x, bullet.y);
    this.deactivateBullet(bullet);
    this.time.delayedCall(0, () => bullet.destroy());
  }

  private handlePlayerBulletHit(bulletObj: unknown, enemyObj: unknown): void {
    const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObj as import('../entities/Enemy').Enemy;

    // Guard against a bullet that was already consumed earlier in this same
    // physics step (e.g. it overlapped a second enemy in the same pass, or
    // another collider already destroyed it). Checking `.active` alone is
    // not quite enough once the body has actually been torn down, so also
    // bail if the Arcade body itself is gone.
    if (!bullet.active || !bullet.body) return;
    const weaponType = bullet.getData('weaponType') as WeaponType | undefined;
    const pierced = bullet.getData('piercedEnemies') as Set<Enemy> | undefined;
    if (pierced?.has(enemy)) return;

    // BaseWeapon.spawnProjectile() already tags every player bullet with
    // its weapon's real damage via sprite.setData('damage', damage) -- this
    // was hardcoded to 1 and never read it, so Plasma Beam/Rocket
    // Launcher/etc. all did the same damage as the base Pulse Rifle.
    const damage = (bullet.getData('damage') as number) ?? 1;
    enemy.takeDamage(damage, bullet.x, bullet.y);
    this.effectsManager.createHitSpark(bullet.x, bullet.y, weaponType);
    EventBus.emit(Events.AUDIO_SFX,
      weaponType === WeaponType.PLASMA_BEAM ? 'sfx_impact_energy' : 'sfx_impact_metal',
      { volume: 0.22 });
    if (weaponType === WeaponType.ROCKET_LAUNCHER) {
      this.effectsManager.createSmallExplosion(bullet.x, bullet.y);
      this.enemySpawner.getEnemyGroup().getChildren().forEach((otherObj) => {
        const other = otherObj as Enemy;
        if (other === enemy || !other.active || other.getIsDead()) return;
        if (Phaser.Math.Distance.Between(other.x, other.y, bullet.x, bullet.y) > 52) return;
        other.takeDamage(Math.max(1, Math.ceil(damage / 2)), bullet.x, bullet.y);
        if (other.getIsDead()) this.player.addScore(other.getScoreValue());
      });
    }

    // Deactivate immediately so no other overlap pair processed later in
    // this same physics step can touch this bullet, but defer the actual
    // destroy() to the next tick. Destroying a body mid-collision-pass is
    // what causes Phaser's World.collideObjects to crash with
    // "Cannot read properties of undefined (reading 'isParent')" when a
    // stale reference to it is processed again before the frame ends.
    if (weaponType === WeaponType.PLASMA_BEAM) {
      const hitSet = pierced ?? new Set<Enemy>();
      hitSet.add(enemy);
      bullet.setData('piercedEnemies', hitSet);
      if (hitSet.size >= 3) {
        this.deactivateBullet(bullet);
        this.time.delayedCall(0, () => bullet.destroy());
      }
    } else {
      this.deactivateBullet(bullet);
      this.time.delayedCall(0, () => bullet.destroy());
    }

    if (enemy.getIsDead()) {
      const stats = gameState.getPlayerStats();
      this.player.addScore(enemy.getScoreValue());
    }
  }

  private handlePickup(playerObj: unknown, pickupObj: unknown): void {
    const pickup = pickupObj as Phaser.Physics.Arcade.Sprite;
    const pickupType = pickup.getData('type');

    if (pickupType === 'weapon') {
      const weaponType = pickup.getData('weaponType');
      // Pick up the specific weapon through the weapon manager
      const wm = this.player.getWeaponManager();
      wm.pickUpWeapon(weaponType as import('../config/gameConfig').WeaponType);
      this.hud.setWeapon(weaponType, wm.getCurrentWeaponLevel());
      this.hud.updateScore(gameState.getPlayerStats().score);
      EventBus.emit(Events.NOTIFICATION, `ACQUIRED: ${weaponType.toUpperCase()}`);
    } else if (pickupType === 'health') {
      this.player.heal(1);
    }

    pickup.destroy();
  }

  private handleCheckpoint(zone: Phaser.GameObjects.Zone): void {
    const checkpoint = this.checkpoints.indexOf(zone);
    if (checkpoint !== -1 && checkpoint > this.currentCheckpoint) {
      this.currentCheckpoint = checkpoint;
      this.checkpointVisuals[checkpoint]?.setTexture('checkpoint_active');
      const cp = levelData.checkpoints[checkpoint];
      const safeY = this.getSafePlayerY(cp.x, cp.y);

      gameState.registerCheckpoint({
        id: cp.id,
        x: cp.x,
        y: safeY,
        weapon: cp.weapon as any,
        weaponLevel: cp.weaponLevel,
        score: gameState.getPlayerStats().score,
      });

      const returnState = this.gameFlowManager.state;
      this.gameFlowManager.changeState(GameFlowState.CHECKPOINT);
      this.time.delayedCall(300, () => {
        if (this.gameFlowManager.state === GameFlowState.CHECKPOINT) {
          this.gameFlowManager.changeState(returnState);
        }
      });

      this.hud.showCheckpointMessage();
      EventBus.emit(Events.AUDIO_SFX, 'sfx_pickup');
    }
  }

  private setupEventListeners(): void {
    // Note: LEVEL_START is intentionally NOT listened to here. The scene is
    // already running by the time setupEventListeners() is called; listening
    // for LEVEL_START and calling scene.start('LevelOneScene') would restart
    // the scene on top of itself, causing a stuck/frozen game.

    this.onGameEvent(Events.PAUSE_TOGGLE, () => {
      if (this.gameFlowManager.state === GameFlowState.GAME_OVER ||
        this.gameFlowManager.state === GameFlowState.PLAYER_DEAD) return;
      if (this.pauseMenu.isVisible) {
        this.pauseMenu.hide();
        this.physics.resume();
        this.gameFlowManager.resume();
        gameState.setGameState(GameState.PLAYING);
      } else {
        this.pauseMenu.show();
        this.physics.pause();
        this.gameFlowManager.pause();
        gameState.setGameState(GameState.PAUSED);
      }
    });

    this.onGameEvent(Events.PLAYER_DEATH, () => {
      this.handlePlayerDeath();
    });

    this.onGameEvent(Events.PLAYER_RESPAWN, () => {
      this.handlePlayerRespawn();
    });

    this.onGameEvent(Events.ARENA_LOCK, (x: number, y: number, width: number) => {
      this.lockArena(x, width);
      this.gameFlowManager.changeState(GameFlowState.COMBAT);
    });

    this.onGameEvent(Events.ARENA_UNLOCK, () => {
      this.unlockArena();
      if (this.gameFlowManager.state === GameFlowState.COMBAT) {
        this.gameFlowManager.changeState(GameFlowState.PLAYING);
      }
    });

    this.onGameEvent(Events.PLAYER_WEAPON_PICKUP, (weaponType: string) => {
      this.handleWeaponPickup(weaponType);
    });

    // Add projectiles to bullet group for collision detection
    this.onGameEvent(Events.PROJECTILE_FIRED, (sprite: Phaser.Physics.Arcade.Sprite) => {
      if (sprite && this.bulletGroup) {
        // BaseWeapon.spawnProjectile() already set this bullet's real
        // velocity and disabled its gravity before emitting this event.
        // Group.add() below re-applies the *group's* defaults to every
        // member's body -- including velocityX/velocityY: 0 and (were it
        // not set to allowGravity: false above) gravity re-enabled -- so
        // without capturing and restoring velocity here, every bullet's
        // real velocity gets silently zeroed the instant it's added to the
        // group, and it just falls straight down under gravity instead of
        // flying. This was the actual "bullet released just falls to the
        // ground" bug.
        const preBody = sprite.body as Phaser.Physics.Arcade.Body;
        const vx = preBody.velocity.x;
        const vy = preBody.velocity.y;
        const allowGravity = preBody.allowGravity;
        const gravityY = preBody.gravity.y;
        const collisionCategory = preBody.collisionCategory;
        const collisionMask = preBody.collisionMask;
        this.bulletGroup.add(sprite);
        const postBody = sprite.body as Phaser.Physics.Arcade.Body;
        postBody.setVelocity(vx, vy);
        postBody.setAllowGravity(allowGravity).setGravityY(gravityY);
        postBody.collisionCategory = collisionCategory;
        postBody.collisionMask = collisionMask;
        if (vx !== 0 || vy !== 0) sprite.setRotation(Math.atan2(vy, vx));

        const enemyColliders: Phaser.Physics.Arcade.Collider[] = [];
        this.enemySpawner.getEnemyGroup().children.iterate((enemyObject: Phaser.GameObjects.GameObject) => {
          const enemy = enemyObject as Enemy;
          if (enemy.active && !enemy.getIsDead()) {
            enemyColliders.push(this.physics.add.overlap(
              sprite,
              enemy,
              (bulletObj, enemyObj) => this.handlePlayerBulletHit(bulletObj, enemyObj),
              undefined,
              this,
            ));
          }
          return true;
        });
        sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
          enemyColliders.forEach((collider) => collider.destroy());
        });

        const bombColliders = [this.destructibleBombs, this.bombProjectiles].map((bombs) =>
          this.physics.add.overlap(sprite, bombs,
            (bullet, bomb) => this.handleBombShot(bullet, bomb), undefined, this));
        sprite.once(Phaser.GameObjects.Events.DESTROY, () =>
          bombColliders.forEach((collider) => collider.destroy()));

        this.obstacles.children.iterate((object: Phaser.GameObjects.GameObject) => {
          const obstacle = object as Phaser.Physics.Arcade.Sprite;
          if (!obstacle.active || Math.abs(obstacle.x - sprite.x) > 1500) return true;
          const collider = this.physics.add.overlap(sprite, obstacle,
            (bullet, cover) => this.handleObstacleShot(bullet, cover), undefined, this);
          const remove = () => {
            if (collider.active) collider.destroy();
            sprite.off(Phaser.GameObjects.Events.DESTROY, remove);
            obstacle.off(Phaser.GameObjects.Events.DESTROY, remove);
          };
          sprite.once(Phaser.GameObjects.Events.DESTROY, remove);
          obstacle.once(Phaser.GameObjects.Events.DESTROY, remove);
          return true;
        });

        if (this.boss?.active && !this.boss.getIsDead()) {
          const bossColliders = this.boss.getWeakPointSprites().map((weakPoint) => this.physics.add.overlap(
            sprite, weakPoint,
            (bulletObj, weakPointObj) => this.handlePlayerBulletBoss(bulletObj, weakPointObj),
            undefined, this,
          ));
          sprite.once(Phaser.GameObjects.Events.DESTROY, () => bossColliders.forEach((collider) => collider.destroy()));
        }
      }
    });

    // Enemy bullets were previously fired but never tracked anywhere, so
    // they flew straight through the player with no effect. Add them to
    // their own group so setupCollisions() can overlap them against the
    // player.
    this.onGameEvent(Events.ENEMY_PROJECTILE_FIRED, (sprite: Phaser.Physics.Arcade.Sprite) => {
      if (sprite && this.enemyBulletGroup) {
        // Same velocity-reset issue as PROJECTILE_FIRED above.
        const preBody = sprite.body as Phaser.Physics.Arcade.Body;
        const vx = preBody.velocity.x;
        const vy = preBody.velocity.y;
        const allowGravity = preBody.allowGravity;
        const gravityY = preBody.gravity.y;
        const collisionCategory = preBody.collisionCategory;
        const collisionMask = preBody.collisionMask;
        this.enemyBulletGroup.add(sprite);
        const postBody = sprite.body as Phaser.Physics.Arcade.Body;
        postBody.setVelocity(vx, vy);
        postBody.setAllowGravity(allowGravity).setGravityY(gravityY);
        postBody.collisionCategory = collisionCategory;
        postBody.collisionMask = collisionMask;
        if (vx !== 0 || vy !== 0) sprite.setRotation(Math.atan2(vy, vx));
        const enemyFlash = this.add.image(sprite.x, sprite.y, 'effect_muzzle').setDepth(13)
          .setRotation(Math.atan2(vy, vx)).setTint(sprite.getData('destructibleBomb') ? 0xff9d63 : 0xffc17e);
        this.tweens.add({ targets: enemyFlash, alpha: 0, duration: 90,
          onComplete: () => enemyFlash.destroy() });
        if (sprite.getData('destructibleBomb')) {
          this.bombProjectiles.add(sprite);
          // A second group.add() can reset motion and collision filters too.
          const bombBody = sprite.body as Phaser.Physics.Arcade.Body;
          bombBody.setVelocity(vx, vy);
          bombBody.setAllowGravity(allowGravity).setGravityY(gravityY);
          bombBody.collisionCategory = collisionCategory;
          bombBody.collisionMask = collisionMask;
        }

        this.obstacles.children.iterate((object: Phaser.GameObjects.GameObject) => {
          const obstacle = object as Phaser.Physics.Arcade.Sprite;
          if (!obstacle.active || Math.abs(obstacle.x - sprite.x) > 1500) return true;
          const collider = this.physics.add.overlap(sprite, obstacle,
            (bullet) => this.handleEnemyBulletCoverHit(bullet), undefined, this);
          const remove = () => {
            if (collider.active) collider.destroy();
            sprite.off(Phaser.GameObjects.Events.DESTROY, remove);
            obstacle.off(Phaser.GameObjects.Events.DESTROY, remove);
          };
          sprite.once(Phaser.GameObjects.Events.DESTROY, remove);
          obstacle.once(Phaser.GameObjects.Events.DESTROY, remove);
          return true;
        });

        const playerCollider = this.physics.add.overlap(
          this.player,
          sprite,
          (_playerObj, bulletObj) => this.handleEnemyBulletHit(bulletObj),
          undefined,
          this,
        );
        sprite.once(Phaser.GameObjects.Events.DESTROY, () => playerCollider.destroy());
      }
    });

    // Update HUD when weapon switches
    this.onGameEvent(Events.WEAPON_SWITCH, () => {
      const wm = this.player.getWeaponManager();
      this.hud.setWeapon(wm.getCurrentWeaponType().toString(), wm.getCurrentWeaponLevel());
    });

    this.onGameEvent(Events.GAME_VICTORY, () => {
      this.startVictory();
    });

    this.onGameEvent(Events.BOSS_STATE_CHANGE, (state: BossState) => {
      if (state === BossState.IDLE || state === BossState.ENRAGED) {
        this.bossHealthBar.show();
        if (this.gameFlowManager.state === GameFlowState.BOSS_INTRO) {
          this.gameFlowManager.changeState(GameFlowState.BOSS_FIGHT);
          gameState.setGameState(GameState.PLAYING);
        }
      }
    });

    this.onGameEvent(Events.BOSS_CLEAR_PROJECTILES, () => {
      this.enemyBulletGroup.children.each((child) => {
        const projectile = child as Phaser.GameObjects.Sprite;
        if (projectile.active) this.deactivateBullet(projectile);
        this.time.delayedCall(0, () => projectile.destroy());
        return true;
      });
    });

    this.onGameEvent(Events.BOSS_DEATH, () => {
      this.bossHealthBar.hide();
    });

    this.onGameEvent(Events.GAME_OVER, () => {
      this.startGameOver();
    });
  }

  private onGameEvent(event: string, handler: (...args: any[]) => void): void {
    this.eventUnsubscribers.push(EventBus.on(event, handler));
  }

  private handleWeaponPickup(weaponType: string): void {
    // Pick up the specific weapon
    const wm = this.player.getWeaponManager();
    wm.pickUpWeapon(weaponType as import('../config/gameConfig').WeaponType);
    EventBus.emit(Events.NOTIFICATION, `WEAPON: ${weaponType.toUpperCase()}`);

    // Update HUD
    this.hud.setWeapon(weaponType, wm.getCurrentWeaponLevel());
  }

  private lockArena(x: number, width: number): void {
    this.isArenaLocked = true;
    this.lockedArenaLeft = x;
    this.lockedArenaRight = x + width;
    if (width >= this.cameras.main.width) this.cameras.main.setBounds(x, 0, width, this.levelHeight);
  }

  private unlockArena(): void {
    this.isArenaLocked = false;
    this.lockedArenaLeft = null;
    this.lockedArenaRight = null;
    this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
    this.enemySpawner?.setEnabled(true);
  }

  private handlePlayerDeath(): void {
    if (this.gameFlowManager.state === GameFlowState.PLAYER_DEAD ||
      this.gameFlowManager.state === GameFlowState.GAME_OVER) return;
    this.gameFlowManager.changeState(GameFlowState.PLAYER_DEAD);
    gameState.setGameState(GameState.PLAYER_DEAD);
    this.enemySpawner.setEnabled(false);
    this.clearTemporaryProjectiles();
    const stats = gameState.getPlayerStats();
    if (stats.lives > 0 && this.boss && !this.boss.getIsDead()) {
      this.bossHealthBar.hide();
      this.boss.resetEncounter();
    }

    if (stats.lives <= 0) {
      this.startGameOver();
    } else {
      this.time.delayedCall(1500, () => {
        if (this.gameFlowManager.state === GameFlowState.PLAYER_DEAD && this.sys.isActive()) {
          this.handlePlayerRespawn();
        }
      });
    }
  }

  private clearTemporaryProjectiles(): void {
    const seen = new Set<Phaser.GameObjects.Sprite>();
    for (const group of [this.enemyBulletGroup, this.bombProjectiles, this.bulletGroup]) {
      for (const object of group.getChildren()) {
        const bullet = object as Phaser.GameObjects.Sprite;
        if (seen.has(bullet)) continue;
        seen.add(bullet);
        if (bullet.active && bullet.body) this.deactivateBullet(bullet);
        this.time.delayedCall(0, () => { if (bullet.active || bullet.scene) bullet.destroy(); });
      }
    }
  }

  private handlePlayerRespawn(): void {
    if (this.gameFlowManager.state !== GameFlowState.PLAYER_DEAD || gameState.getPlayerStats().lives <= 0) return;
    gameState.setGameState(GameState.RESPAWNING);
    this.clearTemporaryProjectiles();
    const checkpoint = gameState.getCurrentCheckpoint();
    if (checkpoint) {
      this.player.respawnAtCheckpoint();
      this.player.setPosition(checkpoint.x, this.getSafePlayerY(checkpoint.x, checkpoint.y));
    } else {
      this.player.respawnAtCheckpoint();
      this.player.setPosition(levelData.startPosition.x, this.getSafePlayerY(levelData.startPosition.x, levelData.startPosition.y));
    }
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.reset(this.player.x, this.player.y);
    playerBody.setVelocity(0, 0);
    gameState.resetHP();
    this.player.setVisible(false);
    this.player.setAlpha(1);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.enemySpawner.resetForRespawn();
    this.enemySpawner.setEnabled(true);
    this.gameFlowManager.changeState(this.boss ? GameFlowState.BOSS_FIGHT : GameFlowState.PLAYING);
    gameState.setGameState(GameState.PLAYING);
  }

  private startGameOver(): void {
    if (this.gameFlowManager.state === GameFlowState.GAME_OVER) return;
    this.gameFlowManager.changeState(GameFlowState.GAME_OVER);
    gameState.setGameState(GameState.GAME_OVER);
    this.enemySpawner.setEnabled(false);
    this.clearTemporaryProjectiles();
    this.physics.pause();
    this.bossHealthBar.hide();
    audioManager.stopAmbience();
    const stats = gameState.getPlayerStats();
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', { score: stats.score });
    });
  }

  private startVictory(): void {
    this.gameFlowManager.changeState(GameFlowState.VICTORY);
    gameState.setGameState(GameState.LEVEL_COMPLETE);
    const stats = gameState.getPlayerStats();
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('VictoryScene', { score: stats.score });
    });
  }

  private startIntro(): void {
    this.introActive = true;

    const introText = this.add.text(this.player.x, this.player.y - 50, [
      'RAVEN-07: SHADOW STRIKE',
      'MISSION 01 — OPERATION EMERALD STRIKE',
    ], {
      font: `700 18px ${FONT.display}`,
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center',
    });
    introText.setOrigin(0.5);
    introText.setDepth(201);
    introText.setScrollFactor(0);
    introText.setAlpha(0);

    this.tweens.add({
      targets: introText,
      alpha: 1,
      duration: 300,
      hold: 800,
      yoyo: true,
      onComplete: () => {
        introText.destroy();
        // Hand control back to the player immediately after the title fades
        this.introActive = false;
        if (SaveManager.getSettings().tutorialHints) EventBus.emit(Events.NOTIFICATION, 'GO!');
        gameState.setGameState(GameState.PLAYING);
        gameState.setLevelStartTime(Date.now());
        this.player.setVelocity(0, 0);
        this.gameFlowManager.changeState(GameFlowState.PLAYING);
      },
    });
  }

  private playDropshipIntro(): void {
    // Simple dropship effect - a rectangle flying in from left
    const dropship = this.add.rectangle(
      -50, this.player.y - 100,
      80,
      40,
      0x5a5a7a,
      0.8,
    );
    dropship.setDepth(5);

    // Animate dropship flying in
    this.tweens.add({
      targets: dropship,
      x: this.player.x + 100,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        // Player drops down
        this.tweens.add({
          targets: this.player,
          y: this.player.y + 20,
          duration: 500,
          ease: 'Bounce',
          onComplete: () => {
            // Enable gameplay
            this.introActive = false;
            dropship.destroy();
            EventBus.emit(Events.NOTIFICATION, 'START GAME');
            gameState.setGameState(GameState.PLAYING);
            gameState.setLevelStartTime(Date.now());

            // Enable player input
            this.player.setVelocity(0, 0);
          },
        });
      },
    });
  }

  private createDebugOverlay(): void {
    this.debugText = this.add.text(10, 10, '', {
      font: `500 12px ${FONT.hud}`,
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.debugText.setDepth(100);
    this.debugText.setScrollFactor(0);
    this.debugText.setVisible(false);
  }

  update(time: number, delta: number): void {
    if (this.gameFlowManager.state === GameFlowState.GAME_OVER) return;
    this.updateMovingPlatformRiders(delta);
    this.updateProjectileTrails(time);
    this.updateHazards(time);

    if (this.introActive) {
      // Limit player movement during intro
      this.player.setVelocity(0, 0);
    }

    // Update enemy spawner
    if (this.gameFlowManager.state !== GameFlowState.PLAYER_DEAD) this.enemySpawner.update();

    // Update HUD
    this.hud.update();

    // Update boss health bar
    if (this.boss) {
      this.bossHealthBar.update(this.boss.getHp(), this.boss.getMaxHp(), this.boss.getPhase());
    }

    // Spawn boss when player reaches arena
    if (!this.hasSpawnedBoss && this.player.x > 10400) {
      this.spawnBoss();
      this.hasSpawnedBoss = true;
    }

    if (this.isArenaLocked && this.boss && this.lockedArenaLeft !== null && this.lockedArenaRight !== null) {
      this.player.x = Phaser.Math.Clamp(this.player.x, this.lockedArenaLeft + 20, this.lockedArenaRight - 20);
    }

    if (this.player.y > this.levelHeight + 60 && this.player.getPlayerState() !== 'death') {
      this.player.takeDamage(999);
    }

    // Update parallax backgrounds
    this.updateParallax();

    // Debug info
    if (this.debugEnabled) {
      const bossInfo = this.boss ? `\n${this.boss.getDebugInfo()}` : '';
      const enemyCount = this.enemySpawner.getEnemyGroup().getChildren().filter((enemy) => enemy.active).length;
      const projectileCount = this.bulletGroup.getChildren().filter((bullet) => bullet.active).length +
        this.enemyBulletGroup.getChildren().filter((bullet) => bullet.active).length;
      const debugInfo = `FPS: ${Math.round(this.game.loop.actualFps)}  FRAME: ${Math.round(delta)}ms\n` +
        `ENEMIES: ${enemyCount}  PROJECTILES: ${projectileCount}  PARTICLES: ${this.effectsManager.getParticleCount()}\n` +
        `${this.player.getTerrainDebugInfo()}${bossInfo}`;
      this.debugText.setText(debugInfo);
      this.debugText.setVisible(true);
    }
    this.terrainDebugRenderer.draw([
      ...this.platforms.getChildren(), ...this.movingPlatforms.map((entry) => entry.sprite),
    ], this.player);

    // Toggle debug with F2
    if (import.meta.env.DEV && this.inputManager.getDebugToggle()) {
      this.debugEnabled = !this.debugEnabled;
      this.hud.setDebugEnabled(this.debugEnabled);
      this.debugText.setVisible(this.debugEnabled);
      this.terrainDebugRenderer.setEnabled(this.debugEnabled);
    }
  }

  private updateProjectileTrails(time: number): void {
    if (SaveManager.getSettings().effectsQuality === 'low') return;
    if (time < this.nextProjectileTrailAt) return;
    this.nextProjectileTrailAt = time + 80;
    let emitted = 0;
    for (const object of this.bulletGroup.getChildren()) {
      const bullet = object as Phaser.Physics.Arcade.Sprite;
      if (!bullet.active) continue;
      const type = bullet.getData('weaponType') as WeaponType | undefined;
      if (type !== WeaponType.ROCKET_LAUNCHER && type !== WeaponType.PLASMA_BEAM) continue;
      const body = bullet.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const trail = this.add.sprite(bullet.x - Math.sign(body.velocity.x) * 6,
        bullet.y - Math.sign(body.velocity.y) * 6, 'effect_hit_spark')
        .setDepth(11).setTint(type === WeaponType.ROCKET_LAUNCHER ? 0xe99872 : 0xc189ef)
        .setAlpha(0.65).setScale(type === WeaponType.ROCKET_LAUNCHER ? 1.2 : 0.8);
      this.tweens.add({ targets: trail, alpha: 0, scale: 0.15, duration: 170,
        onComplete: () => trail.destroy() });
      if (++emitted >= 8) break;
    }
  }

  private updateMovingPlatformRiders(delta: number): void {
    for (const entry of this.movingPlatforms) {
      const targetX = entry.direction > 0 ? entry.endX : entry.startX;
      const targetY = entry.direction > 0 ? entry.endY : entry.startY;
      const distance = Phaser.Math.Distance.Between(entry.sprite.x, entry.sprite.y, targetX, targetY);
      const step = Math.min(distance, entry.speed * delta / 1000);
      const angle = Phaser.Math.Angle.Between(entry.sprite.x, entry.sprite.y, targetX, targetY);
      const dx = distance > 0 ? Math.cos(angle) * step : 0;
      const dy = distance > 0 ? Math.sin(angle) * step : 0;

      const platformBody = entry.sprite.body as Phaser.Physics.Arcade.Body;
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      // Keep rider ownership through tiny solver gaps. Detach only for a
      // real jump, a completed drop-through, or walking beyond an edge.
      const stillRiding = this.ridingPlatform === entry.sprite && playerBody.velocity.y >= 0 &&
        this.player.getIgnoredTerrainId() !== entry.sprite.getData('terrainId') &&
        this.player.getPlayerState() !== 'death' &&
        playerBody.top <= platformBody.bottom + 6 &&
        playerBody.right > platformBody.left && playerBody.left < platformBody.right;

      entry.sprite.setPosition(entry.sprite.x + dx, entry.sprite.y + dy);
      platformBody.updateFromGameObject();

      if (distance <= step + 0.01) entry.direction = entry.direction > 0 ? -1 : 1;
      if (this.ridingPlatform === entry.sprite) {
        if (stillRiding && (dx !== 0 || dy !== 0)) {
          // Use a stable offset while idle. Arcade can lose a few pixels of
          // horizontal carry as the platform body is updated between steps.
          if (Math.abs(playerBody.velocity.x) > 1) {
            this.ridingOffsetX += playerBody.velocity.x * delta / 1000;
          }
          this.player.setPosition(entry.sprite.x + this.ridingOffsetX, this.player.y + dy);
          playerBody.updateFromGameObject();
          this.player.recordTerrainLanding(entry.sprite);
        } else if (!stillRiding) {
          this.ridingPlatform = null;
        }
      }
    }
  }

  private getSafePlayerY(x: number, requestedY: number): number {
    const surface = this.findPlatformSurfaceAt(x, requestedY);
    if (!surface) return requestedY;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const footOffset = body.bottom - this.player.y;
    return surface.top - footOffset - 4;
  }

  private spawnBoss(): void {
    if (this.boss) return;
    this.gameFlowManager.changeState(GameFlowState.BOSS_INTRO);
    gameState.setGameState(GameState.BOSS_INTRO);
    // x=13500 used to be past the right edge of the boss-arena platform
    // (spec { x: 11500, width: 3000 } only spans 10000-13000), so the boss
    // spawned over empty space and fell before the collider below even had
    // a chance to catch it. 12500 sits well inside that span.
    this.boss = new JungleSiegeWalker(this, 12500, 340, this.player);
    const arenaSurface = this.findPlatformSurfaceAt(this.boss.x, this.boss.y);
    if (arenaSurface) {
      this.boss.placeOnArena(arenaSurface.left, arenaSurface.right, arenaSurface.top);
    }
    this.bossHealthBar.hide();
    this.lockArena(10000, 3000);
    this.enemySpawner.setEnabled(false);

    // The composite walker is placed by its visible feet and kept
    // gravity-free; resolving its small root body against the platform put
    // the much taller leg sprites underneath the ground.

    EventBus.emit(Events.BOSS_SPAWN);
    EventBus.emit(Events.NOTIFICATION, 'BOSS SPAWNED: JUNGLE SIEGE WALKER');
    EventBus.emit(Events.AUDIO_SFX, 'sfx_boss_warning');
    EventBus.emit(Events.SCREEN_FLASH, 0xff0000, 500);

    // Play boss music
    audioManager.stopMusic();
    audioManager.playMusic('music_boss');

    // Boss body parts need to be part of physics
    this.boss.getBodyParts().forEach((part) => {
      this.physics.add.collider(this.player, part);
    });

    // Player projectiles register a concrete boss overlap when fired.

    this.boss.beginEncounter();
  }

  private findPlatformSurfaceAt(x: number, referenceY: number): { left: number; right: number; top: number } | null {
    const intervals: Array<{ left: number; right: number; top: number }> = [];
    this.platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const body = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (body && x >= body.left && x <= body.right) {
        intervals.push({ left: body.left, right: body.right, top: body.top });
      }
      return true;
    });

    const seed = intervals.sort((a, b) => Math.abs(a.top - referenceY) - Math.abs(b.top - referenceY))[0];
    if (!seed) return null;

    const sameHeight: Array<{ left: number; right: number }> = [];
    this.platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const body = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (body && Math.abs(body.top - seed.top) <= 2) {
        sameHeight.push({ left: body.left, right: body.right });
      }
      return true;
    });

    let left = seed.left;
    let right = seed.right;
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const interval of sameHeight) {
        if (interval.right >= left - 2 && interval.left <= right + 2) {
          const nextLeft = Math.min(left, interval.left);
          const nextRight = Math.max(right, interval.right);
          expanded = expanded || nextLeft !== left || nextRight !== right;
          left = nextLeft;
          right = nextRight;
        }
      }
    }

    return { left, right, top: seed.top };
  }

  private handlePlayerBulletBoss(bulletObj: unknown, bossObj: unknown): void {
    const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
    const weakPoint = bossObj as Phaser.GameObjects.Sprite;

    // Same defensive guard as handlePlayerBulletHit() above.
    if (!bullet.active || !bullet.body) return;
    if (!this.boss || this.boss.getIsDead()) return;

    const damage = (bullet.getData('damage') as number) ?? 1;
    const weakPointId = weakPoint.getData('weakPointId') as string | undefined;
    if (!weakPointId) return;
    if (this.boss.damageWeakPoint(weakPointId, damage)) {
      this.effectsManager.createHitSpark(bullet.x, bullet.y,
        bullet.getData('weaponType') as string | undefined);
    }

    this.deactivateBullet(bullet);
    this.time.delayedCall(0, () => bullet.destroy());
  }

  private updateParallax(): void {
    const camX = this.cameras.main.scrollX;
    this.industrialBackground.setAlpha(Phaser.Math.Clamp((this.player.x - 4700) / 900, 0, 1));
    audioManager.playAmbience(this.player.x < 5000 ? 'ambience_jungle' : 'ambience_factory');

    // Simple parallax - move background layers slower
    this.backgroundLayers.forEach((layer) => {
      const drift = layer.sprite.texture.key === 'bg_fog' ? this.time.now * 0.006 : 0;
      layer.sprite.setTilePosition(camX * layer.factor + drift);
    });
  }

  destroy(fromScene?: boolean): void {
    // Clean up
    audioManager.stopAmbience();
    this.hud?.destroy();
    this.bossHealthBar?.destroy();
    this.pauseMenu?.destroy();
    this.effectsManager?.destroy();
    this.terrainDebugRenderer?.destroy();
    this.eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.eventUnsubscribers = [];
  }
}
