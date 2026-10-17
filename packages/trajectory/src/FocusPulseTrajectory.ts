import type { TrajectoryDefinitionInterface } from './interfaces/TrajectoryDefinitionInterface.ts';

import { FOCUS_PULSE_STOPS } from './constants/FocusPulseStops.ts';

/** A short back-and-forth pulse on the accent role that returns near its starting point. */
export const focusPulseTrajectory: TrajectoryDefinitionInterface = {
  'stops': [...FOCUS_PULSE_STOPS]
};
