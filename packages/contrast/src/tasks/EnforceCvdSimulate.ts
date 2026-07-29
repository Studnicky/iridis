import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RgbInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { clamp01, colorRecordFactory, contrastWcag21, gamutMapSrgb, linearToSrgb, oklchToRgbRaw, rgbToHex, srgbToLinear } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { CvdCorrectionInterfaceType, CvdPairWarningInterfaceType } from '../types/augmentation.ts';
import type {
  CorrectionCandidateInterfaceType,
  CvdEvalInterfaceType,
  CvdMatrixInterfaceType
} from '../types/index.ts';

import { cvdMatrices } from '../data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../data/cvdThresholds.ts';

class CvdPairConstraint {
  readonly background: ColorRecordInterfaceType;
  readonly backgroundLuminance: number;
  readonly backgroundName: string;
  readonly baseline: number;
  readonly originalFailureTypes: ReadonlySet<CvdEvalInterfaceType['cvdType']>;
  readonly simulatedBackgroundLuminances: readonly number[];

  constructor(
    backgroundName: string,
    background: ColorRecordInterfaceType,
    baseline: number,
    originalFailureTypes: ReadonlySet<CvdEvalInterfaceType['cvdType']>
  ) {
    this.background = background;
    this.backgroundLuminance = CvdSimulation.luminance(background.rgb);
    this.backgroundName = backgroundName;
    this.baseline = baseline;
    this.originalFailureTypes = originalFailureTypes;
    const simulatedBackgroundLuminances: number[] = [];
    for (const cvd of cvdMatrices) {
      simulatedBackgroundLuminances.push(CvdSimulation.luminance(CvdSimulation.color(background.rgb, cvd)));
    }
    this.simulatedBackgroundLuminances = simulatedBackgroundLuminances;
  }
}

class CvdForegroundGroup {
  readonly constraints: CvdPairConstraint[];
  readonly foreground: string;
  readonly original: ColorRecordInterfaceType;

  constructor(foreground: string, original: ColorRecordInterfaceType) {
    this.constraints = [];
    this.foreground = foreground;
    this.original = original;
  }

  add(backgroundName: string, background: ColorRecordInterfaceType): void {
    this.constraints.push(new CvdPairConstraint(
      backgroundName,
      background,
      contrastWcag21.apply(this.original, background),
      CvdSimulation.failureTypes(this.original, background)
    ));
  }

  dependsOn(foreground: string): boolean {
    for (const constraint of this.constraints) {
      if (constraint.backgroundName === foreground) {
        return true;
      }
    }
    return false;
  }

  resolve(roles: ReadonlyMap<string, ColorRecordInterfaceType>): CvdPairConstraint[] {
    const resolved: CvdPairConstraint[] = [];
    for (const constraint of this.constraints) {
      const background = roles.get(constraint.backgroundName) ?? constraint.background;
      resolved.push(new CvdPairConstraint(
        constraint.backgroundName,
        background,
        constraint.baseline,
        constraint.originalFailureTypes
      ));
    }
    return resolved;
  }
}

abstract class CvdCorrectionCandidate implements CorrectionCandidateInterfaceType {
  abstract readonly 'allClear': boolean;
  abstract readonly 'baselineValid': boolean;
  abstract readonly 'c': number;
  abstract readonly 'failureCount': number;
  abstract readonly 'failureSetValid': boolean;
  abstract readonly 'l': number;
  abstract readonly 'rgb': RgbInterfaceType;
  abstract readonly 'searchC': number;
  abstract readonly 'searchL': number;
  abstract readonly 'trichromatContrast': number;
  abstract readonly 'worstSim': number;
}

class Matrix {
  static apply(
    cvd: CvdMatrixInterfaceType,
    r: number,
    g: number,
    b: number
  ): readonly [number, number, number] {
    const m = cvd.matrix;
    // Row-major: [m0 m1 m2 / m3 m4 m5 / m6 m7 m8]
    const rp = m[0] * r + m[1] * g + m[2] * b;
    const gp = m[3] * r + m[4] * g + m[5] * b;
    const bp = m[6] * r + m[7] * g + m[8] * b;
    return [
      clamp01.apply(rp),
      clamp01.apply(gp),
      clamp01.apply(bp)
    ] as const;
  }
}

class CvdEmittedColorCache {
  private readonly records: Map<string, ColorRecordInterfaceType>;

  constructor() {
    this.records = new Map();
  }

  fromRgb(rgb: RgbInterfaceType): ColorRecordInterfaceType {
    const hex = rgbToHex.apply(rgb.r, rgb.g, rgb.b);
    const cached = this.records.get(hex);
    if (cached !== undefined) {
      return cached;
    }
    const record = colorRecordFactory.fromHex(hex);
    this.records.set(hex, record);
    return record;
  }
}

