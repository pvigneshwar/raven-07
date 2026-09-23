/**
 * Helper utilities for RAVEN-07: SHADOW STRIKE
 */

import { GAME_CONFIG } from '../config/gameConfig';

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/** Linear interpolation with delta time */
export function lerpDT(start: number, end: number, factor: number, dt: number): number {
  return lerp(start, end, 1 - Math.pow(1 - factor, dt));
}

/** Calculate distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Get a random number between min and max */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Get a random integer between min and max (inclusive) */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Get a random element from an array */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/** Shuffle an array in place (Fisher-Yates) */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Get the sign of a number (-1, 0, or 1) */
export function sign(value: number): number {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/** Format time as MM:SS.mmm */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Format score with commas */
export function formatScore(score: number): string {
  return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Delay promise - returns a promise that resolves after ms */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a simple pixel-art texture programmatically using Phaser's graphics.
 * Creates a texture from a drawing function.
 */
export function generateTexture(
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
  draw: (gfx: Phaser.GameObjects.Graphics) => void,
): void {
  graphics.clear();
  draw(graphics);
  graphics.generateTexture(key, width, height);
}

/** Create a simple rectangle texture */
export function createRectTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: number,
  alpha: number = 1,
): void {
  const gfx = scene.add.graphics();
  gfx.fillStyle(color, alpha);
  gfx.fillRect(0, 0, width, height);
  gfx.generateTexture(key, width, height);
  gfx.destroy();
}

/** Calculate angle between two points in degrees */
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return radToDeg(Math.atan2(y2 - y1, x2 - x1));
}

/** Get normalized direction vector from angle */
export function directionFromAngle(angle: number): { x: number; y: number } {
  return {
    x: Math.cos(degToRad(angle)),
    y: Math.sin(degToRad(angle)),
  };
}

/** Simple 2D vector utilities */
export interface Vec2 {
  x: number;
  y: number;
}

export function createVec2(x: number = 0, y: number = 0): Vec2 {
  return { x, y };
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Flip a texture horizontally on a sprite */
export function setFlipX(sprite: Phaser.GameObjects.Sprite, facing: 'left' | 'right'): void {
  sprite.setFlipX(facing === 'left');
}

/** Check if a value is within a range */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Simple easing functions */
export const Easing = {
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} as const;

/** Debug log - only prints when debug mode is enabled */
export function debugLog(message: string, ...args: unknown[]): void {
  if (GAME_CONFIG.DEBUG_ENABLED) {
    console.log(`[RAVEN-07] ${message}`, ...args);
  }
}
