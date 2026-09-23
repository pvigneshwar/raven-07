import Phaser from 'phaser';
import { BaseBoss } from './BaseBoss';
import { BossState } from './BossState';
import {
  JUNGLE_SIEGE_WALKER_CONFIG,
  type BossAttackConfig,
  type BossAttackId,
  type WeakPointConfig,
} from './BossConfig';
import { CollisionGroup } from '../config/gameConfig';
import { EventBus, Events } from '../core/EventBus';

interface WeakPointRuntime {
  config: WeakPointConfig;
  hp: number;
  sprite: Phaser.GameObjects.Sprite;
  destroyed: boolean;
}

/** Three-phase, multi-part mechanical boss driven by an explicit state machine. */
export class JungleSiegeWalker extends BaseBoss {
  private bodySprite!: Phaser.GameObjects.Sprite;
  private headSprite!: Phaser.GameObjects.Sprite;
  private leftLeg!: Phaser.GameObjects.Sprite;
  private rightLeg!: Phaser.GameObjects.Sprite;
  private leftArm!: Phaser.GameObjects.Sprite;
  private rightArm!: Phaser.GameObjects.Sprite;
  private leftHip!: Phaser.GameObjects.Sprite;
  private rightHip!: Phaser.GameObjects.Sprite;
  private core!: Phaser.GameObjects.Sprite;
  private walkerArt!: Phaser.GameObjects.Image;