class CvdSearchColor {
  readonly emitted: ColorRecordInterfaceType;
  readonly searchC: number;
  readonly searchL: number;

  constructor(
    l: number,
    c: number,
    h: number,
    emittedColors: CvdEmittedColorCache
  ) {
    const mapped = gamutMapSrgb.apply(l, c, h);
    const rawRgb = oklchToRgbRaw.apply(mapped.l, mapped.c, mapped.h);
    this.emitted = emittedColors.fromRgb(rawRgb);
    this.searchC = mapped.c;
    this.searchL = mapped.l;
  }
}

class CvdSimulation {
  private static readonly searchCoarseChromaPartitions = 40;
  private static readonly searchCoarseLightnessPartitions = 80;
  private static readonly searchFineChromaPartitions = 80;
  private static readonly searchFineLightnessPartitions = 200;
  private static readonly searchRefinementLevels = 4;
  private static readonly searchRefinementRadius = 4;

  static color(
    rgb: RgbInterfaceType,
    cvd: CvdMatrixInterfaceType
  ): { readonly 'b': number; readonly 'g': number; readonly 'r': number; } {
  // Convert gamma-encoded sRGB → linear sRGB
    const lin = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);

    // Apply CVD matrix in linear sRGB
    const [rp, gp, bp] = Matrix.apply(cvd, lin.r, lin.g, lin.b);

