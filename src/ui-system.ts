import {
  createSystem,
  UIKitMLAsset,
} from '@iwsdk/core';
import {
  GameState,
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
import { GameSystem } from './game-system.js';
import { AudioSystem } from './audio-system.js';

export class UISystem extends createSystem(
  {
    gameStates: { required: [GameState] },
  },
) {
  private menuPanel: UIKitMLAsset | undefined = undefined;
  private hudPanel: UIKitMLAsset | undefined = undefined;
  private gameOverPanel: UIKitMLAsset | undefined = undefined;
  private settingsPanel: UIKitMLAsset | undefined = undefined;
  private tutorialPanel: UIKitMLAsset | undefined = undefined;
  private highscorePanel: UIKitMLAsset | undefined = undefined;
  private pausePanel: UIKitMLAsset | undefined = undefined;
  private initialized = false;
  private returnFromSettings: number = STATE_MENU;

  init(): void {
    // Panels load asynchronously; try to resolve them each frame until found
  }

  update(delta: number): void {
    if (!this.initialized) {
      this.tryInitPanels();
      if (!this.initialized) return;
    }

    for (const entity of this.queries.gameStates.entities) {
      const state = entity.getValue(GameState, 'state') as number;
      const score = entity.getValue(GameState, 'score') as number;
      const lives = entity.getValue(GameState, 'lives') as number;
      const wave = entity.getValue(GameState, 'wave') as number;
      const combo = entity.getValue(GameState, 'combo') as number;
      const ghostsRem = entity.getValue(GameState, 'ghostsRemaining') as number;
      const totalCaptured = entity.getValue(GameState, 'totalGhostsCaptured') as number;

      // Show/hide panels based on state
      this.showOnly(state);

      // Update HUD
      if (state === STATE_PLAYING || state === STATE_WAVE_INTRO || state === STATE_WAVE_COMPLETE) {
        this.updateHUD(score, combo, lives, wave, ghostsRem);
      }

      // Update game over
      if (state === STATE_GAME_OVER) {
        this.updateGameOver(score, totalCaptured, wave);
      }
    }
  }

  private tryInitPanels(): void {
    this.menuPanel = this.world.getSceneObject<UIKitMLAsset>('menu-panel');
    this.hudPanel = this.world.getSceneObject<UIKitMLAsset>('hud-panel');
    this.gameOverPanel = this.world.getSceneObject<UIKitMLAsset>('game-over-panel');
    this.settingsPanel = this.world.getSceneObject<UIKitMLAsset>('settings-panel');
    this.tutorialPanel = this.world.getSceneObject<UIKitMLAsset>('tutorial-panel');
    this.highscorePanel = this.world.getSceneObject<UIKitMLAsset>('highscore-panel');
    this.pausePanel = this.world.getSceneObject<UIKitMLAsset>('pause-panel');

    if (!this.menuPanel) return;

    this.initialized = true;

    // Wire button handlers
    this.wireMenuButtons();
    this.wireGameOverButtons();
    this.wireSettingsButtons();
    this.wireTutorialButtons();
    this.wireHighscoreButtons();
    this.wirePauseButtons();

    // Initial state: show menu only
    this.showOnly(STATE_MENU);
    this.updateHighScoreDisplay();
  }

  private wireMenuButtons(): void {
    const audio = this.world.getSystem(AudioSystem);
    const game = this.world.getSystem(GameSystem);

    this.menuPanel?.getElementById('btn-play')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.startGame();
    });
    this.menuPanel?.getElementById('btn-tutorial')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.showTutorial();
    });
    this.menuPanel?.getElementById('btn-settings')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.returnFromSettings = STATE_MENU;
      game?.showSettings();
    });
    this.menuPanel?.getElementById('btn-highscore')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.updateHighScoreDisplay();
      game?.showHighscore();
    });
  }

  private wireGameOverButtons(): void {
    const audio = this.world.getSystem(AudioSystem);
    const game = this.world.getSystem(GameSystem);

    this.gameOverPanel?.getElementById('btn-play-again')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.startGame();
    });
    this.gameOverPanel?.getElementById('btn-menu')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.goToMenu();
    });
  }

  private wireSettingsButtons(): void {
    const audio = this.world.getSystem(AudioSystem);

    // Volume buttons
    this.settingsPanel?.getElementById('vol-off')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.setVolume(0);
    });
    this.settingsPanel?.getElementById('vol-low')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.setVolume(1);
    });
    this.settingsPanel?.getElementById('vol-high')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.setVolume(2);
    });

    // Difficulty buttons
    this.settingsPanel?.getElementById('diff-normal')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.setDifficulty(0);
    });
    this.settingsPanel?.getElementById('diff-hard')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.setDifficulty(1);
    });

    // Back button
    this.settingsPanel?.getElementById('btn-settings-back')?.addEventListener('click', () => {
      audio?.playUIClick();
      for (const entity of this.queries.gameStates.entities) {
        entity.setValue(GameState, 'state', this.returnFromSettings);
      }
    });
  }

  private wireTutorialButtons(): void {
    const audio = this.world.getSystem(AudioSystem);
    const game = this.world.getSystem(GameSystem);

    this.tutorialPanel?.getElementById('btn-tutorial-back')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.goToMenu();
    });
  }

  private wireHighscoreButtons(): void {
    const audio = this.world.getSystem(AudioSystem);
    const game = this.world.getSystem(GameSystem);

    this.highscorePanel?.getElementById('btn-hs-back')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.goToMenu();
    });
  }

  private wirePauseButtons(): void {
    const audio = this.world.getSystem(AudioSystem);
    const game = this.world.getSystem(GameSystem);

    this.pausePanel?.getElementById('btn-resume')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.resumeGame();
    });
    this.pausePanel?.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      audio?.playUIClick();
      this.returnFromSettings = STATE_PAUSED;
      game?.showSettings();
    });
    this.pausePanel?.getElementById('btn-quit')?.addEventListener('click', () => {
      audio?.playUIClick();
      game?.goToMenu();
    });
  }

  private showOnly(state: number): void {
    const panels = [
      { panel: this.menuPanel, states: [STATE_MENU] },
      { panel: this.hudPanel, states: [STATE_PLAYING, STATE_WAVE_INTRO, STATE_WAVE_COMPLETE] },
      { panel: this.gameOverPanel, states: [STATE_GAME_OVER] },
      { panel: this.settingsPanel, states: [STATE_SETTINGS] },
      { panel: this.tutorialPanel, states: [STATE_TUTORIAL] },
      { panel: this.highscorePanel, states: [STATE_HIGHSCORE] },
      { panel: this.pausePanel, states: [STATE_PAUSED] },
    ];

    for (const { panel, states } of panels) {
      if (panel) {
        panel.visible = states.includes(state);
      }
    }
  }

  private updateHUD(score: number, combo: number, lives: number, wave: number, ghostsRem: number): void {
    this.hudPanel?.getElementById('wave-label')?.setProperties({ text: `WAVE ${wave}` });
    this.hudPanel?.getElementById('score-label')?.setProperties({ text: String(score) });

    const comboText = combo > 1 ? `COMBO x${Math.min(combo, 10)}` : 'COMBO x1';
    this.hudPanel?.getElementById('combo-label')?.setProperties({ text: comboText });

    const hearts = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives));
    this.hudPanel?.getElementById('lives-label')?.setProperties({ text: hearts });
    this.hudPanel?.getElementById('ghost-count')?.setProperties({ text: `GHOSTS: ${ghostsRem}` });
  }

  private updateGameOver(score: number, captured: number, wave: number): void {
    this.gameOverPanel?.getElementById('go-score')?.setProperties({ text: String(score) });
    this.gameOverPanel?.getElementById('go-captured')?.setProperties({ text: String(captured) });
    this.gameOverPanel?.getElementById('go-best-combo')?.setProperties({
      text: String(this.world.getSystem(GameSystem)?.getBestCombo() ?? 0),
    });
    this.gameOverPanel?.getElementById('go-wave')?.setProperties({ text: `REACHED WAVE ${wave}` });
  }

  private setVolume(level: number): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'volume', level);
    }
    this.updateSettingsDisplay(level, -1);
  }

  private setDifficulty(level: number): void {
    for (const entity of this.queries.gameStates.entities) {
      entity.setValue(GameState, 'difficulty', level);
    }
    this.updateSettingsDisplay(-1, level);
  }

  private updateSettingsDisplay(vol: number, diff: number): void {
    if (vol >= 0) {
      const volIds = ['vol-off', 'vol-low', 'vol-high'];
      for (let i = 0; i < volIds.length; i++) {
        this.settingsPanel?.getElementById(volIds[i])?.setProperties({
          backgroundColor: i === vol ? 'rgba(0, 255, 100, 0.25)' : 'rgba(0, 255, 100, 0.08)',
          borderColor: i === vol ? 'rgba(0, 255, 100, 0.6)' : 'rgba(0, 255, 100, 0.2)',
        });
      }
    }
    if (diff >= 0) {
      const diffIds = ['diff-normal', 'diff-hard'];
      for (let i = 0; i < diffIds.length; i++) {
        this.settingsPanel?.getElementById(diffIds[i])?.setProperties({
          backgroundColor: i === diff ? 'rgba(0, 255, 100, 0.25)' : 'rgba(0, 255, 100, 0.08)',
          borderColor: i === diff ? 'rgba(0, 255, 100, 0.6)' : 'rgba(0, 255, 100, 0.2)',
        });
      }
    }
  }

  private updateHighScoreDisplay(): void {
    try {
      const scores: number[] = JSON.parse(localStorage.getItem('neon-ghost-scores') || '[]');
      for (let i = 0; i < 5; i++) {
        const scoreText = scores[i] ? String(scores[i]) : '---';
        this.highscorePanel?.getElementById(`hs-score-${i + 1}`)?.setProperties({ text: scoreText });
      }
    } catch {
      // ignore
    }
  }
}
