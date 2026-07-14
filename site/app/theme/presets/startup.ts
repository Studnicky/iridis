import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Energetic tech/SaaS — rising bubble energy, no grid, brisk pace. The lava-lamp goo wash is Futuristic's own signature effect now; the bubbles alone carry Startup's "rising energy" vibe. Visual (fonts/radius/border) lives in ./startup.css. */
export const startup: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [80, 80, 70, 40, 40],
    'particleShape':   'bubble',
    'speedMultiplier': 0.7
  },
  'dataLayout': 'grid',
  'key':   'startup',
  'label': 'Startup'
};