    // Convert back to gamma-encoded sRGB
    const encoded = linearToSrgb.apply(rp, gp, bp);
    return { 'b': encoded.b, 'g': encoded.g, 'r': encoded.r };
  }

  static luminance(simulated: { readonly 'b': number; readonly 'g': number; readonly 'r': number; }): number {
    const linear = srgbToLinear.apply(simulated.r, simulated.g, simulated.b);
    return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
  }

  /** WCAG-21 style contrast ratio between two gamma-encoded sRGB triples.
 *  Used both for CVD-simulated contrast and, fed un-simulated triples,
 *  for the trichromat contrast of a correction candidate — the formula
 *  is identical either way. */
  static contrast(
    fg: { readonly 'b': number; readonly 'g': number; readonly 'r': number; },
    bg: { readonly 'b': number; readonly 'g': number; readonly 'r': number; }
  ): number {
    const l1 = CvdSimulation.luminance(fg);
    const l2 = CvdSimulation.luminance(bg);
    return CvdSimulation.contrastFromLuminances(l1, l2);
  }

  private static contrastFromLuminances(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** Evaluates a foreground/background rgb pair against every CVD matrix.
 *  Pure — no metadata writes, no logging. Shared by the initial
 *  detection pass and the post-correction final pass. */
  static evaluate(
    fgRgb: RgbInterfaceType,
    bgRgb: RgbInterfaceType,
    originalContrast: number
  ): CvdEvalInterfaceType[] {
    const EPS = 1e-12;
    const evals: CvdEvalInterfaceType[] = [];
    for (const cvd of cvdMatrices) {
      const threshold   = CVD_THRESHOLDS[cvd.name];
      const simulatedForeground = CvdSimulation.color(fgRgb, cvd);
      const simulatedBackground = CvdSimulation.color(bgRgb, cvd);
      const simContrast = CvdSimulation.contrast(simulatedForeground, simulatedBackground);
      const drop        = originalContrast - simContrast;

      const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude + EPS;
      const belowFloor   = simContrast < threshold.minSimulatedContrast - EPS;

      evals.push({
        'belowFloor':       belowFloor,
        'cvdType':          cvd.name,
        'drop':             drop,
        'exceedsDrop':      exceedsDrop,
        'fail':             exceedsDrop || belowFloor,
        'originalContrast': originalContrast,
        'simContrast':       simContrast
      });
    }
    return evals;
  }

  static failureTypes(
    foreground: ColorRecordInterfaceType,
    background: ColorRecordInterfaceType
  ): ReadonlySet<CvdEvalInterfaceType['cvdType']> {
    const contrast = contrastWcag21.apply(foreground, background);
    const evaluations = CvdSimulation.evaluate(foreground.rgb, background.rgb, contrast);
    const failureTypes = new Set<CvdEvalInterfaceType['cvdType']>();
    for (const evaluation of evaluations) {
      if (evaluation.fail) {
        failureTypes.add(evaluation.cvdType);
      }
    }
    return failureTypes;
  }

  /** Scores a candidate (l, c, h) against the requested CVD types,
 *  gated by the trichromat-contrast baseline. */
  private static scoreCandidate(
    candidate: CvdSearchColor,
    constraints: readonly CvdPairConstraint[]
  ): CvdCorrectionCandidate {
    const EPS = 1e-12;
    const emitted = candidate.emitted;
    const rgb = emitted.rgb;
    const foregroundLuminance = CvdSimulation.luminance(rgb);

    let trichromatContrast = Infinity;
    let worstSim = Infinity;
    let allClear  = true;
    for (const constraint of constraints) {
      const pairContrast = CvdSimulation.contrastFromLuminances(foregroundLuminance, constraint.backgroundLuminance);
      if (pairContrast < trichromatContrast) {
        trichromatContrast = pairContrast;
      }
      if (pairContrast + EPS < constraint.baseline) {
        allClear = false;
      }
    }

    if (!allClear) {
      return {
        'allClear': false,
        'baselineValid': false,
        'c': emitted.oklch.c,
        'failureCount': Number.POSITIVE_INFINITY,
        'failureSetValid': false,
        'l': emitted.oklch.l,
        'rgb': rgb,
        'searchC': candidate.searchC,
        'searchL': candidate.searchL,
        'trichromatContrast': trichromatContrast,
        'worstSim': 0
      };
    }

    const simulatedForegroundLuminances: number[] = [];
    for (const cvd of cvdMatrices) {
      simulatedForegroundLuminances.push(CvdSimulation.luminance(CvdSimulation.color(rgb, cvd)));
    }

    const cvdCount = cvdMatrices.length;
    let failureCount = 0;
    let failureSetValid = true;
    for (const constraint of constraints) {
      for (let cvdIndex = 0; cvdIndex < cvdCount; cvdIndex++) {
        const cvd = cvdMatrices.at(cvdIndex);
        const simulatedForegroundLuminance = simulatedForegroundLuminances.at(cvdIndex);
        const simulatedBackgroundLuminance = constraint.simulatedBackgroundLuminances.at(cvdIndex);
        if (cvd === undefined || simulatedForegroundLuminance === undefined || simulatedBackgroundLuminance === undefined) {
          allClear = false;
          failureCount++;
          failureSetValid = false;
          continue;
        }
        const threshold = CVD_THRESHOLDS[cvd.name];
        const simContrast = CvdSimulation.contrastFromLuminances(simulatedForegroundLuminance, simulatedBackgroundLuminance);
        const pairContrast = CvdSimulation.contrastFromLuminances(foregroundLuminance, constraint.backgroundLuminance);
        const drop = pairContrast - simContrast;
        const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude + EPS;
        const belowFloor = simContrast < threshold.minSimulatedContrast - EPS;

        if (exceedsDrop || belowFloor) {
          allClear = false;
          failureCount++;
          if (!constraint.originalFailureTypes.has(cvd.name)) {
            failureSetValid = false;
          }
        }
        if (simContrast < worstSim) {
          worstSim = simContrast;
        }
      }
    }

    return {
      'allClear': allClear,
      'baselineValid': true,
      'c': emitted.oklch.c,
      'failureCount': failureCount,
      'failureSetValid': failureSetValid,
      'l': emitted.oklch.l,
      'rgb': rgb,
      'searchC': candidate.searchC,
      'searchL': candidate.searchL,
      'trichromatContrast': trichromatContrast,
      'worstSim': worstSim
    };
  }

  private static searchGrid(
    selection: CvdCandidateSelection,
    originalC: number,
    h: number,
    constraints: readonly CvdPairConstraint[],
    lightnessPartitions: number,
    chromaPartitions: number,
    pruneByDistance: boolean,
    emittedColors: CvdEmittedColorCache
  ): void {
    for (let lightnessIndex = 0; lightnessIndex <= lightnessPartitions; lightnessIndex++) {
      const candidateL = lightnessIndex / lightnessPartitions;
      for (let chromaIndex = 0; chromaIndex <= chromaPartitions; chromaIndex++) {
        const candidateC = chromaPartitions === 0 ? 0 : originalC * chromaIndex / chromaPartitions;
        const candidate = new CvdSearchColor(candidateL, candidateC, h, emittedColors);
        if (pruneByDistance && !selection.couldImprove(candidate.emitted.oklch.l, candidate.emitted.oklch.c)) {
          continue;
        }
        selection.consider(CvdSimulation.scoreCandidate(candidate, constraints));
      }
    }
  }

  /**
   * Corrects one foreground against every background that declares it with a
   * bounded OKLCH search over the complete L boundary and the C=0 boundary.
   * Candidate RGB values are scored only after sRGB gamut mapping and a round
   * trip through their emitted 8-bit hex, so clipping or channel rounding cannot
   * masquerade as success. Among candidates that retain every pair's trichromat
   * baseline, deterministic coarse-to-fine refinement minimizes the remaining
   * pair/type failure count and then emitted-color OKLCH distance. Hue is held
   * constant throughout. A partial candidate is accepted
   * only when it fixes at least one original failure without introducing a new
   * CVD type on any pair; when no candidate improves the terminal constraints,
   * the original foreground is returned unchanged.
   */
  static correctForeground(
    group: CvdForegroundGroup,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache
  ): ColorRecordInterfaceType {
    const fgRecord = group.original;
    const fgL   = fgRecord.oklch.l;
    const c     = fgRecord.oklch.c;
    const h     = fgRecord.oklch.h;
    const alpha = fgRecord.alpha;
    const hints: ColorHintsInterfaceType | undefined = fgRecord.hints;
    const sourceFormat = fgRecord.sourceFormat;
    const coarseChromaPartitions = c === 0 ? 0 : CvdSimulation.searchCoarseChromaPartitions;
    const fineChromaPartitions = c === 0 ? 0 : CvdSimulation.searchFineChromaPartitions;
    const originalCandidate = CvdSimulation.scoreCandidate(
      new CvdSearchColor(fgL, c, h, emittedColors),
      constraints
    );
    const selection = new CvdCandidateSelection(fgRecord, CvdSimulation.originalFailureCount(constraints));

    if (originalCandidate.allClear) {
      return fgRecord;
    }
    CvdSimulation.searchGrid(
      selection,
      c,
      h,
      constraints,
      CvdSimulation.searchCoarseLightnessPartitions,
      coarseChromaPartitions,
      false,
      emittedColors
    );
    CvdSimulation.searchGrid(
      selection,
      c,
      h,
      constraints,
      CvdSimulation.searchFineLightnessPartitions,
      fineChromaPartitions,
      true,
      emittedColors
    );

    let best = selection.result();
    if (best === undefined) {
      return fgRecord;
    }

    let lightnessStep = 1 / CvdSimulation.searchFineLightnessPartitions;
    let chromaStep = fineChromaPartitions === 0 ? 0 : c / fineChromaPartitions;
    for (let level = 0; level < CvdSimulation.searchRefinementLevels; level++) {
      const centerL = best.searchL;
      const centerC = best.searchC;
      lightnessStep = lightnessStep / CvdSimulation.searchRefinementRadius;
      chromaStep = chromaStep / CvdSimulation.searchRefinementRadius;

      for (let lightnessOffset = -CvdSimulation.searchRefinementRadius; lightnessOffset <= CvdSimulation.searchRefinementRadius; lightnessOffset++) {
        const candidateL = clamp01.apply(centerL + lightnessOffset * lightnessStep);
        if (chromaStep === 0) {
          selection.consider(CvdSimulation.scoreCandidate(
            new CvdSearchColor(candidateL, 0, h, emittedColors),
            constraints
          ));
          continue;
        }
        for (let chromaOffset = -CvdSimulation.searchRefinementRadius; chromaOffset <= CvdSimulation.searchRefinementRadius; chromaOffset++) {
          const candidateC = Math.max(0, Math.min(c, centerC + chromaOffset * chromaStep));
          selection.consider(CvdSimulation.scoreCandidate(
            new CvdSearchColor(candidateL, candidateC, h, emittedColors),
            constraints
          ));
        }
      }
      best = selection.result();
      if (best === undefined) {
        return fgRecord;
      }
    }

    return colorRecordFactory.fromHex(rgbToHex.apply(best.rgb.r, best.rgb.g, best.rgb.b), {
      'alphaOverride': alpha,
      'hints':         hints,
      'sourceFormat':  sourceFormat
    });
  }

  static preservesBaselines(
    foreground: ColorRecordInterfaceType,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    const EPS = 1e-12;
    for (const constraint of constraints) {
      if (contrastWcag21.apply(foreground, constraint.background) + EPS < constraint.baseline) {
        return false;
      }
    }
    return true;
  }

  static improves(
    foreground: ColorRecordInterfaceType,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    return CvdSimulation.preservesBaselines(foreground, constraints)
      && CvdSimulation.preservesFailureSets(foreground, constraints)
      && CvdSimulation.failureCount(foreground, constraints) < CvdSimulation.originalFailureCount(constraints);
  }

  static preservesFailureSets(
    foreground: ColorRecordInterfaceType,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    for (const constraint of constraints) {
      const failureTypes = CvdSimulation.failureTypes(foreground, constraint.background);
      for (const failureType of failureTypes) {
        if (!constraint.originalFailureTypes.has(failureType)) {
          return false;
        }
      }
    }
    return true;
  }

  private static originalFailureCount(constraints: readonly CvdPairConstraint[]): number {
    let failureCount = 0;
    for (const constraint of constraints) {
      failureCount += constraint.originalFailureTypes.size;
    }
    return failureCount;
  }

  private static failureCount(
    foreground: ColorRecordInterfaceType,
    constraints: readonly CvdPairConstraint[]
  ): number {
    let failureCount = 0;
    for (const constraint of constraints) {
      const contrast = contrastWcag21.apply(foreground, constraint.background);
      const evaluations = CvdSimulation.evaluate(foreground.rgb, constraint.background.rgb, contrast);
      for (const evaluation of evaluations) {
        if (evaluation.fail) {
          failureCount++;
        }
      }
    }
    return failureCount;
  }
}

