/**
 * ObjectPool - Generic object pooling system.
 * Reuses objects to avoid garbage collection and maintain 60 FPS.
 */

export interface Poolable {
  active: boolean;
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private name: string;

  constructor(name: string, factory: () => T, initialSize: number = 10) {
    this.name = name;
    this.factory = factory;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /** Get an object from the pool. Creates new ones as needed. */
  get(): T {
    const obj = this.pool.pop();
    if (obj) {
      obj.active = true;
      return obj;
    }
    // Pool is empty, create a new instance
    return this.factory();
  }

  /** Return an object to the pool for reuse. */
  release(obj: T): void {
    if (obj.active) {
      obj.reset();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  /** Get current available count */
  getAvailableCount(): number {
    return this.pool.length;
  }

  /** Get total created count (approximate) */
  getTotalCreated(): number {
    // Not tracked precisely - this is approximate
    return this.pool.length + (this.usageCount || 0);
  }

  private usageCount: number = 0;

  /** Release all pooled objects */
  clear(): void {
    this.pool = [];
    this.usageCount = 0;
  }
}
