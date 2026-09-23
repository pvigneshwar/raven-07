/**
 * SaveManager - Handles persistence using localStorage.
 * Saves high score, settings, unlocked levels, completed missions, highest combo.
 */

export interface SavedStats {
  score: number;
  highScore: number;
  highestCombo: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  mute: boolean;
  fullscreen: boolean;
  screenShake: number;
  reduceFlashes: boolean;
  pixelScale: number;
  effectsQuality: 'low' | 'high';
  difficulty: 'easy' | 'normal' | 'hard';
  controllerVibration: boolean;
  tutorialHints: boolean;
}

export interface RunSave {
  level: 'level_1';
  checkpoint: number;
  lives: number;
  score: number;
  weapon: string | null;
  weaponLevel: number;
}

export interface SaveData {
  version: number;
  highScore: number;
  settings: GameSettings;
  unlockedLevels: string[];
  completedMissions: string[];
  highestCombo: number;
  run: RunSave | null;
}

const STORAGE_KEY = 'raven-07-save';
const SAVE_VERSION = 2;

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.7,
  musicVolume: 0.5,
  mute: false,
  fullscreen: false,
  screenShake: 0.6,
  reduceFlashes: false,
  pixelScale: 2,
  effectsQuality: 'high',
  difficulty: 'normal',
  controllerVibration: false,
  tutorialHints: true,
};

const finite = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

function validateRun(value: unknown): RunSave | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as Partial<RunSave>;
  if (run.level !== 'level_1' || !Number.isInteger(run.checkpoint) ||
    run.checkpoint! < 0 || run.checkpoint! > 10) return null;
  return {
    level: 'level_1', checkpoint: run.checkpoint!,
    lives: Math.round(finite(run.lives, 3, 1, 3)),
    score: Math.round(finite(run.score, 0)),
    weapon: typeof run.weapon === 'string' ? run.weapon : null,
    weaponLevel: Math.round(finite(run.weaponLevel, 0, 0, 10)),
  };
}

class SaveManagerClass {
  private cachedData: SaveData | null = null;

  private get data(): SaveData {
    if (this.cachedData) {
      return this.cachedData;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        if (parsed && typeof parsed === 'object') {
          const defaults = this.createDefaultData();
          const oldSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : defaults.settings;
          const numberSetting = (key: 'masterVolume' | 'sfxVolume' | 'musicVolume' | 'screenShake') =>
            finite(oldSettings[key], defaults.settings[key], 0, 1);
          this.cachedData = {
            version: SAVE_VERSION,
            highScore: Math.round(finite(parsed.highScore, 0)),
            highestCombo: Math.round(finite(parsed.highestCombo, 0)),
            unlockedLevels: Array.isArray(parsed.unlockedLevels)
              ? parsed.unlockedLevels.filter((x): x is string => typeof x === 'string') : ['level_1'],
            completedMissions: Array.isArray(parsed.completedMissions)
              ? parsed.completedMissions.filter((x): x is string => typeof x === 'string') : [],
            settings: {
              ...defaults.settings,
              masterVolume: numberSetting('masterVolume'), sfxVolume: numberSetting('sfxVolume'),
              musicVolume: numberSetting('musicVolume'), screenShake: numberSetting('screenShake'),
              mute: typeof oldSettings.mute === 'boolean' ? oldSettings.mute : false,
              fullscreen: typeof oldSettings.fullscreen === 'boolean' ? oldSettings.fullscreen : false,
              reduceFlashes: typeof oldSettings.reduceFlashes === 'boolean' ? oldSettings.reduceFlashes : false,
              pixelScale: Math.round(finite(oldSettings.pixelScale, 2, 1, 4)),
              effectsQuality: oldSettings.effectsQuality === 'low' ? 'low' : 'high',
              difficulty: ['easy', 'normal', 'hard'].includes(oldSettings.difficulty)
                ? oldSettings.difficulty : 'normal',
              controllerVibration: typeof oldSettings.controllerVibration === 'boolean'
                ? oldSettings.controllerVibration : false,
              tutorialHints: typeof oldSettings.tutorialHints === 'boolean' ? oldSettings.tutorialHints : true,
            },
            run: validateRun(parsed.run),
          };
        }
      }
    } catch {
      // Storage may be unavailable or contain invalid JSON. Use defaults.
    }
    this.cachedData ??= this.createDefaultData();
    return this.cachedData;
  }

  private createDefaultData(): SaveData {
    return {
      version: SAVE_VERSION,
      highScore: 0,
      settings: { ...DEFAULT_SETTINGS },
      unlockedLevels: ['level_1'],
      completedMissions: [],
      highestCombo: 0,
      run: null,
    };
  }

  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedData)); } catch {
      // Quota or privacy restrictions must not prevent play.
    }
  }

  getHighScore(): number {
    return this.data.highScore;
  }

  setHighScore(score: number): void {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
    }
  }

  getSettings(): GameSettings {
    return { ...DEFAULT_SETTINGS, ...this.data.settings };
  }

  updateSettings(settings: Partial<GameSettings>): void {
    Object.assign(this.data.settings, settings);
    this.save();
  }

  getRun(): RunSave | null { return this.data.run ? { ...this.data.run } : null; }

  saveRun(run: RunSave): void {
    this.data.run = validateRun(run);
    this.save();
  }

  clearRun(): void {
    this.data.run = null;
    this.save();
  }

  getUnlockedLevels(): string[] {
    return [...this.data.unlockedLevels];
  }

  isLevelUnlocked(level: string): boolean {
    return this.data.unlockedLevels.includes(level);
  }

  unlockLevel(level: string): void {
    if (!this.data.unlockedLevels.includes(level)) {
      this.data.unlockedLevels.push(level);
      this.save();
    }
  }

  getCompletedMissions(): string[] {
    return [...this.data.completedMissions];
  }

  completeMission(mission: string): void {
    if (!this.data.completedMissions.includes(mission)) {
      this.data.completedMissions.push(mission);
      this.save();
    }
  }

  getHighestCombo(): number {
    return this.data.highestCombo;
  }

  setHighestCombo(combo: number): void {
    if (combo > this.data.highestCombo) {
      this.data.highestCombo = combo;
      this.save();
    }
  }

  /** Save player stats from current game session */
  savePlayerStats(stats: Partial<SavedStats>): void {
    if (stats.highScore !== undefined) {
      this.setHighScore(stats.highScore);
    }
    if (stats.highestCombo !== undefined) {
      this.setHighestCombo(stats.highestCombo);
    }
    if (stats.score !== undefined && stats.score > this.data.highScore) {
      this.data.highScore = stats.score;
      this.save();
    }
  }

  /** Load player stats for initializing a new game session */
  loadPlayerStats(): SavedStats | null {
    if (this.data.highScore === 0 && this.data.highestCombo === 0) {
      return null;
    }
    return {
      score: this.data.highScore,
      highScore: this.data.highScore,
      highestCombo: this.data.highestCombo,
    };
  }

  /** Clear all save data */
  clearSave(): void {
    this.cachedData = this.createDefaultData();
    this.save();
  }
}

export const SaveManager = new SaveManagerClass();
