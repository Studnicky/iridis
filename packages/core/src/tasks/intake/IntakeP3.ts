import type {
  ColorHintsInterface,
  ColorRecordInterface,
  OklchInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RgbInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { gamutMapSrgb } from '../../math/GamutMapSrgb.ts';
import { linearToSrgb } from '../../math/LinearToSrgb.ts';
import { rgbToHex } from '../../math/RgbToHex.ts';

/**
 * Matches CSS Color 4 `color(display-p3 r g b)` and
 * `color(display-p3 r g b / alpha)` syntax. Channel values are 0..1
 * floats. Alpha is optional. Whitespace tolerant.
 *
 * Captures: `[1] r`, `[2] g`, `[3] b`, `[4] alpha?` (the slash-prefixed group).
 */
const P3_PATTERN = /^color\(\s*display-p3\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)(?:\s*\/\s*(-?\d*\.?\d+))?\s*\)$/i;

/**
 * Intake task that parses CSS Color 4 `color(display-p3 r g b [/alpha])`
 * strings into {@link ColorRecordInterface} entries with `displayP3`
 * populated directly from the input and `rgb` gamut-mapped down to sRGB
 * so sRGB-only consumers stay safe.
 *
 * Conversion chain (CSS Color 4 §17.6 sample code):
 *   1. Parse the string (P3 channels in `[0, 1]`).
 *   2. Display-P3 gamma → linear Display-P3 (inverse sRGB-style gamma).
 *   3. Linear Display-P3 → linear sRGB via the matrix inverse of the
 *      `linearSrgb → linearP3` chain used in
 *      {@link import('../../math/OklchToDisplayP3.ts').OklchToDisplayP3}.
 *   4. Linear sRGB → OKLab (Björn Ottosson matrices) → OKLCH.
 *   5. If any linear-sRGB channel is outside `[0, 1]`, gamut-map the
 *      derived OKLCH back into sRGB (chroma-reduction along L+H).
 *
 * The resulting record stores:
 *   - `displayP3` — the input (r, g, b), preserved verbatim (clamped to [0,1]).
 *   - `rgb`/`hex` — the gamut-mapped sRGB representation.
 *   - `oklch`     — derived from the original wide-gamut point.
 *   - `sourceFormat: 'displayP3'`.
 */
export class IntakeP3 implements TaskInterface {
  readonly 'name' = 'intake:p3';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:p3',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses CSS color(display-p3 r g b [/ alpha]) strings into ColorRecord entries with displayP3 populated.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (typeof raw !== 'string') {
        continue;
      }
      const match = P3_PATTERN.exec(raw.trim());
      if (!match) {
        continue;
      }

      const p3R   = parseFloat(match[1]!);
      const p3G   = parseFloat(match[2]!);
      const p3B   = parseFloat(match[3]!);
      const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

      const record = recordFromP3(p3R, p3G, p3B, alpha, undefined);
      state.colors.push(record);
      ctx.logger.debug('IntakeP3', 'run', 'Parsed display-p3 value', {
        'raw': raw,
        'hex': record.hex,
      });
    }
  }
}

/** Singleton instance registered as the `intake:p3` pipeline task. */
export const intakeP3 = new IntakeP3();

/**
 * Internal: build a record from raw P3 channel floats. Extracted from
 * the task so future intake variants (e.g. an object literal form
 * `{ p3: [r, g, b] }`) can reuse the conversion path without
 * re-implementing the matrix chain.
 */
