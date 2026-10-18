import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderStreak } from '../particles/renderStreak.ts';

/** Terminal/CRT hacker — densest starfield of any theme, visible scanline grid, fast cascading pace. Visual (fonts/radius/border) lives in ./hackerman.css. */
export const hackerman: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       4,
    'gooFilter':       'none',
    'gridDisplay':     'block',
    'particleCounts':  [120, 120, 100, 60, 60],
    'particleRenderer': renderStreak,
    'speedMultiplier': 0.45
  },
  'dataLayout': DataLayoutStrategy.table,
  'key':   'hackerman',
  'label': 'Hackerman'
};
