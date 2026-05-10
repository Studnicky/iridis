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
