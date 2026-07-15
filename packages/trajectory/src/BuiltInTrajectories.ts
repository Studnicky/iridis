import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

import { duskFadeTrajectory } from './DuskFadeTrajectory.ts';
import { focusPulseTrajectory } from './FocusPulseTrajectory.ts';
import { sunriseTrajectory } from './SunriseTrajectory.ts';

/** Name→definition lookup for the curated built-in trajectory set. */
export const builtInTrajectories: ReadonlyMap<string, TrajectoryDefinitionInterfaceType> = new Map([
  ['dusk-fade',  duskFadeTrajectory],
  ['focus-pulse', focusPulseTrajectory],
  ['sunrise',    sunriseTrajectory]
]);
