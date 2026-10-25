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
    const result = (range[0] + range[1]) / 2;
    return result;
  }

  /** Uses target range centers for an operation without source-relative L/C controls. */
  static targetEnvelope(
    lightness: number,
    chroma: number,
    options: Readonly<{
      'chromaRange': readonly [number, number] | undefined;
      'lightnessRange': readonly [number, number] | undefined;
    }>
  ): { readonly 'chroma': number; readonly 'lightness': number } {
    const targetLightness = options.lightnessRange === undefined
      ? lightness
      : RoleGeometry.rangeCenter(options.lightnessRange);
    const targetChroma = options.chromaRange === undefined
      ? chroma
      : RoleGeometry.rangeCenter(options.chromaRange);
    return { 'chroma': targetChroma, 'lightness': targetLightness };
  }

  /** Clamps source-relative coordinates inside the target role's declared envelope. */
  static clampToTargetEnvelope(
    lightness: number,
    chroma: number,
    options: Readonly<{
      'chromaRange': readonly [number, number] | undefined;
      'lightnessRange': readonly [number, number] | undefined;
    }>
  ): { readonly 'chroma': number; readonly 'lightness': number } {
    const targetLightness = options.lightnessRange === undefined
      ? lightness
      : Math.max(options.lightnessRange[0], Math.min(options.lightnessRange[1], lightness));
    const targetChroma = options.chromaRange === undefined
      ? chroma
      : Math.max(options.chromaRange[0], Math.min(options.chromaRange[1], chroma));
    return { 'chroma': targetChroma, 'lightness': targetLightness };
  }

  /** Rotate `source` toward `target` along the shortest arc, by at most `maximumDegrees` degrees. */
  static hueTowards(source: number, target: number, maximumDegrees: number): number {
    const delta = ((target - source + 540) % 360) - 180;
    const clamped = Math.max(-maximumDegrees, Math.min(maximumDegrees, delta));
    const result = (((source + clamped) % 360) + 360) % 360;
    return result;
  }
}

export { RoleGeometry };
