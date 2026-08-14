import { createComponent, defineComponents, Types } from '@iwsdk/core';

export const Ghost = createComponent('Ghost', {
  ghostType: { type: Types.Int32, default: 0 },
  health: { type: Types.Float32, default: 100 },
  maxHealth: { type: Types.Float32, default: 100 },
  points: { type: Types.Int32, default: 10 },
  speed: { type: Types.Float32, default: 1 },
  captureProgress: { type: Types.Float32, default: 0 },
  isBeingCaptured: { type: Types.Boolean, default: false },
  isStunned: { type: Types.Boolean, default: false },
  stunTimer: { type: Types.Float32, default: 0 },
  phaseTimer: { type: Types.Float32, default: 0 },
  attackCooldown: { type: Types.Float32, default: 0 },
  spawnTime: { type: Types.Float32, default: 0 },
  moveAngle: { type: Types.Float32, default: 0 },
  moveRadius: { type: Types.Float32, default: 2 },
  baseY: { type: Types.Float32, default: 1.5 },
  alive: { type: Types.Boolean, default: true },
});

export const GameState = createComponent('GameState', {
  state: { type: Types.Int32, default: 0 },
  score: { type: Types.Int32, default: 0 },
  lives: { type: Types.Int32, default: 3 },
  wave: { type: Types.Int32, default: 1 },
  ghostsRemaining: { type: Types.Int32, default: 0 },
  ghostsCaptured: { type: Types.Int32, default: 0 },
  totalGhostsCaptured: { type: Types.Int32, default: 0 },
  combo: { type: Types.Int32, default: 0 },
  comboTimer: { type: Types.Float32, default: 0 },
  waveTimer: { type: Types.Float32, default: 0 },
  invulnTimer: { type: Types.Float32, default: 0 },
  difficulty: { type: Types.Int32, default: 0 },
  volume: { type: Types.Int32, default: 1 },
  highScore: { type: Types.Int32, default: 0 },
});

export const Beam = createComponent('Beam', {
  active: { type: Types.Boolean, default: false },
  hitGhostId: { type: Types.Int32, default: -1 },
});

export const Particle = createComponent('Particle', {
  lifetime: { type: Types.Float32, default: 0 },
  maxLifetime: { type: Types.Float32, default: 3 },
  velocityX: { type: Types.Float32, default: 0 },
  velocityY: { type: Types.Float32, default: 0 },
  velocityZ: { type: Types.Float32, default: 0 },
});

// Ghost types enum
export const GHOST_WISP = 0;
export const GHOST_SPECTER = 1;
export const GHOST_POLTERGEIST = 2;
export const GHOST_PHANTOM = 3;

// Game states enum
export const STATE_MENU = 0;
export const STATE_PLAYING = 1;
export const STATE_WAVE_INTRO = 2;
export const STATE_WAVE_COMPLETE = 3;
export const STATE_GAME_OVER = 4;
export const STATE_PAUSED = 5;
export const STATE_TUTORIAL = 6;
export const STATE_SETTINGS = 7;
export const STATE_HIGHSCORE = 8;

export default defineComponents([Ghost, GameState, Beam, Particle]);
