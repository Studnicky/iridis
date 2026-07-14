import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Retro pixel-art — scattered chunky pixel-blinks, visible grid, snappy pace. Visual (fonts/radius/border) lives in ./arcade.css. */
export const arcade: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     true,
    'particleCounts':  [70, 70, 60, 35, 35],
    'particleShape':   'square',
    'speedMultiplier': 0.6
  },
  'key':   'arcade',
  'label': 'Arcade'
};
