/** Small, self-contained soundtrack and effects. Everything is synthesized once,
 * so gameplay never creates oscillators or allocates sample data while firing. */

type Effect = {
  duration: number; from: number; to: number; tone: number; noise: number;
  decay: number; harmonics?: number; filter?: number; pulse?: number;
};

const TAU = Math.PI * 2;

function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296 * 2 - 1;
  };
}

function buffer(context: AudioContext, seconds: number): AudioBuffer {
  return context.createBuffer(2, Math.round(context.sampleRate * seconds), context.sampleRate);
}

function finish(sound: AudioBuffer, gain = 1): AudioBuffer {
  for (let channel = 0; channel < 2; channel++) {
    const data = sound.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * gain);
  }
  return sound;
}

function effect(context: AudioContext, spec: Effect, seed: number): AudioBuffer {
  const sound = buffer(context, spec.duration);
  const rng = random(seed);
  const left = sound.getChannelData(0);
  const right = sound.getChannelData(1);
  const rate = context.sampleRate;
  let phase = 0;
  let filtered = 0;
  const filter = spec.filter ?? 0.25;
  for (let i = 0; i < left.length; i++) {
    const t = i / rate;
    const progress = t / spec.duration;
    const frequency = spec.from * Math.pow(spec.to / spec.from, progress);
    phase += TAU * frequency / rate;
    filtered += (rng() - filtered) * filter;
    const shape = Math.sin(phase) + (spec.harmonics ?? 0.2) * Math.sin(phase * 2);
    const pulse = spec.pulse ? 0.7 + 0.3 * Math.sin(TAU * spec.pulse * t) : 1;
    const attack = Math.min(1, t * 500);
    const tail = Math.min(1, (spec.duration - t) * 180);
    const envelope = attack * tail * Math.exp(-spec.decay * t) * pulse;
    const sample = (shape * spec.tone + filtered * spec.noise) * envelope;
    left[i] = sample;
    right[i] = sample * 0.96;
  }
  return finish(sound);
}

const effects: Record<string, Effect> = {
  sfx_rifle:         { duration: 0.115, from: 420, to: 105, tone: 0.43, noise: 0.44, decay: 30, filter: 0.45 },
  sfx_spread:        { duration: 0.16, from: 360, to: 82, tone: 0.46, noise: 0.52, decay: 23, filter: 0.33 },
  sfx_rapid:         { duration: 0.09, from: 510, to: 145, tone: 0.34, noise: 0.32, decay: 37, filter: 0.42 },
  sfx_plasma:        { duration: 0.26, from: 680, to: 190, tone: 0.43, noise: 0.12, decay: 12, harmonics: 0.35, pulse: 28 },
  sfx_rocket:        { duration: 0.37, from: 240, to: 56, tone: 0.48, noise: 0.38, decay: 8, filter: 0.09 },
  sfx_explosion:     { duration: 0.72, from: 115, to: 37, tone: 0.65, noise: 0.82, decay: 6, filter: 0.07 },
  sfx_boss_explosion:{ duration: 1.15, from: 102, to: 28, tone: 0.7, noise: 0.9, decay: 4, filter: 0.045 },
  sfx_bomb_small:    { duration: 0.43, from: 135, to: 45, tone: 0.52, noise: 0.72, decay: 9, filter: 0.08 },
  sfx_player_damage: { duration: 0.28, from: 310, to: 92, tone: 0.42, noise: 0.3, decay: 11, pulse: 35 },
  sfx_enemy_damage:  { duration: 0.16, from: 265, to: 135, tone: 0.3, noise: 0.27, decay: 19 },
  sfx_enemy_death:   { duration: 0.3, from: 235, to: 65, tone: 0.37, noise: 0.36, decay: 10 },
  sfx_player_death:  { duration: 0.78, from: 390, to: 52, tone: 0.48, noise: 0.22, decay: 4, pulse: 12 },
  sfx_boss_damage:   { duration: 0.2, from: 170, to: 76, tone: 0.52, noise: 0.43, decay: 15, filter: 0.22 },
  sfx_pickup:        { duration: 0.32, from: 520, to: 1040, tone: 0.34, noise: 0.015, decay: 5, harmonics: 0.3 },
  sfx_jump:          { duration: 0.14, from: 185, to: 335, tone: 0.25, noise: 0.025, decay: 17 },
  sfx_landing:       { duration: 0.14, from: 110, to: 65, tone: 0.19, noise: 0.23, decay: 21, filter: 0.12 },
  sfx_footstep:      { duration: 0.07, from: 95, to: 65, tone: 0.1, noise: 0.15, decay: 36, filter: 0.1 },
  sfx_impact_metal:  { duration: 0.19, from: 920, to: 570, tone: 0.24, noise: 0.28, decay: 24, harmonics: 0.62 },
  sfx_impact_energy: { duration: 0.24, from: 1100, to: 330, tone: 0.32, noise: 0.08, decay: 15, harmonics: 0.4 },
  sfx_enemy_rifle:   { duration: 0.12, from: 325, to: 105, tone: 0.32, noise: 0.32, decay: 26, filter: 0.32 },
  sfx_enemy_heavy:   { duration: 0.21, from: 210, to: 65, tone: 0.43, noise: 0.46, decay: 15, filter: 0.18 },
  sfx_enemy_drone:   { duration: 0.21, from: 720, to: 260, tone: 0.24, noise: 0.09, decay: 14, pulse: 22 },
  sfx_enemy_turret:  { duration: 0.15, from: 280, to: 85, tone: 0.39, noise: 0.35, decay: 21, filter: 0.27 },
  sfx_boss_cannon:   { duration: 0.36, from: 205, to: 42, tone: 0.6, noise: 0.56, decay: 10, filter: 0.11 },
  sfx_laser:         { duration: 0.2, from: 1100, to: 215, tone: 0.31, noise: 0.07, decay: 13, pulse: 31 },
  sfx_boss_warning:  { duration: 0.75, from: 440, to: 440, tone: 0.24, noise: 0.025, decay: 2, pulse: 6 },
  sfx_ui_click:      { duration: 0.085, from: 530, to: 350, tone: 0.19, noise: 0.025, decay: 30 },
  sfx_ui_hover:      { duration: 0.065, from: 660, to: 590, tone: 0.1, noise: 0.01, decay: 39 },
};

