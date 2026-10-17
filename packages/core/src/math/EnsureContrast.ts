import { ValidationError } from '@studnicky/errors/node';

import type { ColorHintsInterfaceTypeEntity } from '../entities/ColorHintsInterfaceTypeEntity.ts';
import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { RgbInterfaceTypeEntity } from '../entities/RgbInterfaceTypeEntity.ts';
import { apcaLc } from './ApcaLc.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { oklchToRgbRaw } from './OklchToRgbRaw.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

/** WCAG 2.1 relative luminance from a gamma-encoded sRGB triple in 0..1. */
class RgbLuminance {
  static calculate(r: number, g: number, b: number): number {
    const linear = srgbToLinear.apply(r, g, b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
  }
}

/** WCAG 2.1 contrast ratio between two precomputed luminances. */
class WcagContrastRatio {
  static between(first: number, second: number): number {
    const lighter = Math.max(first, second);
    const darker  = Math.min(first, second);
    const result = (lighter + 0.05) / (darker + 0.05);
    return result;
  }
}

class ContrastMeasure {
  readonly #backgroundLuminance: (rgb: RgbInterfaceTypeEntity.Type) => number;
  readonly #contrast: (foreground: RgbInterfaceTypeEntity.Type, backgroundLuminance: number) => number;

  private constructor(
    backgroundLuminance: (rgb: RgbInterfaceTypeEntity.Type) => number,
    contrast: (foreground: RgbInterfaceTypeEntity.Type, backgroundLuminance: number) => number
  ) {
    this.#backgroundLuminance = backgroundLuminance;
    this.#contrast = contrast;
  }

  static resolve(name: string): ContrastMeasure {
    const measure = ContrastMeasure.#measures.get(name);
    if (measure === undefined) {
      throw ValidationError.create({
        'message': 'EnsureContrast: unsupported contrast algorithm',
        'path':    'algorithm',
        'violations': [{
          'details': { 'received': name },
          'message': 'value is not a supported contrast algorithm',
          'path':    'algorithm'
        }]
      });
    }
    return measure;
  }

  backgroundLuminance(rgb: RgbInterfaceTypeEntity.Type): number {
    const result = this.#backgroundLuminance(rgb);
    return result;
  }

  contrast(foreground: RgbInterfaceTypeEntity.Type, backgroundLuminance: number): number {
    const result = this.#contrast(foreground, backgroundLuminance);
    return result;
  }

  static #apcaBackground(rgb: RgbInterfaceTypeEntity.Type): number {
    const result = apcaLc.luminance(rgb.r, rgb.g, rgb.b);
    return result;
  }

