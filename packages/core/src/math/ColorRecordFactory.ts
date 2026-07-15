import { ValidationError } from '@studnicky/errors';

import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  OklchInterfaceType,
  RgbInterfaceType,
  SourceFormatType
} from '../types/index.ts';

import { clamp } from './Clamp.ts';
import { clamp01 } from './Clamp01.ts';
import { gamutMapSrgb } from './GamutMapSrgb.ts';
import { oklchToDisplayP3 } from './OklchToDisplayP3.ts';
import { oklchToRgbRaw } from './OklchToRgbRaw.ts';
import { rgbToHex } from './RgbToHex.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

function rgbToOklchRaw(r: number, g: number, b: number): OklchInterfaceType {
  const { 'b': bl, 'g': gl, 'r': rl } = srgbToLinear.apply(r, g, b);

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
    'c': clamp.apply(0, 0.5, c),
    'h': h % 360,
    'l': clamp01.apply(labL)
  };
}

function hslToRgbRaw(h: number, s: number, l: number): RgbInterfaceType {
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

  return { 'b': clamp01.apply(b + m), 'g': clamp01.apply(g + m), 'r': clamp01.apply(r + m) };
}

/**
 * Factory for canonical {@link ColorRecordInterfaceType} values. Every record
 * leaves this factory with all three encodings (`oklch`, `rgb`, `hex`)
 * populated and consistent: the OKLCH/RGB transforms below round-trip
 * through the Björn Ottosson OKLab matrices, and the hex string is
 * derived from the same RGB triple. Inputs are clamped into the valid
 * encoding ranges (L/C/alpha into [0,1]/[0,0.5]/[0,1]; hue mod 360).
 *
 * Every record is allocated with the SAME field set in the SAME key
 * order (`alpha`, `displayP3`, `hex`, `hints`, `oklch`, `rgb`,
 * `sourceFormat` — alphabetical, enforced by the workspace's
 * perfectionist/sort-objects eslint rule) so V8 collapses all records
 * into a single hidden class. Optional fields default to `undefined`
 * (explicit, not absent) so
 * downstream code can read `record.hints?.role` without forcing a
 * second hidden class to materialise on the spread/append path.
 *
 * Use the singleton `colorRecordFactory` rather than `new`; it has no
 * state and registries assume reference identity.
 */
