import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Terminal/CRT hacker — densest starfield of any theme, visible scanline grid, fast cascading pace. Visual (fonts/radius/border) lives in ./hackerman.css. */
export const hackerman: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       4,
    'gooEnabled':      false,
    'gridEnabled':     true,
    'particleCounts':  [300, 300, 300, 150, 150],
    'particleShape':   'streak',
    'speedMultiplier': 0.45
  },
  'key':   'hackerman',
  'label': 'Hackerman'
};
