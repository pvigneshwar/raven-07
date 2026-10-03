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
  thumb: Phaser.GameObjects.Arc;
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
    this.jumpButton = scene.add.circle(500, 213, 27, 0xffc857, 0.26)
      .setStrokeStyle(2, 0xffe29a, 0.78).setScrollFactor(0);
    const jumpLabel = scene.add.text(500, 213, 'JUMP', {
      fontFamily: 'RavenMono, monospace', fontSize: '9px', color: '#fff1c7',
    }).setOrigin(0.5).setScrollFactor(0);
    this.root = scene.add.container(0, 0, [
      ...moveBase, ...aimBase, moveThumb, aimThumb, this.jumpButton, jumpLabel,
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
    const outer = this.scene.add.circle(x, y, this.activationRadius, 0x08131b, 0.34)
      .setStrokeStyle(2, color, 0.42).setScrollFactor(0);
    const inner = this.scene.add.circle(x, y, this.radius, color, 0.08)
      .setStrokeStyle(1, color, 0.25).setScrollFactor(0);
    const text = this.scene.add.text(x, y + 50, label, {
      fontFamily: 'RavenMono, monospace', fontSize: '8px', color: '#d9f7ff',
    }).setOrigin(0.5).setAlpha(0.75).setScrollFactor(0);
    return [outer, inner, text];
  }

  private createThumb(x: number, y: number, color: number): Phaser.GameObjects.Arc {
    return this.scene.add.circle(x, y, 19, color, 0.34)
      .setStrokeStyle(2, color, 0.82).setScrollFactor(0);
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
