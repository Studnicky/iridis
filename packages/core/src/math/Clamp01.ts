/**
 * Clamps `v` to the [0, 1] range. Branch-free comparison path; faster than
 * the equivalent `Math.max(0, Math.min(1, v))` due to no function-call
 * overhead. Hot path in every record-allocation site and every gamut
 * encoder.
 */
export class Clamp01 {
  readonly 'name' = 'clamp01';

  apply(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
}

/** Singleton instance registered as the `clamp01` math primitive. */
export const clamp01 = new Clamp01();