class CvdCandidateSelection {
  private bestAny: CvdCorrectionCandidate | undefined;
  private bestNonExtreme: CvdCorrectionCandidate | undefined;
  private readonly originalFailureCount: number;
  private readonly originalIsExtreme: boolean;
  private readonly originalC: number;
  private readonly originalL: number;

  constructor(original: ColorRecordInterfaceType, originalFailureCount: number) {
    this.bestAny = undefined;
    this.bestNonExtreme = undefined;
    this.originalFailureCount = originalFailureCount;
    this.originalIsExtreme = CvdCandidateSelection.isExtreme(original.rgb);
    this.originalC = original.oklch.c;
    this.originalL = original.oklch.l;
  }

  consider(candidate: CvdCorrectionCandidate): void {
    if (!candidate.baselineValid || !candidate.failureSetValid || candidate.failureCount >= this.originalFailureCount) {
      return;
    }
    if (this.prefer(candidate, this.bestAny)) {
      this.bestAny = candidate;
    }
    if (!CvdCandidateSelection.isExtreme(candidate.rgb) && this.prefer(candidate, this.bestNonExtreme)) {
      this.bestNonExtreme = candidate;
    }
  }

  couldImprove(candidateL: number, candidateC: number): boolean {
    const current = this.result();
    if (current === undefined) {
      return true;
    }
    const EPS = 1e-12;
    const candidateLowerBound = Math.hypot(candidateL - this.originalL, candidateC - this.originalC);
    const currentDistance = Math.hypot(current.l - this.originalL, current.c - this.originalC);
    return !current.allClear || candidateLowerBound <= currentDistance + EPS;
  }

