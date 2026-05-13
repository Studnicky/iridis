import type { ColorRecordInterface, ContrastAlgorithmType, RgbInterface } from '../types/index.ts';
import { clamp01 } from './Clamp.ts';
import { colorRecordFactory, oklchToRgbRaw } from './ColorRecordFactory.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

const APCA_NORM_BG  = 0.56;
const APCA_NORM_TXT = 0.57;
const APCA_CLAMP    = 0.022;
const APCA_CLAMP_P  = 1.414;
const APCA_SCALE    = 1.14;
const APCA_LOW_CLIP = 0.001;
const APCA_OFFSET   = 0.027;

/** WCAG 2.1 relative luminance from a gamma-encoded sRGB triple in 0..1.
 *  Equivalent to `luminance.apply({rgb: {r, g, b}, ...})` without the
 *  record allocation.                                                    */
function rgbLuminance(r: number, g: number, b: number): number {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}

/** WCAG 2.1 contrast ratio between two precomputed luminances. */
function wcagRatio(la: number, lb: number): number {
  const lighter = Math.max(la, lb);
  const darker  = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** APCA Lc foreground luminance (text exponent). */
function apcaFg(r: number, g: number, b: number): number {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.56)
       + 0.7151522 * Math.pow(lin.g, 0.56)
       + 0.0721750 * Math.pow(lin.b, 0.56);
}

/** APCA Lc background luminance (background exponent). */
function apcaBg(r: number, g: number, b: number): number {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.65)
       + 0.7151522 * Math.pow(lin.g, 0.65)
       + 0.0721750 * Math.pow(lin.b, 0.65);
}

/** APCA Lc absolute value between text and background, computed from
 *  the text's foreground-luminance and the precomputed background. */
function apcaLcFromYtxt(Ytxt: number, Ybg: number): number {
  const txtClamp = Ytxt < APCA_CLAMP ? Ytxt + Math.pow(APCA_CLAMP - Ytxt, APCA_CLAMP_P) : Ytxt;
  const bgClamp  = Ybg  < APCA_CLAMP ? Ybg  + Math.pow(APCA_CLAMP - Ybg,  APCA_CLAMP_P) : Ybg;

  let Lc = 0;
  if (bgClamp > txtClamp) {
    Lc = (Math.pow(bgClamp, APCA_NORM_BG) - Math.pow(txtClamp, APCA_NORM_TXT)) * APCA_SCALE;
    if (Lc < APCA_LOW_CLIP) return 0;
    Lc = Lc - APCA_OFFSET;
  } else {
    Lc = (Math.pow(bgClamp, 0.62) - Math.pow(txtClamp, 0.65)) * APCA_SCALE;
    if (Lc > -APCA_LOW_CLIP) return 0;
    Lc = Lc + APCA_OFFSET;
  }
  return Math.abs(Lc * 100);
}

export class EnsureContrast {
  readonly 'name' = 'ensureContrast';

  /**
   * Adjusts `foreground` along the OKLCH L axis until its contrast against
   * `background` meets `minRatio` for the given `algorithm`. The inner
   * loop operates on a scalar `L` value — no `ColorRecord` is allocated
   * per iteration. The background's luminance is computed once. A single
   * `ColorRecord` is materialised at return via `colorRecordFactory`.
   */
  apply(
    foreground: ColorRecordInterface,
    background: ColorRecordInterface,
    minRatio: number,
    algorithm: ContrastAlgorithmType = 'wcag21',
  ): ColorRecordInterface {
    // Precompute background luminance once — it never changes during the loop.
    const bgRgb: RgbInterface = background.rgb;
    const Ybg = algorithm === 'wcag21'
      ? rgbLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
      : apcaBg(bgRgb.r, bgRgb.g, bgRgb.b);

    // Compute initial foreground contrast from its existing rgb.
    const fgRgb: RgbInterface = foreground.rgb;
    const initialContrast = algorithm === 'wcag21'
      ? wcagRatio(rgbLuminance(fgRgb.r, fgRgb.g, fgRgb.b), Ybg)
      : apcaLcFromYtxt(apcaFg(fgRgb.r, fgRgb.g, fgRgb.b), Ybg);

    if (initialContrast >= minRatio) {
      return foreground;
    }

    const fgL = foreground.oklch.l;
    const c   = foreground.oklch.c;
    const h   = foreground.oklch.h;
    const a   = foreground.alpha;
    const step = fgL < background.oklch.l ? -0.02 : 0.02;

    let currentL = fgL;
    let lastL    = currentL;

    for (let i = 0; i < 50; i++) {
      const newL = clamp01(currentL + step);
      const rgb  = oklchToRgbRaw(newL, c, h);

      const ratio = algorithm === 'wcag21'
        ? wcagRatio(rgbLuminance(rgb.r, rgb.g, rgb.b), Ybg)
        : apcaLcFromYtxt(apcaFg(rgb.r, rgb.g, rgb.b), Ybg);

      lastL = newL;

      if (ratio >= minRatio) {
        return colorRecordFactory.fromOklch(newL, c, h, a);
      }

      if (newL === 0 || newL === 1) {
        return colorRecordFactory.fromOklch(newL, c, h, a);
      }

      currentL = newL;
    }

    return colorRecordFactory.fromOklch(lastL, c, h, a);
  }
}

/** Singleton instance registered as the `ensureContrast` math primitive. */
export const ensureContrast = new EnsureContrast();
