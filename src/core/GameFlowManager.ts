/**
 * GameFlowManager - Central manager for major game-state transitions.
 * Implements doc 09 (GameFlowManager Implementation Guide) from
 * D:\projects\contra\game instructions\09_GAME_FLOW_MANAGER_IMPLEMENTATION.md.
 *
 * DELIBERATE SCOPE NOTE: this is added additively alongside the existing
 * `gameState` (src/core/GameState.ts, a flatter GameState enum) rather than
 * replacing it. The game's actual gameplay gating (enemy AI, encounter
 * locks, boss spawning, pause/resume) already works via other mechanisms
 * (isArenaLocked flags, distance checks, EventBus events) that were built,
 * tested, and verified working before this manager existed. Ripping those
 * out to route every gate through GameFlowState, with no build/test loop
 * available, would risk regressing a completed and playable game for a
 * purely architectural win. Instead, LevelOneScene calls changeState() at
 * each of the transition points doc 09 lists (pause/resume, player-death,
 * encounter, boss, victory) so the state is tracked correctly and emits
 * GAME_FLOW_STATE_ENTER/EXIT for any future system to subscribe to,
 * without changing what currently gates gameplay.
 */

import { EventBus, Events } from './EventBus';

export enum GameFlowState {
  BOOT,
  MENU,
  INTRO,
  PLAYING,
  COMBAT,
  CHECKPOINT,
  BOSS_INTRO,
  BOSS_FIGHT,
  PLAYER_DEAD,
  GAME_OVER,
  VICTORY,
  PAUSED,
}

export class GameFlowManager {
  private currentState: GameFlowState;
  private previousState: GameFlowState;

  constructor(initialState: GameFlowState = GameFlowState.BOOT) {
    this.currentState = initialState;
    this.previousState = initialState;
  }

  get state(): GameFlowState {
    return this.currentState;
  }

  changeState(nextState: GameFlowState): void {
    if (nextState === this.currentState) return;

    this.onExit(this.currentState);

    this.previousState = this.currentState;
    this.currentState = nextState;

    this.onEnter(nextState);
  }

  pause(): void {
    if (this.currentState === GameFlowState.PAUSED) return;

    this.previousState = this.currentState;
    this.currentState = GameFlowState.PAUSED;
    this.onEnter(GameFlowState.PAUSED);
  }

  resume(): void {
    if (this.currentState !== GameFlowState.PAUSED) return;

    const restoreState = this.previousState;
    this.currentState = restoreState;
    this.onEnter(restoreState);
  }

  private onEnter(state: GameFlowState): void {
    EventBus.emit(Events.GAME_FLOW_STATE_ENTER, state);
  }

  private onExit(state: GameFlowState): void {
    EventBus.emit(Events.GAME_FLOW_STATE_EXIT, state);
  }
}
