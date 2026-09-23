/**
 * Enemy - Base class for all enemy types.
 * Implements a finite state machine for AI behavior.
 */

import Phaser from 'phaser';
import { CollisionGroup, GameState, type EnemyType } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import type { EnemyConfig } from '../data/enemyData';
import { gameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';

export type EnemyState = 'IDLE' | 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'HURT' | 'DEAD';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  protected config: EnemyConfig;
  protected aiState: EnemyState = 'IDLE';
  protected player: Phaser.Physics.Arcade.Sprite | null = null;
  protected stateTimer: number = 0;
  protected patrolDirection: number = 1;
  protected patrolStartX: number = 0;
  protected patrolRange: number = 100;
  protected facing: 'left' | 'right' = 'right';
  protected canAttack: boolean = true;
  protected attackCooldown: number = 0;
  protected isDead: boolean = false;
  protected flashTimer: number = 0;
  protected maxHp: number;
  protected hp: number;
  private supportSurface: { left: number; right: number; top: number } | null = null;
  private hasEngagedPlayer: boolean = false;
  private lastVisualTint = 0xffffff;
  private lastAttackAt = -1000;
  private characterArt: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyConfig,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    super(scene, x, y, config.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const difficulty = SaveManager.getSettings().difficulty;
    const pace = difficulty === 'easy' ? 0.82 : difficulty === 'hard' ? 1.2 : 1;
    this.config = { ...config, speed: config.speed * pace,
      detectionRange: config.detectionRange * pace,
      attackCooldown: config.attackCooldown / pace };
    this.player = player;
    this.maxHp = config.hp;
    this.hp = this.maxHp;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.width - 4, config.height - 4, false);
    body.setOffset(2 + config.offsetX, 2 + config.offsetY);
    body.setCollideWorldBounds(true);
    body.collisionCategory = CollisionGroup.ENEMY;
    body.collisionMask =
      CollisionGroup.PLAYER |
      CollisionGroup.PLAYER_BULLET |
      CollisionGroup.ENVIRONMENT;

    this.setDepth(8);
    this.setOrigin(0.5, 0.5);
    const artKey: Record<string, string> = {
      enemy_infantry: 'art_enemy_infantry',
      enemy_rifle: 'art_enemy_rifle',
      enemy_heavy: 'art_enemy_heavy',
      enemy_shield: 'art_enemy_shield',
      enemy_drone: 'art_enemy_drone',
      enemy_turret: 'art_enemy_turret',
    };
    this.characterArt = scene.add.image(x, y, artKey[config.texture] ?? 'art_enemy_infantry')
      .setOrigin(0.5, config.type === 'flying_drone' ? 0.5 : 1).setDepth(9);
    this.setVisible(false);
    this.once('destroy', () => this.characterArt.destroy());

    // Set up physics properties
    body.setDrag(200);
    body.setBounce(0);

    // Patrol start position
    this.patrolStartX = x;

    // Ground enemies are platform-bound actors, not free-falling bodies.
    // Resolve their intended support immediately and keep gravity from ever
    // pulling them through a thin/segmented Arcade platform.
    if (config.type !== 'flying_drone') {
      this.anchorToNearestPlatform();
    }

    this.on('animationcomplete', this.handleAnimationComplete, this);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.isDead) return;
    if (gameState.getGameState() === GameState.PLAYER_DEAD ||
      gameState.getGameState() === GameState.GAME_OVER) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateCharacterArt();
      return;
    }

    this.updateSupportSurface();

    // Update timers
    this.stateTimer -= delta;
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 0;
        this.canAttack = true;
      }
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.clearAlpha();
      }
    }

    // Update state
    this.updateState(delta);

    // Update behavior
    this.updateBehavior(time, delta);

    // Ground enemies own the platform they land on. This final guard also
    // covers knockback and delayed subclass movement, which can bypass the
    // patrol/chase ledge probe and used to send enemies into the void.
    this.keepOnSupportSurface();

    // Update animation
    this.updateAnimation();
    this.setVisible(false);
    this.updateCharacterArt();
  }

  private updateCharacterArt(): void {
    if (!this.characterArt?.active) return;
    const dimensions: Record<string, [number, number]> = {
      enemy_infantry: [30, 34], enemy_rifle: [32, 34],
      enemy_heavy: [39, 39], enemy_shield: [34, 35],
      enemy_drone: [42, 27], enemy_turret: [35, 31],
    };
    const [width, height] = dimensions[this.config.texture] ?? [30, 34];
    const body = this.body as Phaser.Physics.Arcade.Body;
    const walking = (this.aiState === 'PATROL' || this.aiState === 'CHASE') && Math.abs(body.velocity.x) > 4;
    const walkFrames: Record<string, string> = {
      enemy_infantry: 'art_enemy_infantry_walk', enemy_rifle: 'art_enemy_rifle_walk',
      enemy_heavy: 'art_enemy_heavy_walk', enemy_shield: 'art_enemy_shield_walk',
    };
    const baseFrames: Record<string, string> = {
      enemy_infantry: 'art_enemy_infantry', enemy_rifle: 'art_enemy_rifle',
      enemy_heavy: 'art_enemy_heavy', enemy_shield: 'art_enemy_shield',
    };
    const walkFrame = walkFrames[this.config.texture];
    const baseFrame = baseFrames[this.config.texture];
    const useWalkFrame = walking && !!walkFrame && Math.floor(this.scene.time.now / 125) % 2 === 0;
    const artFrame = useWalkFrame ? walkFrame : baseFrame;
    if (artFrame && this.characterArt.texture.key !== artFrame) this.characterArt.setTexture(artFrame);
    const recoil = this.scene.time.now - this.lastAttackAt < 110 ? 2 : 0;
    this.characterArt.setDisplaySize(width, height);
    this.characterArt.setPosition(Math.round(this.x + (this.facing === 'right' ? -recoil : recoil)),
      Math.round(this.config.type === 'flying_drone' ? this.y : body.bottom));
    this.characterArt.setFlipX(this.facing === 'right');
    this.characterArt.setTint(this.lastVisualTint);
    this.characterArt.setAlpha(this.alpha);
  }

  private updateState(_delta: number): void {
    if (!this.player) return;

    if (!this.isPlayerAlive()) {
      this.hasEngagedPlayer = false;
      if (this.aiState !== 'HURT') this.aiState = 'IDLE';
      return;
    }

    // Detection is latched for the encounter. Once an enemy sees the
    // player it keeps pursuing until one of them dies, rather than dropping
    // back to patrol whenever the player briefly leaves the detection ray.
    if (this.canSeePlayer()) {
      this.hasEngagedPlayer = true;
      this.facing = this.player.x >= this.x ? 'right' : 'left';
    }

    if (this.hasEngagedPlayer && this.aiState !== 'HURT' && this.aiState !== 'ATTACK') {
      this.aiState = 'CHASE';
    } else if (!this.hasEngagedPlayer && (this.aiState === 'CHASE' || this.aiState === 'ALERT')) {
      this.aiState = 'PATROL';
    }
  }

  private isPlayerAlive(): boolean {
    if (!this.player?.active) return false;
    const playerWithState = this.player as Phaser.Physics.Arcade.Sprite & {
      getPlayerState?: () => string;
    };
    return playerWithState.getPlayerState?.() !== 'death';
  }

  /**
   * Line-of-sight check: casts a short ray of sample points from the
   * enemy to the player and rejects sight if any sample point lands
   * inside a platform's collision body. This is what "in sight" actually
   * means -- previously the only gate was a Y-distance proxy with no
   * check for solid geometry in between, so an enemy standing right below
   * a platform the player was standing on top of would still "detect"
   * and attack them straight through the floor.
   */
  protected canSeePlayer(maxRange: number = this.config.detectionRange): boolean {
    if (!this.player?.active || this.isDead) return false;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    return distance <= maxRange && this.hasClearLineOfSight();
  }

  private hasClearLineOfSight(): boolean {
    if (!this.player) return false;

    const scene = this.scene as Phaser.Scene & {
      getPlatforms?: () => Phaser.Physics.Arcade.StaticGroup;
      getSightBlockers?: () => Phaser.GameObjects.GameObject[];
    };
    const blockers = scene.getSightBlockers?.() ?? scene.getPlatforms?.().getChildren();
    if (!blockers) return true;

    let blocked = false;
    for (const child of blockers) {
      const platform = child as Phaser.Physics.Arcade.Sprite;
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | null;
      if (!platformBody?.enable) continue;

      if (this.segmentIntersectsBody(this.x, this.y, this.player!.x, this.player!.y, platformBody)) {
        blocked = true;
        break;
      }
    }

    return !blocked;
  }

  /** Exact segment/AABB test so thin platforms cannot fall between ray samples. */
  private segmentIntersectsBody(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    body: Phaser.Physics.Arcade.StaticBody,
  ): boolean {
    const minX = body.x;
    const maxX = body.x + body.width;
    const minY = body.y;
    const maxY = body.y + body.height;
    const dx = endX - startX;
    const dy = endY - startY;
    let near = 0;
    let far = 1;

    const clipAxis = (start: number, delta: number, min: number, max: number): boolean => {
      if (Math.abs(delta) < 0.0001) return start >= min && start <= max;
      const first = (min - start) / delta;
      const second = (max - start) / delta;
      near = Math.max(near, Math.min(first, second));
      far = Math.min(far, Math.max(first, second));
      return near <= far;
    };

    return clipAxis(startX, dx, minX, maxX) && clipAxis(startY, dy, minY, maxY) && far > 0.01 && near < 0.99;
  }

  /** Unit direction from this enemy to the player's current position. */
  protected getAimDirection(spreadDegrees: number = 0): Phaser.Math.Vector2 {
    if (!this.player) return new Phaser.Math.Vector2(this.facing === 'right' ? 1 : -1, 0);

    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const spread = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-spreadDegrees, spreadDegrees));
    return new Phaser.Math.Vector2(Math.cos(baseAngle + spread), Math.sin(baseAngle + spread));
  }

  protected projectileSpeed(base: number): number {
    const difficulty = SaveManager.getSettings().difficulty;
    return base * (difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.18 : 1);
  }

  private updateBehavior(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'IDLE':
        body.setVelocityX(0);
        if (this.stateTimer <= 0) {
          this.stateTimer = 2000 + Math.random() * 1000;
          this.aiState = 'PATROL';
        }
        break;

      case 'PATROL':
        if (this.stateTimer <= 0) {
          this.patrolDirection *= -1;
          this.stateTimer = 2000 + Math.random() * 1000;
        }

        if (this.shouldTurnAround()) {
          this.patrolDirection *= -1;
        }

        body.setVelocityX(this.config.speed * this.patrolDirection);
        this.facing = this.patrolDirection > 0 ? 'right' : 'left';
        break;

      case 'ALERT':
        // Legacy saves/animations may still enter ALERT; resume the latched
        // pursuit immediately instead of stopping to fire in place.
        this.aiState = this.hasEngagedPlayer ? 'CHASE' : 'PATROL';
        break;

      case 'CHASE':
        if (this.player && this.isPlayerAlive()) {
          const dir = this.player.x - this.x;
          this.facing = dir > 0 ? 'right' : 'left';

          // Don't chase the player straight off a ledge. If continuing
          // toward them would walk off solid ground, stop advancing
          // horizontally instead -- the enemy stays put (still able to
          // attack if in range) rather than falling into a pit chasing a
          // player who jumped across a gap.
          const chaseDirection = dir > 0 ? 1 : -1;
          if (this.isApproachingLedge(chaseDirection)) {
            body.setVelocityX(0);
          } else {
            body.setVelocityX(
              Phaser.Math.Clamp(dir * this.config.speed / 100, -this.config.speed, this.config.speed),
            );
          }

          // Movement and firing happen in the same state: enemies continue
          // closing the distance while taking every clear shot in range.
          if (this.canAttack && this.attackCooldown <= 0 && this.canSeePlayer(this.config.attackRange)) {
            this.lastAttackAt = this.scene.time.now;
            this.playAttackCue();
            this.performAttack();
            this.attackCooldown = this.config.attackCooldown;
            this.canAttack = false;
          }
        } else {
          body.setVelocityX(0);
          this.aiState = 'IDLE';
        }
        break;

      case 'ATTACK':
        // ATTACK is retained for compatibility, but no longer pauses chase.
        this.lastAttackAt = this.scene.time.now;
        this.playAttackCue();
        this.performAttack();
        this.attackCooldown = this.config.attackCooldown;
        this.canAttack = false;
        this.aiState = 'CHASE';
        break;

      case 'HURT':
        body.setVelocityX(0);
        if (this.stateTimer <= 0) {
          this.aiState = this.hasEngagedPlayer ? 'CHASE' : 'PATROL';
        }
        break;
    }
  }

  private shouldTurnAround(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const reachedPatrolBound =
      (this.patrolDirection < 0 && body.onWall() === false && this.x < this.patrolStartX - this.patrolRange) ||
      (this.patrolDirection > 0 && body.onWall() === false && this.x > this.patrolStartX + this.patrolRange);

    return reachedPatrolBound || this.isApproachingLedge();
  }

  /**
   * Ground-edge check: previously PATROL only ever turned around at a
   * wall or the patrolRange bound, with no check for solid ground ahead.
   * An enemy patrolling toward a platform edge with nothing beyond it
   * (a pit, or simply the end of that platform segment) would walk
   * straight off and fall, since collide-with-platforms only stops
   * vertical falling once already airborne, not horizontal movement into
   * open space. This probes a point just past the enemy's leading edge,
   * slightly below its feet, and treats "no platform body there" as a
   * ledge to turn back from.
   */
  protected isApproachingLedge(direction: number = this.patrolDirection): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Only grounded, moving enemies patrol/chase along a surface.
    // Stationary enemies (Turret, speed 0) never call setVelocityX from a
    // branch that matters, and airborne enemies (FlyingDrone) overwrite
    // velocity every frame in their own preUpdate after calling
    // super.preUpdate, so a ledge concept doesn't apply to them; skip the
    // probe entirely rather than have it fight their own movement logic.
    if (this.supportSurface) {
      const leadingEdge = direction > 0 ? body.right : body.left;
      const limit = direction > 0 ? this.supportSurface.right : this.supportSurface.left;
      return direction > 0 ? leadingEdge + 6 >= limit : leadingEdge - 6 <= limit;
    }

    if (this.config.speed <= 0 || !body.onFloor() || direction === 0) return false;

    const scene = this.scene as Phaser.Scene & { getPlatforms?: () => Phaser.Physics.Arcade.StaticGroup };
    const platforms = scene.getPlatforms?.();
    if (!platforms) return false;

    const probeAheadDistance = body.width / 2 + 6;
    const probeX = this.x + probeAheadDistance * Math.sign(direction);
    const probeY = body.y + body.height + 4; // just below the enemy's feet

    let foundGround = false;
    platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const platform = child as Phaser.Physics.Arcade.Sprite;
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | null;
      if (!platformBody) return true;

      if (
        probeX >= platformBody.x &&
        probeX <= platformBody.x + platformBody.width &&
        probeY >= platformBody.y &&
        probeY <= platformBody.y + platformBody.height + 8
      ) {
        foundGround = true;
        return false;
      }
      return true;
    });

    return !foundGround;
  }

  /**
   * Records the complete contiguous platform span under a grounded enemy.
   * Platforms are built from 32px segments, so treating only one collider
   * as the support would trap an enemy on a single tile.
   */
  private updateSupportSurface(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body.allowGravity || !(body.onFloor() || body.blocked.down || body.touching.down)) return;

    const scene = this.scene as Phaser.Scene & { getPlatforms?: () => Phaser.Physics.Arcade.StaticGroup };
    const platforms = scene.getPlatforms?.();
    if (!platforms) return;

    const footY = body.bottom;
    const intervals: Array<{ left: number; right: number; top: number }> = [];

    platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const platform = child as Phaser.Physics.Arcade.Sprite;
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | null;
      if (!platformBody || Math.abs(platformBody.top - footY) > 8) return true;

      intervals.push({ left: platformBody.left, right: platformBody.right, top: platformBody.top });
      return true;
    });

    const seed = intervals.find((interval) => body.right >= interval.left && body.left <= interval.right);
    if (!seed) return;

    let left = seed.left;
    let right = seed.right;
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const interval of intervals) {
        if (Math.abs(interval.top - seed.top) > 2) continue;
        if (interval.right >= left - 2 && interval.left <= right + 2) {
          const nextLeft = Math.min(left, interval.left);
          const nextRight = Math.max(right, interval.right);
          expanded = expanded || nextLeft !== left || nextRight !== right;
          left = nextLeft;
          right = nextRight;
        }
      }
    }

    this.supportSurface = { left, right, top: seed.top };
  }

  private anchorToNearestPlatform(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const scene = this.scene as Phaser.Scene & { getPlatforms?: () => Phaser.Physics.Arcade.StaticGroup };
    const platforms = scene.getPlatforms?.();
    if (!platforms) return;

    const intervals: Array<{ left: number; right: number; top: number }> = [];
    platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const platform = child as Phaser.Physics.Arcade.Sprite;
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | null;
      if (platformBody && this.x >= platformBody.left && this.x <= platformBody.right) {
        intervals.push({ left: platformBody.left, right: platformBody.right, top: platformBody.top });
      }
      return true;
    });

    const seed = intervals
      .filter((interval) => interval.top >= this.y - 80)
      .sort((a, b) => Math.abs(a.top - body.bottom) - Math.abs(b.top - body.bottom))[0];
    if (!seed) return;

    // Merge all touching tiles at the selected height into one platform.
    const sameHeight: Array<{ left: number; right: number; top: number }> = [];
    platforms.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const platformBody = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (platformBody && Math.abs(platformBody.top - seed.top) <= 2) {
        sameHeight.push({ left: platformBody.left, right: platformBody.right, top: platformBody.top });
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

    this.supportSurface = { left, right, top: seed.top };
    const correctedY = this.y - (body.bottom - seed.top);
    this.setY(correctedY);
    body.reset(this.x, correctedY);
    body.setAllowGravity(false);
  }

  private keepOnSupportSurface(): void {
    if (!this.supportSurface) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const leftInset = this.x - body.left;
    const rightInset = body.right - this.x;
    const minX = this.supportSurface.left + leftInset + 2;
    const maxX = this.supportSurface.right - rightInset - 2;
    const clampedX = Phaser.Math.Clamp(this.x, minX, maxX);

    if (clampedX !== this.x) {
      this.setX(clampedX);
      body.setVelocityX(0);
      this.patrolDirection = clampedX === minX ? 1 : -1;
    }

    // If a strong knockback or a delayed charge got the body around an
    // edge between physics steps, put it back on top of its owned surface.
    if (Math.abs(body.bottom - this.supportSurface.top) > 1) {
      const correctedY = this.y - (body.bottom - this.supportSurface.top);
      this.setY(correctedY);
      body.reset(this.x, correctedY);
    }
  }

  /** Override in subclasses for specific attack behavior */
  protected abstract performAttack(): void;

  private playAttackCue(): void {
    const sound = this.config.type === 'heavy_gunner' ? 'sfx_enemy_heavy' :
      this.config.type === 'flying_drone' ? 'sfx_enemy_drone' :
      this.config.type === 'turret' ? 'sfx_enemy_turret' : 'sfx_enemy_rifle';
    EventBus.emit(Events.AUDIO_SFX, sound, { volume: 0.45 });
  }

  protected updateAnimation(): void {
    this.setFlipX(this.facing === 'left');
    const tint = this.aiState === 'HURT' ? 0xff8c83 : this.scene.time.now - this.lastAttackAt < 110 ? 0xffd39b :
      this.aiState === 'ALERT' || this.aiState === 'CHASE' ? 0xffebbd : 0xffffff;
    if (tint !== this.lastVisualTint) {
      this.setTint(tint);
      this.lastVisualTint = tint;
    }

    const animMap: Record<EnemyState, string | null> = {
      IDLE: 'enemy_idle',
      PATROL: 'enemy_walk',
      ALERT: 'enemy_idle',
      CHASE: 'enemy_walk',
      ATTACK: 'enemy_attack',
      HURT: 'enemy_hurt',
      DEAD: 'enemy_dead',
    };

    const animKey = animMap[this.aiState];
    if (animKey && this.anims.exists(animKey)) {
      this.play(animKey, true);
    }
  }

  handleAnimationComplete(anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame): void {
    // Override in subclasses if needed
  }

  takeDamage(damage: number, sourceX?: number, sourceY?: number): void {
    if (this.isDead) return;

    this.hp -= damage;

    // Knockback
    if (sourceX !== undefined && sourceY !== undefined) {
      const knockbackDir = this.x - sourceX;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(knockbackDir * 0.3);
      if (!this.supportSurface) {
        body.setVelocityY(-150);
      }
    }

    // Flash effect
    this.setAlpha(0.5);
    this.flashTimer = 200;

    if (this.hp <= 0) {
      this.die();
    } else {
      this.aiState = 'HURT';
      this.stateTimer = 300;
      EventBus.emit(Events.ENEMY_DAMAGED, this);
      EventBus.emit(Events.AUDIO_SFX, 'sfx_enemy_damage');
    }
  }

  die(): void {
    this.isDead = true;
    this.aiState = 'DEAD';

    // Score is awarded by LevelOneScene.handlePlayerBulletHit() via
    // player.addScore(enemy.getScoreValue()), which applies the combo
    // multiplier correctly. This used to also call
    // gameState.addScore(this.config.scoreValue * gameState.getPlayerStats().score > 0 ? 1 : 1)
    // here -- a ternary whose branches were both `1`, so it silently
    // discarded config.scoreValue and double-counted every kill (a flat
    // +1 on top of the correct combo-weighted award). Removed.
    gameState.addEnemyDefeated();

    // Drop weapon pickup chance
    if (this.config.dropsWeapon && Math.random() < this.config.weaponDropChance) {
      this.dropWeapon();
    }

    const mechanical = this.config.type === 'flying_drone' || this.config.type === 'turret' ||
      this.config.type === 'heavy_gunner' || this.config.type === 'shield_soldier';
    EventBus.emit(Events.PARTICLE_EMIT, mechanical ? 'debris' : 'enemy_death', this.x, this.y,
      { count: mechanical ? 12 : 7 });
    if (mechanical) EventBus.emit(Events.AUDIO_SFX, 'sfx_bomb_small', { volume: 0.35 });

    // Play sound
    EventBus.emit(Events.AUDIO_SFX, 'sfx_enemy_death');

    // Despawn after delay
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = false;
    this.scene.tweens.add({ targets: [this, this.characterArt], alpha: 0,
      angle: this.facing === 'left' ? -12 : 12,
      duration: 450 });
    this.scene.time.delayedCall(500, () => {
      if (this.destroy) {
        this.destroy();
      }
    });
  }

  private dropWeapon(): void {
    // 50% chance to drop a weapon pickup
    const weapons = ['spread_blaster', 'rapid_cannon', 'plasma_beam', 'rocket_launcher'];
    const weapon = Phaser.Math.RND.pick(weapons) as string;

    EventBus.emit(Events.PLAYER_WEAPON_PICKUP, weapon, this.x, this.y);
  }

  /** Check if enemy should be active (near player) */
  isActiveInViewport(viewportX: number, viewportEndX: number): boolean {
    return this.x >= viewportX - 50 && this.x <= viewportEndX + 50;
  }

  /** Get score value */
  getScoreValue(): number {
    return this.config.scoreValue;
  }

  /** Get enemy type */
  getType(): EnemyType {
    return this.config.type;
  }

  /** Get HP */
  getHp(): number {
    return this.hp;
  }

  /** Check if dead */
  getIsDead(): boolean {
    return this.isDead;
  }

  /** A checkpoint respawn starts a fresh engagement without duplicating enemies. */
  resetEncounterState(): void {
    if (this.isDead) return;
    this.hasEngagedPlayer = false;
    this.aiState = 'IDLE';
    this.stateTimer = 500;
    this.attackCooldown = 0;
    this.canAttack = true;
    this.lastAttackAt = -1000;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}

// Enemy interface for pooling
interface Poolable {
  active: boolean;
  reset(): void;
}
