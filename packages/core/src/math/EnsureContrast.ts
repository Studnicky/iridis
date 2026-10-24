import { ValidationError } from '@studnicky/errors/node';

import type { ColorHintsEntity } from '../entities/ColorHintsEntity.ts';
import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { apcaLc } from './ApcaLc.ts';
import { ColorCoordinate } from './ColorCoordinate.ts';
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

interface RgbCoordinatesInterface {
  readonly 'b': number;
  readonly 'g': number;
  readonly 'r': number;
}

class ContrastMeasure {
  readonly #backgroundLuminance: (rgb: RgbCoordinatesInterface) => number;
  readonly #contrast: (foreground: RgbCoordinatesInterface, backgroundLuminance: number) => number;

  private constructor(
    backgroundLuminance: (rgb: RgbCoordinatesInterface) => number,
    contrast: (foreground: RgbCoordinatesInterface, backgroundLuminance: number) => number
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

  backgroundLuminance(rgb: RgbCoordinatesInterface): number {
    const result = this.#backgroundLuminance(rgb);
    return result;
  }

  contrast(foreground: RgbCoordinatesInterface, backgroundLuminance: number): number {
    const result = this.#contrast(foreground, backgroundLuminance);
    return result;
  }

  static #apcaBackground(rgb: RgbCoordinatesInterface): number {
    const result = apcaLc.luminance(rgb.r, rgb.g, rgb.b);
    return result;
  }

  static #apcaContrast(foreground: RgbCoordinatesInterface, backgroundLuminance: number): number {
    const result = Math.abs(apcaLc.apply(apcaLc.luminance(foreground.r, foreground.g, foreground.b), backgroundLuminance));
    return result;
  }

  static #wcagBackground(rgb: RgbCoordinatesInterface): number {
    const result = RgbLuminance.calculate(rgb.r, rgb.g, rgb.b);
    return result;
  }

  static #wcagContrast(foreground: RgbCoordinatesInterface, backgroundLuminance: number): number {
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
  readonly 'lightnessRange'?: readonly [number, number];
  readonly 'maximumRatio'?: number;
}

class ContrastPolicy {
  readonly 'lightnessRange': readonly [number, number];
  readonly 'maximumRatio': number;
  readonly 'measure': ContrastMeasure;

  private constructor(
    measure: ContrastMeasure,
    maximumRatio: number,
    lightnessRange: readonly [number, number]
  ) {
    this.lightnessRange = lightnessRange;
    this.measure = measure;
    this.maximumRatio = maximumRatio;
  }

  static resolve(input: string | EnsureContrastOptions): ContrastPolicy {
    const name = typeof input === 'string' ? input : input.algorithm ?? 'wcag21';
    let maximumRatio = Infinity;
    if (typeof input !== 'string' && input.maximumRatio !== undefined) {
      maximumRatio = input.maximumRatio;
    }
    const lightnessRange = typeof input === 'string' || input.lightnessRange === undefined
      ? [0, 1] as const
      : input.lightnessRange;
    const result = new ContrastPolicy(
      ContrastMeasure.resolve(name),
      maximumRatio,
      lightnessRange
    );
    return result;
  }

  constrainLightness(lightness: number): number {
    const result = Math.max(this.lightnessRange[0], Math.min(this.lightnessRange[1], lightness));
    return result;
  }
}

class ContrastCandidate {
  readonly 'coordinate': ColorCoordinate;
  readonly 'l': number;
  readonly 'ratio': number;

