import type { ColorHintsInterfaceType, ColorRecordInterfaceType, ContrastAlgorithmType, RgbInterfaceType, SourceFormatType } from '../types/index.ts';

import { apcaLc } from './ApcaLc.ts';
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
class RgbLuminance {
  static calculate(r: number, g: number, b: number): number {
    const lin = srgbToLinear.apply(r, g, b);
    return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
  }
}

/** WCAG 2.1 contrast ratio between two precomputed luminances. */
class WcagContrastRatio {
  static between(la: number, lb: number): number {
    const lighter = Math.max(la, lb);
    const darker  = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }
}

class EnsureContrastOptions {
  readonly 'algorithm'?: ContrastAlgorithmType;
  readonly 'maximumRatio'?: number;
}
class ContrastCandidate {
  readonly 'l': number;
  readonly 'ratio': number;
  readonly 'record': ColorRecordInterfaceType;

  constructor(lightness: number, ratio: number, record: ColorRecordInterfaceType) {
    this.l = lightness;
    this.ratio = ratio;
    this.record = record;
  }
}
class ContrastSearchResult {
  readonly 'candidate': ContrastCandidate | undefined;
  readonly 'endpoint': ContrastCandidate;

  constructor(candidate: ContrastCandidate | undefined, endpoint: ContrastCandidate) {
    this.candidate = candidate;
    this.endpoint = endpoint;
  }
}
class EnsureContrast {
  readonly 'name' = 'ensureContrast';

  private static calculateContrast(rgb: RgbInterfaceType, backgroundLuminance: number, algorithm: ContrastAlgorithmType): number {
    return algorithm === 'wcag21'
      ? WcagContrastRatio.between(RgbLuminance.calculate(rgb.r, rgb.g, rgb.b), backgroundLuminance)
      : Math.abs(apcaLc.apply(apcaLc.luminance(rgb.r, rgb.g, rgb.b), backgroundLuminance));
  }

  private static candidateAt(
    lightness: number,
    chroma: number,
    hue: number,
    backgroundLuminance: number,
    algorithm: ContrastAlgorithmType,
    alpha: number,
    hints: ColorHintsInterfaceType | undefined,
    sourceFormat: SourceFormatType,
    isSrgb: boolean
  ): ContrastCandidate {
    const rawRgb = oklchToRgbRaw.apply(lightness, chroma, hue);
    const record = isSrgb
      ? colorRecordFactory.fromRgb(rawRgb.r, rawRgb.g, rawRgb.b, { 'alpha': alpha, 'hints': hints, 'sourceFormat': sourceFormat })
      : colorRecordFactory.fromOklch(lightness, chroma, hue, { 'alpha': alpha, 'hints': hints, 'sourceFormat': sourceFormat });
    return new ContrastCandidate(
      lightness,
      EnsureContrast.calculateContrast(record.rgb, backgroundLuminance, algorithm),
      record
    );
  }

  private static refineBoundary(
    outside: ContrastCandidate,
    inside: ContrastCandidate,
    chroma: number,
    hue: number,
    backgroundLuminance: number,
    algorithm: ContrastAlgorithmType,
    threshold: number,
    reachesMinimum: boolean,
    alpha: number,
    hints: ColorHintsInterfaceType | undefined,
    sourceFormat: SourceFormatType,
    isSrgb: boolean
  ): ContrastCandidate {
    let currentOutside = outside;
    let currentInside = inside;

    for (let iteration = 0; iteration < 64; iteration++) {
      const middleL = (currentOutside.l + currentInside.l) / 2;
      if (middleL === currentOutside.l || middleL === currentInside.l) {
        break;
      }
      const middle = EnsureContrast.candidateAt(
        middleL, chroma, hue, backgroundLuminance, algorithm, alpha, hints, sourceFormat, isSrgb
      );
      const reachesThreshold = reachesMinimum
        ? middle.ratio >= threshold
        : middle.ratio <= threshold;
      if (reachesThreshold) {
        currentInside = middle;
      } else {
        currentOutside = middle;
      }
    }

    return currentInside;
  }

  private static searchDirection(
    initial: ContrastCandidate,
    chroma: number,
    hue: number,
    direction: number,
    backgroundLuminance: number,
    algorithm: ContrastAlgorithmType,
    minimumRatio: number,
    maximumRatio: number,
    alpha: number,
    hints: ColorHintsInterfaceType | undefined,
    sourceFormat: SourceFormatType,
    isSrgb: boolean
  ): ContrastSearchResult {
    const endpointL = direction > 0 ? 1 : 0;
    const endpoint = EnsureContrast.candidateAt(
      endpointL, chroma, hue, backgroundLuminance, algorithm, alpha, hints, sourceFormat, isSrgb
    );
    let previous = initial;

    if (previous.ratio >= minimumRatio && previous.ratio <= maximumRatio) {
      return new ContrastSearchResult(previous, endpoint);
    }

    for (let segment = 1; segment <= 256; segment++) {
      const lightness = initial.l + (endpointL - initial.l) * (segment / 256);
      const current = EnsureContrast.candidateAt(
        lightness, chroma, hue, backgroundLuminance, algorithm, alpha, hints, sourceFormat, isSrgb
      );
      if (current.ratio >= minimumRatio && current.ratio <= maximumRatio) {
        return new ContrastSearchResult(current, endpoint);
      }

      if (previous.ratio < minimumRatio && current.ratio >= minimumRatio) {
        const candidate = EnsureContrast.refineBoundary(
          previous, current, chroma, hue, backgroundLuminance, algorithm, minimumRatio, true,
          alpha, hints, sourceFormat, isSrgb
        );
        if (candidate.ratio <= maximumRatio) {
          return new ContrastSearchResult(candidate, endpoint);
        }
      }
      if (previous.ratio > maximumRatio && current.ratio <= maximumRatio) {
        const candidate = EnsureContrast.refineBoundary(
          previous, current, chroma, hue, backgroundLuminance, algorithm, maximumRatio, false,
          alpha, hints, sourceFormat, isSrgb
        );
        if (candidate.ratio >= minimumRatio) {
          return new ContrastSearchResult(candidate, endpoint);
        }
      }
      previous = current;
    }

    return new ContrastSearchResult(undefined, endpoint);
  }

