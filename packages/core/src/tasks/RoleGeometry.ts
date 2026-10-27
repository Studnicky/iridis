class RelationshipCoordinateMode {
  static readonly clamp = new RelationshipCoordinateMode();

  static readonly midpoint = new RelationshipCoordinateMode();

  private constructor() {}
}

/** Shared OKLCH range/hue geometry used by resolution and relationship derivation. */
class RoleGeometry {
  static readonly clampMode = RelationshipCoordinateMode.clamp;

  static readonly midpointMode = RelationshipCoordinateMode.midpoint;

  /**
   * Default bound for a hue-target relationship whose clamp is omitted.
   */
  static readonly DEFAULT_HUE_CLAMP = 90;

  /** Selects the target-envelope mode shared by relationship resolution and feasibility. */
  static coordinateMode(relationship: Readonly<{
    'chromaScale'?: number;
    'lightnessOffset'?: number;
    'operation': string;
  }>): RelationshipCoordinateMode {
    const explicit = relationship.operation === 'alpha-overlay'
      || relationship.operation === 'oklch-interpolate'
      || (relationship.operation === 'oklch-delta' && (
        relationship.chromaScale !== undefined || relationship.lightnessOffset !== undefined
      ));
    const result = explicit ? RoleGeometry.clampMode : RoleGeometry.midpointMode;
    return result;
  }

  /** Midpoint of a declared `[min, max]` range. */
  static rangeCenter(range: readonly [number, number]): number {
    const result = (range[0] + range[1]) / 2;
    return result;
  }

  /** Clamps a coordinate into its declared inclusive range. */
  static clampRange(value: number, range: readonly [number, number]): number {
    const result = Math.max(range[0], Math.min(range[1], value));
    return result;
  }

  /** Identifies hue targets that preserve their target role as the relationship source. */
  static ownsTarget(relationship: Readonly<{ 'operation': string; 'source'?: string; 'target': string; }>): boolean {
    const result = relationship.operation === 'hue-target' && (
      relationship.source === undefined || relationship.source === relationship.target
    );
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
    modes: Readonly<{
      'chroma': RelationshipCoordinateMode;
      'lightness': RelationshipCoordinateMode;
    }>
  ): { readonly 'chroma': number; readonly 'lightness': number } {
    const targetLightness = RoleGeometry.relationshipCoordinate(
      lightness,
      options.lightnessRange,
      modes.lightness
    );
    const targetChroma = RoleGeometry.relationshipCoordinate(
      chroma,
      options.chromaRange,
      modes.chroma
    );
    const result = { 'chroma': targetChroma, 'lightness': targetLightness };
    return result;
  }

  private static relationshipCoordinate(
    value: number,
    range: readonly [number, number] | undefined,
    mode: RelationshipCoordinateMode
  ): number {
    if (range === undefined) {
      return value;
    }
    if (mode === RelationshipCoordinateMode.clamp) {
      const result = RoleGeometry.clampRange(value, range);
      return result;
    }
    const result = RoleGeometry.rangeCenter(range);
    return result;
  }

  /** Measures the shortest angular difference between two hue degrees. */
  static hueDifference(left: number, right: number): number {
    const result = Math.abs(((left - right + 540) % 360) - 180);
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
