import Phaser from 'phaser';
import { CollisionGroup, GameState } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import type { BossConfig } from './BossConfig';
import { BossState } from './BossState';

/** Common boss lifecycle, state ownership, damage gating, and timer safety. */
export abstract class BaseBoss extends Phaser.Physics.Arcade.Sprite {
  protected readonly config: BossConfig;
  protected maxHp: number;
  protected hp: number;
  protected currentPhase = 0;
  protected isDead = false;
  protected flashTimer = 0;
  protected player: Phaser.Physics.Arcade.Sprite | null;
  protected bossState = BossState.DORMANT;
  protected stateTimeRemaining = 0;
  protected damageEnabled = false;
  protected currentAttack = '';
  protected pendingPhase: number | null = null;

  private stateTimers = new Set<Phaser.Time.TimerEvent>();
  private deathTimers = new Set<Phaser.Time.TimerEvent>();

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, config: BossConfig,
    player: Phaser.Physics.Arcade.Sprite | null) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const difficulty = SaveManager.getSettings().difficulty;
    const pace = difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.15 : 1;
    this.config = {
      ...config,
      phases: config.phases.map((phase) => ({ ...phase, movementSpeed: phase.movementSpeed * pace })),
      attacks: Object.fromEntries(Object.entries(config.attacks).map(([id, attack]) => [id, {
        ...attack,
        cooldown: attack.cooldown / pace,
        recoveryDuration: attack.recoveryDuration / pace,
        projectileSpeed: attack.projectileSpeed === undefined ? undefined : attack.projectileSpeed * pace,
      }])) as BossConfig['attacks'],
    };
    this.maxHp = config.maxHealth;
    this.hp = config.maxHealth;
    this.player = player;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 60, false).setCollideWorldBounds(true).setAllowGravity(false);
    body.collisionCategory = CollisionGroup.BOSS;
    body.collisionMask = CollisionGroup.PLAYER | CollisionGroup.PLAYER_BULLET | CollisionGroup.ENVIRONMENT;
    this.setDepth(10).setOrigin(0.5);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.bossState === BossState.DEAD) return;
    if (gameState.getGameState() === GameState.PLAYER_DEAD ||
      gameState.getGameState() === GameState.GAME_OVER) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) this.setAlpha(1);
    }
    this.stateTimeRemaining = Math.max(0, this.stateTimeRemaining - delta);
    this.updateBehavior(time, delta);
  }

  protected setBossState(next: BossState, duration = 0): void {
    if (next === this.bossState && duration === this.stateTimeRemaining) return;
    this.cancelStateTimers();
    this.bossState = next;
    this.stateTimeRemaining = duration;
    this.damageEnabled = ![BossState.DORMANT, BossState.INTRO, BossState.TRANSITION,
      BossState.DYING, BossState.DEAD].includes(next);
    EventBus.emit(Events.BOSS_STATE_CHANGE, next, duration);
  }

  protected scheduleStateAction(delay: number, action: () => void): Phaser.Time.TimerEvent {
    const ownerState = this.bossState;
    const timer = this.scene.time.delayedCall(delay, () => {
      this.stateTimers.delete(timer);
      if (this.bossState === ownerState && !this.isDead) action();
    });
    this.stateTimers.add(timer);
    return timer;
  }

  protected cancelStateTimers(): void {
    this.stateTimers.forEach((timer) => timer.remove(false));
    this.stateTimers.clear();
  }

  protected scheduleDeathAction(delay: number, action: () => void): void {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.deathTimers.delete(timer);
      if (this.bossState === BossState.DYING) action();
    });
    this.deathTimers.add(timer);
  }

  protected queuePhaseIfNeeded(): void {
    const ratio = this.hp / this.maxHp;
    const target = ratio <= this.config.phase3Threshold ? 2 : ratio <= this.config.phase2Threshold ? 1 : 0;
    if (target > this.currentPhase && (this.pendingPhase === null || target > this.pendingPhase)) this.pendingPhase = target;
  }

  protected beginPhaseTransition(): boolean {
    if (this.pendingPhase === null || this.isDead) return false;
    this.currentPhase = this.pendingPhase;
    this.pendingPhase = null;
    this.currentAttack = '';
    this.setBossState(BossState.TRANSITION, this.config.transitionDuration);
    const phase = this.config.phases[this.currentPhase];
    EventBus.emit(Events.BOSS_PHASE_CHANGE, this.currentPhase, phase.message);
    EventBus.emit(Events.NOTIFICATION, `PHASE ${this.currentPhase + 1}: ${phase.message}`);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_boss_warning');
    EventBus.emit(Events.SCREEN_FLASH, 0xff3300, 500);
    return true;
  }

  abstract updateBehavior(time: number, delta: number): void;

  takeDamage(damage: number): boolean {
    if (this.isDead || !this.damageEnabled || damage <= 0) return false;
    // A powerful weapon cannot skip an entire configured phase. The boss
    // stops at the next phase gate, performs its transition, then becomes
    // damageable again in the new phase.
    const phaseFloor = this.currentPhase === 0
      ? this.maxHp * this.config.phase2Threshold
      : this.currentPhase === 1
        ? this.maxHp * this.config.phase3Threshold
        : 0;
    this.hp = Math.max(phaseFloor, this.hp - damage);
    this.setAlpha(0.5);
    this.flashTimer = 150;
    EventBus.emit(Events.BOSS_DAMAGED, this.hp, this.maxHp, this.currentPhase);
    EventBus.emit(Events.PARTICLE_EMIT, 'boss_damage', this.x, this.y, { count: 8 });
    if (this.hp <= 0) this.die(); else this.queuePhaseIfNeeded();
    return true;
  }

  die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.damageEnabled = false;
    this.cancelStateTimers();
    this.setBossState(BossState.DYING, this.config.deathSequence.removeAt);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    EventBus.emit(Events.BOSS_DEATH, this);
    EventBus.emit(Events.BOSS_CLEAR_PROJECTILES);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_boss_explosion');
    gameState.addScore(5000 * (4 - this.currentPhase));
    gameState.addEnemyDefeated();

    this.config.deathSequence.smallExplosions.forEach((delay, index) => {
      this.scheduleDeathAction(delay, () => {
        EventBus.emit(Events.EXPLOSION, this.x + (index % 2 === 0 ? -40 : 40), this.y - 25 + index * 18, 40);
        EventBus.emit(Events.CAMERA_SHAKE, 12, 220);
      });
    });
    this.scheduleDeathAction(this.config.deathSequence.mainExplosion, () => {
      EventBus.emit(Events.EXPLOSION, this.x, this.y, 90);
      EventBus.emit(Events.SCREEN_FLASH, 0xffdd88, 700);
      EventBus.emit(Events.CAMERA_SHAKE, 30, 900);
    });
    this.scheduleDeathAction(this.config.deathSequence.removeAt, () => {
      this.setBossState(BossState.DEAD);
      this.setActive(false).setVisible(false);
      EventBus.emit(Events.ARENA_UNLOCK);
      EventBus.emit(Events.GAME_VICTORY);
    });
  }

  protected resetBaseEncounter(): void {
    this.cancelStateTimers();
    this.deathTimers.forEach((timer) => timer.remove(false));
    this.deathTimers.clear();
    this.isDead = false;
    this.hp = this.maxHp;
    this.currentPhase = 0;
    this.pendingPhase = null;
    this.currentAttack = '';
    this.setActive(true).setAlpha(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false).setVelocity(0, 0);
    this.setBossState(BossState.DORMANT);
  }

  getHp(): number { return this.hp; }
  getMaxHp(): number { return this.maxHp; }
  getPhase(): number { return this.currentPhase; }
  getIsDead(): boolean { return this.isDead; }
  getBossState(): BossState { return this.bossState; }
  getCurrentAttack(): string { return this.currentAttack; }
  getConfig(): Readonly<BossConfig> { return this.config; }
}
