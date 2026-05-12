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

export interface ColorRecordInterface {
  readonly oklch:        OklchInterface;
  readonly rgb:          RgbInterface;
  readonly hex:          string;
  readonly alpha:        number;
  readonly sourceFormat: SourceFormatType;
  readonly displayP3?:   RgbInterface;
  readonly hints?:       ColorHintsInterface;
}
