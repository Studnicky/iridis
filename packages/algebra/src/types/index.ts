export type OklchInterfaceType = {
  'c': number;
  'h': number;
  'l': number;
};

/** A palette is a point in OKLCH×N space: role name → OKLCH triple. */
export type PaletteInterfaceType = Record<string, OklchInterfaceType>;

export type HueDirectionType = 'clockwise' | 'counterClockwise' | 'shortestArc';

export type LerpOptionsInterfaceType = {
  'hueDirection'?: HueDirectionType;
};

export type PaletteDistanceMetricType = (
  a: PaletteInterfaceType,
  b: PaletteInterfaceType
) => number;
