import {
  createSystem,
  Vector3,
} from '@iwsdk/core';
import {
  Ghost,
  GameState,
  STATE_PLAYING,
  STATE_WAVE_INTRO,
  STATE_WAVE_COMPLETE,
  STATE_GAME_OVER,
  STATE_MENU,
} from './components.js';
import { BeamSystem } from './beam-system.js';

export class AudioSystem extends createSystem(
  {
    ghosts: { required: [Ghost] },
    gameStates: { required: [GameState] },
  },
) {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private beamOsc: OscillatorNode | null = null;
  private beamGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private emfGain: GainNode | null = null;
  private emfOsc: OscillatorNode | null = null;
  private isBeamPlaying = false;
  private lastCaptureTime = 0;
  private lastHitTime = 0;
  private lastWaveStartTime = 0;
  private lastWaveEndTime = 0;
  private lastGameOverTime = 0;
  private volumeLevel = 1;
  private playerPos!: Vector3;
  private prevGhostCount = 0;
  private prevState = STATE_MENU;

  init(): void {
    this.playerPos = new Vector3();
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.startAmbient();
      this.startEMFDetector();
    } catch {
      // audio not available
    }
  }

  update(delta: number): void {
    if (!this.ctx || !this.masterGain) return;

    // Volume setting
    for (const gs of this.queries.gameStates.entities) {
      this.volumeLevel = gs.getValue(GameState, 'volume') as number;
      const state = gs.getValue(GameState, 'state') as number;

      const volMap = [0, 0.15, 0.4];
      this.masterGain!.gain.value = volMap[this.volumeLevel] ?? 0.3;

      // Wave intro sound
      if (state === STATE_WAVE_INTRO && this.prevState !== STATE_WAVE_INTRO) {
        this.playWaveStart();
      }
      // Wave complete sound
      if (state === STATE_WAVE_COMPLETE && this.prevState !== STATE_WAVE_COMPLETE) {
        this.playWaveComplete();
      }
      // Game over sound
      if (state === STATE_GAME_OVER && this.prevState !== STATE_GAME_OVER) {
        this.playGameOver();
      }

      this.prevState = state;

      if (state !== STATE_PLAYING) {
        this.stopBeamSound();
        return;
      }
    }

    // Update beam sound
    const beamSystem = this.world.getSystem(BeamSystem);
    const beamActive = beamSystem?.isBeamActive() ?? false;

    if (beamActive && !this.isBeamPlaying) {
      this.startBeamSound();
    } else if (!beamActive && this.isBeamPlaying) {
      this.stopBeamSound();
    }

    // Update EMF proximity
    this.world.camera.getWorldPosition(this.playerPos);
    let closestDist = 100;
    for (const ghost of this.queries.ghosts.entities) {
      const obj = ghost.object3D;
      if (!obj) continue;
      const dist = obj.position.distanceTo(this.playerPos);
      if (dist < closestDist) closestDist = dist;
    }

    this.updateEMFDetector(closestDist);

    // Check for ghost captures (ghost count decreased)
    const currentGhostCount = this.queries.ghosts.entities.size;
    if (currentGhostCount < this.prevGhostCount && this.prevGhostCount > 0) {
      this.playCaptureSound();
    }
    this.prevGhostCount = currentGhostCount;
  }

  private startAmbient(): void {
    if (!this.ctx || !this.masterGain) return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.08;
    this.ambientGain.connect(this.masterGain);

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 55;
    this.ambientOsc.connect(this.ambientGain);
    this.ambientOsc.start();

    // Add noise layer
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.03;
    noiseGain.connect(this.masterGain);

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lpFilter = this.ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 200;
    noise.connect(lpFilter);
    lpFilter.connect(noiseGain);
    noise.start();
  }

  private startEMFDetector(): void {
    if (!this.ctx || !this.masterGain) return;

    this.emfGain = this.ctx.createGain();
    this.emfGain.gain.value = 0;
    this.emfGain.connect(this.masterGain);

    this.emfOsc = this.ctx.createOscillator();
    this.emfOsc.type = 'square';
    this.emfOsc.frequency.value = 2;
    this.emfOsc.connect(this.emfGain);
    this.emfOsc.start();
  }

  private updateEMFDetector(closestDist: number): void {
    if (!this.emfGain || !this.emfOsc) return;

    if (closestDist < 8) {
      const intensity = 1 - (closestDist / 8);
      this.emfGain.gain.value = intensity * 0.12;
      this.emfOsc.frequency.value = 2 + intensity * 20;
    } else {
      this.emfGain.gain.value = 0;
    }
  }

  private startBeamSound(): void {
    if (!this.ctx || !this.masterGain || this.isBeamPlaying) return;
    this.isBeamPlaying = true;

    this.beamGain = this.ctx.createGain();
    this.beamGain.gain.value = 0.15;
    this.beamGain.connect(this.masterGain);

    this.beamOsc = this.ctx.createOscillator();
    this.beamOsc.type = 'sawtooth';
    this.beamOsc.frequency.value = 180;
    this.beamOsc.connect(this.beamGain);
    this.beamOsc.start();

    // Add frequency sweep LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 8;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(this.beamOsc.frequency);
    lfo.start();
  }

  private stopBeamSound(): void {
    if (!this.isBeamPlaying) return;
    this.isBeamPlaying = false;
    try {
      this.beamOsc?.stop();
    } catch { /* ignore */ }
    this.beamOsc = null;
    this.beamGain = null;
  }

  playCaptureSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    gain.connect(this.masterGain);

    // Ascending arpeggio
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      osc.connect(gain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    }
  }

  playHitSound(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playWaveStart(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    gain.connect(this.masterGain);

    // Dramatic rising sting
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.0);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    osc2.connect(gain);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.8);
  }

  private playWaveComplete(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    gain.connect(this.masterGain);

    // Victory fanfare
    const notes = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      osc.connect(gain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    }
  }

  private playGameOver(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    gain.connect(this.masterGain);

    // Descending ominous tones
    const notes = [400, 350, 300, 200, 100];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = notes[i];
      osc.connect(gain);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.5);
    }
  }

  playUIClick(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playEMFPulse(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}