class ColorRecordFactory {
  /**
   * Builds a record from OKLCH coordinates. `l` is normalised lightness
   * (0..1), `c` is chroma (0..0.5), `h` is hue in degrees (any real
   * number; wrapped into [0, 360)).
   *
   * Wide-gamut handling: when the input OKLCH falls outside the sRGB
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
   * ~1e-8 per channel, below the 4dp precision used by `serializeP3`
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
    l: number,
    c: number,
    h: number,
    opts?: { 'alpha'?: number; 'hints'?: ColorHintsInterfaceType | undefined; 'sourceFormat'?: SourceFormatType; }
  ): ColorRecordInterfaceType {
    const { alpha = 1, hints, sourceFormat = 'oklch' } = opts ?? {};
    const mapped = gamutMapSrgb.apply(l, c, h);
    const rgb    = oklchToRgbRaw.apply(mapped.l, mapped.c, mapped.h);

    let displayP3: { 'b': number; 'g': number; 'r': number; } | undefined;
    if (!mapped.inGamut) {
      const p3 = oklchToDisplayP3.apply(l, c, h);
      displayP3 = {
        'b': clamp01.apply(p3.b),
        'g': clamp01.apply(p3.g),
        'r': clamp01.apply(p3.r)
      };
    } else {
      displayP3 = undefined;
    }

    return {
      'alpha':        clamp01.apply(alpha),
      'displayP3':    displayP3,
      'hex':          rgbToHex.apply(rgb.r, rgb.g, rgb.b),
      'hints':        hints,
      'oklch':        { 'c': clamp.apply(0, 0.5, c), 'h': ((h % 360) + 360) % 360, 'l': clamp01.apply(l) },
      'rgb':          rgb,
      'sourceFormat': sourceFormat
    };
  }

  /**
   * Builds a record from gamma-encoded sRGB components in 0..1. Inputs
   * outside the unit range are clamped, not scaled; pass `r/255` if
   * starting from byte values. The OKLCH coordinates are derived via
   * Björn Ottosson's OKLab transform.
   *
   * `sourceFormat` defaults to `'rgb'` but accepts any
   * {@link SourceFormatType} so intake handlers that compute through
   * RGB (lab, hsl, imagePixel, ...) can tag the record with the format
   * they actually consumed.
   */
  fromRgb(
    r: number,
    g: number,
    b: number,
    opts?: { 'alpha'?: number; 'hints'?: ColorHintsInterfaceType | undefined; 'sourceFormat'?: SourceFormatType; }
  ): ColorRecordInterfaceType {
    const { alpha = 1, hints, sourceFormat = 'rgb' } = opts ?? {};
    const rc    = clamp01.apply(r);
    const gc    = clamp01.apply(g);
    const bc    = clamp01.apply(b);
    const oklch = rgbToOklchRaw(rc, gc, bc);
    return {
      'alpha':        clamp01.apply(alpha),
      'displayP3':    undefined,
      'hex':          rgbToHex.apply(rc, gc, bc),
      'hints':        hints,
      'oklch':        oklch,
      'rgb':          { 'b': bc, 'g': gc, 'r': rc },
      'sourceFormat': sourceFormat
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
   * `IntakeHex`) supply an alpha derived elsewhere, useful when the
   * hex string is the 6-digit canonical form but the original input
   * carried a separate alpha. When `undefined`, the alpha embedded in
   * the hex string (or `1` for 6-digit input) is used.
   */
  fromHex(
    hex: string,
    opts?: { 'alphaOverride'?: number; 'hints'?: ColorHintsInterfaceType | undefined; 'sourceFormat'?: SourceFormatType; }
  ): ColorRecordInterfaceType {
    const { alphaOverride, hints, sourceFormat = 'hex' } = opts ?? {};
    const cleaned = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(cleaned)) {
      throw ValidationError.create({
        'message': 'ColorRecordFactory.fromHex: invalid hex string',
        'path':    'hex',
        'violations': [{
          'details': { 'expectedFormat': '6 or 8 hex digits, with or without leading #', 'received': hex },
          'message': 'value is not a valid hex color string',
          'path':    'hex'
        }]
      });
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;
    const parsedAlpha = cleaned.length === 8
      ? parseInt(cleaned.slice(6, 8), 16) / 255
      : 1;
    const alpha = alphaOverride ?? parsedAlpha;
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      'alpha':        clamp01.apply(alpha),
      'displayP3':    undefined,
      'hex':          `#${cleaned.slice(0, 6).toLowerCase()}`,
      'hints':        hints,
      'oklch':        oklch,
      'rgb':          { 'b': b, 'g': g, 'r': r },
      'sourceFormat': sourceFormat
    };
  }

  /**
   * Builds a record from HSL coordinates. `h` is degrees (wrapped into
   * [0, 360)); `s` and `l` are 0..1. The HSL → RGB conversion uses the
   * standard piecewise formula, then derives OKLCH and hex from the
   * RGB triple. `sourceFormat` defaults to `'hsl'`.
   */
  fromHsl(
    h: number,
    s: number,
    l: number,
    opts?: { 'alpha'?: number; 'hints'?: ColorHintsInterfaceType | undefined; 'sourceFormat'?: SourceFormatType; }
  ): ColorRecordInterfaceType {
    const { alpha = 1, hints, sourceFormat = 'hsl' } = opts ?? {};
    const rgb = hslToRgbRaw(h, s, l);
    return this.fromRgb(rgb.r, rgb.g, rgb.b, { 'alpha': alpha, 'hints': hints, 'sourceFormat': sourceFormat });
  }
}

/**
 * Process-wide singleton instance. Stateless; safe to share across
 * engines and modules. The registry assumes this exact reference.
 */
export const colorRecordFactory = new ColorRecordFactory();