  private prefer(candidate: CvdCorrectionCandidate, current: CvdCorrectionCandidate | undefined): boolean {
    if (current === undefined) {
      return true;
    }
    const EPS = 1e-12;
    if (candidate.failureCount < current.failureCount) {
      return true;
    }
    if (candidate.failureCount > current.failureCount) {
      return false;
    }
    const candidateDistance = Math.hypot(candidate.l - this.originalL, candidate.c - this.originalC);
    const currentDistance = Math.hypot(current.l - this.originalL, current.c - this.originalC);
    if (candidateDistance < currentDistance - EPS) {
      return true;
    }
    if (Math.abs(candidateDistance - currentDistance) <= EPS && candidate.c > current.c + EPS) {
      return true;
    }
    return false;
  }

  private static isExtreme(rgb: RgbInterfaceType): boolean {
    const HEX_ROUNDING_BOUNDARY = 0.5 / 255;
    const black = rgb.r < HEX_ROUNDING_BOUNDARY && rgb.g < HEX_ROUNDING_BOUNDARY && rgb.b < HEX_ROUNDING_BOUNDARY;
    const white = rgb.r >= 1 - HEX_ROUNDING_BOUNDARY && rgb.g >= 1 - HEX_ROUNDING_BOUNDARY && rgb.b >= 1 - HEX_ROUNDING_BOUNDARY;
    return black || white;
  }

  result(): CvdCorrectionCandidate | undefined {
    return !this.originalIsExtreme && this.bestNonExtreme !== undefined
      ? this.bestNonExtreme
      : this.bestAny;
  }
}

class CvdDependencyPlanner {
  private readonly components: CvdForegroundGroup[][];
  private currentIndex: number;
  private readonly indices: Map<string, number>;
  private readonly lowLinks: Map<string, number>;
  private readonly onStack: Set<string>;
  private readonly stack: CvdForegroundGroup[];

  constructor() {
    this.components = [];
    this.currentIndex = 0;
    this.indices = new Map();
    this.lowLinks = new Map();
    this.onStack = new Set();
    this.stack = [];
  }

  plan(groups: ReadonlyMap<string, CvdForegroundGroup>): CvdForegroundGroup[][] {
    for (const group of groups.values()) {
      if (this.indices.get(group.foreground) === undefined) {
        this.connect(group, groups);
      }
    }
    return this.components;
  }

  private connect(group: CvdForegroundGroup, groups: ReadonlyMap<string, CvdForegroundGroup>): void {
    const index = this.currentIndex;
    this.currentIndex++;
    this.indices.set(group.foreground, index);
    this.lowLinks.set(group.foreground, index);
    this.stack.push(group);
    this.onStack.add(group.foreground);

    for (const constraint of group.constraints) {
      const dependency = groups.get(constraint.backgroundName);
      if (dependency === undefined) {
        continue;
      }
      const dependencyIndex = this.indices.get(dependency.foreground);
      if (dependencyIndex === undefined) {
        this.connect(dependency, groups);
        const dependencyLowLink = this.lowLinks.get(dependency.foreground);
        const groupLowLink = this.lowLinks.get(group.foreground);
        if (dependencyLowLink !== undefined && groupLowLink !== undefined) {
          this.lowLinks.set(group.foreground, Math.min(groupLowLink, dependencyLowLink));
        }
      } else if (this.onStack.has(dependency.foreground)) {
        const groupLowLink = this.lowLinks.get(group.foreground);
        if (groupLowLink !== undefined) {
          this.lowLinks.set(group.foreground, Math.min(groupLowLink, dependencyIndex));
        }
      }
    }

    if (this.lowLinks.get(group.foreground) !== this.indices.get(group.foreground)) {
      return;
    }
    const component: CvdForegroundGroup[] = [];
    while (this.stack.length > 0) {
      const member = this.stack.pop();
      if (member === undefined) {
        break;
      }
      this.onStack.delete(member.foreground);
      component.push(member);
      if (member.foreground === group.foreground) {
        break;
      }
    }
    this.components.push(component);
  }
}

