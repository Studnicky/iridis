import type { TrajectoryDefinitionInterface } from './interfaces/TrajectoryDefinitionInterface.ts';

import { DUSK_FADE_STOPS } from './constants/DuskFadeStops.ts';

/** Cool sweep from a lit dusk sky down through violet into near-black night. */
export const duskFadeTrajectory: TrajectoryDefinitionInterface = {
  'stops': [...DUSK_FADE_STOPS]
};
