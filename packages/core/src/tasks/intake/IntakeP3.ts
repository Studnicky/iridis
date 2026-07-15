import { ValidationError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  OklchInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RgbInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
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
 * strings into {@link ColorRecordInterfaceType} entries with `displayP3`
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
 *   - `displayP3`: the input (r, g, b), preserved verbatim (clamped to [0,1]).
 *   - `rgb`/`hex`: the gamut-mapped sRGB representation.
 *   - `oklch`:     derived from the original wide-gamut point.
 *   - `sourceFormat: 'displayP3'`.
 */
class IntakeP3 implements TaskInterface {
  readonly 'name' = 'intake:p3';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Parses CSS color(display-p3 r g b [/ alpha]) strings into ColorRecord entries with displayP3 populated.',
    'name':        'intake:p3',
    'phase':       undefined,
    'reads':       ['input.colors'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  /**
   * Parses a single value as a CSS `color(display-p3 …)` string. Throws when
   * the input is not a string or does not match the Display-P3 pattern.
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw: unknown): ColorRecordInterfaceType {
    if (typeof raw !== 'string') {
      throw ValidationError.create({
        'message': 'intake:p3 — expected a string input',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedType': 'string', 'receivedType': typeof raw },
          'message': 'input is not a string',
          'path':    'raw'
        }]
      });
    }
    const match = P3_PATTERN.exec(raw.trim());
    if (match === null) {
      throw ValidationError.create({
        'message': 'intake:p3 — not a display-p3 string',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedFormat': 'color(display-p3 r g b [/ alpha])', 'received': raw },
          'message': 'value does not match the display-p3 CSS syntax',
          'path':    'raw'
        }]
      });
    }

    const p3R   = parseFloat(match[1]!);
    const p3G   = parseFloat(match[2]!);
    const p3B   = parseFloat(match[3]!);
    const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

    return recordFromP3(p3R, p3G, p3B, alpha, undefined);
  }

  /**
   * Parses a single entry, rethrowing with index/context on failure.
   * Extracted from {@link IntakeP3.run} so the loop body contains only
   * a function call, not a try-catch, per V8 optimization guidance.
   */
  private parseEntry(raw: unknown, index: number): ColorRecordInterfaceType {
    try {
      return this.parse(raw);
    } catch {
      throw ValidationError.create({
        'message': `intake:p3 — entry at index ${index} is not a Display-P3 string`,
        'path':    `input.colors[${index}]`,
        'violations': [{
          'details': {
            'expectedFormat': 'color(display-p3 r g b [/ alpha])',
            'index':          index,
            'received':       JSON.stringify(raw) ?? 'undefined'
          },
          'message': 'entry does not match the display-p3 CSS syntax',
          'path':    `input.colors[${index}]`
        }]
      });
    }
  }

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.input.colors.length; i++) {
      const raw = state.input.colors[i];
      const record = this.parseEntry(raw, i);
      state.colors.push(record);
      ctx.logger.debug(
        LogBody.create()
          .component('IntakeP3')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Parsed display-p3 value')
          .context({
            'hex': record.hex,
            'raw': raw
          })
          .build()
      );
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
  hints: ColorHintsInterfaceType | undefined
): ColorRecordInterfaceType {
  // 1. Display-P3 gamma → linear Display-P3 (sign-preserving for
  //    out-of-range floats; spec guarantees inputs in [0, 1] but be
  //    tolerant of slightly-out-of-range floats).
  const lp3R = P3.decode(p3R);
  const lp3G = P3.decode(p3G);
  const lp3B = P3.decode(p3B);

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

  // 4. Determine whether the linear sRGB is in-gamut. If yes, emit
  //    directly. If no, gamut-map the OKLCH back into sRGB and use
  //    that for the sRGB-safe `rgb`/`hex`.
  const inSrgb =
    lsR >= 0 && lsR <= 1 &&
    lsG >= 0 && lsG <= 1 &&
    lsB >= 0 && lsB <= 1;

  let safeRgb: RgbInterfaceType;
  if (inSrgb) {
    const encoded = linearToSrgb.apply(lsR, lsG, lsB);
    safeRgb = {
      'b': clamp01.apply(encoded.b),
      'g': clamp01.apply(encoded.g),
      'r': clamp01.apply(encoded.r)
    };
  } else {
    const mapped     = gamutMapSrgb.apply(oklch.l, oklch.c, oklch.h);
    const mappedLin  = oklchToLinearSrgb(mapped.l, mapped.c, mapped.h);
    const mappedSrgb = linearToSrgb.apply(mappedLin.r, mappedLin.g, mappedLin.b);
    safeRgb = {
      'b': clamp01.apply(mappedSrgb.b),
      'g': clamp01.apply(mappedSrgb.g),
      'r': clamp01.apply(mappedSrgb.r)
    };
  }

  return {
    'alpha':        clamp01.apply(alpha),
    'displayP3':    {
      'b': clamp01.apply(p3B),
      'g': clamp01.apply(p3G),
      'r': clamp01.apply(p3R)
    },
    'hex':          rgbToHex.apply(safeRgb.r, safeRgb.g, safeRgb.b),
    'hints':        hints,
    'oklch':        oklch,
    'rgb':          safeRgb,
    'sourceFormat': 'displayP3'
  };
}

/** Display-P3 inverse gamma (same curve as sRGB; sign-preserving). */
class P3 {
  static decode(v: number): number {
    const sign = v < 0 ? -1 : 1;
    const abs  = Math.abs(v);
    if (abs <= 0.04045) {
      return sign * (abs / 12.92);
    }
    return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
  }
}

/**
 * Linear sRGB → OKLCH. Splits {@link import('../../math/ColorRecordFactory.ts')}
 * `rgbToOklchRaw` so we can skip the gamma-decode step (input is already
 * linear) and avoid clamping for out-of-gamut inputs. Same Björn
 * Ottosson matrices.
 */
function linearSrgbToOklch(rl: number, gl: number, bl: number): OklchInterfaceType {
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
    'c': clamp.apply(0, 0.5, c),
    'h': h % 360,
    'l': clamp01.apply(labL)
  };
}

function signCbrt(v: number): number {
  if (v < 0) {return -Math.cbrt(-v);}
  return Math.cbrt(v);
}

/** OKLCH → linear sRGB (Björn Ottosson). Local helper; mirrors the
 *  matrix used in OklchToRgbRaw/OklchToDisplayP3. */
function oklchToLinearSrgb(l: number, c: number, h: number): RgbInterfaceType {
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
    'b': -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z,
    'g': -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    'r': +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z
  };
}
