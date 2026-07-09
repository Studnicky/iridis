/**
 * Clamps `v` to the [0, 1] range. Branch-free comparison path; faster than
 * the equivalent `Math.max(0, Math.min(1, v))` due to no function-call
 * overhead. Hot path in every record-allocation site and every gamut
 * encoder.
 */
class Clamp01 {
  readonly 'name' = 'clamp01';

  apply(v: number): number {
    if (v < 0) {return 0;}
    if (v > 1) {return 1;}
    return v;
  }
}

/** Singleton instance registered as the `clamp01` math primitive. */
export const clamp01 = new Clamp01();
