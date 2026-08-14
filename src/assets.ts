import { AssetType, defineAssets } from '@iwsdk/core';
import { mansionEnvironment } from './scene-assets/mansion.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  // UIKitML panels
  'menu-panel': {
    url: publicAssetUrl('ui/menu.uikitml'),
    type: AssetType.UIKitML,
    name: 'Menu Panel',
  },
  'hud-panel': {
    url: publicAssetUrl('ui/hud.uikitml'),
    type: AssetType.UIKitML,
    name: 'HUD Panel',
  },
  'game-over-panel': {
    url: publicAssetUrl('ui/game-over.uikitml'),
    type: AssetType.UIKitML,
    name: 'Game Over Panel',
  },
  'settings-panel': {
    url: publicAssetUrl('ui/settings.uikitml'),
    type: AssetType.UIKitML,
    name: 'Settings Panel',
  },
  'tutorial-panel': {
    url: publicAssetUrl('ui/tutorial.uikitml'),
    type: AssetType.UIKitML,
    name: 'Tutorial Panel',
  },
  'highscore-panel': {
    url: publicAssetUrl('ui/highscore.uikitml'),
    type: AssetType.UIKitML,
    name: 'High Score Panel',
  },
  'pause-panel': {
    url: publicAssetUrl('ui/pause.uikitml'),
    type: AssetType.UIKitML,
    name: 'Pause Panel',
  },
  // Scene assets
  'mansion-env': mansionEnvironment,
});
