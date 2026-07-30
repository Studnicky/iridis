import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

import { DUSK_FADE_STOPS } from './constants/DuskFadeStops.ts';

/** Cool sweep from a lit dusk sky down through violet into near-black night. */
export const duskFadeTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  undefined,
  'stops': [...DUSK_FADE_STOPS]
};