class CvdCorrectionCoordinator {
  private static readonly cycleIterations = 12;

  static resolve(
    groups: ReadonlyMap<string, CvdForegroundGroup>,
    originalRoles: ReadonlyMap<string, ColorRecordInterfaceType>
  ): Map<string, ColorRecordInterfaceType> {
    const resolvedRoles = new Map(originalRoles);
    const components = new CvdDependencyPlanner().plan(groups);
    const emittedColors = new CvdEmittedColorCache();
    for (const component of components) {
      const onlyGroup = component.length === 1 ? component.at(0) : undefined;
      if (onlyGroup !== undefined && !onlyGroup.dependsOn(onlyGroup.foreground)) {
        const constraints = onlyGroup.resolve(resolvedRoles);
        resolvedRoles.set(onlyGroup.foreground, CvdSimulation.correctForeground(onlyGroup, constraints, emittedColors));
        continue;
      }
      CvdCorrectionCoordinator.resolveCycle(component, resolvedRoles, emittedColors);
    }

    return CvdCorrectionCoordinator.audit(groups, resolvedRoles, originalRoles);
  }

  private static audit(
    groups: ReadonlyMap<string, CvdForegroundGroup>,
    resolvedRoles: Map<string, ColorRecordInterfaceType>,
    originalRoles: ReadonlyMap<string, ColorRecordInterfaceType>
  ): Map<string, ColorRecordInterfaceType> {
    for (let pass = 0; pass <= groups.size; pass++) {
      const invalid: CvdForegroundGroup[] = [];
      for (const group of groups.values()) {
        const foreground = resolvedRoles.get(group.foreground);
        if (foreground !== undefined && !CvdCorrectionCoordinator.isValid(group, foreground, resolvedRoles)) {
          invalid.push(group);
        }
      }
      if (invalid.length === 0) {
        return resolvedRoles;
      }

      let restored = false;
      for (const group of invalid) {
        const foreground = resolvedRoles.get(group.foreground);
        if (foreground !== undefined && foreground !== group.original) {
          resolvedRoles.set(group.foreground, group.original);
          restored = true;
          continue;
        }
        for (const constraint of group.constraints) {
          const dependency = groups.get(constraint.backgroundName);
          if (dependency !== undefined && resolvedRoles.get(dependency.foreground) !== dependency.original) {
            resolvedRoles.set(dependency.foreground, dependency.original);
            restored = true;
          }
        }
      }
      if (!restored) {
        break;
      }
    }
    return new Map(originalRoles);
  }

  private static isValid(
    group: CvdForegroundGroup,
    foreground: ColorRecordInterfaceType,
    resolvedRoles: ReadonlyMap<string, ColorRecordInterfaceType>
  ): boolean {
    const constraints = group.resolve(resolvedRoles);
    return CvdSimulation.preservesBaselines(foreground, constraints)
      && CvdSimulation.preservesFailureSets(foreground, constraints)
      && (foreground === group.original || CvdSimulation.improves(foreground, constraints));
  }

  private static resolveCycle(
    component: readonly CvdForegroundGroup[],
    resolvedRoles: Map<string, ColorRecordInterfaceType>,
    emittedColors: CvdEmittedColorCache
  ): void {
    for (let iteration = 0; iteration < CvdCorrectionCoordinator.cycleIterations; iteration++) {
      const snapshot = new Map(resolvedRoles);
      let stable = true;
      for (const group of component) {
        const constraints = group.resolve(snapshot);
        const corrected = CvdSimulation.correctForeground(group, constraints, emittedColors);
        const current = snapshot.get(group.foreground);
        if (current === undefined || !CvdCorrectionCoordinator.sameColor(current, corrected)) {
          stable = false;
        }
        resolvedRoles.set(group.foreground, corrected);
      }
      if (stable) {
        return;
      }
    }

    for (const group of component) {
      const foreground = resolvedRoles.get(group.foreground);
      if (foreground === undefined || !CvdCorrectionCoordinator.isValid(group, foreground, resolvedRoles)) {
        for (const member of component) {
          resolvedRoles.set(member.foreground, member.original);
        }
        return;
      }
    }
  }

