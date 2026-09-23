/**
 * Player - RAVEN-07 character with full movement, combat, and state management.
 * Implements arcade-style run-and-gun mechanics.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, CollisionGroup, GameState } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import {WeaponManager} from '../systems/WeaponManager';
import type { InputManager } from '../systems/InputManager';
import type { AimDirection } from '../config/gameConfig';
import { WeaponType } from '../config/gameConfig';
import { TerrainType } from '../terrain/TerrainType';
import { SaveManager } from '../core/SaveManager';

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'crouch' | 'shoot' | 'damage' | 'death';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private inputManager: InputManager;
  private weaponManager: WeaponManager;
  private playerState: PlayerState = 'idle';
  private readonly maxHp: number = GAME_CONFIG.PLAYER_MAX_HP;
  private hp: number;
  private lives: number;
  private facing: 'left' | 'right' = 'right';
  private invincible: boolean = false;
  private invincibleTimer: number = 0;
  private knockbackTimer: number = 0;
  private knockbackVel: { x: number; y: number } = { x: 0, y: 0 };
  private jumpBuffered: boolean = false;
  private jumpBufferTimer: number = 0;
  private wasOnGround: boolean = false;
  private coyoteTimer: number = 0;
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private readonly comboResetTime: number = GAME_CONFIG.COMBO_RESET_TIME;
  private aimDirection: AimDirection = { x: 1, y: 0, isUp: false, isDown: false };
  private isShooting: boolean = false;
  private crouchReleased: boolean = true;
  private lastShootTime: number = 0;
  private landingPoseTimer = 0;
  private respawnPoseTimer = 0;
  private footstepTimer = 0;
  private characterArt: Phaser.GameObjects.Image;
  private currentGround: Phaser.GameObjects.GameObject | null = null;
  private ignoredTerrainId: string | null = null;
  private ignoredTerrainBottom = 0;
  private dropThroughTimer = 0;

  // Animations
  private animsCreated: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    inputManager: InputManager,
  ) {
    super(scene, x, y, 'player_idle');

    // Register with the scene's display list and physics system.
    // This must happen before `this.body` is accessed below, since
    // Phaser.Physics.Arcade.Sprite does not get a physics body until
    // the game object is added to the physics world.
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inputManager = inputManager;
    this.hp = this.maxHp;
    this.lives = gameState.getPlayerStats().lives;

    // Create animations
    this.createAnimations();

    // Setup physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 28, false);
    body.setOffset(4, 2);
    body.setCollideWorldBounds(true);
    body.setDragX(GAME_CONFIG.PLAYER_DEACCEL);

    // Set collision
    body.collisionCategory = CollisionGroup.PLAYER;
    body.collisionMask =
      CollisionGroup.PLAYER |
      CollisionGroup.ENEMY |
      CollisionGroup.ENEMY_BULLET |
      CollisionGroup.ENVIRONMENT |
      CollisionGroup.PICKUP |
      CollisionGroup.HAZARD |
      CollisionGroup.BOSS;

    // Create weapon manager
    this.weaponManager = new WeaponManager(scene);

    this.setDepth(10);
    // Keep the battle-tested 32x36 physics/animation sprite as the collision
    // source. The higher-resolution artwork follows it without affecting body
    // size, platform landings, or projectile origin calculations.
    this.characterArt = scene.add.image(x, y, 'art_player_idle').setOrigin(0.5, 1).setDepth(11);
    this.setVisible(false);
    this.once('destroy', () => this.characterArt.destroy());
    this.updateCharacterArt();

    // Emit spawn event
    EventBus.emit(Events.PLAYER_SPAWN, this);
  }

  private createAnimations(): void {
    if (this.animsCreated) return;
    this.animsCreated = true;

    const tex = this.scene.textures;

    // Run animation
    this.anims.create({
      key: 'player_run',
      frames: [
        { key: 'player_run_0', duration: 300 },
        { key: 'player_run_1', duration: 300 },
      ],
      repeat: -1,
    });

    // Idle animation
    this.anims.create({
      key: 'player_idle',
      frames: [{ key: 'player_idle', duration: 500 }],
      repeat: -1,
    });

    // Jump animation
    this.anims.create({
      key: 'player_jump',
      frames: [{ key: 'player_jump', duration: 200 }],
      repeat: 0,
    });

    // Fall animation
    this.anims.create({
      key: 'player_fall',
      frames: [{ key: 'player_fall', duration: 200 }],
      repeat: 0,
    });

    // Crouch animation
    this.anims.create({
      key: 'player_crouch',
      frames: [{ key: 'player_crouch', duration: 200 }],
      repeat: 0,
    });

    // Damage animation
    this.anims.create({
      key: 'player_damage',
      frames: [{ key: 'player_damage', duration: 100 }],
      repeat: 0,
    });

    // Death animation
    this.anims.create({
      key: 'player_death',
      frames: [{ key: 'player_death', duration: 500 }],
      repeat: 0,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.playerState === 'death') {
      this.setVisible(false);
      this.updateCharacterArt();
      return;
    }

    this.landingPoseTimer = Math.max(0, this.landingPoseTimer - delta);
    this.respawnPoseTimer = Math.max(0, this.respawnPoseTimer - delta);

    // Update timers
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.setAlpha(1);
      }
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= delta;
      if (this.knockbackTimer <= 0) {
        this.knockbackVel = { x: 0, y: 0 };
      }
    }

    // Update jump buffer
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
      this.jumpBuffered = this.jumpBufferTimer > 0;
    }

    this.updateDropThrough(delta);

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.resetCombo();
      }
    }

    // Process movement
    this.handleMovement(delta);

    // Process shooting
    this.handleShooting();

    // Update animation
    this.updateAnimation();
    // Phaser animation playback and scene respawn can reveal the legacy
    // collider sprite. It is a physics rig only; the art image owns rendering.
    this.setVisible(false);
    this.updateCharacterArt();

    // Update weapon display
    EventBus.emit(Events.HUD_UPDATE, this.hp, gameState.getPlayerStats().lives, gameState.getPlayerStats().score);
  }

  private handleMovement(delta: number): void {
    const input = this.inputManager.getInputState();
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (input.pause) EventBus.emit(Events.PAUSE_TOGGLE);

    if (input.switchWeapon) {
      this.switchWeapon();
    }

    // Skip movement if in knockback
    if (this.knockbackTimer > 0) {
      body.setVelocityX(this.knockbackVel.x);
      body.setVelocityY(this.knockbackVel.y);
      return;
    }

    const onGround = body.onFloor() || body.blocked.down || body.touching.down || this.isSupportedByCurrentGround();
    const wasOnGround = this.wasOnGround;
    if (onGround && !wasOnGround && body.velocity.y >= 0) {
      this.landingPoseTimer = 110;
      EventBus.emit(Events.AUDIO_SFX, 'sfx_landing', { volume: 0.65 });
      EventBus.emit(Events.PARTICLE_EMIT, 'dust', this.x, body.bottom, { count: 4 });
    }

    // Update Coyote time
    if (onGround) {
      this.coyoteTimer = GAME_CONFIG.PLAYER_COYOTE_TIME;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= delta;
    }

    // Check for jump input (buffered).
    // NOTE: use `input.jump` (already computed once inside getInputState(),
    // called above) rather than calling inputManager.getJumpInput() again.
    // getJumpInput() re-invokes Phaser.Input.Keyboard.JustDown() on SPACE,
    // but JustDown() is a one-shot per key-press: the first call inside
    // getInputState() already consumes the flag, so a second call in the
    // same frame always returns false and jump input was never registered.
    const wantsDropThrough = input.down && input.jump && this.canDropThroughCurrentGround();
    if (wantsDropThrough) {
      this.beginDropThrough();
      this.jumpBuffered = false;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    } else if (input.jump) {
      this.jumpBufferTimer = GAME_CONFIG.PLAYER_JUMP_BUFFER_TIME;
      this.jumpBuffered = true;
    }

    // Handle jump: allow if buffered and either on ground (via coyote) or
    // still within the jump-buffer window from a recent ground frame.
    // wasOnGround check was previously inverted (!wasOnGround), blocking
    // normal ground jumps entirely.
    if (!wantsDropThrough && this.jumpBuffered && this.coyoteTimer > 0) {
      body.setVelocityY(-GAME_CONFIG.PLAYER_JUMP_FORCE);
      this.currentGround = null;
      this.jumpBuffered = false;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      EventBus.emit(Events.AUDIO_SFX, 'sfx_jump');
      if (this.playerState !== 'damage') {
        this.playerState = 'jump';
      }
    }

    // Variable jump height - if jump key is released early, reduce upward velocity once
    if (body.velocity.y < -150 && !this.inputManager.isJumpHeld()) {
      body.setVelocityY(body.velocity.y * 0.7);
    }

    // Handle horizontal movement
    const speed = GAME_CONFIG.PLAYER_SPEED * (onGround ? 1 : GAME_CONFIG.PLAYER_AIR_CONTROL);
    if (input.left && !input.right) {
      this.facing = 'left';
      body.setVelocityX(-speed);
    } else if (input.right && !input.left) {
      this.facing = 'right';
      body.setVelocityX(speed);
    } else {
      body.setVelocityX(0);
    }

    this.footstepTimer = Math.max(0, this.footstepTimer - delta);
    if (onGround && Math.abs(body.velocity.x) > 50 && this.footstepTimer === 0) {
      EventBus.emit(Events.AUDIO_SFX, 'sfx_footstep', { volume: 0.4 });
      this.footstepTimer = 240;
    }

    this.wasOnGround = onGround;

    // Determine player state for animation
    if (onGround) {
      if (this.playerState === 'jump' || this.playerState === 'fall') {
        this.playerState = 'idle';
      }
      if (input.down && !input.left && !input.right) {
        this.playerState = 'crouch';
      } else if (input.left || input.right) {
        this.playerState = 'run';
      } else {
        this.playerState = 'idle';
      }
    } else {
      if (body.velocity.y < 0) {
        this.playerState = 'jump';
      } else {
        this.playerState = 'fall';
      }
    }
  }

  private handleShooting(): void {
    if (this.playerState === 'death') return;

    const shoot = this.inputManager.getShootInput();

    if (shoot) {
      this.isShooting = true;

      // Get aim direction
      const camera = this.scene.cameras.main;
      this.aimDirection = this.inputManager.getAimDirection(this.x, this.y, camera);
      // The projectile and the visible pose must use the same aim vector.
      // Movement may point the other way; active gunfire wins.
      if (this.aimDirection.x < -0.01) this.facing = 'left';
      else if (this.aimDirection.x > 0.01) this.facing = 'right';

      // Fire weapon continuously based on fire rate
      if (this.weaponManager.getCurrentWeapon().isReady()) this.lastShootTime = this.scene.time.now;
      this.weaponManager.fire(this.x, this.y, this.aimDirection, this.facing);
    } else {
      this.isShooting = false;
    }
  }

  switchWeapon(): void {
    this.weaponManager.switchToNext();
    EventBus.emit(Events.NOTIFICATION, `WEAPON: ${this.weaponManager.getCurrentWeaponName()}`);
  }

  private updateAnimation(): void {
    if (this.invincible && this.playerState !== 'death') {
      // Flash effect during invincibility
      if (this.scene.time.now % 200 < 100) {
        this.setAlpha(0.5);
      } else {
        this.setAlpha(1);
      }
    } else {
      this.setAlpha(1);
    }

    // Set flip based on facing
    this.setFlipX(this.facing === 'left');

    // Play appropriate animation
    if (this.playerState === 'damage') return;
    if (this.playerState === 'death') return;

    if (this.isShooting && Math.abs(this.aimDirection.y) > 0.25) {
      const pose = this.aimDirection.y < 0
        ? (Math.abs(this.aimDirection.x) < 0.25 ? 'player_aim_up' : 'player_aim_diag_up')
        : 'player_aim_diag_down';
      this.anims.stop();
      this.setTexture(pose);
      return;
    }

    // Registered animation keys are prefixed with "player_" (see
    // createAnimations() above: player_idle, player_run, player_jump,
    // player_fall, player_crouch). Using the bare playerState here always
    // missed (this.anims.exists('crouch') is false), so no state animation
    // ever played -- masked for run/jump/fall by real positional movement,
    // but crouch has no physical motion of its own, so it looked totally
    // inert.
    const animKey = `player_${this.playerState}`;
    if (this.anims.exists(animKey)) {
      this.play(animKey, true);
    }
  }

  private updateCharacterArt(): void {
    if (!this.characterArt?.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const airborne = this.playerState === 'jump' || this.playerState === 'fall';
    const crouched = this.playerState === 'crouch';
    const dying = this.playerState === 'death';
    let texture = 'art_player_idle';
    if (dying) texture = 'art_player_death';
    else if (crouched) texture = 'art_player_crouch';
    else if (airborne) texture = 'art_player_jump';
    else if (this.playerState === 'run') {
      const step = Math.floor(this.scene.time.now / 105) % 3;
      texture = step === 0 ? 'art_player_run_contact' : step === 1 ? 'art_player_forward' : 'art_player_run';
    }
    else if (this.landingPoseTimer > 0) texture = 'art_player_crouch';
    if (!dying && this.isShooting && Math.abs(this.aimDirection.y) > 0.25) {
      texture = this.aimDirection.y < 0
        ? (Math.abs(this.aimDirection.x) < 0.25 ? 'art_player_up' : 'art_player_diagonal_up')
        : 'art_player_diagonal_down';
    }
    if (this.characterArt.texture.key !== texture) this.characterArt.setTexture(texture);
    const width = dying ? 48 : 32;
    const height = dying ? 28 : 36;
    const recoil = this.scene.time.now - this.lastShootTime < 85 ? 2 : 0;
    this.characterArt.setDisplaySize(width, height);
    this.characterArt.setPosition(Math.round(this.x - this.aimDirection.x * recoil), Math.round(body.bottom));
    this.characterArt.setFlipX(this.facing === 'left');
    this.characterArt.setAngle(0);
    this.characterArt.setTint(this.playerState === 'damage' ? 0xff8f83 : 0xffffff);
    const respawnFlash = this.respawnPoseTimer > 0 && Math.floor(this.scene.time.now / 65) % 2 === 0;
    this.characterArt.setAlpha(respawnFlash ? 0.45 : this.alpha);
  }

  takeDamage(amount: number = 1, sourceX?: number, sourceY?: number): boolean {
    if (this.invincible || this.playerState === 'death' || gameState.getGameState() === GameState.GAME_OVER) return false;

    this.hp = Math.max(0, this.hp - amount);
    gameState.takeDamage(amount);

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    // Apply knockback
    if (sourceX !== undefined && sourceY !== undefined) {
      const knockbackX = (this.x - sourceX) * 0.5;
      const knockbackY = (this.y - sourceY) * 0.3 - 200;
      this.knockbackVel = { x: knockbackX, y: knockbackY };
      this.knockbackTimer = GAME_CONFIG.PLAYER_KNOCKBACK_TIME;
    }

    // Invincibility frames
    this.invincible = true;
    this.invincibleTimer = GAME_CONFIG.PLAYER_INVINCIBLE_TIME;
    this.playerState = 'damage';

    EventBus.emit(Events.PLAYER_DAMAGE, this, amount);
    this.vibrateController(100);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_player_damage');
    EventBus.emit(Events.SCREEN_FLASH, 0xff0000, 200);

    // Reset to idle after damage flash
    this.scene.time.delayedCall(300, () => {
      if (this.playerState === 'damage') {
        this.playerState = 'idle';
      }
    });

    return true;
  }

  private die(): void {
    if (this.playerState === 'death') return;
    this.playerState = 'death';
    gameState.loseLife();
    this.lives = gameState.getPlayerStats().lives;
    gameState.addDeath();

    this.setVelocity(0, -300);
    this.isShooting = false;
    EventBus.emit(Events.PLAYER_DEATH, this);
    this.vibrateController(250);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_player_death');
  }

  private vibrateController(duration: number): void {
    if (!SaveManager.getSettings().controllerVibration) return;
    try {
      const pad = navigator.getGamepads?.()[0] as (Gamepad & {
        vibrationActuator?: { playEffect: (type: string, params: object) => Promise<unknown> };
      }) | null;
      void pad?.vibrationActuator?.playEffect('dual-rumble', {
        duration, strongMagnitude: 0.35, weakMagnitude: 0.6,
      });
    } catch { /* Controllers without haptics keep playing normally. */ }
  }

  /** Called by LevelOneScene when respawning at checkpoint */
  respawnAtCheckpoint(): void {
    this.hp = this.maxHp;
    this.lives = gameState.getPlayerStats().lives;
    this.playerState = 'idle';
    this.invincible = true;
    this.invincibleTimer = 1500;
    this.respawnPoseTimer = 500;
    this.knockbackTimer = 0;
    this.knockbackVel = { x: 0, y: 0 };
    this.comboCount = 0;
    this.comboTimer = 0;
    this.resetTerrainState();

    const checkpoint = gameState.getCurrentCheckpoint();
    if (checkpoint) {
      this.hp = this.maxHp;
      if (checkpoint.weapon) {
        this.weaponManager.setWeapon(checkpoint.weapon, checkpoint.weaponLevel);
      }
    }
  }

  respawn(x: number, y: number): void {
    this.setPosition(x, y);
    this.hp = this.maxHp;
    this.playerState = 'idle';
    this.invincible = true;
    this.invincibleTimer = 1500;
    this.respawnPoseTimer = 500;
    this.knockbackTimer = 0;
    this.knockbackVel = { x: 0, y: 0 };
    this.comboCount = 0;
    this.comboTimer = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.resetTerrainState();

    EventBus.emit(Events.PLAYER_RESPAWN, this);
  }

  recordTerrainLanding(terrain: Phaser.GameObjects.GameObject): void {
    this.currentGround = terrain;
    this.wasOnGround = true;
    this.coyoteTimer = GAME_CONFIG.PLAYER_COYOTE_TIME;
  }

  getIgnoredTerrainId(): string | null { return this.ignoredTerrainId; }

  getCurrentGround(): Phaser.GameObjects.GameObject | null { return this.currentGround; }

  applyGroundDisplacement(dx: number, dy: number): void {
    if (!this.currentGround || this.playerState === 'death') return;
    this.setPosition(this.x + dx, this.y + dy);
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  resetTerrainState(): void {
    this.currentGround = null;
    this.ignoredTerrainId = null;
    this.ignoredTerrainBottom = 0;
    this.dropThroughTimer = 0;
    this.wasOnGround = false;
    this.coyoteTimer = 0;
    this.jumpBuffered = false;
    this.jumpBufferTimer = 0;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  getTerrainDebugInfo(): string {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const id = this.currentGround?.getData('terrainId') ?? '-';
    const top = this.currentGround?.body
      ? (this.currentGround.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody).top.toFixed(1)
      : '-';
    return `GROUND: ${id} | GROUNDED: ${this.isSupportedByCurrentGround() || body.onFloor() || body.touching.down}\n` +
      `VEL: ${body.velocity.x.toFixed(0)},${body.velocity.y.toFixed(0)} | FEET: ${body.bottom.toFixed(1)} PREV: ${(body.prev.y + body.height).toFixed(1)} | TOP: ${top}`;
  }

  private canDropThroughCurrentGround(): boolean {
    if (!this.currentGround) return false;
    const type = this.currentGround.getData('terrainType') as TerrainType | undefined;
    return type === TerrainType.ONE_WAY_PLATFORM || type === TerrainType.MOVING_PLATFORM || type === TerrainType.BOSS_FLOOR;
  }

  private beginDropThrough(): void {
    if (!this.currentGround?.body) return;
    const terrainBody = this.currentGround.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    this.ignoredTerrainId = this.currentGround.getData('terrainId') as string;
    this.ignoredTerrainBottom = terrainBody.bottom;
    this.dropThroughTimer = 250;
    this.currentGround = null;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.y += 4;
    body.updateFromGameObject();
    body.setVelocityY(Math.max(100, body.velocity.y));
  }

  private updateDropThrough(delta: number): void {
    if (!this.ignoredTerrainId) return;
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - delta);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.dropThroughTimer <= 0 && body.top > this.ignoredTerrainBottom + 2) {
      this.ignoredTerrainId = null;
      this.ignoredTerrainBottom = 0;
    }
  }

  private isSupportedByCurrentGround(): boolean {
    if (!this.currentGround?.body) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const groundBody = this.currentGround.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    const supported = body.right > groundBody.left + 3 && body.left < groundBody.right - 3 &&
      Math.abs(body.bottom - groundBody.top) <= 5 && body.velocity.y >= 0;
    if (!supported && body.velocity.y !== 0) this.currentGround = null;
    return supported;
  }

  /** Called when a checkpoint is reached */
  reachCheckpoint(x: number, y: number, weapon: WeaponType | null, weaponLevel: number): void {
    gameState.registerCheckpoint({
      id: gameState.getPlayerStats().currentCheckpoint + 1,
      x,
      y,
      weapon,
      weaponLevel,
      score: gameState.getPlayerStats().score,
    });

    EventBus.emit(Events.NOTIFICATION, 'CHECKPOINT REACHED');
  }

  /** Add to combo chain */
  addCombo(): void {
    this.comboCount += 1;
    this.comboTimer = this.comboResetTime;
    gameState.addCombo(this.comboCount);
    EventBus.emit(Events.COMBO_UPDATE, this.comboCount);
  }

  /** Reset combo chain */
  private resetCombo(): void {
    this.comboCount = 0;
    EventBus.emit(Events.COMBO_UPDATE, 0);
  }

  /** Get current combo multiplier */
  getComboMultiplier(): number {
    if (this.comboCount === 0) return 1;
    return Math.min(1 + Math.floor(this.comboCount / 5), GAME_CONFIG.COMBO_MAX + 1);
  }

  /** Add score with combo multiplier */
  addScore(baseScore: number): void {
    const score = Math.floor(baseScore * this.getComboMultiplier());
    gameState.addScore(score);
    this.addCombo();
    EventBus.emit(Events.SCORE_UPDATE, gameState.getPlayerStats().score);
  }

  /** Heal the player */
  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    gameState.heal(amount);
    EventBus.emit(Events.HUD_UPDATE, this.hp, this.lives, gameState.getPlayerStats().score);
  }

  // Getters
  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  getLives(): number {
    return this.lives;
  }

  getFacing(): 'left' | 'right' {
    return this.facing;
  }

  getWeaponManager(): WeaponManager {
    return this.weaponManager;
  }

  getCombo(): number {
    return this.comboCount;
  }

  isInvincible(): boolean {
    return this.invincible;
  }

  getPlayerState(): PlayerState {
    return this.playerState;
  }

  getAimDirection(): AimDirection {
    return this.aimDirection;
  }

  /** Handle overlap with enemy/projectile */
  handleEnemyCollision(enemyX?: number, enemyY?: number): void {
    if (enemyX !== undefined && enemyY !== undefined) {
      this.takeDamage(1, enemyX, enemyY);
    } else {
      this.takeDamage(1);
    }
  }

  /** Cleanup */
  destroy(fromScene?: boolean): void {
    this.weaponManager = null as unknown as WeaponManager;
    super.destroy(fromScene);
  }
}