function recordFromP3(
  p3R:   number,
  p3G:   number,
  p3B:   number,
  alpha: number,
  hints: ColorHintsInterface | undefined,
): ColorRecordInterface {
  // 1. Display-P3 gamma → linear Display-P3 (sign-preserving for
  //    out-of-range floats; spec guarantees inputs in [0, 1] but be
  //    robust to slightly-out-of-range floats).
  const lp3R = decodeP3(p3R);
  const lp3G = decodeP3(p3G);
  const lp3B = decodeP3(p3B);

  // 2. Linear Display-P3 → linear sRGB. Matrix is the inverse of the
  //    composed `linearSrgb → XYZ-D65 → linearP3` chain. Source: CSS
  //    Color 4 §17.6 sample code.
  const lsR =  1.2249401  * lp3R - 0.2249404  * lp3G + 0.0000000  * lp3B;
  const lsG = -0.0420569  * lp3R + 1.0420571  * lp3G - 0.0000001  * lp3B;
  const lsB = -0.0196376  * lp3R - 0.0786361  * lp3G + 1.0982735  * lp3B;

  // 3. Linear sRGB → OKLab → OKLCH (Björn Ottosson). Computed BEFORE
  //    gamma-encoding sRGB so the precision survives super-saturated
  //    inputs.
  const oklch = linearSrgbToOklch(lsR, lsG, lsB);

  // 4. Determine whether the linear sRGB is in-gamut. If yes — emit
  //    directly. If no — gamut-map the OKLCH back into sRGB and use
  //    that for the sRGB-safe `rgb`/`hex`.
  const inSrgb =
    lsR >= 0 && lsR <= 1 &&
    lsG >= 0 && lsG <= 1 &&
    lsB >= 0 && lsB <= 1;

  let safeRgb: RgbInterface;
  if (inSrgb) {
    const encoded = linearToSrgb.apply(lsR, lsG, lsB);
    safeRgb = {
      'r': clamp01.apply(encoded.r),
      'g': clamp01.apply(encoded.g),
      'b': clamp01.apply(encoded.b),
    };
  } else {
    const mapped     = gamutMapSrgb.apply(oklch.l, oklch.c, oklch.h);
    const mappedLin  = oklchToLinearSrgb(mapped.l, mapped.c, mapped.h);
    const mappedSrgb = linearToSrgb.apply(mappedLin.r, mappedLin.g, mappedLin.b);
    safeRgb = {
      'r': clamp01.apply(mappedSrgb.r),
      'g': clamp01.apply(mappedSrgb.g),
      'b': clamp01.apply(mappedSrgb.b),
    };
  }

  return {
    'oklch':        oklch,
    'rgb':          safeRgb,
    'hex':          rgbToHex.apply(safeRgb.r, safeRgb.g, safeRgb.b),
    'alpha':        clamp01.apply(alpha),
    'sourceFormat': 'displayP3',
    'displayP3':    {
      'r': clamp01.apply(p3R),
      'g': clamp01.apply(p3G),
      'b': clamp01.apply(p3B),
    },
    'hints':        hints,
  };
}

/** Display-P3 inverse gamma (same curve as sRGB; sign-preserving). */
function decodeP3(v: number): number {
  const sign = v < 0 ? -1 : 1;
  const abs  = Math.abs(v);
  if (abs <= 0.04045) {
    return sign * (abs / 12.92);
  }
  return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
}

/**
 * Linear sRGB → OKLCH. Splits {@link import('../../math/ColorRecordFactory.ts')}
 * `rgbToOklchRaw` so we can skip the gamma-decode step (input is already
 * linear) and avoid clamping for out-of-gamut inputs. Same Björn
 * Ottosson matrices.
 */
function linearSrgbToOklch(rl: number, gl: number, bl: number): OklchInterface {
  let x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  let y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  let z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  // Sign-preserving cube root so negative LMS values from out-of-gamut
  // inputs still produce a sane OKLab triple.
  x = signCbrt(x);
  y = signCbrt(y);
  z = signCbrt(z);

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

function signCbrt(v: number): number {
  if (v < 0) return -Math.cbrt(-v);
  return Math.cbrt(v);
}

/** OKLCH → linear sRGB (Björn Ottosson). Local helper; mirrors the
 *  matrix used in OklchToRgbRaw/OklchToDisplayP3. */
function oklchToLinearSrgb(l: number, c: number, h: number): RgbInterface {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548  * b;

  x = x * x * x;
  y = y * y * y;
  z = z * z * z;

  return {
    'r': +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    'g': -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    'b': -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z,
  };
}
