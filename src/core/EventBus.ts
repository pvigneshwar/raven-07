/**
 * EventBus - Centralized event system for decoupled communication.
 * Uses a simple publish/subscribe pattern.
 */

type EventHandler = (...args: unknown[]) => void;

class EventBusClass {
  private events: Map<string, Set<EventHandler>> = new Map();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return () => {
      this.events.get(event)?.delete(handler);
      if (this.events.get(event)?.size === 0) {
        this.events.delete(event);
      }
    };
  }

  /** Subscribe to an event for a single emission. */
  once(event: string, handler: EventHandler): void {
    const wrapped: EventHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
  }

  /** Unsubscribe from an event. */
  off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }

  /** Emit an event to all listeners. */
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  /** Remove all listeners for a specific event or all events. */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const EventBus = new EventBusClass();

// Event name constants for type safety and discoverability
export const Events = {
  // Game state
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_OVER: 'game:over',
  GAME_VICTORY: 'game:victory',
  LEVEL_START: 'level:start',
  LEVEL_COMPLETE: 'level:complete',

  // Player
  PLAYER_SPAWN: 'player:spawn',
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_DEATH: 'player:death',
  PLAYER_RESPAWN: 'player:respawn',
  PLAYER_CHECKPOINT: 'player:checkpoint',
  PLAYER_WEAPON_PICKUP: 'player:weapon_pickup',

  // Combat
  ENEMY_SPAWNED: 'enemy:spawned',
  ENEMY_DEFEATED: 'enemy:defeated',
  ENEMY_DAMAGED: 'enemy:damaged',
  PROJECTILE_FIRED: 'projectile:fired',
  PROJECTILE_HIT: 'projectile:hit',
  ENEMY_PROJECTILE_FIRED: 'enemy_projectile:fired',
  EXPLOSION: 'explosion',
  DAMAGE_DEALT: 'damage:dealt',

  // Boss
  BOSS_SPAWN: 'boss:spawn',
  BOSS_PHASE_CHANGE: 'boss:phase_change',
  BOSS_DAMAGED: 'boss:damaged',
  BOSS_DEATH: 'boss:death',
  BOSS_STATE_CHANGE: 'boss:state_change',
  BOSS_WEAK_POINT_DESTROYED: 'boss:weak_point_destroyed',
  BOSS_CLEAR_PROJECTILES: 'boss:clear_projectiles',

  // Arena
  ARENA_LOCK: 'arena:lock',
  ARENA_UNLOCK: 'arena:unlock',

  // UI
  SCORE_UPDATE: 'score:update',
  COMBO_UPDATE: 'combo:update',
  HUD_UPDATE: 'hud:update',
  NOTIFICATION: 'notification',
  WEAPON_SWITCH: 'weapon:switch',
  PAUSE_TOGGLE: 'pause:toggle',

  // Audio
  AUDIO_PLAY: 'audio:play',
  AUDIO_MUSIC: 'audio:music',
  AUDIO_SFX: 'audio:sfx',

  // Effects
  CAMERA_SHAKE: 'camera:shake',
  SCREEN_FLASH: 'screen:flash',
  PARTICLE_EMIT: 'particle:emit',

  // Game flow (GameFlowManager, doc 09) -- fired on every GameFlowState
  // transition. Additive/informational: nothing currently gates gameplay
  // logic on these (that would be a much larger rewrite of already-working
  // systems), but any future system can subscribe without touching
  // LevelOneScene.
  GAME_FLOW_STATE_ENTER: 'gameflow:enter',
  GAME_FLOW_STATE_EXIT: 'gameflow:exit',
} as const;