  static #apcaContrast(foreground: RgbInterfaceTypeEntity.Type, backgroundLuminance: number): number {
    const result = Math.abs(apcaLc.apply(apcaLc.luminance(foreground.r, foreground.g, foreground.b), backgroundLuminance));
    return result;
  }

  static #wcagBackground(rgb: RgbInterfaceTypeEntity.Type): number {
    const result = RgbLuminance.calculate(rgb.r, rgb.g, rgb.b);
    return result;
  }

  static #wcagContrast(foreground: RgbInterfaceTypeEntity.Type, backgroundLuminance: number): number {
    const result = WcagContrastRatio.between(RgbLuminance.calculate(foreground.r, foreground.g, foreground.b), backgroundLuminance);
    return result;
  }

  static readonly #measures: ReadonlyMap<string, ContrastMeasure> = new Map([
    ['apca', new ContrastMeasure(ContrastMeasure.#apcaBackground, ContrastMeasure.#apcaContrast)],
    ['wcag21', new ContrastMeasure(ContrastMeasure.#wcagBackground, ContrastMeasure.#wcagContrast)]
  ]);
}

class EnsureContrastOptions {
  readonly 'algorithm'?: string;
  readonly 'maximumRatio'?: number;
}

class ContrastPolicy {
  readonly 'maximumRatio': number;
  readonly 'measure': ContrastMeasure;

  private constructor(measure: ContrastMeasure, maximumRatio: number) {
    this.measure = measure;
    this.maximumRatio = maximumRatio;
  }

  static resolve(input: string | EnsureContrastOptions): ContrastPolicy {
    const name = typeof input === 'string' ? input : input.algorithm ?? 'wcag21';
    let maximumRatio = Infinity;
    if (typeof input !== 'string' && input.maximumRatio !== undefined) {
      maximumRatio = input.maximumRatio;
    }
    const result = new ContrastPolicy(ContrastMeasure.resolve(name), maximumRatio);
    return result;
  }
}

class ContrastCandidate {
  readonly 'l': number;
  readonly 'ratio': number;
  readonly 'record': ColorRecordInterfaceTypeEntity.Type;

  constructor(lightness: number, ratio: number, record: ColorRecordInterfaceTypeEntity.Type) {
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

class ContrastRecordBuilder {
  readonly #alpha: number;
  readonly #create: (lightness: number, chroma: number, hue: number, alpha: number, hints: ColorHintsInterfaceTypeEntity.Type | undefined, origin: ColorRecordInterfaceTypeEntity.Type) => ColorRecordInterfaceTypeEntity.Type;
  readonly #hints: ColorHintsInterfaceTypeEntity.Type | undefined;
  readonly #origin: ColorRecordInterfaceTypeEntity.Type;

  private constructor(
    origin: ColorRecordInterfaceTypeEntity.Type,
    create: (lightness: number, chroma: number, hue: number, alpha: number, hints: ColorHintsInterfaceTypeEntity.Type | undefined, origin: ColorRecordInterfaceTypeEntity.Type) => ColorRecordInterfaceTypeEntity.Type
  ) {
    this.#alpha = origin.alpha;
    this.#create = create;
    this.#hints = origin.hints;
    this.#origin = origin;
  }

  static resolve(origin: ColorRecordInterfaceTypeEntity.Type): ContrastRecordBuilder {
    const create = ContrastRecordBuilder.#srgbFormats.has(origin.sourceFormat)
      ? ContrastRecordBuilder.#fromRgb
      : ContrastRecordBuilder.#fromOklch;
    const result = new ContrastRecordBuilder(origin, create);
    return result;
  }

  create(lightness: number, chroma: number, hue: number): ColorRecordInterfaceTypeEntity.Type {
    const result = this.#create(lightness, chroma, hue, this.#alpha, this.#hints, this.#origin);
    return result;
  }

  static #fromOklch(
    lightness: number,
    chroma: number,
    hue: number,
    alpha: number,
    hints: ColorHintsInterfaceTypeEntity.Type | undefined,
    origin: ColorRecordInterfaceTypeEntity.Type
  ): ColorRecordInterfaceTypeEntity.Type {
    const result = colorRecordFactory.fromOklch(lightness, chroma, hue, { 'alpha': alpha, 'hints': hints, 'origin': origin });
    return result;
  }

  static #fromRgb(
    lightness: number,
    chroma: number,
    hue: number,
    alpha: number,
    hints: ColorHintsInterfaceTypeEntity.Type | undefined,
    origin: ColorRecordInterfaceTypeEntity.Type
  ): ColorRecordInterfaceTypeEntity.Type {
    const rgb = oklchToRgbRaw.apply(lightness, chroma, hue);
    const result = colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { 'alpha': alpha, 'hints': hints, 'origin': origin });
    return result;
  }

  static readonly #srgbFormats: ReadonlySet<string> = new Set([
    'hex', 'hsl', 'imagePixel', 'lab', 'named', 'rgb'
  ]);
}

class ContrastSearch {
  readonly #backgroundLuminance: number;
  readonly #measure: ContrastMeasure;
  readonly #records: ContrastRecordBuilder;

