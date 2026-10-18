import { hueInterpolations } from '@studnicky/iridis-anima';

import type { TrajectoryDefinitionInterface } from './interfaces/TrajectoryDefinitionInterface.ts';

import { SUNRISE_STOPS } from './constants/SunriseStops.ts';

/** Warm-to-cool sweep from deep dawn orange through green to a pale sky-blue morning. */
export const sunriseTrajectory: TrajectoryDefinitionInterface = {
  'options': { 'hueInterpolation': hueInterpolations.clockwise },
  'stops':   [...SUNRISE_STOPS]
};
