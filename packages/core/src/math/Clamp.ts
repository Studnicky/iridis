/**
 * Clamps `v` to the [min, max] range.
 * For the common [0, 1] case prefer {@link import('./Clamp01.ts').clamp01}.
 */
class Clamp {
  readonly 'name' = 'clamp';

  apply(minimum: number, maximum: number, v: number): number {
    if (v < minimum) {return minimum;}
    if (v > maximum) {return maximum;}
    return v;
  }
}

/** Singleton instance registered as the `clamp` math primitive. */
export const clamp = new Clamp();
