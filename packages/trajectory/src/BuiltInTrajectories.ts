import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

const sunriseStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.18, 'h': 30,  'l': 0.55 }, 'background': { 'c': 0.03, 'h': 30,  'l': 0.12 } },
  { 'accent': { 'c': 0.20, 'h': 70,  'l': 0.65 }, 'background': { 'c': 0.04, 'h': 70,  'l': 0.35 } },
  { 'accent': { 'c': 0.16, 'h': 140, 'l': 0.72 }, 'background': { 'c': 0.03, 'h': 140, 'l': 0.65 } },
  { 'accent': { 'c': 0.14, 'h': 200, 'l': 0.78 }, 'background': { 'c': 0.02, 'h': 200, 'l': 0.90 } }
];

const focusPulseStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.15, 'h': 250, 'l': 0.55 } },
  { 'accent': { 'c': 0.28, 'h': 250, 'l': 0.65 } },
  { 'accent': { 'c': 0.16, 'h': 250, 'l': 0.56 } }
];

const duskFadeStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.17, 'h': 260, 'l': 0.60 }, 'background': { 'c': 0.03, 'h': 260, 'l': 0.85 } },
  { 'accent': { 'c': 0.12, 'h': 290, 'l': 0.45 }, 'background': { 'c': 0.02, 'h': 290, 'l': 0.30 } },
  { 'accent': { 'c': 0.08, 'h': 300, 'l': 0.30 }, 'background': { 'c': 0.01, 'h': 300, 'l': 0.08 } }
];

/** Warm-to-cool sweep from deep dawn orange through green to a pale sky-blue morning. */
export const sunriseTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  { 'hueDirection': 'clockwise' },
  'stops': sunriseStops
};

/** A short back-and-forth pulse on the accent role that returns near its starting point. */
export const focusPulseTrajectory: TrajectoryDefinitionInterfaceType = {
  'stops': focusPulseStops
};

/** Cool sweep from a lit dusk sky down through violet into near-black night. */
export const duskFadeTrajectory: TrajectoryDefinitionInterfaceType = {
  'stops': duskFadeStops
};

export const builtInTrajectories: ReadonlyMap<string, TrajectoryDefinitionInterfaceType> = new Map([
  ['dusk-fade',  duskFadeTrajectory],
  ['focus-pulse', focusPulseTrajectory],
  ['sunrise',    sunriseTrajectory]
]);
