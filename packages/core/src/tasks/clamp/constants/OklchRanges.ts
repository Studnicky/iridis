/** Conservative default OKLCH lightness/chroma envelopes used by {@link import('../ClampOklch.ts').ClampOklch} when a color carries no role hint (or the schema declares no ranges for its role). */
export const OKLCH_RANGES = {
  'DEFAULT_CHROMA_RANGE':   [0.0,  0.40] as readonly [number, number],
  'DEFAULT_LIGHTNESS_RANGE': [0.05, 0.95] as readonly [number, number]
} as const;
