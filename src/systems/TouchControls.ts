import Phaser from 'phaser';
import type { AimDirection } from '../config/gameConfig';

export interface TouchControlState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  aiming: boolean;
  jump: boolean;
  jumpHeld: boolean;
}

type Stick = {
  pointerId: number | null;
  origin: Phaser.Math.Vector2;
  value: Phaser.Math.Vector2;
  thumb: Phaser.GameObjects.Container;
};

/** Mobile-only twin-stick controls. The right stick fires while it is held. */
export class TouchControls {
  private readonly root: Phaser.GameObjects.Container;
  private readonly moveStick: Stick;
  private readonly aimStick: Stick;
  private readonly jumpButton: Phaser.GameObjects.Arc;
  private readonly radius = 42;
  private readonly activationRadius = 62;
  private jumpPointerId: number | null = null;
  private jumpQueued = false;

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isTouchPointer(pointer)) return;
    if (this.jumpPointerId === null && this.distanceTo(pointer, this.jumpButton.x, this.jumpButton.y) <= 36) {
      this.jumpPointerId = pointer.id;
      this.jumpQueued = true;
      this.jumpButton.setFillStyle(0xffc857, 0.55).setScale(0.9);
      return;
    }
    if (this.moveStick.pointerId === null &&
      this.distanceTo(pointer, this.moveStick.origin.x, this.moveStick.origin.y) <= this.activationRadius) {
      this.moveStick.pointerId = pointer.id;
      this.updateStick(this.moveStick, pointer);
      return;
    }
    if (this.aimStick.pointerId === null &&
      this.distanceTo(pointer, this.aimStick.origin.x, this.aimStick.origin.y) <= this.activationRadius) {
      this.aimStick.pointerId = pointer.id;
      this.updateStick(this.aimStick, pointer);
    }
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.moveStick.pointerId) this.updateStick(this.moveStick, pointer);
    if (pointer.id === this.aimStick.pointerId) this.updateStick(this.aimStick, pointer);
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.moveStick.pointerId) this.releaseStick(this.moveStick);
    if (pointer.id === this.aimStick.pointerId) this.releaseStick(this.aimStick);
    if (pointer.id === this.jumpPointerId) {
      this.jumpPointerId = null;
      this.jumpButton.setFillStyle(0xffc857, 0.26).setScale(1);
    }
  };

  static shouldEnable(): boolean {
    return navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches === true;
  }

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.addPointer(3);
    const moveOrigin = new Phaser.Math.Vector2(72, 286);
    const aimOrigin = new Phaser.Math.Vector2(568, 286);
    const moveBase = this.createStickBase(moveOrigin.x, moveOrigin.y, 0x62e9ff, 'MOVE');
    const aimBase = this.createStickBase(aimOrigin.x, aimOrigin.y, 0xff6b8a, 'AIM');
    const moveThumb = this.createThumb(moveOrigin.x, moveOrigin.y, 0x62e9ff);
    const aimThumb = this.createThumb(aimOrigin.x, aimOrigin.y, 0xff6b8a);
    const jumpTexture = this.createButtonTexture(500, 213, 0xffc857);
    this.jumpButton = scene.add.circle(500, 213, 25, 0x513f16, 0.72)
      .setStrokeStyle(2, 0xffe29a, 0.9).setScrollFactor(0);
    const jumpLabel = scene.add.text(500, 213, 'JUMP', {
      fontFamily: 'RavenMono, monospace', fontSize: '9px', color: '#fff1c7',
    }).setOrigin(0.5).setScrollFactor(0);
    this.root = scene.add.container(0, 0, [
      ...moveBase, ...aimBase, moveThumb, aimThumb, jumpTexture, this.jumpButton, jumpLabel,
    ]).setDepth(10_000).setScrollFactor(0).setName('touch-controls');
    this.moveStick = { pointerId: null, origin: moveOrigin, value: new Phaser.Math.Vector2(), thumb: moveThumb };
    this.aimStick = { pointerId: null, origin: aimOrigin, value: new Phaser.Math.Vector2(), thumb: aimThumb };
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  isTouchPointer(pointer: Phaser.Input.Pointer): boolean {
    const nativePointer = pointer.event as PointerEvent | undefined;
    return pointer.wasTouch || nativePointer?.pointerType === 'touch';
  }

  getState(): TouchControlState {
    const state = {
      moveX: this.moveStick.value.x,
      moveY: this.moveStick.value.y,
      aimX: this.aimStick.value.x,
      aimY: this.aimStick.value.y,
      aiming: this.aimStick.pointerId !== null && this.aimStick.value.length() > 0.18,
      jump: this.jumpQueued,
      jumpHeld: this.jumpPointerId !== null,
    };
    this.jumpQueued = false;
    return state;
  }

  getAimDirection(fallbackFacing: 'left' | 'right'): AimDirection {
    const length = this.aimStick.value.length();
    if (length <= 0.18) {
      return { x: fallbackFacing === 'left' ? -1 : 1, y: 0, isUp: false, isDown: false };
    }
    const x = this.aimStick.value.x / length;
    const y = this.aimStick.value.y / length;
    return { x, y, isUp: y < -0.3, isDown: y > 0.3 };
  }

  isAiming(): boolean {
    return this.aimStick.pointerId !== null && this.aimStick.value.length() > 0.18;
  }

  isJumpHeld(): boolean {
    return this.jumpPointerId !== null;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.root.destroy(true);
  }

  private createStickBase(x: number, y: number, color: number, label: string): Phaser.GameObjects.GameObject[] {
    const plate = this.scene.add.graphics().setScrollFactor(0);
    plate.fillStyle(0x02070b, 0.64).fillCircle(x, y, this.activationRadius);
    plate.fillStyle(color, 0.07).fillCircle(x, y, this.radius + 6);
    plate.lineStyle(2, color, 0.64).strokeCircle(x, y, this.activationRadius - 1);
    plate.lineStyle(1, color, 0.34).strokeCircle(x, y, this.radius + 6);
    plate.lineStyle(1, color, 0.18).strokeCircle(x, y, this.radius - 7);
    plate.lineStyle(1, color, 0.28);
    plate.lineBetween(x - 31, y, x - 22, y);
    plate.lineBetween(x + 22, y, x + 31, y);
    plate.lineBetween(x, y - 31, x, y - 22);
    plate.lineBetween(x, y + 22, x, y + 31);
    plate.lineStyle(3, color, 0.78);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      plate.beginPath();
      plate.arc(x, y, this.activationRadius - 7, angle + 0.08, angle + 0.38);
      plate.strokePath();
    }
    const text = this.scene.add.text(x, y + 50, label, {
      fontFamily: 'RavenMono, monospace', fontSize: '8px', color: '#d9f7ff',
      backgroundColor: '#061017', padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setAlpha(0.92).setScrollFactor(0);
    return [plate, text];
  }

  private createThumb(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const glow = this.scene.add.circle(0, 0, 23, color, 0.12);
    const outer = this.scene.add.circle(0, 0, 18, 0x07131d, 0.92).setStrokeStyle(2, color, 0.95);
    const core = this.scene.add.circle(0, 0, 12, color, 0.34).setStrokeStyle(1, 0xffffff, 0.36);
    const detail = this.scene.add.graphics();
    detail.lineStyle(1, color, 0.78);
    detail.lineBetween(-7, 0, 7, 0);
    detail.lineBetween(0, -7, 0, 7);
    return this.scene.add.container(x, y, [glow, outer, core, detail]).setScrollFactor(0);
  }

  private createButtonTexture(x: number, y: number, color: number): Phaser.GameObjects.Graphics {
    const texture = this.scene.add.graphics().setScrollFactor(0);
    texture.fillStyle(color, 0.09).fillCircle(x, y, 34);
    texture.lineStyle(1, color, 0.28).strokeCircle(x, y, 34);
    texture.lineStyle(3, color, 0.82);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      texture.beginPath();
      texture.arc(x, y, 30, angle + 0.12, angle + 0.58);
      texture.strokePath();
    }
    return texture;
  }

  private updateStick(stick: Stick, pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - stick.origin.x;
    const dy = pointer.y - stick.origin.y;
    const distance = Math.hypot(dx, dy);
    const scale = distance > this.radius ? this.radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    stick.value.set(x / this.radius, y / this.radius);
    stick.thumb.setPosition(stick.origin.x + x, stick.origin.y + y);
  }

  private releaseStick(stick: Stick): void {
    stick.pointerId = null;
    stick.value.set(0, 0);
    stick.thumb.setPosition(stick.origin.x, stick.origin.y);
  }

  private distanceTo(pointer: Phaser.Input.Pointer, x: number, y: number): number {
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y);
  }
}
