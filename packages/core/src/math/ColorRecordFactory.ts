import type {
  ColorHintsInterface,
  ColorRecordInterface,
  OklchInterface,
  RgbInterface,
  SourceFormatType,
} from '../types/index.ts';
import { clamp, clamp01 } from './Clamp.ts';
import { linearToSrgb } from './LinearToSrgb.ts';
import { rgbToHex } from './RgbToHex.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

/**
 * Raw OKLCH → sRGB conversion without `ColorRecord` allocation. Returns
 * a plain `RgbInterface` so hot inner loops (e.g. `EnsureContrast`) can
 * iterate on a scalar L value without materialising a full record per
 * step. The transform matches `ColorRecordFactory.fromOklch` bit-for-bit;
 * inputs are not clamped (callers operating on a scalar L are expected
 * to clamp themselves).
 */
export function oklchToRgbRaw(l: number, c: number, h: number): RgbInterface {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548  * b;

  x = x * x * x;
  y = y * y * y;
  z = z * z * z;

  const rLin = +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
  const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
  const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z;

  const encoded = linearToSrgb.apply(rLin, gLin, bLin);

  return {
    'r': clamp01(encoded.r),
    'g': clamp01(encoded.g),
    'b': clamp01(encoded.b),
  };
}

function rgbToOklchRaw(r: number, g: number, b: number): OklchInterface {
  const { r: rl, g: gl, b: bl } = srgbToLinear.apply(r, g, b);

  let x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  let y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  let z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  x = Math.cbrt(x);
  y = Math.cbrt(y);
  z = Math.cbrt(z);

  const labL = 0.2104542553 * x + 0.7936177850 * y - 0.0040720468 * z;
  const labA = 1.9779984951 * x - 2.4285922050 * y + 0.4505937099 * z;
  const labB = 0.0259040371 * x + 0.7827717662 * y - 0.8086757660 * z;

  const c = Math.sqrt(labA * labA + labB * labB);
  let h = (Math.atan2(labB, labA) * 180) / Math.PI;
  if (h < 0) {
    h += 360;
  }

  return {
    'l': clamp01(labL),
    'c': clamp(0, 0.5, c),
    'h': h % 360,
  };
}

function hslToRgbRaw(h: number, s: number, l: number): RgbInterface {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) {
    r = c; g = x; b = 0;
  } else if (hh < 120) {
    r = x; g = c; b = 0;
  } else if (hh < 180) {
    r = 0; g = c; b = x;
  } else if (hh < 240) {
    r = 0; g = x; b = c;
  } else if (hh < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return { 'r': clamp01(r + m), 'g': clamp01(g + m), 'b': clamp01(b + m) };
}

/**
 * Factory for canonical {@link ColorRecordInterface} values. Every record
 * leaves this factory with all three encodings (`oklch`, `rgb`, `hex`)
 * populated and consistent: the OKLCH/RGB transforms below round-trip
 * through the Björn Ottosson OKLab matrices, and the hex string is
 * derived from the same RGB triple. Inputs are clamped into the valid
 * encoding ranges (L/C/alpha into [0,1]/[0,0.5]/[0,1]; hue mod 360).
 *
 * Every record is allocated with the SAME field set in the SAME key
 * order — `oklch`, `rgb`, `hex`, `alpha`, `sourceFormat`, `displayP3`,
 * `hints` — so V8 collapses all records into a single hidden class.
 * Optional fields default to `undefined` (explicit, not absent) so
 * downstream code can read `record.hints?.role` without forcing a
 * second hidden class to materialise on the spread/append path.
 *
 * Use the singleton `colorRecordFactory` rather than `new` — it has no
 * state and registries assume reference identity.
 */
export class ColorRecordFactory {
  /**
   * Builds a record from OKLCH coordinates. `l` is normalised lightness
   * (0..1), `c` is chroma (0..0.5), `h` is hue in degrees (any real
   * number; wrapped into [0, 360)). The resulting RGB is gamma-encoded
   * sRGB clamped to gamut — out-of-gamut inputs are silently clipped
   * rather than gamut-mapped.
   *
   * `sourceFormat` defaults to `'oklch'` but accepts any
   * {@link SourceFormatType} so callers that transcoded into OKLCH from
   * another representation can preserve the origin tag without a
   * post-call spread.
   */
  fromOklch(
    l:            number,
    c:            number,
    h:            number,
    alpha:        number             = 1,
    sourceFormat: SourceFormatType   = 'oklch',
    hints:        ColorHintsInterface | undefined = undefined,
  ): ColorRecordInterface {
    const rgb = oklchToRgbRaw(l, c, h);
    return {
      'oklch':        { 'l': clamp01(l), 'c': clamp(0, 0.5, c), 'h': ((h % 360) + 360) % 360 },
      'rgb':          rgb,
      'hex':          rgbToHex.apply(rgb.r, rgb.g, rgb.b),
      'alpha':        clamp01(alpha),
      'sourceFormat': sourceFormat,
      'displayP3':    undefined,
      'hints':        hints,
    };
  }

