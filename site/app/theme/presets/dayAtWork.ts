import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/**
 * Workday/spreadsheet default. An office backdrop keeps only the subtle
 * grid-pan texture (a calm static pattern, not motion) — no twinkling
 * starfield/particles at all; a spreadsheet doesn't have flashing dots
 * drifting across it. Visual (fonts/radius/border) lives in ./dayAtWork.css.
 */
export const dayAtWork: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     true,
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleShape':   'dot',
    'speedMultiplier': 1.8
  },
  'dataLayout': 'table',
  'key':   'day-at-work',
  'label': 'Day-at-Work'
};