  private static sameColor(a: ColorRecordInterfaceType, b: ColorRecordInterfaceType): boolean {
    const EPS = 1e-12;
    return Math.abs(a.rgb.r - b.rgb.r) <= EPS
      && Math.abs(a.rgb.g - b.rgb.g) <= EPS
      && Math.abs(a.rgb.b - b.rgb.b) <= EPS;
  }
}

/**
 * Evaluates every contrast pair against all four CVD types
 * (protanopia, deuteranopia, tritanopia, achromatopsia) and emits a
 * warning on `metadata['contrast:cvd'].warnings` for any pair × type whose
 * perceptual-stability signals violate the published thresholds in
 * `CVD_THRESHOLDS`. Two signals are evaluated per pair × type:
 *  - The magnitude of the trichromat-vs-simulated WCAG-21 contrast
 *    drop must not exceed `dropMagnitude` (perceptible-difference
 *    boundary per [CIE76] / [SWD05] mapped to WCAG ratio space).
 *  - The post-simulation WCAG-21 contrast must stay ≥
 *    `minSimulatedContrast` ([WCAG21] SC 1.4.11 non-text floor).
 *
 * Advisory only by default. When `state.input.contrast.cvdCorrect` is
 * `true`, a pair with one or more failing CVD types is additionally
 * corrected in-place. All pairs that share a foreground are optimized as one
 * constraint group. Role dependencies are solved from terminal backgrounds
 * toward their foreground consumers; strongly connected role sets use a
 * bounded deterministic iteration. A bounded OKLCH lightness/chroma search
 * chooses the closest in-gamut candidate among those with the fewest remaining
 * failures, without regressing any declared pair's trichromat contrast or
 * introducing a CVD failure type that the original pair did not have. A
 * graph-wide terminal audit rolls back only invalid dependent corrections
 * before staged writes are applied. Warnings and correction metadata describe
 * only those final values. If no valid candidate exists, the foreground remains
 * unchanged and its unresolved warnings remain advisory.
 */
class EnforceCvdSimulate implements TaskInterface {
  readonly 'name' = 'enforce:cvdSimulate';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'CVD simulation against published thresholds: protanopia, deuteranopia, tritanopia, achromatopsia. Advisory by default; when input.contrast.cvdCorrect is true, also auto-corrects failing pairs and writes roles.',
    'name':        'enforce:cvdSimulate',
    'phase':       undefined,
    'reads':       ['input.roles.contrastPairs', 'input.contrast.cvdCorrect', 'roles'],
    'requires':    undefined,
    'writes':      ['roles', 'metadata[\'contrast:cvd\']']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const cvdCorrect = state.input.contrast?.cvdCorrect === true;
    const warnings: CvdPairWarningInterfaceType[] = [];
    const corrections: CvdCorrectionInterfaceType[] = [];
    const emittedOriginalRoles = new Map<string, ColorRecordInterfaceType>();
    for (const roleName of Object.keys(state.roles)) {
      const role = state.roles[roleName];
      if (role !== undefined) {
        emittedOriginalRoles.set(roleName, colorRecordFactory.fromHex(role.hex, {
          'alphaOverride': role.alpha,
          'hints':         role.hints,
          'sourceFormat':  role.sourceFormat
        }));
      }
    }

    if (cvdCorrect) {
      const groups = new Map<string, CvdForegroundGroup>();
      for (const pair of pairs) {
        const foreground = emittedOriginalRoles.get(pair.foreground);
        const background = emittedOriginalRoles.get(pair.background);
        if (foreground === undefined || background === undefined) {
          continue;
        }
        let group = groups.get(pair.foreground);
        if (group === undefined) {
          group = new CvdForegroundGroup(pair.foreground, foreground);
          groups.set(pair.foreground, group);
        }
        group.add(pair.background, background);
      }

      const resolvedRoles = CvdCorrectionCoordinator.resolve(groups, emittedOriginalRoles);
      for (const group of groups.values()) {
        const corrected = resolvedRoles.get(group.foreground);
        if (corrected !== undefined && corrected !== group.original) {
          state.roles[group.foreground] = corrected;
        }
      }
    }

