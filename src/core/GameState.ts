/**
 * GameState - Central store for game state management.
 * Tracks player stats, level progress, score, and current game state.
 */

import { GAME_CONFIG, GameState, WeaponType } from '../config/gameConfig';
import { SaveManager } from './SaveManager';
import type { RunSave } from './SaveManager';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  lives: number;
  score: number;
  highScore: number;
  currentWeapon: WeaponType | null;
  weaponLevel: number;
  highestCombo: number;
  enemiesDefeated: number;
  deaths: number;
  currentCheckpoint: number;
  totalTime: number;
}

export interface CheckpointData {
  id: number;
  x: number;
  y: number;
  weapon: WeaponType | null;
  weaponLevel: number;
  score: number;
}

class GameStateManager {
  private state: GameState = GameState.MENU;
  private playerStats: PlayerStats;
  private checkpoints: CheckpointData[] = [];
  private currentCheckpointIndex: number = -1;
  private levelStartTime: number = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.playerStats = this.createDefaultStats();
  }

  private createDefaultStats(): PlayerStats {
    const saved = SaveManager.loadPlayerStats();
    return {
      hp: 3,
      maxHp: 3,
      lives: 3,
      score: 0,
      highScore: saved?.highScore ?? 0,
      currentWeapon: null,
      weaponLevel: 0,
      highestCombo: saved?.highestCombo ?? 0,
      enemiesDefeated: 0,
      deaths: 0,
      currentCheckpoint: 0,
      totalTime: 0,
    };
  }

  getGameState(): GameState {
    return this.state;
  }

  setGameState(newState: GameState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notify();
    }
  }

  getPlayerStats(): PlayerStats {
    return { ...this.playerStats };
  }

  setPlayerStats(partial: Partial<PlayerStats>): void {
    this.playerStats = { ...this.playerStats, ...partial };
    this.playerStats.lives = Math.max(0, Math.min(GAME_CONFIG.PLAYER_LIVES, this.playerStats.lives));
    this.playerStats.hp = Math.max(0, Math.min(this.playerStats.maxHp, this.playerStats.hp));
    this.notify();
  }

  resetPlayerStats(): void {
    this.playerStats = this.createDefaultStats();
    this.currentCheckpointIndex = -1;
    this.checkpoints = [];
    this.levelStartTime = 0;
    this.notify();
  }

  setLevelStartTime(time: number): void {
    this.levelStartTime = time;
  }

  getElapsedTime(): number {
    return Date.now() - this.levelStartTime;
  }

  addScore(points: number): void {
    this.playerStats.score += points;
    if (this.playerStats.score > this.playerStats.highScore) {
      this.playerStats.highScore = this.playerStats.score;
    }
    this.notify();
  }

  addCombo(combo: number): void {
    if (combo > this.playerStats.highestCombo) {
      this.playerStats.highestCombo = combo;
    }
    this.notify();
  }

  addEnemyDefeated(): void {
    this.playerStats.enemiesDefeated += 1;
    this.notify();
  }

  addDeath(): void {
    this.playerStats.deaths += 1;
    this.notify();
  }

  takeDamage(amount: number = 1): void {
    this.playerStats.hp -= amount;
    if (this.playerStats.hp <= 0) {
      this.playerStats.hp = 0;
    }
    this.notify();
  }

  heal(amount: number): void {
    this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + amount);
    this.notify();
  }

  isAlive(): boolean {
    return this.playerStats.hp > 0;
  }

  loseLife(): void {
    this.playerStats.lives = Math.max(0, this.playerStats.lives - 1);
    if (this.playerStats.lives === 0) SaveManager.clearRun();
    else this.saveRun();
    this.notify();
  }

  resetHP(): void {
    this.playerStats.hp = this.playerStats.maxHp;
    this.notify();
  }

  /** Set the active weapon. If same weapon, upgrade level. */
  setWeapon(weapon: WeaponType): void {
    if (this.playerStats.currentWeapon === weapon) {
      this.playerStats.weaponLevel += 1;
    } else {
      this.playerStats.currentWeapon = weapon;
      this.playerStats.weaponLevel = 0;
    }
    this.notify();
  }

  registerCheckpoint(checkpoint: CheckpointData): void {
    const existing = this.checkpoints.find((c) => c.id === checkpoint.id);
    if (existing) {
      Object.assign(existing, checkpoint);
    } else {
      this.checkpoints.push(checkpoint);
    }
    this.currentCheckpointIndex = this.checkpoints.findIndex((c) => c.id === checkpoint.id);
    this.playerStats.currentCheckpoint = checkpoint.id;
    this.saveRun();
    this.notify();
  }

  restoreRun(run: RunSave, checkpoint: CheckpointData): void {
    this.resetPlayerStats();
    this.playerStats.lives = Math.max(1, Math.min(GAME_CONFIG.PLAYER_LIVES, run.lives));
    this.playerStats.score = Math.max(0, run.score);
    this.playerStats.currentWeapon = Object.values(WeaponType).includes(run.weapon as WeaponType)
      ? run.weapon as WeaponType : null;
    this.playerStats.weaponLevel = run.weaponLevel;
    this.registerCheckpoint({ ...checkpoint, weapon: this.playerStats.currentWeapon,
      weaponLevel: this.playerStats.weaponLevel, score: this.playerStats.score });
  }

  private saveRun(): void {
    const checkpoint = this.getCurrentCheckpoint();
    if (!checkpoint || this.playerStats.lives <= 0) return;
    SaveManager.saveRun({ level: 'level_1', checkpoint: checkpoint.id,
      lives: this.playerStats.lives, score: this.playerStats.score,
      weapon: this.playerStats.currentWeapon, weaponLevel: this.playerStats.weaponLevel });
  }

  getCurrentCheckpoint(): CheckpointData | null {
    if (this.currentCheckpointIndex >= 0) {
      return { ...this.checkpoints[this.currentCheckpointIndex] };
    }
    return null;
  }

  getLastCheckpoint(): CheckpointData | null {
    return this.getCurrentCheckpoint();
  }

  respawnAtCheckpoint(): void {
    const checkpoint = this.getCurrentCheckpoint();
    if (checkpoint) {
      this.playerStats.hp = this.playerStats.maxHp;
      this.playerStats.currentWeapon = checkpoint.weapon;
      this.playerStats.weaponLevel = checkpoint.weaponLevel;
    }
    this.notify();
  }

  saveProgress(): void {
    SaveManager.savePlayerStats({
      score: this.playerStats.highScore,
      highScore: this.playerStats.highScore,
      highestCombo: this.playerStats.highestCombo,
    });
  }

  /** Subscribe to state changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const gameState = new GameStateManager();
