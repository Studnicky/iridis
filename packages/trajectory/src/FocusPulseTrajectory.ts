import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

const focusPulseStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.15, 'h': 250, 'l': 0.55 } },
  { 'accent': { 'c': 0.28, 'h': 250, 'l': 0.65 } },
  { 'accent': { 'c': 0.16, 'h': 250, 'l': 0.56 } }
];

/** A short back-and-forth pulse on the accent role that returns near its starting point. */
export const focusPulseTrajectory: TrajectoryDefinitionInterfaceType = {
  'stops': focusPulseStops
};