  private stepOffset = 0;
  private walkDirection = -1;
  private isWalking = false;
  private arenaLeft: number | null = null;
  private arenaRight: number | null = null;
  private arenaRootY: number | null = null;
  private selectedAttack: BossAttackConfig | null = null;
  private lastAttack: BossAttackId | null = null;
  private repeatCount = 0;
  private disabledAttacks = new Set<BossAttackId>();
  private weakPoints = new Map<string, WeakPointRuntime>();
  private telegraphObjects: Phaser.GameObjects.GameObject[] = [];
  private missileTargets: number[] = [];
  private visualDamageStage = -1;
  private lastFireAt = -1000;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Phaser.Physics.Arcade.Sprite | null = null) {
    super(scene, x, y, 'boss_body', JUNGLE_SIEGE_WALKER_CONFIG, player);
    this.createBodyParts();
  }

  private createBodyParts(): void {
    const add = (x: number, y: number, texture: string, width: number, height: number, depth: number) =>
      this.scene.add.sprite(x, y, texture).setDisplaySize(width, height).setDepth(depth);
    this.bodySprite = add(this.x, this.y, 'boss_body', 100, 60, 11);
    this.headSprite = add(this.x, this.y - 40, 'boss_head', 64, 64, 12);
    this.leftLeg = add(this.x - 35, this.y + 40, 'boss_leg', 40, 80, 10);
    this.rightLeg = add(this.x + 35, this.y + 40, 'boss_leg', 40, 80, 10);
    this.leftHip = add(this.x - 25, this.y - 10, 'boss_hip', 60, 40, 11);
    this.rightHip = add(this.x + 25, this.y - 10, 'boss_hip', 60, 40, 11);
    this.leftArm = add(this.x - 55, this.y + 10, 'boss_upper_arm', 24, 54, 12);
    this.rightArm = add(this.x + 55, this.y + 10, 'boss_upper_arm', 24, 54, 12);
    this.core = add(this.x, this.y + 10, 'boss_weakpoint', 22, 22, 13);
    this.walkerArt = this.scene.add.image(this.x, this.y, 'art_boss_walker')
      .setDisplaySize(210, 157).setDepth(13).setAlpha(0);
    this.core.setDepth(14);
    this.once('destroy', () => this.walkerArt.destroy());
    this.setVisible(false);

    for (const part of this.getBodyParts()) {
      this.scene.physics.add.existing(part);
      const body = part.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setImmovable(true);
      body.collisionCategory = CollisionGroup.BOSS;
      body.collisionMask = CollisionGroup.PLAYER | CollisionGroup.PLAYER_BULLET;
      // The rig remains interactive, but the generated walker art now owns
      // the visible armor silhouette. Only its glowing core renders above it.
      if (part !== this.core) part.setVisible(false);
    }

    const sprites = new Map<string, Phaser.GameObjects.Sprite>([
      ['left_cannon', this.leftArm], ['right_cannon', this.rightArm], ['core', this.core],
    ]);
    for (const weakPoint of this.config.weakPoints) {
      const sprite = sprites.get(weakPoint.id)!;
      sprite.setData('weakPointId', weakPoint.id);
      this.weakPoints.set(weakPoint.id, { config: weakPoint, hp: weakPoint.health, sprite, destroyed: false });
    }
  }

  beginEncounter(): void {
    if (this.bossState !== BossState.DORMANT) return;
    this.setBossState(BossState.INTRO, this.config.introDuration);
    this.isWalking = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.getBodyParts().forEach((part) => part.setAlpha(0));
    this.scene.tweens.add({ targets: this.getBodyParts(), alpha: 1, duration: this.config.introDuration * 0.7 });
    this.walkerArt.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.walkerArt, alpha: 1, duration: this.config.introDuration * 0.7 });
  }

  updateBehavior(_time: number, delta: number): void {
    this.pinToArena();
    this.updateBodyParts();
    if (this.bossState === BossState.DEAD) return;

    switch (this.bossState) {
      case BossState.DORMANT:
      case BossState.DYING:
      case BossState.STUNNED:
        this.stopMoving();
        break;
      case BossState.INTRO:
        this.stopMoving();
        if (this.stateTimeRemaining <= 0) this.enterDecisionState(500);
        break;
      case BossState.IDLE:
      case BossState.ENRAGED:
        this.moveWithinArena(delta);
        if (this.stateTimeRemaining <= 0) this.targetNextAttack();
        break;
      case BossState.TARGETING:
        this.moveWithinArena(delta * 0.35);
        if (this.stateTimeRemaining <= 0) this.executeSelectedAttack();
        break;
      case BossState.ATTACKING:
        this.stopMoving();
        if (this.stateTimeRemaining <= 0) {
          this.clearTelegraphs();
          this.setBossState(BossState.RECOVERY, this.selectedAttack?.recoveryDuration ?? 700);
        }
        break;
      case BossState.RECOVERY:
        this.stopMoving();
        if (this.stateTimeRemaining <= 0) {
          if (!this.beginPhaseTransition()) this.enterDecisionState(this.selectedAttack?.cooldown ?? 350);
        }
        break;
      case BossState.TRANSITION:
        this.stopMoving();
        if (this.stateTimeRemaining <= 0) this.enterDecisionState(500);
        break;
    }

    const hpRatio = this.hp / this.maxHp;
    const sparkChance = hpRatio <= 0.15 ? 0.1 : hpRatio <= 0.3 ? 0.055 : hpRatio <= 0.5 ? 0.02 : 0.006;
    if (!this.isDead && Math.random() < sparkChance) {
      EventBus.emit(Events.PARTICLE_EMIT, 'boss_explosion_particle', this.x + Phaser.Math.Between(-45, 45), this.y, { count: 1 });
    }
    this.updateDamageAppearance();
  }

  private updateDamageAppearance(): void {
    const ratio = this.hp / this.maxHp;
    const stage = ratio <= 0.1 ? 4 : ratio <= 0.3 ? 3 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 1 : 0;
    if (stage !== this.visualDamageStage) {
      this.visualDamageStage = stage;
      const armorTints = [0xffffff, 0xe4ded0, 0xcebaa8, 0xba9583, 0xff7560];
      this.getBodyParts().forEach((part) => { if (part !== this.core) part.setTint(armorTints[stage]); });
      this.walkerArt.setTint(armorTints[stage]);
      if (stage > 0) EventBus.emit(Events.PARTICLE_EMIT, 'boss_damage', this.x, this.y, { count: 6 });
    }
    if (this.bossState !== BossState.INTRO && this.bossState !== BossState.DORMANT && !this.weakPoints.get('core')?.destroyed) {
      this.core.setTint(stage >= 3 ? 0xff594a : 0xffb05a);
      this.core.setAlpha(0.75 + 0.25 * Math.sin(this.scene.time.now / (stage >= 3 ? 85 : 180)));
    }
  }

  private enterDecisionState(delay: number): void {
    const phase = this.config.phases[this.currentPhase];
    const scaledDelay = delay * phase.cooldownMultiplier;
    this.setBossState(this.currentPhase >= 2 ? BossState.ENRAGED : BossState.IDLE, scaledDelay);
  }

  private targetNextAttack(): void {
    if (this.beginPhaseTransition()) return;
    this.selectedAttack = this.chooseAttack();
    this.currentAttack = this.selectedAttack.id;
    this.createTelegraph(this.selectedAttack);
    this.setBossState(BossState.TARGETING, this.selectedAttack.telegraphDuration);
  }

  private chooseAttack(): BossAttackConfig {
    const phase = this.config.phases[this.currentPhase];
    const distance = this.player ? Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y) : 500;
    let candidates = phase.attacks.map((id) => this.config.attacks[id]).filter((attack) =>
      !this.disabledAttacks.has(attack.id) &&
      (attack.minDistance === undefined || distance >= attack.minDistance) &&
      (attack.maxDistance === undefined || distance <= attack.maxDistance) &&
      !(this.repeatCount >= 2 && attack.id === this.lastAttack));
    if (candidates.length === 0) {
      candidates = phase.attacks.map((id) => this.config.attacks[id]).filter((attack) => !this.disabledAttacks.has(attack.id));
    }
    const total = candidates.reduce((sum, attack) => sum + attack.weight, 0);
    let roll = Math.random() * total;
    const chosen = candidates.find((attack) => (roll -= attack.weight) <= 0) ?? candidates[0] ?? this.config.attacks.ground_shockwave;
    this.repeatCount = chosen.id === this.lastAttack ? this.repeatCount + 1 : 1;
    this.lastAttack = chosen.id;
    return chosen;
  }

  private createTelegraph(attack: BossAttackConfig): void {
    this.clearTelegraphs();
    const color = attack.major ? 0xff2200 : 0xffcc00;
    const warning = this.scene.add.circle(this.x, this.y, attack.major ? 46 : 28, color, 0.2).setDepth(14);
    warning.setStrokeStyle(3, color, 0.9);
    this.telegraphObjects.push(warning);
    this.scene.tweens.add({ targets: warning, alpha: 0.8, scale: 1.25, yoyo: true, repeat: -1, duration: 180 });

    if (attack.id === 'missile_rain' && this.player) {
      this.missileTargets = [];
      const count = attack.projectileCount ?? 4;
      for (let i = 0; i < count; i++) {
        const targetX = Phaser.Math.Clamp(this.player.x + (i - (count - 1) / 2) * 75, (this.arenaLeft ?? 0) + 30, (this.arenaRight ?? this.scene.scale.width) - 30);
        this.missileTargets.push(targetX);
        const marker = this.scene.add.circle(targetX, (this.arenaRootY ?? this.y) + 78, 22, 0xff0000, 0.2).setDepth(14);
        marker.setStrokeStyle(2, 0xff3300, 0.9);
        this.telegraphObjects.push(marker);
      }
    } else if (attack.id === 'laser_sweep' && this.player) {
      const dx = this.player.x - this.x;
      const dy = this.player.y - this.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const beam = this.scene.add.rectangle(this.x, this.y, distance, 4, 0xff0000, 0.35)
        .setOrigin(0, 0.5).setRotation(Math.atan2(dy, dx)).setDepth(15);
      this.telegraphObjects.push(beam);
    }
  }

  private clearTelegraphs(): void {
    this.telegraphObjects.forEach((object) => object.destroy());
    this.telegraphObjects = [];
  }

  private executeSelectedAttack(): void {
    const attack = this.selectedAttack;
    if (!attack || this.disabledAttacks.has(attack.id)) {
      this.enterDecisionState(250);
      return;
    }
    this.setBossState(BossState.ATTACKING, attack.executionDuration);
    switch (attack.id) {
      case 'cannon_burst': this.fireBurst(attack); break;
      case 'spread_shot': this.fireSpread(attack); break;
      case 'missile_rain': this.fireMissileRain(attack); break;
      case 'ground_shockwave': this.fireShockwave(attack); break;
      case 'laser_sweep': this.fireLaser(attack); break;
    }
  }

  private fireBurst(attack: BossAttackConfig): void {
    const count = attack.projectileCount ?? 4;
    for (let i = 0; i < count; i++) {
      this.scheduleStateAction(i * (attack.fireInterval ?? 120), () => {
        if (!this.player) return;
        const muzzleX = this.x + (this.player.x < this.x ? -68 : 68);
        const angle = Math.atan2(this.player.y - this.y, this.player.x - muzzleX) + Phaser.Math.DegToRad(Phaser.Math.Between(-5, 5));
        EventBus.emit(Events.AUDIO_SFX, 'sfx_boss_cannon', { volume: 0.65 });
        this.flashMuzzle(muzzleX, this.y, angle);
        this.spawnProjectile(muzzleX, this.y, angle, attack.projectileSpeed ?? 350, 'bullet_boss_cannon', 17, 10, attack.damage);
      });
    }
  }

  private fireSpread(attack: BossAttackConfig): void {
    if (!this.player) return;
    const muzzleX = this.x + (this.player.x < this.x ? -68 : 68);
    const center = Math.atan2(this.player.y - this.y, this.player.x - muzzleX);
    const count = attack.projectileCount ?? 5;
    EventBus.emit(Events.AUDIO_SFX, 'sfx_boss_cannon', { volume: 0.85 });
    this.flashMuzzle(muzzleX, this.y, center);
    const spread = Phaser.Math.DegToRad(attack.spreadAngle ?? 55);
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1);
      this.spawnProjectile(muzzleX, this.y, center + offset, attack.projectileSpeed ?? 280, 'bullet_boss_cannon', 17, 10, attack.damage);
    }
  }

  private fireMissileRain(attack: BossAttackConfig): void {
    this.missileTargets.forEach((targetX, index) => {
      this.scheduleStateAction(index * (attack.fireInterval ?? 160), () => {
        const startX = this.x + (index % 2 === 0 ? -28 : 28);
        const startY = this.y - 40;
        const flightTime = 0.95;
        const gravity = 600;
        const vx = (targetX - startX) / flightTime;
        const targetY = (this.arenaRootY ?? this.y) + 70;
        const vy = (targetY - startY - 0.5 * gravity * flightTime * flightTime) / flightTime;
        EventBus.emit(Events.AUDIO_SFX, 'sfx_rocket', { volume: 0.5 });
        this.flashMuzzle(startX, startY, -Math.PI / 2);
        const missile = this.spawnProjectile(startX, startY, 0, 0, 'boss_missile', 20, 8, attack.damage, true);
        (missile.body as Phaser.Physics.Arcade.Body).setGravityY(gravity).setVelocity(vx, vy);
      });
    });
  }

  private fireShockwave(attack: BossAttackConfig): void {
    EventBus.emit(Events.SCREEN_FLASH, 0xaaaaaa, 180);
    EventBus.emit(Events.CAMERA_SHAKE, 15, 320);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_explosion', { volume: 0.65 });
    const groundY = (this.arenaRootY ?? this.y) + 72;
    this.flashMuzzle(this.x, groundY - 12, 0);
    for (const direction of [-1, 1]) {
      this.spawnProjectile(this.x, groundY, direction < 0 ? Math.PI : 0, attack.projectileSpeed ?? 260,
        'boss_shockwave', 42, 14, attack.damage);
    }
  }

  private fireLaser(attack: BossAttackConfig): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    EventBus.emit(Events.AUDIO_SFX, 'sfx_laser');
    this.flashMuzzle(this.x, this.y - 12, angle);
    EventBus.emit(Events.CAMERA_SHAKE, 10, 700);
    this.spawnProjectile(this.x, this.y - 12, angle, attack.projectileSpeed ?? 430, 'boss_laser', 150, 10, attack.damage);
  }

  private spawnProjectile(x: number, y: number, angle: number, speed: number, texture: string,
    width: number, height: number, damage: number, allowGravity = false): Phaser.Physics.Arcade.Sprite {
    const sprite = this.scene.physics.add.sprite(x, y, texture).setDisplaySize(width, height).setDepth(15);
    sprite.setData('damage', damage);
    if (texture === 'boss_missile' || texture === 'explosive_barrel') {
      sprite.setData('destructibleBomb', true);
    }
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(allowGravity).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    body.collisionCategory = CollisionGroup.ENEMY_BULLET;
    body.collisionMask = CollisionGroup.PLAYER | CollisionGroup.ENVIRONMENT |
      (sprite.getData('destructibleBomb') ? CollisionGroup.PLAYER_BULLET : 0);
    EventBus.emit(Events.ENEMY_PROJECTILE_FIRED, sprite);
    this.scene.time.delayedCall(5000, () => { if (sprite.active) sprite.destroy(); });
    return sprite;
  }

  private flashMuzzle(x: number, y: number, angle: number): void {
    this.lastFireAt = this.scene.time.now;
    const flash = this.scene.add.image(x, y, 'effect_muzzle').setDepth(16)
      .setDisplaySize(25, 12).setRotation(angle).setTint(0xffa85a);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 130,
      onComplete: () => flash.destroy() });
  }

  damageWeakPoint(id: string, damage: number): boolean {
    const weakPoint = this.weakPoints.get(id);
    if (!weakPoint || weakPoint.destroyed) return false;
    const applied = damage * weakPoint.config.damageMultiplier;
    if (!super.takeDamage(applied)) return false;
    weakPoint.hp = Math.max(0, weakPoint.hp - damage);
    if (weakPoint.hp <= 0 && weakPoint.config.destroyable) {
      weakPoint.destroyed = true;
      weakPoint.sprite.setVisible(false);
      const body = weakPoint.sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      if (weakPoint.config.disablesAttack) this.disabledAttacks.add(weakPoint.config.disablesAttack);
      EventBus.emit(Events.BOSS_WEAK_POINT_DESTROYED, id);
      EventBus.emit(Events.EXPLOSION, weakPoint.sprite.x, weakPoint.sprite.y, 45);
      EventBus.emit(Events.NOTIFICATION, `${id.replace('_', ' ').toUpperCase()} DESTROYED`);
    }
    return true;
  }

  override die(): void {
    if (this.isDead) return;
    this.clearTelegraphs();
    super.die();
    this.getBodyParts().forEach((part) => {
      const body = part.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    });
    this.scheduleDeathAction(this.config.deathSequence.removeAt - 1, () => {
      this.getBodyParts().forEach((part) => part.setVisible(false));
      this.walkerArt.setVisible(false);
    });
  }

  resetEncounter(): void {
    this.clearTelegraphs();
    this.resetBaseEncounter();
    this.disabledAttacks.clear();
    this.lastAttack = null;
    this.repeatCount = 0;
    this.selectedAttack = null;
    this.visualDamageStage = -1;
    this.walkDirection = -1;
    this.weakPoints.forEach((weakPoint) => {
      weakPoint.hp = weakPoint.config.health;
      weakPoint.destroyed = false;
      weakPoint.sprite.setVisible(true).setAlpha(1);
      (weakPoint.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    });
    this.getBodyParts().forEach((part) => {
      part.setVisible(true).setAlpha(1).clearTint();
      (part.body as Phaser.Physics.Arcade.Body).enable = true;
      if (part !== this.core) part.setVisible(false);
    });
    this.walkerArt.setVisible(true).setAlpha(1).clearTint();
    if (this.arenaRootY !== null) this.placeOnArena(this.arenaLeft!, this.arenaRight!, this.arenaRootY + 80);
    this.beginEncounter();
  }

  private moveWithinArena(delta: number): void {
    const phase = this.config.phases[this.currentPhase];
    this.isWalking = true;
    this.stepOffset += delta * 0.006 * (1 + this.currentPhase * 0.2);
    if (this.arenaLeft !== null && this.x <= this.arenaLeft + 75) this.walkDirection = 1;
    if (this.arenaRight !== null && this.x >= this.arenaRight - 75) this.walkDirection = -1;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.walkDirection * phase.movementSpeed).setVelocityY(0);
  }

  private stopMoving(): void {
    this.isWalking = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private pinToArena(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.arenaRootY !== null && Math.abs(this.y - this.arenaRootY) > 0.5) {
      this.setY(this.arenaRootY);
      body.updateFromGameObject();
    }
    if (this.arenaLeft !== null && this.arenaRight !== null) {
      this.setX(Phaser.Math.Clamp(this.x, this.arenaLeft + 60, this.arenaRight - 60));
    }
    body.setAllowGravity(false).setVelocityY(0);
  }

  private updateBodyParts(): void {
    const swing = this.isWalking ? Math.sin(this.stepOffset) * 14 : 0;
    this.bodySprite.setPosition(this.x, this.y);
    this.headSprite.setPosition(this.x, this.y - 40);
    this.leftLeg.setPosition(this.x - 35 + swing, this.y + 40);
    this.rightLeg.setPosition(this.x + 35 - swing, this.y + 40);
    this.leftHip.setPosition(this.x - 25, this.y - 10);
    this.rightHip.setPosition(this.x + 25, this.y - 10);
    this.leftArm.setPosition(this.x - 55, this.y + 10);
    this.rightArm.setPosition(this.x + 55, this.y + 10);
    this.core.setPosition(this.x, this.y + 10);
    const recoil = this.scene.time.now - this.lastFireAt < 110 ? (this.player?.x ?? 0) < this.x ? 2 : -2 : 0;
    this.walkerArt.setPosition(Math.round(this.x + recoil),
      Math.round(this.y + (this.isWalking ? Math.sin(this.stepOffset) * 1.5 : 0)));
  }

  getBodyParts(): Phaser.GameObjects.Sprite[] {
    return [this.bodySprite, this.headSprite, this.leftLeg, this.rightLeg, this.leftHip,
      this.rightHip, this.leftArm, this.rightArm, this.core];
  }

  getWeakPointSprites(): Phaser.GameObjects.Sprite[] {
    return [...this.weakPoints.values()].filter((point) => !point.destroyed).map((point) => point.sprite);
  }

  getWeakPointHealth(): Record<string, number> {
    return Object.fromEntries([...this.weakPoints].map(([id, point]) => [id, point.hp]));
  }

  getDebugInfo(): string {
    const distance = this.player ? Math.round(Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y)) : 0;
    const points = [...this.weakPoints].map(([id, point]) => `${id}:${Math.ceil(point.hp)}`).join(' ');
    return `BOSS ${this.bossState} | P${this.currentPhase + 1} | ${this.currentAttack || '-'} | ${Math.ceil(this.hp)}/${this.maxHp} | D:${distance} | ${points}`;
  }

  placeOnArena(left: number, right: number, platformTop: number): void {
    this.arenaLeft = left;
    this.arenaRight = right;
    this.arenaRootY = platformTop - 80;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setPosition(Phaser.Math.Clamp(this.x, left + 60, right - 60), this.arenaRootY);
    body.reset(this.x, this.arenaRootY);
    body.setAllowGravity(false).setVelocity(0, 0);
    this.updateBodyParts();
  }
}
