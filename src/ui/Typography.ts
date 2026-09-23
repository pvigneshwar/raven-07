/** Small, consistent type system for the game's canvas UI. */
export const FONT = {
  display: 'RavenDisplay',
  ui: 'RavenDisplay',
  hud: 'RavenMono',
  numeric: 'RavenMono',
} as const;

export const TYPE_COLOR = {
  primary: '#eaf1e9',
  muted: '#aebfc1',
  accent: '#8ce3c8',
  warning: '#ffc268',
  danger: '#ff7371',
} as const;
