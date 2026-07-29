import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

import { SUNRISE_STOPS } from './constants/SunriseStops.ts';

/** Warm-to-cool sweep from deep dawn orange through green to a pale sky-blue morning. */
export const sunriseTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  { 'chromaticDetourRoles': undefined, 'easing': undefined, 'hueDirection': 'clockwise' },
  'stops': [...SUNRISE_STOPS]
};
