/**
 * Clamps `v` to the [min, max] range.
 * For the common [0, 1] case prefer {@link import('./Clamp01.ts').clamp01}.
 */
class Clamp {
  readonly 'name' = 'clamp';

  apply(min: number, max: number, v: number): number {
    if (v < min) {return min;}
    if (v > max) {return max;}
    return v;
  }
}

/** Singleton instance registered as the `clamp` math primitive. */
export const clamp = new Clamp();
