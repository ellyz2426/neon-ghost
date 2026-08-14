import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { GameSystem } from './game-system.js';
import { GhostSystem } from './ghost-system.js';
import { BeamSystem } from './beam-system.js';
import { AudioSystem } from './audio-system.js';
import { UISystem } from './ui-system.js';
import { EnvironmentSystem } from './environment-system.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(AudioSystem);
  world.registerSystem(EnvironmentSystem);
  world.registerSystem(BeamSystem);
  world.registerSystem(GhostSystem);
  world.registerSystem(GameSystem);
  world.registerSystem(UISystem);
});
