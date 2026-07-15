import type { ColorRecordInterfaceType, ContrastAlgorithmType, RgbInterfaceType, SourceFormatType } from '../types/index.ts';

import { apcaLc } from './ApcaLc.ts';
import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { oklchToRgbRaw } from './OklchToRgbRaw.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

/** sRGB-family source formats. When the original foreground was sourced from
 *  one of these, the adjusted record must remain sRGB (no displayP3 slot).   */
const SRGB_FORMATS: ReadonlySet<SourceFormatType> = new Set([
  'hex', 'hsl', 'imagePixel', 'lab', 'named', 'rgb'
]);

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

class EnsureContrast {
  readonly 'name' = 'ensureContrast';

  /**
   * Adjusts `foreground` along the OKLCH L axis until its contrast against
   * `background` meets `minRatio` for the given `algorithm`. The inner
   * loop operates on a scalar `L` value; no `ColorRecord` is allocated
   * per iteration. The background's luminance is computed once. A single
   * `ColorRecord` is materialised at return via `colorRecordFactory`.
   *
   * Gamut preservation: the adjusted record inherits `foreground.sourceFormat`.
   * When that format is an sRGB-family format (`hex`, `rgb`, `hsl`, `lab`,
   * `named`, `imagePixel`), the record is built via `fromRgb` using the
   * sRGB-clamped coordinates computed during the loop — preventing a
   * spurious `displayP3` slot from appearing on a colour that was never
   * wide-gamut. When the source is `displayP3` or `oklch`, `fromOklch` is
   * used so the wide-gamut `displayP3` slot is re-derived as expected.
   */
  apply(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType,
    minRatio: number,
    algorithm: ContrastAlgorithmType = 'wcag21'
  ): ColorRecordInterfaceType {
    // Precompute background luminance once; it never changes during the loop.
    const bgRgb: RgbInterfaceType = background.rgb;
    const Ybg = algorithm === 'wcag21'
      ? rgbLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
      : apcaLc.luminance(bgRgb.r, bgRgb.g, bgRgb.b);

    // Compute initial foreground contrast from its existing rgb.
    const fgRgb: RgbInterfaceType = foreground.rgb;
    // ensureContrast only needs Lc magnitude to compare against minRatio;
    // apcaLc.apply()'s sign (polarity) is discarded via Math.abs().
    const initialContrast = algorithm === 'wcag21'
      ? wcagRatio(rgbLuminance(fgRgb.r, fgRgb.g, fgRgb.b), Ybg)
      : Math.abs(apcaLc.apply(apcaLc.luminance(fgRgb.r, fgRgb.g, fgRgb.b), Ybg));

    if (initialContrast >= minRatio) {
      return foreground;
    }

    const fgL    = foreground.oklch.l;
    const c      = foreground.oklch.c;
    const h      = foreground.oklch.h;
    const a      = foreground.alpha;
    const fmt    = foreground.sourceFormat;
    const hints  = foreground.hints;
    const isSrgb = SRGB_FORMATS.has(fmt);
    // Contrast is monotonic only within a polarity branch: to gain contrast
    // against a fixed background you move the foreground toward the LUMINANCE
    // extreme farther from that background — darken toward black on a
    // luminance-light bg, lighten toward white on a luminance-dark one. The
    // decision keys off WCAG relative luminance, not OKLCH lightness: a
    // saturated hue (e.g. violet) can read "light" in OKLCH L yet be
    // luminance-dark, and contrast is a function of luminance, not L.
    const step   = rgbLuminance(bgRgb.r, bgRgb.g, bgRgb.b) > 0.5 ? -0.02 : 0.02;

    let currentL = fgL;
    let lastL    = currentL;
    let lastRgb: RgbInterfaceType = fgRgb;

    for (let i = 0; i < 50; i++) {
      const newL = clamp01.apply(currentL + step);
      const rgb  = oklchToRgbRaw.apply(newL, c, h);

      const ratio = algorithm === 'wcag21'
        ? wcagRatio(rgbLuminance(rgb.r, rgb.g, rgb.b), Ybg)
        : Math.abs(apcaLc.apply(apcaLc.luminance(rgb.r, rgb.g, rgb.b), Ybg));

      lastL   = newL;
      lastRgb = rgb;

      if (ratio >= minRatio) {
        return isSrgb
          ? colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt })
          : colorRecordFactory.fromOklch(newL, c, h, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt });
      }

      if (newL === 0 || newL === 1) {
        return isSrgb
          ? colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt })
          : colorRecordFactory.fromOklch(newL, c, h, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt });
      }

      currentL = newL;
    }

    return isSrgb
      ? colorRecordFactory.fromRgb(lastRgb.r, lastRgb.g, lastRgb.b, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt })
      : colorRecordFactory.fromOklch(lastL, c, h, { 'alpha': a, 'hints': hints, 'sourceFormat': fmt });
  }
}

/** Singleton instance registered as the `ensureContrast` math primitive. */
export const ensureContrast = new EnsureContrast();
