import type { PaletteEntity } from '@studnicky/iridis-algebra';

import { perpendicular } from '@studnicky/iridis-algebra';

const MAXIMUM_DRIFT_DELTA = 0.035;

/** A subtle per-role chroma drift target — never the same point twice in a row, never a wide swing. */
class DriftTargetOperation {
  static run(from: PaletteEntity.Type, rand: () => number = Math.random): PaletteEntity.Type {
    let to = from;
    const roles = Object.keys(from);
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role === undefined) {
        throw new RangeError(`Palette role list is missing entry ${index}`);
      }
      const delta = (rand() * 2 - 1) * MAXIMUM_DRIFT_DELTA;
      to = perpendicular(to, role, delta);
    }
    const result = to;
    return result;
  }
}

export const driftTarget = DriftTargetOperation.run;
