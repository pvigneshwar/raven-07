import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export interface RuntimeDeviceConfig {
  isMobile: boolean;
  orientation: 'landscape' | 'portrait';
  viewportWidth: number;
  viewportHeight: number;
  fullscreen: boolean;
  touchControlsEnabled: boolean;
}

type LayoutListener = (config: Readonly<RuntimeDeviceConfig>) => void;

const getViewportSize = (): { width: number; height: number } => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
});

const detectMobileLayout = (): boolean => {
  const size = getViewportSize();
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const touchScreen = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(size.width, size.height) <= GAME_CONFIG.MOBILE_BREAKPOINT;
  return coarsePointer || (touchScreen && smallScreen);
};

/** Owns browser viewport state without touching world or physics state. */
class RuntimeViewport {
  readonly config: RuntimeDeviceConfig;
  private game: Phaser.Game | null = null;
  private listeners = new Set<LayoutListener>();
  private refreshScheduled = false;
  private orientationPaused = false;

  constructor() {
    const size = getViewportSize();
    this.config = {
      isMobile: detectMobileLayout(),
      orientation: size.width >= size.height ? 'landscape' : 'portrait',
      viewportWidth: size.width,
      viewportHeight: size.height,
      fullscreen: Boolean(document.fullscreenElement),
      touchControlsEnabled: false,
    };
    this.refreshConfig();

    window.addEventListener('resize', this.scheduleRefresh, { passive: true });
    window.addEventListener('orientationchange', this.scheduleRefresh, { passive: true });
    window.visualViewport?.addEventListener('resize', this.scheduleRefresh, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.scheduleRefresh, { passive: true });
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  attachGame(game: Phaser.Game): void {
    this.game = game;
    this.refreshRuntimeLayout();
  }

  subscribe(listener: LayoutListener): () => void {
    this.listeners.add(listener);
    listener(this.config);
    return () => this.listeners.delete(listener);
  }

  async enterFullscreen(): Promise<void> {
    const shell = document.getElementById('game-shell');
    try {
      if (!document.fullscreenElement) await shell?.requestFullscreen();
    } catch { /* Continue in the normal visual viewport when unsupported. */ }
    if (this.config.isMobile) {
      try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
        await orientation.lock?.('landscape');
      } catch { /* iOS and embedded browsers may require manual rotation. */ }
    }
    this.scheduleRefresh();
  }

  async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* A rejected exit must not interrupt gameplay. */ }
    this.scheduleRefresh();
  }

  private readonly scheduleRefresh = (): void => {
    if (this.refreshScheduled) return;
    this.refreshScheduled = true;
    requestAnimationFrame(() => {
      this.refreshScheduled = false;
      this.refreshRuntimeLayout();
    });
  };

  private readonly handleFullscreenChange = (): void => {
    this.scheduleRefresh();
    requestAnimationFrame(() => requestAnimationFrame(this.scheduleRefresh));
  };

  private refreshRuntimeLayout(): void {
    this.refreshConfig();
    const portrait = this.config.isMobile && this.config.orientation === 'portrait';
    document.documentElement.classList.toggle('mobile-layout', this.config.isMobile);
    document.documentElement.classList.toggle('mobile-portrait', portrait);
    document.documentElement.classList.toggle('mobile-landscape', this.config.touchControlsEnabled);

    if (this.game) {
      this.game.scale.refresh();
      if (portrait && !this.orientationPaused) {
        this.orientationPaused = true;
        this.game.loop.sleep();
      } else if (!portrait && this.orientationPaused) {
        this.orientationPaused = false;
        this.game.loop.wake();
      }
    }
    this.listeners.forEach((listener) => listener(this.config));
  }

  private refreshConfig(): void {
    const size = getViewportSize();
    this.config.isMobile = detectMobileLayout();
    this.config.viewportWidth = size.width;
    this.config.viewportHeight = size.height;
    this.config.orientation = size.width >= size.height ? 'landscape' : 'portrait';
    this.config.fullscreen = Boolean(document.fullscreenElement);
    this.config.touchControlsEnabled = this.config.isMobile && this.config.orientation === 'landscape';
  }
}

export const runtimeViewport = new RuntimeViewport();
export const INTERNAL_WIDTH = GAME_CONFIG.WIDTH;
export const INTERNAL_HEIGHT = GAME_CONFIG.HEIGHT;
