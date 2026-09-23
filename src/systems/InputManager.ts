/**
 * InputManager - Centralized input handling.
 * Manages keyboard and mouse input, producing a unified input state.
 */

import type { AimDirection } from '../config/gameConfig';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  shoot: boolean;
  switchWeapon: boolean;
  pause: boolean;
  aimUp: boolean;
  aimDown: boolean;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  facing: 'left' | 'right';
}

export class InputManager {
  private keys: Map<string, Phaser.Input.Keyboard.Key>;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;
  private facing: 'left' | 'right' = 'right';
  private onepressed: boolean = false;
  private previousPadJump = false;
  private previousPadSwitch = false;
  private previousPadPause = false;
  private rightStick = { x: 0, y: 0 };
  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    this.mouseX = pointer.x;
    this.mouseY = pointer.y;
  };
  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.mouseX = pointer.x;
    this.mouseY = pointer.y;
    this.mouseDown = true;
  };
  private readonly onPointerUp = (): void => { this.mouseDown = false; };

  constructor(private scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = new Map();

    // WASD keys
    this.addKey('W');
    this.addKey('A');
    this.addKey('S');
    this.addKey('D');

    // Action keys
    this.addKey('J'); // Shoot
    this.addKey('K'); // Switch weapon
    this.addKey('F2'); // Debug toggle

    // Space for jump
    this.addKey('SPACE');

    // Escape for pause
    this.addKey('ESC');

    // Mouse
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointerup', this.onPointerUp);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointerup', this.onPointerUp);
  }

  private addKey(key: string): void {
    const k = this.scene.input.keyboard.addKey(key);
    this.keys.set(key, k);
  }

  /** Check if a key was just pressed (down this frame, not previous) */
  isJustPressed(key: string): boolean {
    const k = this.keys.get(key);
    if (!k) return false;
    return Phaser.Input.Keyboard.JustDown(k);
  }

  /** Check if a key is currently down */
  isDown(key: string): boolean {
    const k = this.keys.get(key);
    if (!k) return false;
    return k.isDown;
  }

  /** Keyboard actions can be rebound without teaching entities about key codes. */
  rebind(action: 'fire' | 'jump' | 'switch' | 'pause', key: string): void {
    const slot = { fire: 'J', jump: 'SPACE', switch: 'K', pause: 'ESC' }[action];
    this.keys.set(slot, this.scene.input.keyboard.addKey(key));
  }

  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    return this.scene.input.gamepad?.getPad(0) ?? null;
  }

  isJumpHeld(): boolean {
    const pad = this.getPad();
    return this.isDown('SPACE') || this.cursors.up.isDown || !!pad?.buttons[0]?.pressed;
  }

  /** Get the current input state */
  getInputState(): InputState {
    const isJustPressedJump = this.isJustPressed('SPACE');
    const pad = this.getPad();
    const axisX = pad && Math.abs(pad.axes[0]?.getValue() ?? 0) > 0.25 ? pad.axes[0].getValue() : 0;
    const axisY = pad && Math.abs(pad.axes[1]?.getValue() ?? 0) > 0.25 ? pad.axes[1].getValue() : 0;
    this.rightStick = { x: pad?.axes[2]?.getValue() ?? 0, y: pad?.axes[3]?.getValue() ?? 0 };
    const padJump = !!pad?.buttons[0]?.pressed;
    const padSwitch = !!pad?.buttons[3]?.pressed;
    const padPause = !!pad?.buttons[9]?.pressed;

    // Determine direction
    const left = this.cursors.left.isDown || this.isDown('A') || axisX < 0;
    const right = this.cursors.right.isDown || this.isDown('D') || axisX > 0;

    if (left && !right) {
      this.facing = 'left';
    } else if (right && !left) {
      this.facing = 'right';
    }

    const up = this.cursors.up.isDown || this.isDown('W') || axisY < 0;
    const down = this.cursors.down.isDown || this.isDown('S') || axisY > 0;

    const jump = isJustPressedJump || (padJump && !this.previousPadJump);
    const shoot = this.isDown('J') || this.mouseDown || !!pad?.buttons[7]?.pressed;
    const switchWeapon = this.isJustPressed('K') || (padSwitch && !this.previousPadSwitch);
    const pause = this.isJustPressed('ESC') || (padPause && !this.previousPadPause);
    this.previousPadJump = padJump;
    this.previousPadSwitch = padSwitch;
    this.previousPadPause = padPause;

    return {
      left,
      right,
      up,
      down,
      jump,
      shoot,
      switchWeapon,
      pause,
      aimUp: up,
      aimDown: down,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseDown: this.mouseDown,
      facing: this.facing,
    };
  }

  /** Get mouse position in world coordinates */
  getWorldMousePosition(camera: Phaser.Cameras.Scene2D.Camera): Phaser.Math.Vector2 {
    return camera.getWorldPoint(this.mouseX, this.mouseY);
  }

  /** Get aim direction based on keys/mouse */
  getAimDirection(playerX: number, playerY: number, camera: Phaser.Cameras.Scene2D.Camera): AimDirection {
    const input = this.getInputState();

    // Mouse aiming: pass the real normalized vector so bullets travel toward
    // the cursor rather than snapping to a cardinal/diagonal ±1 component.
    // The old code returned { x: ax >= 0 ? 1 : -1, y: ay >= 0 ? 1 : -1 },
    // which turned any mouse position slightly below the player into y: 1
    // and fired bullets straight downward.
    if (this.mouseDown) {
      const worldMouse = this.getWorldMousePosition(camera);
      const dx = worldMouse.x - playerX;
      const dy = worldMouse.y - playerY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return { x: input.facing === 'left' ? -1 : 1, y: 0, isUp: false, isDown: false };
      const nx = dx / len;
      const ny = dy / len;
      return {
        x: nx,
        y: ny,
        isUp: ny < -0.3,
        isDown: ny > 0.3,
      };
    }

    const stickLength = Math.hypot(this.rightStick.x, this.rightStick.y);
    if (stickLength > 0.3) {
      const x = this.rightStick.x / stickLength;
      const y = this.rightStick.y / stickLength;
      return { x, y, isUp: y < -0.3, isDown: y > 0.3 };
    }

    // Keyboard-based aiming
    if (input.aimUp) {
      if (input.left) return { x: -0.707, y: -0.707, isUp: true, isDown: false };
      if (input.right) return { x: 0.707, y: -0.707, isUp: true, isDown: false };
      return { x: 0, y: -1, isUp: true, isDown: false };
    }

    if (input.left) return { x: -1, y: 0, isUp: false, isDown: false };
    if (input.right) return { x: 1, y: 0, isUp: false, isDown: false };

    return { x: input.facing === 'left' ? -1 : 1, y: 0, isUp: false, isDown: false };
  }

  getDebugToggle(): boolean {
    return this.isJustPressed('F2');
  }

  getShootInput(): boolean {
    return this.isDown('J') || this.mouseDown || !!this.getPad()?.buttons[7]?.pressed;
  }

  getJumpInput(): boolean {
    return this.isJustPressed('SPACE');
  }
}