  constructor(measure: ContrastMeasure, backgroundLuminance: number, records: ContrastRecordBuilder) {
    this.#backgroundLuminance = backgroundLuminance;
    this.#measure = measure;
    this.#records = records;
  }

  searchDirection(
    initial: ContrastCandidate,
    chroma: number,
    hue: number,
    direction: number,
    minimumRatio: number,
    maximumRatio: number
  ): ContrastSearchResult {
    const endpointLightness = direction > 0 ? 1 : 0;
    const endpoint = this.#candidateAt(endpointLightness, chroma, hue);
    if (this.#isWithinBand(initial, minimumRatio, maximumRatio)) {
      const result = new ContrastSearchResult(initial, endpoint);
      return result;
    }

    let previous = initial;
    for (let segment = 1; segment <= 256; segment++) {
      const lightness = initial.l + (endpointLightness - initial.l) * (segment / 256);
      const current = this.#candidateAt(lightness, chroma, hue);
      const selected = this.#selectSegmentCandidate(previous, current, chroma, hue, minimumRatio, maximumRatio);
      if (selected !== undefined) {
        const result = new ContrastSearchResult(selected, endpoint);
        return result;
      }
      previous = current;
    }

    const result = new ContrastSearchResult(undefined, endpoint);
    return result;
  }

  #candidateAt(lightness: number, chroma: number, hue: number): ContrastCandidate {
    const record = this.#records.create(lightness, chroma, hue);
    const ratio = this.#measure.contrast(RgbInterfaceTypeEntity.create(record.rgb), this.#backgroundLuminance);
    const result = new ContrastCandidate(lightness, ratio, record);
    return result;
  }

  #isWithinBand(candidate: ContrastCandidate, minimumRatio: number, maximumRatio: number): boolean {
    const result = candidate.ratio >= minimumRatio && candidate.ratio <= maximumRatio;
    return result;
  }

  #selectSegmentCandidate(
    previous: ContrastCandidate,
    current: ContrastCandidate,
    chroma: number,
    hue: number,
    minimumRatio: number,
    maximumRatio: number
  ): ContrastCandidate | undefined {
    if (this.#isWithinBand(current, minimumRatio, maximumRatio)) {
      return current;
    }
    const lower = this.#crossedMinimum(previous, current, chroma, hue, minimumRatio, maximumRatio);
    if (lower !== undefined) {
      return lower;
    }
    const upper = this.#crossedMaximum(previous, current, chroma, hue, minimumRatio, maximumRatio);
    return upper;
  }

  #crossedMinimum(
    previous: ContrastCandidate,
    current: ContrastCandidate,
    chroma: number,
    hue: number,
    minimumRatio: number,
    maximumRatio: number
  ): ContrastCandidate | undefined {
    if (previous.ratio >= minimumRatio || current.ratio < minimumRatio) {
      return undefined;
    }
    const candidate = this.#refineBoundary(previous, current, chroma, hue, minimumRatio, ContrastSearch.#atOrAbove);
    const result = candidate.ratio <= maximumRatio ? candidate : undefined;
    return result;
  }

  #crossedMaximum(
    previous: ContrastCandidate,
    current: ContrastCandidate,
    chroma: number,
    hue: number,
    minimumRatio: number,
    maximumRatio: number
  ): ContrastCandidate | undefined {
    if (previous.ratio <= maximumRatio || current.ratio > maximumRatio) {
      return undefined;
    }
    const candidate = this.#refineBoundary(previous, current, chroma, hue, maximumRatio, ContrastSearch.#atOrBelow);
    const result = candidate.ratio >= minimumRatio ? candidate : undefined;
    return result;
  }

  #refineBoundary(
    outside: ContrastCandidate,
    inside: ContrastCandidate,
    chroma: number,
    hue: number,
    threshold: number,
    includes: (ratio: number, threshold: number) => boolean
  ): ContrastCandidate {
    let currentOutside = outside;
    let currentInside = inside;
    for (let iteration = 0; iteration < 64; iteration++) {
      const middleLightness = (currentOutside.l + currentInside.l) / 2;
      if (middleLightness === currentOutside.l || middleLightness === currentInside.l) {
        break;
      }
      const middle = this.#candidateAt(middleLightness, chroma, hue);
      if (includes(middle.ratio, threshold)) {
        currentInside = middle;
      } else {
        currentOutside = middle;
      }
    }
    return currentInside;
  }

  static #atOrAbove(ratio: number, threshold: number): boolean {
    const result = ratio >= threshold;
    return result;
  }

  static #atOrBelow(ratio: number, threshold: number): boolean {
    const result = ratio <= threshold;
    return result;
  }
}