  /**
   * Adjusts `foreground` along the OKLCH L axis until its contrast against
   * `background` enters the inclusive `minimumRatio` to `maximumRatio` band
   * for the given `algorithm`. Omitting `maximumRatio` preserves the
   * lower-bound-only behavior. Every search candidate is materialised through
   * the same factory path as the returned record, so gamut mapping cannot
   * change its measured contrast after selection.
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
    minimumRatio: number
  ): ColorRecordInterfaceType;
  apply(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType,
    minimumRatio: number,
    algorithm: ContrastAlgorithmType
  ): ColorRecordInterfaceType;
  apply(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType,
    minimumRatio: number,
    options: EnsureContrastOptions
  ): ColorRecordInterfaceType;
  apply(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType,
    minimumRatio: number,
    algorithmOrOptions: ContrastAlgorithmType | EnsureContrastOptions = 'wcag21'
  ): ColorRecordInterfaceType {
    let algorithm: ContrastAlgorithmType = 'wcag21';
    let maximumRatio: number | undefined;
    if (typeof algorithmOrOptions === 'string') {
      algorithm = algorithmOrOptions;
    } else {
      algorithm = algorithmOrOptions.algorithm ?? 'wcag21';
      maximumRatio = algorithmOrOptions.maximumRatio;
    }
    // Precompute background luminance once; it never changes during the loop.
    const bgRgb: RgbInterfaceType = background.rgb;
    const Ybg = algorithm === 'wcag21'
      ? RgbLuminance.calculate(bgRgb.r, bgRgb.g, bgRgb.b)
      : apcaLc.luminance(bgRgb.r, bgRgb.g, bgRgb.b);

    // Compute initial foreground contrast from its existing rgb.
    const fgRgb: RgbInterfaceType = foreground.rgb;
    // ensureContrast only needs Lc magnitude to compare against the declared
    // band; apcaLc.apply()'s sign (polarity) is discarded via Math.abs().
    const initialContrast = algorithm === 'wcag21'
      ? WcagContrastRatio.between(RgbLuminance.calculate(fgRgb.r, fgRgb.g, fgRgb.b), Ybg)
      : Math.abs(apcaLc.apply(apcaLc.luminance(fgRgb.r, fgRgb.g, fgRgb.b), Ybg));
    const upperRatio = maximumRatio ?? Number.POSITIVE_INFINITY;

    if (initialContrast >= minimumRatio && initialContrast <= upperRatio) {
      return foreground;
    }

    const fgL    = foreground.oklch.l;
    const c      = foreground.oklch.c;
    const h      = foreground.oklch.h;
    const a      = foreground.alpha;
    const fmt    = foreground.sourceFormat;
    const hints  = foreground.hints;
    const isSrgb = SRGB_FORMATS.has(fmt);
    // Search the historical preferred direction and its opposite. A role can
    // begin near white while a dark endpoint is the only reachable color in
    // the requested contrast band.
    let primaryStep: number;
    if (initialContrast > upperRatio) {
      primaryStep = fgL < background.oklch.l ? 0.02 : -0.02;
    } else {
      primaryStep = RgbLuminance.calculate(bgRgb.r, bgRgb.g, bgRgb.b) > 0.5 ? -0.02 : 0.02;
    }
    const initial = new ContrastCandidate(fgL, initialContrast, foreground);
    const primary = EnsureContrast.searchDirection(
      initial, c, h, primaryStep, Ybg, algorithm, minimumRatio, upperRatio, a, hints, fmt, isSrgb
    );
    const opposite = EnsureContrast.searchDirection(
      initial, c, h, -primaryStep, Ybg, algorithm, minimumRatio, upperRatio, a, hints, fmt, isSrgb
    );

    let selected = primary.candidate;
    selected ??= opposite.candidate;
    if (primary.candidate !== undefined && opposite.candidate !== undefined) {
      const primaryDistance = Math.abs(primary.candidate.l - fgL);
      const oppositeDistance = Math.abs(opposite.candidate.l - fgL);
      selected = primaryDistance <= oppositeDistance ? primary.candidate : opposite.candidate;
    }
    selected ??= primary.endpoint.ratio >= opposite.endpoint.ratio ? primary.endpoint : opposite.endpoint;

    return selected.record;
  }
}

/** Singleton instance registered as the `ensureContrast` math primitive. */
export const ensureContrast = new EnsureContrast();