    for (const pair of pairs) {
      const storedForeground = state.roles[pair.foreground];
      const storedBackground = state.roles[pair.background];
      if (storedForeground === undefined || storedBackground === undefined) {
        continue;
      }
      const finalForeground = colorRecordFactory.fromHex(storedForeground.hex);
      const finalBackground = colorRecordFactory.fromHex(storedBackground.hex);
      const finalOriginalContrast = contrastWcag21.apply(finalForeground, finalBackground);
      const finalEvaluations = CvdSimulation.evaluate(finalForeground.rgb, finalBackground.rgb, finalOriginalContrast);
      const finalFailing: CvdEvalInterfaceType[] = [];
      for (const evaluation of finalEvaluations) {
        if (evaluation.fail) {
          finalFailing.push(evaluation);
        }
      }

      for (const evaluation of finalFailing) {
        warnings.push(CvdWarning.create(pair.foreground, pair.background, evaluation, context));
      }

      if (cvdCorrect && finalFailing.length > 0) {
        context.logger.warn(
          LogBody.create()
            .component('EnforceCvdSimulate')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('CVD correction could not clear every failing type')
            .context({
              'background':          pair.background,
              'foreground':          pair.foreground,
              'remainingCvdTypes':   finalFailing.map((evaluation) => {const result = evaluation.cvdType;
                return result;})
            })
            .build()
        );
      }

      const originalForeground = emittedOriginalRoles.get(pair.foreground);
      const originalBackground = emittedOriginalRoles.get(pair.background);
      if (cvdCorrect && originalForeground !== undefined && originalBackground !== undefined && finalForeground.hex !== originalForeground.hex) {
        const initialContrast = contrastWcag21.apply(originalForeground, originalBackground);
        const initialEvaluations = CvdSimulation.evaluate(originalForeground.rgb, originalBackground.rgb, initialContrast);
        const initialFailingNames: CvdEvalInterfaceType['cvdType'][] = [];
        for (const evaluation of initialEvaluations) {
          if (evaluation.fail) {
            initialFailingNames.push(evaluation.cvdType);
          }
        }
        const remainingNames: CvdEvalInterfaceType['cvdType'][] = [];
        for (const evaluation of finalFailing) {
          remainingNames.push(evaluation.cvdType);
        }
        const remainingNameSet = new Set(remainingNames);
        const fixedNames: CvdEvalInterfaceType['cvdType'][] = [];
        for (const name of initialFailingNames) {
          if (!remainingNameSet.has(name)) {
            fixedNames.push(name);
          }
        }
        if (fixedNames.length > 0) {
          corrections.push({
            'background':        pair.background,
            'cvdTypesFixed':     fixedNames,
            'cvdTypesRemaining': remainingNames,
            'foreground':        pair.foreground
          });
        }
      }
    }

    const cvdMetadata = cvdCorrect
      ? { 'corrections': corrections, 'warnings': warnings }
      : { 'warnings': warnings };
    state.metadata['contrast:cvd'] = cvdMetadata;

    context.logger.debug(
      LogBody.create()
        .component('EnforceCvdSimulate')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('CVD simulation complete')
        .context({
          'correctionCount': corrections.length,
          'cvdMeta':         cvdMetadata,
          'warningCount':    warnings.length
        })
        .build()
    );
  }
}

/** Builds a warning entry and emits the advisory log line — identical
 *  shape/message to the pre-correction behavior, reused for both the
 *  no-correction path and the post-correction final report. */
class CvdWarning {
  static create(
    foreground: string,
    background: string,
    evaluation: CvdEvalInterfaceType,
    context: PipelineContextInterface
  ): CvdPairWarningInterfaceType {
    const threshold = CVD_THRESHOLDS[evaluation.cvdType];
    const simulatedContrastRatio = evaluation.originalContrast === 0 ? 0 : evaluation.simContrast / evaluation.originalContrast;
    const simulatedContrastDropRatio = evaluation.originalContrast === 0 ? 0 : evaluation.drop / evaluation.originalContrast;
    const warning: CvdPairWarningInterfaceType = {
      'background':                  background,
      'cvdType':                     evaluation.cvdType,
      'drop':                        evaluation.drop,
      'dropThreshold':               threshold.dropMagnitude,
      'foreground':                  foreground,
      'minSimulatedContrast':        threshold.minSimulatedContrast,
      'originalLuminanceContrast':   evaluation.originalContrast,
      'simulatedContrastDropRatio':  simulatedContrastDropRatio,
      'simulatedContrastRatio':      simulatedContrastRatio,
      'simulatedLuminanceContrast':  evaluation.simContrast
    };
    context.logger.warn(
      LogBody.create()
        .component('EnforceCvdSimulate')
        .operation('run')
        .status(LOG_STATUS.PARTIAL)
        .message('CVD advisory: pair fails perceptual-stability threshold')
        .context({
          'background':            background,
          'cvdType':               evaluation.cvdType,
          'drop':                  evaluation.drop,
          'dropThreshold':         threshold.dropMagnitude,
          'foreground':            foreground,
          'minSimulatedContrast':  threshold.minSimulatedContrast,
          'originalContrast':      evaluation.originalContrast,
          'reason':                evaluation.exceedsDrop ? 'drop' : 'floor',
          'simulatedContrast':     evaluation.simContrast,
          'simulatedContrastDropRatio': simulatedContrastDropRatio,
          'simulatedContrastRatio': simulatedContrastRatio
        })
        .build()
    );
    return warning;
  }
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