class EnsureContrast {
  readonly 'name' = 'ensureContrast';

  apply(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type,
    minimumRatio: number
  ): ColorRecordInterfaceTypeEntity.Type;
  apply(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type,
    minimumRatio: number,
    algorithm: string
  ): ColorRecordInterfaceTypeEntity.Type;
  apply(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type,
    minimumRatio: number,
    options: EnsureContrastOptions
  ): ColorRecordInterfaceTypeEntity.Type;
  apply(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type,
    minimumRatio: number,
    algorithmOrOptions: string | EnsureContrastOptions = 'wcag21'
  ): ColorRecordInterfaceTypeEntity.Type {
    const policy = ContrastPolicy.resolve(algorithmOrOptions);
    const backgroundRgb = RgbInterfaceTypeEntity.create(background.rgb);
    const backgroundLuminance = policy.measure.backgroundLuminance(backgroundRgb);
    const foregroundRgb = RgbInterfaceTypeEntity.create(foreground.rgb);
    const initialContrast = policy.measure.contrast(foregroundRgb, backgroundLuminance);
    if (initialContrast >= minimumRatio && initialContrast <= policy.maximumRatio) {
      return foreground;
    }

    const initial = new ContrastCandidate(foreground.oklch.l, initialContrast, foreground);
    const search = new ContrastSearch(
      policy.measure,
      backgroundLuminance,
      ContrastRecordBuilder.resolve(foreground)
    );
    const direction = EnsureContrast.#preferredDirection(
      foreground,
      background,
      initialContrast,
      policy.maximumRatio,
      backgroundLuminance
    );
    const primary = search.searchDirection(initial, foreground.oklch.c, foreground.oklch.h, direction, minimumRatio, policy.maximumRatio);
    const opposite = search.searchDirection(initial, foreground.oklch.c, foreground.oklch.h, -direction, minimumRatio, policy.maximumRatio);
    const selected = EnsureContrast.#selectCandidate(primary, opposite, foreground.oklch.l);
    const result = selected.record;
    return result;
  }

  static #preferredDirection(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type,
    initialContrast: number,
    maximumRatio: number,
    backgroundLuminance: number
  ): number {
    if (initialContrast > maximumRatio) {
      const result = foreground.oklch.l < background.oklch.l ? 0.02 : -0.02;
      return result;
    }
    const result = backgroundLuminance > 0.5 ? -0.02 : 0.02;
    return result;
  }

  static #selectCandidate(
    primary: ContrastSearchResult,
    opposite: ContrastSearchResult,
    lightness: number
  ): ContrastCandidate {
    if (primary.candidate !== undefined && opposite.candidate !== undefined) {
      const primaryDistance = Math.abs(primary.candidate.l - lightness);
      const oppositeDistance = Math.abs(opposite.candidate.l - lightness);
      const result = primaryDistance <= oppositeDistance ? primary.candidate : opposite.candidate;
      return result;
    }
    const candidate = primary.candidate ?? opposite.candidate;
    if (candidate !== undefined) {
      return candidate;
    }
    const result = primary.endpoint.ratio >= opposite.endpoint.ratio ? primary.endpoint : opposite.endpoint;
    return result;
  }
}

/** Singleton instance registered as the `ensureContrast` math primitive. */
export const ensureContrast = new EnsureContrast();
