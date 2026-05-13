/**
 * Clamps `v` to the [0, 1] range. Branch-free comparison path; faster than
 * the equivalent `Math.max(0, Math.min(1, v))` due to no function-call overhead.
 */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Clamps `v` to the [min, max] range.
 * For the common [0, 1] case prefer {@link clamp01}.
 */
export function clamp(min: number, max: number, v: number): number {
  return v < min ? min : v > max ? max : v;
}
