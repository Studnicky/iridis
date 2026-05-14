import type {
  ColorHintsInterface,
  ColorRecordInterface,
  OklchInterface,
  RgbInterface,
  SourceFormatType,
} from '../types/index.ts';
import { clamp } from './Clamp.ts';
import { clamp01 } from './Clamp01.ts';
import { gamutMapSrgb } from './GamutMapSrgb.ts';
import { oklchToDisplayP3 } from './OklchToDisplayP3.ts';
import { oklchToRgbRaw } from './OklchToRgbRaw.ts';
import { rgbToHex } from './RgbToHex.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

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
    'l': clamp01.apply(labL),
    'c': clamp.apply(0, 0.5, c),
    'h': h % 360,
  };
}

function hslToRgbRaw(h: number, s: number, l: number): RgbInterface {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01.apply(s);
  const ll = clamp01.apply(l);

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

  return { 'r': clamp01.apply(r + m), 'g': clamp01.apply(g + m), 'b': clamp01.apply(b + m) };
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
   * number; wrapped into [0, 360)).
   *
   * Wide-gamut handling — when the input OKLCH falls outside the sRGB
   * gamut, the factory:
   *  1. Computes a sRGB-safe value via {@link import('./GamutMapSrgb.ts').GamutMapSrgb}
   *     (chroma-reduction along constant L+H per CSS Color 4 §13.2.2).
   *     The returned record's `rgb` and `hex` fields store this
   *     gamut-mapped value so any sRGB-only consumer is safe.
   *  2. Populates `displayP3` from the ORIGINAL (l, c, h) via
   *     {@link import('./OklchToDisplayP3.ts').OklchToDisplayP3}. P3
   *     channels are clipped to `[0, 1]` here for the rare case where
   *     even P3 does not cover the input.
   *  3. Records the ORIGINAL (l, c, h) on the `oklch` slot subject to
   *     bounds: `l` clamped to `[0, 1]`, `c` clamped to `[0, 0.5]`, `h`
   *     wrapped to `[0, 360)`. The 0.5 chroma ceiling covers the
   *     human-visible gamut with room to spare; values beyond it
   *     are pathological and get bounded silently.
   *
   * When the input is already in sRGB, `displayP3` is `undefined` and
   * `rgb` is the direct (unclamped → clamped) conversion.
   *
   * Round-trip note: when a record allocated by another factory method
   * (e.g. `intake:p3` populating `displayP3` verbatim from a P3 input)
   * is later passed BACK through `fromOklch` (e.g. by `ResolveRoles`
   * when copying `role.intent` onto the hints), the `displayP3` slot is
   * re-derived from the OKLCH chain rather than preserved. Drift is
   * ~1e-8 per channel — below the 4dp precision used by `serializeP3`
   * and invisible to consumers. If verbatim preservation matters,
   * consumers must hold the original record reference rather than
   * reallocating.
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
    const mapped = gamutMapSrgb.apply(l, c, h);
    const rgb    = oklchToRgbRaw.apply(mapped.l, mapped.c, mapped.h);

    let displayP3: { 'r': number; 'g': number; 'b': number } | undefined;
    if (!mapped.inGamut) {
      const p3 = oklchToDisplayP3.apply(l, c, h);
      displayP3 = {
        'r': clamp01.apply(p3.r),
        'g': clamp01.apply(p3.g),
        'b': clamp01.apply(p3.b),
      };
    } else {
      displayP3 = undefined;
    }

    return {
      'oklch':        { 'l': clamp01.apply(l), 'c': clamp.apply(0, 0.5, c), 'h': ((h % 360) + 360) % 360 },
      'rgb':          rgb,
      'hex':          rgbToHex.apply(rgb.r, rgb.g, rgb.b),
      'alpha':        clamp01.apply(alpha),
      'sourceFormat': sourceFormat,
      'displayP3':    displayP3,
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
      'rgb':          { 'r': clamp01.apply(r), 'g': clamp01.apply(g), 'b': clamp01.apply(b) },
      'hex':          rgbToHex.apply(r, g, b),
      'alpha':        clamp01.apply(alpha),
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
      'alpha':        clamp01.apply(alpha),
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