  /**
   * Builds a record from gamma-encoded sRGB components in 0..1. Inputs
   * outside the unit range are clamped, not scaled — pass `r/255` if
   * starting from byte values. The OKLCH coordinates are derived via
   * Björn Ottosson's OKLab transform.
   *
   * `sourceFormat` defaults to `'rgb'` but accepts any
   * {@link SourceFormatType} so intake handlers that compute through
   * RGB (lab, hsl, imagePixel, ...) can tag the record with the format
   * they actually consumed.
   */
  fromRgb(
    r:            number,
    g:            number,
    b:            number,
    alpha:        number             = 1,
    sourceFormat: SourceFormatType   = 'rgb',
    hints:        ColorHintsInterface | undefined = undefined,
  ): ColorRecordInterface {
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      'oklch':        oklch,
      'rgb':          { 'r': clamp01(r), 'g': clamp01(g), 'b': clamp01(b) },
      'hex':          rgbToHex.apply(r, g, b),
      'alpha':        clamp01(alpha),
      'sourceFormat': sourceFormat,
      'displayP3':    undefined,
      'hints':        hints,
    };
  }

  /**
   * Parses `#rrggbb` or `#rrggbbaa` (case-insensitive, leading `#`
   * optional). Throws on any other length or non-hex characters. The
   * returned record's `hex` field is always the canonical 6-digit form;
   * any 8-digit alpha is split off into the `alpha` field so downstream
   * code never has to deal with two encodings.
   *
   * The optional `alphaOverride` argument lets callers (notably
   * `IntakeHex`) supply an alpha derived elsewhere — useful when the
   * hex string is the 6-digit canonical form but the original input
   * carried a separate alpha. When `undefined`, the alpha embedded in
   * the hex string (or `1` for 6-digit input) is used.
   */
  fromHex(
    hex:           string,
    alphaOverride: number | undefined = undefined,
    sourceFormat:  SourceFormatType   = 'hex',
    hints:         ColorHintsInterface | undefined = undefined,
  ): ColorRecordInterface {
    const cleaned = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(cleaned)) {
      throw new Error(`ColorRecordFactory.fromHex: invalid hex '${hex}'`);
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;
    const parsedAlpha = cleaned.length === 8
      ? parseInt(cleaned.slice(6, 8), 16) / 255
      : 1;
    const alpha = alphaOverride !== undefined ? alphaOverride : parsedAlpha;
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      'oklch':        oklch,
      'rgb':          { 'r': r, 'g': g, 'b': b },
      'hex':          `#${cleaned.slice(0, 6).toLowerCase()}`,
      'alpha':        clamp01(alpha),
      'sourceFormat': sourceFormat,
      'displayP3':    undefined,
      'hints':        hints,
    };
  }

  /**
   * Builds a record from HSL coordinates. `h` is degrees (wrapped into
   * [0, 360)); `s` and `l` are 0..1. The HSL → RGB conversion uses the
   * standard piecewise formula, then derives OKLCH and hex from the
   * RGB triple. `sourceFormat` defaults to `'hsl'`.
   */
  fromHsl(
    h:            number,
    s:            number,
    l:            number,
    alpha:        number             = 1,
    sourceFormat: SourceFormatType   = 'hsl',
    hints:        ColorHintsInterface | undefined = undefined,
  ): ColorRecordInterface {
    const rgb = hslToRgbRaw(h, s, l);
    return this.fromRgb(rgb.r, rgb.g, rgb.b, alpha, sourceFormat, hints);
  }
}

/**
 * Process-wide singleton instance. Stateless; safe to share across
 * engines and modules. The registry assumes this exact reference.
 */
export const colorRecordFactory = new ColorRecordFactory();
