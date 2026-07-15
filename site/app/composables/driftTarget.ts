import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { perpendicular } from '@studnicky/iridis-algebra';

const MAX_DRIFT_DELTA = 0.035;

/** A subtle per-role chroma drift target — never the same point twice in a row, never a wide swing. */
export function driftTarget(from: PaletteInterfaceType, rand: () => number = Math.random): PaletteInterfaceType {
  let to = from;
  for (const role of Object.keys(from)) {
    const delta = (rand() * 2 - 1) * MAX_DRIFT_DELTA;
    to = perpendicular(to, role, delta);
  }
  return to;
}
