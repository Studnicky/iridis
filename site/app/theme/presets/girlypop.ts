import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Soft, bubbly, playful — no grid, bouncy pace, heart-shaped ambient particles. The lava-lamp goo wash is Futuristic's own signature effect now; the rising hearts alone carry Girlypop's bubbly vibe. Visual (fonts/radius/border) lives in ./girlypop.css. */
export const girlypop: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [70, 70, 60, 35, 35],
    'particleShape':   'heart',
    'speedMultiplier': 0.8
  },
  'dataLayout': 'pixel',
  'key':   'girlypop',
  'label': 'Girlypop'
};
