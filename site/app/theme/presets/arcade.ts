import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderSquare } from '../particles/renderSquare.ts';

/** Retro pixel-art — scattered chunky pixel-blinks, visible grid, snappy pace. Visual (fonts/radius/border) lives in ./arcade.css. */
export const arcade: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount':       0,
    'gooFilter':       'none',
    'gridDisplay':     'block',
    'particleCounts':  [70, 70, 60, 35, 35],
    'particleRenderer': renderSquare,
    'speedMultiplier': 0.6
  },
  'dataLayout': DataLayoutStrategy.pixel,
  'key':   'arcade',
  'label': 'Arcade'
};
