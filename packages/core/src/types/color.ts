export type ColorIntentType =
  | 'base'
  | 'accent'
  | 'muted'
  | 'critical'
  | 'positive'
  | 'neutral'
  | 'surface'
  | 'text';

export type SourceFormatType =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'oklch'
  | 'lab'
  | 'named'
  | 'imagePixel';

export type ColorSpaceType = 'srgb' | 'displayP3';

export interface OklchInterface {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export interface RgbInterface {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** HSL conversion result. Hue 0-360, saturation/lightness 0-1, alpha 0-1.
 *  Distinct from RgbInterface so callers can keep the channel semantics
 *  in their type system instead of overloading triple-number tuples. */
export interface HslResultInterface {
  readonly h:     number;
  readonly s:     number;
  readonly l:     number;
  readonly alpha: number;
}

export interface ColorHintsInterface {
  readonly role?:   string;
  readonly intent?: ColorIntentType;
  readonly weight?: number;
}

/**
 * Canonical color record. Every record allocated anywhere in iridis
 * MUST have the same field set in the same key order so V8 collapses
 * them into a single hidden class. The optional fields use
 * `T | undefined` rather than `T?` so callers must spell out
 * `displayP3: undefined` / `hints: undefined` instead of omitting
 * the slot — explicit-undefined keeps the shape monomorphic where
 * key-absence would create a second hidden class.
 *
 * Key order is: `oklch`, `rgb`, `hex`, `alpha`, `sourceFormat`,
 * `displayP3`, `hints`. `ColorRecordFactory` is the only sanctioned
 * allocation point; downstream code MUST NOT use `{...record, x}`
 * spread-append patterns to add or override fields because spread
 * reorders keys and breaks the hidden class.
 */
export interface ColorRecordInterface {
  readonly oklch:        OklchInterface;
  readonly rgb:          RgbInterface;
  readonly hex:          string;
  readonly alpha:        number;
  readonly sourceFormat: SourceFormatType;
  readonly displayP3:    RgbInterface | undefined;
  readonly hints:        ColorHintsInterface | undefined;
}
