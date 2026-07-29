import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { perpendicular } from '@studnicky/iridis-algebra';

const MAXIMUM_DRIFT_DELTA = 0.035;

/** A subtle per-role chroma drift target — never the same point twice in a row, never a wide swing. */
class DriftTargetOperation {
  static run(from: PaletteInterfaceType, rand: () => number = Math.random): PaletteInterfaceType {
    let to = from;
    for (const role of Object.keys(from)) {
      const delta = (rand() * 2 - 1) * MAXIMUM_DRIFT_DELTA;
      to = perpendicular(to, role, delta);
    }
    return to;
  }
}

export const driftTarget = DriftTargetOperation.run;
