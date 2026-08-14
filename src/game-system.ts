import {
  createSystem,
  InputComponent,
  Vector3,
  Entity,
} from '@iwsdk/core';
import {
  GameState,
  Ghost,
  STATE_MENU,
  STATE_PLAYING,
  STATE_WAVE_INTRO,
  STATE_WAVE_COMPLETE,
  STATE_GAME_OVER,
  STATE_PAUSED,
  STATE_TUTORIAL,
  STATE_SETTINGS,
  STATE_HIGHSCORE,
} from './components.js';

const WAVE_INTRO_TIME = 2.0;
const WAVE_COMPLETE_TIME = 2.5;
const COMBO_WINDOW = 5.0;
const INVULN_TIME = 1.5;

export class GameSystem extends createSystem(
  {
    gameStates: { required: [GameState] },
    ghosts: { required: [Ghost] },
  },
) {
  private prevPauseKey = false;
  private prevEmf = false;
  private emfCooldown = 0;
  private bestCombo = 0;

  init(): void {
    // Create game state entity
    const entity = this.world.createEntity();
    entity.addComponent(GameState, {});

    // Load high score
    try {
      const stored = localStorage.getItem('neon-ghost-highscore');
      if (stored) {
        entity.setValue(GameState, 'highScore', parseInt(stored, 10));
      }
    } catch {
      // ignore
    }
  }

  update(delta: number): void {
    for (const entity of this.queries.gameStates.entities) {
      const state = entity.getValue(GameState, 'state') as number;
      const lives = entity.getValue(GameState, 'lives') as number;

      // Handle pause toggle
      const kbd = this.world.input.keyboard;
      const escDown = kbd?.getKeyDown('Escape') ?? false;
      const leftPad = this.world.input.xr?.gamepads?.left;
      const leftSqueeze = leftPad?.getButtonDown(InputComponent.Squeeze) ?? false;

      if ((escDown && !this.prevPauseKey) || (leftSqueeze && state === STATE_PLAYING)) {
        if (state === STATE_PLAYING) {
          entity.setValue(GameState, 'state', STATE_PAUSED);
        } else if (state === STATE_PAUSED) {
          entity.setValue(GameState, 'state', STATE_PLAYING);
        }
      }
      this.prevPauseKey = escDown;

      // Handle EMF pulse
      const rightClick = kbd?.getKeyDown('contextmenu') ?? false;
      const spaceDown = kbd?.getKeyDown(' ') ?? false;
      const rightPad = this.world.input.xr?.gamepads?.right;
      const gripDown = rightPad?.getButtonDown(InputComponent.Squeeze) ?? false;
      const emfInput = rightClick || spaceDown || gripDown;

      if (this.emfCooldown > 0) {
        this.emfCooldown -= delta;
      }

      if (emfInput && !this.prevEmf && this.emfCooldown <= 0 && state === STATE_PLAYING) {
        this.triggerEMFPulse();
        this.emfCooldown = 3.0;
      }
      this.prevEmf = emfInput;

      // State-specific updates
      if (state === STATE_WAVE_INTRO) {
        const timer = (entity.getValue(GameState, 'waveTimer') as number) + delta;
        entity.setValue(GameState, 'waveTimer', timer);
        if (timer >= WAVE_INTRO_TIME) {
          entity.setValue(GameState, 'state', STATE_PLAYING);
          entity.setValue(GameState, 'waveTimer', 0);
        }
      } else if (state === STATE_PLAYING) {
        // Update combo timer
        const comboTimer = entity.getValue(GameState, 'comboTimer') as number;
        if (comboTimer > 0) {
          const newTimer = comboTimer - delta;
          entity.setValue(GameState, 'comboTimer', newTimer);
          if (newTimer <= 0) {
            entity.setValue(GameState, 'combo', 0);
            entity.setValue(GameState, 'comboTimer', 0);
          }
        }

        // Update invuln timer
        const invuln = entity.getValue(GameState, 'invulnTimer') as number;
        if (invuln > 0) {
          entity.setValue(GameState, 'invulnTimer', Math.max(0, invuln - delta));
        }

        // Check wave completion
        const ghostsRem = entity.getValue(GameState, 'ghostsRemaining') as number;
        if (ghostsRem <= 0 && this.queries.ghosts.entities.size === 0) {
          const wave = entity.getValue(GameState, 'wave') as number;
          const waveBonus = wave * 100;
          const score = entity.getValue(GameState, 'score') as number;
          entity.setValue(GameState, 'score', score + waveBonus);
          entity.setValue(GameState, 'state', STATE_WAVE_COMPLETE);
          entity.setValue(GameState, 'waveTimer', 0);
        }

        // Check death
        if (lives <= 0) {
          entity.setValue(GameState, 'state', STATE_GAME_OVER);
          this.saveHighScore(entity);
        }
      } else if (state === STATE_WAVE_COMPLETE) {
        const timer = (entity.getValue(GameState, 'waveTimer') as number) + delta;
        entity.setValue(GameState, 'waveTimer', timer);
        if (timer >= WAVE_COMPLETE_TIME) {
          const wave = entity.getValue(GameState, 'wave') as number;
          entity.setValue(GameState, 'wave', wave + 1);
          entity.setValue(GameState, 'waveTimer', 0);
          entity.setValue(GameState, 'state', STATE_WAVE_INTRO);
        }
      }
    }
  }

  startGame(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_WAVE_INTRO);
      entity.setValue(GameState, 'score', 0);
      entity.setValue(GameState, 'lives', 3);
      entity.setValue(GameState, 'wave', 1);
      entity.setValue(GameState, 'ghostsRemaining', 0);
      entity.setValue(GameState, 'ghostsCaptured', 0);
      entity.setValue(GameState, 'totalGhostsCaptured', 0);
      entity.setValue(GameState, 'combo', 0);
      entity.setValue(GameState, 'comboTimer', 0);
      entity.setValue(GameState, 'waveTimer', 0);
      entity.setValue(GameState, 'invulnTimer', 0);
      this.bestCombo = 0;

      // Clean up existing ghosts
      for (const ghost of this.queries.ghosts.entities) {
        ghost.dispose();
      }
    }
  }

  goToMenu(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_MENU);
      // Clean up ghosts
      for (const ghost of this.queries.ghosts.entities) {
        ghost.dispose();
      }
    }
  }

  showTutorial(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_TUTORIAL);
    }
  }

  showSettings(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_SETTINGS);
    }
  }

  showHighscore(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_HIGHSCORE);
    }
  }

  resumeGame(): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'state', STATE_PLAYING);
    }
  }

  onGhostCaptured(points: number): void {
    for (const entity of this.queries.gameStates.entities) {
      const combo = (entity.getValue(GameState, 'combo') as number) + 1;
      entity.setValue(GameState, 'combo', combo);
      entity.setValue(GameState, 'comboTimer', COMBO_WINDOW);

      if (combo > this.bestCombo) this.bestCombo = combo;

      const multiplier = Math.min(combo, 10);
      const totalPoints = points * multiplier;
      const score = (entity.getValue(GameState, 'score') as number) + totalPoints;
      entity.setValue(GameState, 'score', score);

      const captured = (entity.getValue(GameState, 'totalGhostsCaptured') as number) + 1;
      entity.setValue(GameState, 'totalGhostsCaptured', captured);
      entity.setValue(GameState, 'ghostsCaptured',
        (entity.getValue(GameState, 'ghostsCaptured') as number) + 1);
    }
  }

  onPlayerHit(): void {
    for (const entity of this.queries.gameStates.entities) {
      const invuln = entity.getValue(GameState, 'invulnTimer') as number;
      if (invuln > 0) return;

      const lives = (entity.getValue(GameState, 'lives') as number) - 1;
      entity.setValue(GameState, 'lives', lives);
      entity.setValue(GameState, 'invulnTimer', INVULN_TIME);
    }
  }

  getBestCombo(): number {
    return this.bestCombo;
  }

  private triggerEMFPulse(): void {
    const playerPos = new Vector3();
    this.world.camera.getWorldPosition(playerPos);

    for (const ghost of this.queries.ghosts.entities) {
      const ghostObj = ghost.object3D;
      if (!ghostObj) continue;
      const dist = ghostObj.position.distanceTo(playerPos);
      if (dist < 5) {
        ghost.setValue(Ghost, 'isStunned', true);
        ghost.setValue(Ghost, 'stunTimer', 2.0);
      }
    }
  }

  private saveHighScore(entity: Entity): void {
    const score = entity.getValue(GameState, 'score') as number;
    try {
      const scores: number[] = JSON.parse(localStorage.getItem('neon-ghost-scores') || '[]');
      scores.push(score);
      scores.sort((a, b) => b - a);
      const top5 = scores.slice(0, 5);
      localStorage.setItem('neon-ghost-scores', JSON.stringify(top5));
      if (top5[0] > (entity.getValue(GameState, 'highScore') as number)) {
        entity.setValue(GameState, 'highScore', top5[0]);
        localStorage.setItem('neon-ghost-highscore', String(top5[0]));
      }
    } catch {
      // ignore
    }
  }
}
