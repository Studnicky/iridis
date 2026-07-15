import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

const duskFadeStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.17, 'h': 260, 'l': 0.60 }, 'background': { 'c': 0.03, 'h': 260, 'l': 0.85 } },
  { 'accent': { 'c': 0.12, 'h': 290, 'l': 0.45 }, 'background': { 'c': 0.02, 'h': 290, 'l': 0.30 } },
  { 'accent': { 'c': 0.08, 'h': 300, 'l': 0.30 }, 'background': { 'c': 0.01, 'h': 300, 'l': 0.08 } }
];

/** Cool sweep from a lit dusk sky down through violet into near-black night. */
export const duskFadeTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  undefined,
  'stops': duskFadeStops
};
