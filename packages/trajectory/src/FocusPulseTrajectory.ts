import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

import { FOCUS_PULSE_STOPS } from './constants/FocusPulseStops.ts';

/** A short back-and-forth pulse on the accent role that returns near its starting point. */
export const focusPulseTrajectory: TrajectoryDefinitionInterfaceType = {
  'opts':  undefined,
  'stops': [...FOCUS_PULSE_STOPS]
};