type MusicStyle = 'level' | 'boss' | 'menu' | 'game_over' | 'victory';

function hz(midi: number): number { return 440 * Math.pow(2, (midi - 69) / 12); }

function addNote(sound: AudioBuffer, start: number, length: number, midi: number, amplitude: number,
  voice: 'bass' | 'lead' | 'pad', pan = 0): void {
  const rate = sound.sampleRate;
  const left = sound.getChannelData(0);
  const right = sound.getChannelData(1);
  const end = Math.min(left.length, Math.round((start + length) * rate));
  const first = Math.max(0, Math.round(start * rate));
  const frequency = hz(midi);
  for (let i = first; i < end; i++) {
    const t = (i / rate) - start;
    const phase = TAU * frequency * t;
    const body = voice === 'bass'
      ? Math.sin(phase) + 0.22 * Math.sin(phase * 2)
      : voice === 'pad'
        ? Math.sin(phase) + 0.18 * Math.sin(phase * 2 + 0.2)
        : Math.sin(phase) + 0.28 * Math.sin(phase * 2) + 0.1 * Math.sin(phase * 3);
    const attack = Math.min(1, t / (voice === 'pad' ? 0.065 : 0.008));
    const release = Math.min(1, (length - t) / (voice === 'pad' ? 0.13 : 0.035));
    const decay = voice === 'pad' ? 1 : Math.exp(-t * (voice === 'bass' ? 2.2 : 3.7));
    const sample = body * amplitude * attack * release * decay;
    left[i] += sample * (1 - Math.max(0, pan));
    right[i] += sample * (1 + Math.min(0, pan));
  }
}

function addDrum(sound: AudioBuffer, start: number, kind: 'kick' | 'snare' | 'hat', strength: number, seed: number): void {
  const rate = sound.sampleRate;
  const left = sound.getChannelData(0);
  const right = sound.getChannelData(1);
  const length = kind === 'kick' ? 0.22 : kind === 'snare' ? 0.16 : 0.075;
  const first = Math.round(start * rate);
  const end = Math.min(left.length, first + Math.round(length * rate));
  const rng = random(seed);
  let noiseLow = 0;
  let phase = 0;
  for (let i = first; i < end; i++) {
    const t = (i - first) / rate;
    const raw = rng();
    noiseLow += (raw - noiseLow) * 0.12;
    let sample: number;
    if (kind === 'kick') {
      phase += TAU * (52 + 125 * Math.exp(-t * 33)) / rate;
      sample = Math.sin(phase) * Math.exp(-t * 23) * 0.53;
    } else if (kind === 'snare') {
      sample = ((raw - noiseLow) * 0.23 + Math.sin(TAU * 172 * t) * 0.12) * Math.exp(-t * 25);
    } else {
      sample = (raw - noiseLow) * Math.exp(-t * 55) * 0.075;
    }
    sample *= strength * Math.min(1, t * 1200);
    left[i] += sample;
    right[i] += sample * (kind === 'hat' ? 0.78 : 1);
  }
}