  constructor(coordinate: ColorCoordinate, ratio: number) {
    this.coordinate = coordinate;
    this.l = coordinate.l;
    this.ratio = ratio;
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
  readonly #create: (lightness: number, chroma: number, hue: number, alpha: number, hints: ColorHintsEntity.Type | undefined, origin: ColorRecordEntity.Type) => ColorRecordEntity.Type;
  readonly #hints: ColorHintsEntity.Type | undefined;
  readonly #origin: ColorRecordEntity.Type;

  private constructor(
    origin: ColorRecordEntity.Type,
    create: (lightness: number, chroma: number, hue: number, alpha: number, hints: ColorHintsEntity.Type | undefined, origin: ColorRecordEntity.Type) => ColorRecordEntity.Type
  ) {
    this.#alpha = origin.alpha;
    this.#create = create;
    this.#hints = origin.hints;
    this.#origin = origin;
  }

  static resolve(origin: ColorRecordEntity.Type): ContrastRecordBuilder {
    const create = ContrastRecordBuilder.#srgbFormats.has(origin.sourceFormat)
      ? ContrastRecordBuilder.#fromRgb
      : ContrastRecordBuilder.#fromOklch;
    const result = new ContrastRecordBuilder(origin, create);
    return result;
  }

  coordinate(lightness: number, chroma: number, hue: number): ColorCoordinate {
    const result = ContrastRecordBuilder.#srgbFormats.has(this.#origin.sourceFormat)
      ? ColorCoordinate.fromRawOklch(lightness, chroma, hue)
      : ColorCoordinate.fromOklch(lightness, chroma, hue);
    return result;
  }

  materialize(lightness: number, chroma: number, hue: number): ColorRecordEntity.Type {
    const result = this.#create(lightness, chroma, hue, this.#alpha, this.#hints, this.#origin);
    return result;
  }

  static #fromOklch(
    lightness: number,
    chroma: number,
    hue: number,
    alpha: number,
    hints: ColorHintsEntity.Type | undefined,
    origin: ColorRecordEntity.Type
  ): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromOklch(lightness, chroma, hue, { 'alpha': alpha, 'hints': hints, 'origin': origin });
    return result;
  }

  static #fromRgb(
    lightness: number,
    chroma: number,
    hue: number,
    alpha: number,
    hints: ColorHintsEntity.Type | undefined,
    origin: ColorRecordEntity.Type
  ): ColorRecordEntity.Type {
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
  readonly #policy: ContrastPolicy;
  readonly #records: ContrastRecordBuilder;

  constructor(policy: ContrastPolicy, backgroundLuminance: number, records: ContrastRecordBuilder) {
    this.#backgroundLuminance = backgroundLuminance;
    this.#measure = policy.measure;
    this.#policy = policy;
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
    const endpointLightness = direction > 0
      ? this.#policy.lightnessRange[1]
      : this.#policy.lightnessRange[0];
    const endpoint = this.candidateAt(endpointLightness, chroma, hue);
    if (this.#isWithinBand(initial, minimumRatio, maximumRatio)) {
      const result = new ContrastSearchResult(initial, endpoint);
      return result;
    }

    let previous = initial;
    for (let segment = 1; segment <= 256; segment++) {
      const lightness = initial.l + (endpointLightness - initial.l) * (segment / 256);
      const current = this.candidateAt(lightness, chroma, hue);
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

  candidateAt(lightness: number, chroma: number, hue: number): ContrastCandidate {
    const coordinate = this.#records.coordinate(lightness, chroma, hue);
    const ratio = this.#measure.contrast(
      { 'b': coordinate.rgbB, 'g': coordinate.rgbG, 'r': coordinate.rgbR },
      this.#backgroundLuminance
    );
    const result = new ContrastCandidate(coordinate, ratio);
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
      const middle = this.candidateAt(middleLightness, chroma, hue);
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
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    minimumRatio: number
  ): ColorRecordEntity.Type;
  apply(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    minimumRatio: number,
    algorithm: string
  ): ColorRecordEntity.Type;
  apply(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    minimumRatio: number,
    options: EnsureContrastOptions
  ): ColorRecordEntity.Type;
  apply(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    minimumRatio: number,
    algorithmOrOptions: string | EnsureContrastOptions = 'wcag21'
  ): ColorRecordEntity.Type {
    const policy = ContrastPolicy.resolve(algorithmOrOptions);
    const backgroundLuminance = policy.measure.backgroundLuminance(background.rgb);
    const initialContrast = policy.measure.contrast(foreground.rgb, backgroundLuminance);
    const initialLightness = policy.constrainLightness(foreground.oklch.l);
    if (
      initialLightness === foreground.oklch.l &&
      initialContrast >= minimumRatio &&
      initialContrast <= policy.maximumRatio
    ) {
      return foreground;
    }

    const search = new ContrastSearch(
      policy,
      backgroundLuminance,
      ContrastRecordBuilder.resolve(foreground)
    );
    const initial = search.candidateAt(
      initialLightness,
      foreground.oklch.c,
      foreground.oklch.h
    );
    const direction = EnsureContrast.#preferredDirection(
      foreground,
      background,
      initial.ratio,
      policy.maximumRatio,
      backgroundLuminance
    );
    const primary = search.searchDirection(initial, foreground.oklch.c, foreground.oklch.h, direction, minimumRatio, policy.maximumRatio);
    const opposite = search.searchDirection(initial, foreground.oklch.c, foreground.oklch.h, -direction, minimumRatio, policy.maximumRatio);
    const selected = EnsureContrast.#selectCandidate(primary, opposite, initial.l);
    const result = ContrastRecordBuilder.resolve(foreground).materialize(
      selected.l,
      foreground.oklch.c,
      foreground.oklch.h
    );
    return result;
  }

  static #preferredDirection(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
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
