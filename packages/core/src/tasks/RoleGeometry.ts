/** Shared OKLCH range/hue geometry used by resolution and relationship derivation. */
class RoleGeometry {
  /**
   * Default bound for a hue-target relationship whose clamp is omitted.
   */
  static readonly DEFAULT_HUE_CLAMP = 90;

  /** Midpoint of a declared `[min, max]` range. */
  static rangeCenter(range: readonly [number, number]): number {
    const result = (range[0] + range[1]) / 2;
    return result;
  }

  /** Resolves operation coordinates inside the target envelope. */
  static relationshipCoordinates(
    lightness: number,
    chroma: number,
    options: Readonly<{
      'chromaRange': readonly [number, number] | undefined;
      'lightnessRange': readonly [number, number] | undefined;
    }>,
    resolveChroma: (value: number, range: readonly [number, number] | undefined) => number,
    resolveLightness: (value: number, range: readonly [number, number] | undefined) => number
  ): { readonly 'chroma': number; readonly 'lightness': number } {
    const targetLightness = resolveLightness(lightness, options.lightnessRange);
    const targetChroma = resolveChroma(chroma, options.chromaRange);
    const result = { 'chroma': targetChroma, 'lightness': targetLightness };
    return result;
  }

  static clampRelationshipCoordinate(
    value: number,
    range: readonly [number, number] | undefined
  ): number {
    if (range === undefined) {
      const result = value;
      return result;
    }
    const result = Math.max(range[0], Math.min(range[1], value));
    return result;
  }

  static preserveRelationshipCoordinate(
    value: number,
    range: readonly [number, number] | undefined
  ): number {
    if (range === undefined) {
      const result = value;
      return result;
    }
    const result = RoleGeometry.rangeCenter(range);
    return result;
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
