/**
 * AudioManager - Plays the generated sound bank through Web Audio with
 * persistent volume settings, category mixing, and loop crossfades.
 */

import { Events, EventBus } from '../core/EventBus';
import { SaveManager } from '../core/SaveManager';
import { buildSoundBank } from './AudioBank';

type AudioCategory = 'weapons' | 'explosions' | 'enemies' | 'player' | 'ui' | 'ambience';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private categoryGains: Partial<Record<AudioCategory, GainNode>> = {};
  private currentMusic: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;
  private currentMusicKey: string | null = null;
  private currentAmbience: AudioBufferSourceNode | null = null;
  private currentAmbienceGain: GainNode | null = null;
  private currentAmbienceKey: string | null = null;
  private activeSfx = new Map<string, number>();
  private isMuted: boolean = false;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private soundCache: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.init();
    this.setupEventListeners();
  }

  private init(): void {
    try {
      const settings = SaveManager.getSettings();
      this.sfxVolume = settings.sfxVolume;
      this.musicVolume = settings.musicVolume;
      this.isMuted = settings.mute;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : settings.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      for (const category of ['weapons', 'explosions', 'enemies', 'player', 'ui', 'ambience'] as const) {
        const gain = this.audioContext.createGain();
        gain.gain.value = category === 'ambience' ? 0.3 : category === 'explosions' ? 0.8 : category === 'ui' ? 0.5 : 0.7;
        gain.connect(this.sfxGain);
        this.categoryGains[category] = gain;
      }

      this.soundCache = buildSoundBank(this.audioContext);

      // Automatically unlock audio on first user gesture
      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      };
      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    } catch (e) {
      console.warn('Audio not supported, proceeding in muted mode:', e);
      this.enabled = false;
    }
  }

  private setupEventListeners(): void {
    EventBus.on(Events.AUDIO_SFX, (soundKey: string, params?: { volume?: number }) => {
      this.playSFX(soundKey, params?.volume ?? 1);
    });

    EventBus.on(Events.AUDIO_MUSIC, (musicKey: string) => {
      this.playMusic(musicKey);
    });
  }

  playSFX(key: string, volume: number = 1): void {
    if (!this.audioContext || !this.enabled) return;

    const buffer = this.soundCache.get(key);
    if (!buffer) return;
    const active = this.activeSfx.get(key) ?? 0;
    const maxVoices = key === 'sfx_rapid' ? 6 : key.startsWith('sfx_explosion') ? 4 : 5;
    if (active >= maxVoices) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const category = this.categoryFor(key);
      if (category === 'weapons') source.playbackRate.value = 0.975 + Math.random() * 0.05;

      const gain = this.audioContext.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gain);
      gain.connect(this.categoryGains[category]!);

      this.activeSfx.set(key, active + 1);
      source.onended = () => {
        this.activeSfx.set(key, Math.max(0, (this.activeSfx.get(key) ?? 1) - 1));
        source.disconnect();
        gain.disconnect();
      };
      source.start(0);
    } catch (e) {
      // Silently fail if audio context is suspended
    }
  }

  private categoryFor(key: string): AudioCategory {
    if (key.includes('explosion') || key.includes('bomb')) return 'explosions';
    if (key.includes('enemy') || key.includes('boss')) return 'enemies';
    if (key.includes('rifle') || key.includes('spread') || key.includes('rapid') ||
        key.includes('plasma') || key.includes('rocket') || key.includes('laser') ||
        key.includes('impact')) return 'weapons';
    if (key.includes('player') || key.includes('jump') || key.includes('landing') || key.includes('footstep')) return 'player';
    return 'ui';
  }

  playMusic(key: string): void {
    if (!this.audioContext || !this.enabled || this.currentMusicKey === key) return;

    const buffer = this.soundCache.get(key);
    if (!buffer) return;

    try {
      const now = this.audioContext.currentTime;
      this.fadeOutMusic(0.3);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const trackGain = this.audioContext.createGain();
      trackGain.gain.setValueAtTime(0, now);
      trackGain.gain.linearRampToValueAtTime(1, now + 0.3);
      source.connect(trackGain);
      trackGain.connect(this.musicGain!);

      source.start(0);
      this.currentMusic = source;
      this.currentMusicGain = trackGain;
      this.currentMusicKey = key;
    } catch (e) {
      console.warn('Failed to play music:', e);
    }
  }

  private fadeOutMusic(duration: number): void {
    if (!this.audioContext || !this.currentMusic || !this.currentMusicGain) return;
    const now = this.audioContext.currentTime;
    const source = this.currentMusic;
    const gain = this.currentMusicGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.stop(now + duration + 0.02);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    this.currentMusic = null;
    this.currentMusicGain = null;
    this.currentMusicKey = null;
  }

  stopMusic(): void {
    this.fadeOutMusic(0.25);
  }

  playAmbience(key: string): void {
    if (!this.audioContext || !this.enabled || this.currentAmbienceKey === key) return;
    const buffer = this.soundCache.get(key);
    if (!buffer) return;
    const now = this.audioContext.currentTime;
    if (this.currentAmbience && this.currentAmbienceGain) {
      const oldSource = this.currentAmbience;
      const oldGain = this.currentAmbienceGain;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + 0.8);
      oldSource.stop(now + 0.82);
      oldSource.onended = () => { oldSource.disconnect(); oldGain.disconnect(); };
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.8);
    source.connect(gain);
    gain.connect(this.categoryGains.ambience!);
    source.start();
    this.currentAmbience = source;
    this.currentAmbienceGain = gain;
    this.currentAmbienceKey = key;
  }

  stopAmbience(): void {
    if (!this.currentAmbience) return;
    const source = this.currentAmbience;
    const gain = this.currentAmbienceGain;
    source.stop();
    source.disconnect();
    gain?.disconnect();
    this.currentAmbience = null;
    this.currentAmbienceGain = null;
    this.currentAmbienceKey = null;
  }

  setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.masterGain) {
      this.masterGain.gain.value = mute ? 0 : SaveManager.getSettings().masterVolume;
    }
  }

  setVolume(master: number, sfx: number, music: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : Math.max(0, Math.min(1, master));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;

    // Save settings
    SaveManager.updateSettings({ masterVolume: master, sfxVolume: sfx, musicVolume: music, mute: this.isMuted });
  }

  resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
