import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

const sunriseStops: PaletteInterfaceType[] = [
  { 'accent': { 'c': 0.18, 'h': 30,  'l': 0.55 }, 'background': { 'c': 0.03, 'h': 30,  'l': 0.12 } },
  { 'accent': { 'c': 0.20, 'h': 70,  'l': 0.65 }, 'background': { 'c': 0.04, 'h': 70,  'l': 0.35 } },
  { 'accent': { 'c': 0.16, 'h': 140, 'l': 0.72 }, 'background': { 'c': 0.03, 'h': 140, 'l': 0.65 } },
  { 'accent': { 'c': 0.14, 'h': 200, 'l': 0.78 }, 'background': { 'c': 0.02, 'h': 200, 'l': 0.90 } }
];

/** Warm-to-cool sweep from deep dawn orange through green to a pale sky-blue morning. */
export const sunriseTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  { 'hueDirection': 'clockwise' },
  'stops': sunriseStops
};
