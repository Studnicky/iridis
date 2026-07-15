/**
 * Shared OKLCH range/hue geometry used by both {@link import('./resolve/ResolveRoles.ts').ResolveRoles}
 * and {@link import('./expand/ExpandFamily.ts').ExpandFamily} when nudging or deriving a
 * color toward a role's declared constraints.
 */
class RoleGeometry {
  /**
   * Default bound (degrees) for a hue nudge when a role declares a `hue`
   * target but no `hueClamp`. A hue target is always a BOUNDED nudge, never
   * an absolute pin, so an unclamped target rotates the resolved color toward
   * it by at most this many degrees — keeping semantic roles rooted in the
   * actual palette rather than snapping to a hue that appears nowhere in it.
   */
  static readonly DEFAULT_HUE_CLAMP = 90;

  /** Midpoint of a declared `[min, max]` range. */
  static rangeCenter(range: readonly [number, number]): number {
    return (range[0] + range[1]) / 2;
  }

  /** Rotate `src` toward `target` along the shortest arc, by at most `maxDeg` degrees. */
  static hueTowards(src: number, target: number, maxDeg: number): number {
    const delta = ((target - src + 540) % 360) - 180;
    const clamped = Math.max(-maxDeg, Math.min(maxDeg, delta));
    return (((src + clamped) % 360) + 360) % 360;
  }
}

export { RoleGeometry };
