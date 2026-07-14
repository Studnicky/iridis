import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Elegant, romantic invitation — sparse drifting-petal ambient, unhurried pace. Visual (fonts/radius/border) lives in ./romance.css. */
export const romance: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       4,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [30, 30, 30, 15, 15],
    'particleShape':   'heart',
    'speedMultiplier': 2.75
  },
  'key':   'romance',
  'label': 'Romance'
};