function music(context: AudioContext, style: MusicStyle): AudioBuffer {
  const bpm = style === 'boss' ? 150 : style === 'level' ? 132 : 100;
  const step = 60 / bpm / 4;
  const bars = 4;
  const sound = buffer(context, step * 16 * bars);
  const roots = style === 'boss' ? [38, 38, 36, 41] : style === 'level' ? [40, 36, 43, 38]
    : style === 'victory' ? [48, 43, 45, 48] : [45, 41, 43, 40];
  const lead = style === 'boss' ? [62, -1, 65, 62, 69, -1, 67, -1, 65, -1, 62, 60, 58, -1, 60, -1]
    : style === 'level' ? [64, -1, 67, -1, 71, 69, 67, -1, 64, -1, 62, 64, 67, -1, 64, -1]
      : style === 'victory' ? [72, -1, 76, -1, 79, -1, 76, -1, 74, -1, 76, -1, 72, -1, 79, -1]
        : style === 'game_over' ? [69, -1, -1, -1, 67, -1, -1, -1, 64, -1, -1, -1, 60, -1, -1, -1]
          : [69, -1, -1, 72, -1, -1, 76, -1, 74, -1, -1, 72, -1, 69, -1, -1];
  for (let bar = 0; bar < bars; bar++) {
    const root = roots[bar];
    const base = bar * 16 * step;
    // Pads and bass give the music a harmonic bed without fighting gunfire.
    for (const [offset, degree] of [[0, 0], [5, 3], [9, 7]] as const) {
      addNote(sound, base + 0.015, step * 15.8, root + 12 + degree, style === 'boss' ? 0.018 : 0.025, 'pad', (degree - 3) * 0.06);
    }
    for (let beat = 0; beat < 8; beat++) {
      const time = base + beat * 2 * step;
      const note = root + (beat % 4 === 3 ? 7 : beat % 4 === 1 ? 12 : 0);
      addNote(sound, time, step * 1.7, note, style === 'menu' || style === 'game_over' ? 0.065 : 0.11, 'bass');
    }
    for (let s = 0; s < 16; s++) {
      const time = base + s * step;
      const note = lead[s];
      if (note >= 0 && (style !== 'game_over' || bar < 2)) {
        addNote(sound, time, step * (style === 'menu' ? 2.6 : 1.8), note + (bar % 2 === 1 ? -2 : 0),
          style === 'boss' ? 0.085 : style === 'level' ? 0.078 : 0.055, 'lead', s % 2 ? 0.1 : -0.1);
      }
      if (style === 'menu' || style === 'game_over') continue;
      if (s % 4 === 0) addDrum(sound, time, 'kick', style === 'boss' ? 1 : 0.82, bar * 100 + s);
      if (s % 8 === 4) addDrum(sound, time, 'snare', 0.8, 500 + bar * 100 + s);
      if (s % 2 === 0 || style === 'boss') addDrum(sound, time, 'hat', s % 4 === 0 ? 0.65 : 0.4, 900 + bar * 100 + s);
    }
  }
  // The final notes release before the loop point; no abrupt DC jump.
  return finish(sound, 0.9);
}

function ambience(context: AudioContext, factory: boolean): AudioBuffer {
  const sound = buffer(context, 4);
  const rate = context.sampleRate;
  for (let channel = 0; channel < 2; channel++) {
    const data = sound.getChannelData(channel);
    const rng = random(417 + channel * 711 + (factory ? 1000 : 0));
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate;
      low += (rng() - low) * (factory ? 0.012 : 0.006);
      const breeze = low * (factory ? 0.028 : 0.065);
      const texture = factory
        ? Math.sin(TAU * 50 * t) * 0.018 + Math.sin(TAU * 100 * t) * 0.005
        : Math.sin(TAU * 1200 * t + Math.sin(TAU * 0.5 * t)) *
          Math.pow(Math.max(0, Math.sin(TAU * 0.75 * t)), 4) * 0.004;
      data[i] = breeze + texture;
    }
    // Blend the final quarter-second into the start for a transparent loop.
    const blend = Math.round(rate * 0.25);
    for (let i = 0; i < blend; i++) {
      const at = data.length - blend + i;
      const mix = i / blend;
      data[at] = data[at] * (1 - mix) + data[i] * mix;
    }
  }
  return sound;
}

export function buildSoundBank(context: AudioContext): Map<string, AudioBuffer> {
  const sounds = new Map<string, AudioBuffer>();
  Object.entries(effects).forEach(([key, spec], index) => sounds.set(key, effect(context, spec, 1729 + index * 97)));
  sounds.set('music_level', music(context, 'level'));
  sounds.set('music_boss', music(context, 'boss'));
  sounds.set('music_menu', music(context, 'menu'));
  sounds.set('music_game_over', music(context, 'game_over'));
  sounds.set('music_victory', music(context, 'victory'));
  sounds.set('ambience_jungle', ambience(context, false));
  sounds.set('ambience_factory', ambience(context, true));
  return sounds;
}
