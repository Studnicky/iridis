import type {
  ColorHintsInterfaceTypeEntity,
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { clamp01, colorRecordFactory, contrastWcag21, gamutMapSrgb, linearToSrgb, oklchToRgbRaw, rgbToHex, srgbToLinear, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { CvdCorrectionInterfaceTypeEntity } from '../entities/CvdCorrectionInterfaceTypeEntity.ts';
import type { CvdEvalInterfaceTypeEntity } from '../entities/CvdEvalInterfaceTypeEntity.ts';
import type { CvdMatrixInterfaceTypeEntity } from '../entities/CvdMatrixInterfaceTypeEntity.ts';
import type { CvdPairWarningInterfaceTypeEntity } from '../entities/CvdPairWarningInterfaceTypeEntity.ts';

import { cvdMatrices } from '../data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../data/cvdThresholds.ts';

class CvdPairConstraint {
  readonly background: ColorRecordInterfaceTypeEntity.Type;
  readonly backgroundLuminance: number;
  readonly backgroundName: string;
  readonly baseline: number;
  readonly originalFailureTypes: ReadonlySet<CvdEvalInterfaceTypeEntity.Type['cvdType']>;
  readonly simulatedBackgroundLuminances: readonly number[];

  constructor(
    backgroundName: string,
    background: ColorRecordInterfaceTypeEntity.Type,
    baseline: number,
    originalFailureTypes: ReadonlySet<CvdEvalInterfaceTypeEntity.Type['cvdType']>
  ) {
    this.background = background;
    this.backgroundLuminance = CvdSimulation.luminance(background.rgb);
    this.backgroundName = backgroundName;
    this.baseline = baseline;
    this.originalFailureTypes = originalFailureTypes;
    const simulatedBackgroundLuminances: number[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd !== undefined) {
        simulatedBackgroundLuminances.push(CvdSimulation.luminance(CvdSimulation.color(background.rgb, cvd)));
      }
    }
    this.simulatedBackgroundLuminances = simulatedBackgroundLuminances;
  }
}

class CvdForegroundGroup {
  readonly constraints: CvdPairConstraint[];
  readonly foreground: string;
  readonly original: ColorRecordInterfaceTypeEntity.Type;

  constructor(foreground: string, original: ColorRecordInterfaceTypeEntity.Type) {
    this.constraints = [];
    this.foreground = foreground;
    this.original = original;
  }

  add(backgroundName: string, background: ColorRecordInterfaceTypeEntity.Type): void {
    this.constraints.push(new CvdPairConstraint(
      backgroundName,
      background,
      contrastWcag21.apply(this.original, background),
      CvdSimulation.failureTypes(this.original, background)
    ));
  }

  dependsOn(foreground: string): boolean {
    for (let constraintIndex = 0; constraintIndex < this.constraints.length; constraintIndex += 1) {
      const constraint = this.constraints[constraintIndex];
      if (constraint?.backgroundName === foreground) {
        return true;
      }
    }
    return false;
  }

  resolve(roles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): CvdPairConstraint[] {
    const resolved: CvdPairConstraint[] = [];
    for (let constraintIndex = 0; constraintIndex < this.constraints.length; constraintIndex += 1) {
      const constraint = this.constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
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

class CvdCorrectionCandidate {
  readonly c: number;
  readonly failureCount: number;
  readonly l: number;
  readonly novelFailureCount: number;
  readonly rgb: ColorRecordInterfaceTypeEntity.Type['rgb'];
  readonly searchC: number;
  readonly searchL: number;
  readonly trichromatBaselineDeficitCount: number;
  readonly trichromatContrast: number;
  readonly worstSim: number;

  constructor(
    c: number,
    failureCount: number,
    l: number,
    novelFailureCount: number,
    rgb: ColorRecordInterfaceTypeEntity.Type['rgb'],
    searchC: number,
    searchL: number,
    trichromatBaselineDeficitCount: number,
    trichromatContrast: number,
    worstSim: number
  ) {
    this.c = c;
    this.failureCount = failureCount;
    this.l = l;
    this.novelFailureCount = novelFailureCount;
    this.rgb = rgb;
    this.searchC = searchC;
    this.searchL = searchL;
    this.trichromatBaselineDeficitCount = trichromatBaselineDeficitCount;
    this.trichromatContrast = trichromatContrast;
    this.worstSim = worstSim;
  }
}

class Matrix {
  static apply(
    cvd: CvdMatrixInterfaceTypeEntity.Type,
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
  private readonly records: Map<string, ColorRecordInterfaceTypeEntity.Type>;

  constructor() {
    this.records = new Map();
  }

  fromRgb(rgb: ColorRecordInterfaceTypeEntity.Type['rgb']): ColorRecordInterfaceTypeEntity.Type {
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
  readonly emitted: ColorRecordInterfaceTypeEntity.Type;
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

abstract class CvdGridSearchPlan {
  abstract shouldScore(selection: CvdCandidateSelection, candidate: CvdSearchColor): boolean;
}

class CvdUnprunedGridSearchPlan extends CvdGridSearchPlan {
  shouldScore(_selection: CvdCandidateSelection, _candidate: CvdSearchColor): boolean {
    return true;
  }
}

class CvdDistancePrunedGridSearchPlan extends CvdGridSearchPlan {
  shouldScore(selection: CvdCandidateSelection, candidate: CvdSearchColor): boolean {
    const result = selection.couldImprove(candidate.emitted.oklch.l, candidate.emitted.oklch.c);
    return result;
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
    rgb: ColorRecordInterfaceTypeEntity.Type['rgb'],
    cvd: CvdMatrixInterfaceTypeEntity.Type
  ): ColorRecordInterfaceTypeEntity.Type['rgb'] {
  // Convert gamma-encoded sRGB → linear sRGB
    const lin = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);

    // Apply CVD matrix in linear sRGB
    const [rp, gp, bp] = Matrix.apply(cvd, lin.r, lin.g, lin.b);

    // Convert back to gamma-encoded sRGB
    const encoded = linearToSrgb.apply(rp, gp, bp);
    const result = { 'b': encoded.b, 'g': encoded.g, 'r': encoded.r };
    return result;
  }

  static luminance(simulated: { readonly 'b': number; readonly 'g': number; readonly 'r': number; }): number {
    const linear = srgbToLinear.apply(simulated.r, simulated.g, simulated.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
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
    const result = CvdSimulation.contrastFromLuminances(l1, l2);
    return result;
  }

  private static contrastFromLuminances(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    const result = (lighter + 0.05) / (darker + 0.05);
    return result;
  }

  /** Evaluates a foreground/background rgb pair against every CVD matrix.
 *  Pure — no metadata writes, no logging. Shared by the initial
 *  detection pass and the post-correction final pass. */
  static evaluate(
    fgRgb: ColorRecordInterfaceTypeEntity.Type['rgb'],
    bgRgb: ColorRecordInterfaceTypeEntity.Type['rgb'],
    originalContrast: number
  ): CvdEvalInterfaceTypeEntity.Type[] {
    const EPS = 1e-12;
    const evals: CvdEvalInterfaceTypeEntity.Type[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd === undefined) {
        continue;
      }
      const threshold = CvdSimulation.thresholdFor(cvd);
      const simulatedForeground = CvdSimulation.color(fgRgb, cvd);
      const simulatedBackground = CvdSimulation.color(bgRgb, cvd);
      const simContrast = CvdSimulation.contrast(simulatedForeground, simulatedBackground);
      const drop        = originalContrast - simContrast;

      const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude + EPS;
      const belowFloor   = simContrast < threshold.minimumSimulatedContrast - EPS;

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
    foreground: ColorRecordInterfaceTypeEntity.Type,
    background: ColorRecordInterfaceTypeEntity.Type
  ): ReadonlySet<CvdEvalInterfaceTypeEntity.Type['cvdType']> {
    const contrast = contrastWcag21.apply(foreground, background);
    const evaluations = CvdSimulation.evaluate(foreground.rgb, background.rgb, contrast);
    const failureTypes = new Set<CvdEvalInterfaceTypeEntity.Type['cvdType']>();
    for (let evaluationIndex = 0; evaluationIndex < evaluations.length; evaluationIndex += 1) {
      const evaluation = evaluations[evaluationIndex];
      if (evaluation?.fail === true) {
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
    const epsilon = 1e-12;
    const emitted = candidate.emitted;
    const foregroundLuminance = CvdSimulation.luminance(emitted.rgb);
    const baseline = CvdSimulation.measureBaselines(foregroundLuminance, constraints, epsilon);
    if (baseline.deficitCount > 0) {
      return new CvdCorrectionCandidate(
        emitted.oklch.c,
        0,
        emitted.oklch.l,
        0,
        emitted.rgb,
        candidate.searchC,
        candidate.searchL,
        baseline.deficitCount,
        baseline.minimumContrast,
        0
      );
    }
    const simulations = CvdSimulation.measureSimulations(
      foregroundLuminance,
      emitted.rgb,
      constraints,
      epsilon
    );
    return new CvdCorrectionCandidate(
      emitted.oklch.c,
      simulations.failureCount,
      emitted.oklch.l,
      simulations.novelFailureCount,
      emitted.rgb,
      candidate.searchC,
      candidate.searchL,
      baseline.deficitCount,
      baseline.minimumContrast,
      simulations.worstContrast
    );
  }

  private static measureBaselines(
    foregroundLuminance: number,
    constraints: readonly CvdPairConstraint[],
    epsilon: number
  ): { readonly 'deficitCount': number; readonly 'minimumContrast': number; } {
    let deficitCount = 0;
    let minimumContrast = Infinity;
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const contrast = CvdSimulation.contrastFromLuminances(foregroundLuminance, constraint.backgroundLuminance);
      if (contrast < minimumContrast) {
        minimumContrast = contrast;
      }
      if (contrast + epsilon < constraint.baseline) {
        deficitCount += 1;
      }
    }
    return { 'deficitCount': deficitCount, 'minimumContrast': minimumContrast };
  }

  private static measureSimulations(
    foregroundLuminance: number,
    rgb: ColorRecordInterfaceTypeEntity.Type['rgb'],
    constraints: readonly CvdPairConstraint[],
    epsilon: number
  ): { readonly 'failureCount': number; readonly 'novelFailureCount': number; readonly 'worstContrast': number; } {
    const foregroundLuminances = CvdSimulation.simulatedLuminances(rgb);
    let failureCount = 0;
    let novelFailureCount = 0;
    let worstContrast = Infinity;
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const measurements = CvdSimulation.measureConstraintSimulations(
        constraint,
        foregroundLuminance,
        foregroundLuminances,
        epsilon
      );
      failureCount += measurements.failureCount;
      novelFailureCount += measurements.novelFailureCount;
      if (measurements.worstContrast < worstContrast) {
        worstContrast = measurements.worstContrast;
      }
    }
    return { 'failureCount': failureCount, 'novelFailureCount': novelFailureCount, 'worstContrast': worstContrast };
  }

  private static measureConstraintSimulations(
    constraint: CvdPairConstraint,
    foregroundLuminance: number,
    foregroundLuminances: readonly number[],
    epsilon: number
  ): { readonly 'failureCount': number; readonly 'novelFailureCount': number; readonly 'worstContrast': number; } {
    let failureCount = 0;
    let novelFailureCount = 0;
    let worstContrast = Infinity;
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const measurement = CvdSimulation.measureSimulationAt(cvdIndex, constraint, foregroundLuminance, foregroundLuminances, epsilon);
      failureCount += measurement.failureCount;
      novelFailureCount += measurement.novelFailureCount;
      if (measurement.simulatedContrast < worstContrast) {
        worstContrast = measurement.simulatedContrast;
      }
    }
    return { 'failureCount': failureCount, 'novelFailureCount': novelFailureCount, 'worstContrast': worstContrast };
  }

  private static measureSimulationAt(
    cvdIndex: number,
    constraint: CvdPairConstraint,
    foregroundLuminance: number,
    foregroundLuminances: readonly number[],
    epsilon: number
  ): { readonly 'failureCount': number; readonly 'novelFailureCount': number; readonly 'simulatedContrast': number; } {
    const cvd = cvdMatrices[cvdIndex];
    const simulatedForegroundLuminance = foregroundLuminances[cvdIndex];
    const simulatedBackgroundLuminance = constraint.simulatedBackgroundLuminances[cvdIndex];
    if (cvd === undefined || simulatedForegroundLuminance === undefined || simulatedBackgroundLuminance === undefined) {
      throw new TypeError('CVD simulation matrices and luminance measurements are misaligned');
    }
    const threshold = CvdSimulation.thresholdFor(cvd);
    const simulatedContrast = CvdSimulation.contrastFromLuminances(simulatedForegroundLuminance, simulatedBackgroundLuminance);
    const contrast = CvdSimulation.contrastFromLuminances(foregroundLuminance, constraint.backgroundLuminance);
    const failed = Math.abs(contrast - simulatedContrast) > threshold.dropMagnitude + epsilon
      || simulatedContrast < threshold.minimumSimulatedContrast - epsilon;
    const failureCount = failed ? 1 : 0;
    const novelFailureCount = failed && !constraint.originalFailureTypes.has(cvd.name) ? 1 : 0;
    return { 'failureCount': failureCount, 'novelFailureCount': novelFailureCount, 'simulatedContrast': simulatedContrast };
  }

  private static simulatedLuminances(rgb: ColorRecordInterfaceTypeEntity.Type['rgb']): number[] {
    const luminances: number[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd === undefined) {
        throw new TypeError('CVD simulation matrix is missing');
      }
      luminances.push(CvdSimulation.luminance(CvdSimulation.color(rgb, cvd)));
    }
    return luminances;
  }

  private static thresholdFor(cvd: CvdMatrixInterfaceTypeEntity.Type): { readonly 'dropMagnitude': number; readonly 'minimumSimulatedContrast': number; } {
    if (cvd.name === 'achromatopsia') {
      const result = CVD_THRESHOLDS.achromatopsia;
      return result;
    }
    if (cvd.name === 'deuteranopia') {
      const result = CVD_THRESHOLDS.deuteranopia;
      return result;
    }
    if (cvd.name === 'protanopia') {
      const result = CVD_THRESHOLDS.protanopia;
      return result;
    }
    const result = CVD_THRESHOLDS.tritanopia;
    return result;
  }

  private static searchGrid(
    selection: CvdCandidateSelection,
    originalC: number,
    h: number,
    constraints: readonly CvdPairConstraint[],
    lightnessPartitions: number,
    chromaPartitions: number,
    searchPlan: CvdGridSearchPlan,
    emittedColors: CvdEmittedColorCache
  ): void {
    for (let lightnessIndex = 0; lightnessIndex <= lightnessPartitions; lightnessIndex += 1) {
      const candidateL = lightnessIndex / lightnessPartitions;
      for (let chromaIndex = 0; chromaIndex <= chromaPartitions; chromaIndex += 1) {
        const candidateC = chromaPartitions === 0 ? 0 : originalC * chromaIndex / chromaPartitions;
        const candidate = new CvdSearchColor(candidateL, candidateC, h, emittedColors);
        if (!searchPlan.shouldScore(selection, candidate)) {
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
  ): ColorRecordInterfaceTypeEntity.Type {
    const fgRecord = group.original;
    const fgL   = fgRecord.oklch.l;
    const c     = fgRecord.oklch.c;
    const h     = fgRecord.oklch.h;
    const alpha = fgRecord.alpha;
    const hints: ColorHintsInterfaceTypeEntity.Type | undefined = fgRecord.hints;
    const sourceFormat = fgRecord.sourceFormat;
    const coarseChromaPartitions = c === 0 ? 0 : CvdSimulation.searchCoarseChromaPartitions;
    const fineChromaPartitions = c === 0 ? 0 : CvdSimulation.searchFineChromaPartitions;
    const originalCandidate = CvdSimulation.scoreCandidate(
      new CvdSearchColor(fgL, c, h, emittedColors),
      constraints
    );
    const selection = new CvdCandidateSelection(fgRecord, CvdSimulation.originalFailureCount(constraints));

    if (CvdCandidateSelection.clearsAll(originalCandidate)) {
      return fgRecord;
    }
    CvdSimulation.searchInitialGrids(selection, c, h, constraints, coarseChromaPartitions, fineChromaPartitions, emittedColors);

    let best = selection.result();
    if (best === undefined) {
      return fgRecord;
    }

    best = CvdSimulation.refine(selection, best, c, h, fineChromaPartitions, constraints, emittedColors);
    if (best === undefined) {
      return fgRecord;
    }

    const result = colorRecordFactory.fromHex(rgbToHex.apply(best.rgb.r, best.rgb.g, best.rgb.b), {
      'alphaOverride': alpha,
      'hints':         hints,
      'sourceFormat':  sourceFormat
    });
    return result;
  }

  private static refine(selection: CvdCandidateSelection, initial: CvdCorrectionCandidate, c: number, h: number, fineChromaPartitions: number, constraints: readonly CvdPairConstraint[], emittedColors: CvdEmittedColorCache): CvdCorrectionCandidate | undefined {
    let best: CvdCorrectionCandidate | undefined = initial;
    let lightnessStep = 1 / CvdSimulation.searchFineLightnessPartitions;
    let chromaStep = fineChromaPartitions === 0 ? 0 : c / fineChromaPartitions;
    for (let level = 0; level < CvdSimulation.searchRefinementLevels; level += 1) {
      if (best === undefined) {return undefined;}
      lightnessStep /= CvdSimulation.searchRefinementRadius;
      chromaStep /= CvdSimulation.searchRefinementRadius;
      CvdSimulation.refineAt(selection, best, lightnessStep, chromaStep, c, h, constraints, emittedColors);
      best = selection.result();
    }
    return best;
  }

  private static refineAt(selection: CvdCandidateSelection, best: CvdCorrectionCandidate, lightnessStep: number, chromaStep: number, c: number, h: number, constraints: readonly CvdPairConstraint[], emittedColors: CvdEmittedColorCache): void {
    for (let lightnessOffset = -CvdSimulation.searchRefinementRadius; lightnessOffset <= CvdSimulation.searchRefinementRadius; lightnessOffset += 1) {
      const lightness = clamp01.apply(best.searchL + lightnessOffset * lightnessStep);
      CvdSimulation.refineChroma(selection, lightness, best.searchC, chromaStep, c, h, constraints, emittedColors);
    }
  }

  private static refineChroma(selection: CvdCandidateSelection, lightness: number, centerC: number, chromaStep: number, c: number, h: number, constraints: readonly CvdPairConstraint[], emittedColors: CvdEmittedColorCache): void {
    const start = chromaStep === 0 ? 0 : -CvdSimulation.searchRefinementRadius;
    const end = chromaStep === 0 ? 0 : CvdSimulation.searchRefinementRadius;
    for (let chromaOffset = start; chromaOffset <= end; chromaOffset += 1) {
      const chroma = chromaStep === 0 ? 0 : Math.max(0, Math.min(c, centerC + chromaOffset * chromaStep));
      selection.consider(CvdSimulation.scoreCandidate(new CvdSearchColor(lightness, chroma, h, emittedColors), constraints));
    }
  }

  private static searchInitialGrids(selection: CvdCandidateSelection, c: number, h: number, constraints: readonly CvdPairConstraint[], coarseChromaPartitions: number, fineChromaPartitions: number, emittedColors: CvdEmittedColorCache): void {
    CvdSimulation.searchGrid(selection, c, h, constraints, CvdSimulation.searchCoarseLightnessPartitions, coarseChromaPartitions, new CvdUnprunedGridSearchPlan(), emittedColors);
    CvdSimulation.searchGrid(selection, c, h, constraints, CvdSimulation.searchFineLightnessPartitions, fineChromaPartitions, new CvdDistancePrunedGridSearchPlan(), emittedColors);
  }

  static preservesBaselines(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    const EPS = 1e-12;
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint !== undefined && contrastWcag21.apply(foreground, constraint.background) + EPS < constraint.baseline) {
        return false;
      }
    }
    return true;
  }

  static improves(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    const result = CvdSimulation.preservesBaselines(foreground, constraints)
      && CvdSimulation.preservesFailureSets(foreground, constraints)
      && CvdSimulation.failureCount(foreground, constraints) < CvdSimulation.originalFailureCount(constraints);
    return result;
  }

  static preservesFailureSets(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
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
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint !== undefined) {
        failureCount += constraint.originalFailureTypes.size;
      }
    }
    return failureCount;
  }

  private static failureCount(
    foreground: ColorRecordInterfaceTypeEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): number {
    let failureCount = 0;
    for (let constraintIndex = 0; constraintIndex < constraints.length; constraintIndex += 1) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const contrast = contrastWcag21.apply(foreground, constraint.background);
      const evaluations = CvdSimulation.evaluate(foreground.rgb, constraint.background.rgb, contrast);
      for (let evaluationIndex = 0; evaluationIndex < evaluations.length; evaluationIndex += 1) {
        const evaluation = evaluations[evaluationIndex];
        if (evaluation === undefined) {
          continue;
        }
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
  private readonly originalC: number;
  private readonly originalL: number;
  private readonly originalRgb: ColorRecordInterfaceTypeEntity.Type['rgb'];

  constructor(original: ColorRecordInterfaceTypeEntity.Type, originalFailureCount: number) {
    this.bestAny = undefined;
    this.bestNonExtreme = undefined;
    this.originalFailureCount = originalFailureCount;
    this.originalC = original.oklch.c;
    this.originalL = original.oklch.l;
    this.originalRgb = original.rgb;
  }

  static clearsAll(candidate: CvdCorrectionCandidate): boolean {
    const result = candidate.trichromatBaselineDeficitCount === 0
      && candidate.failureCount === 0
      && candidate.novelFailureCount === 0;
    return result;
  }

  consider(candidate: CvdCorrectionCandidate): void {
    if (!this.isEligible(candidate)) {
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
    const epsilon = 1e-12;
    const candidateLowerBound = Math.hypot(candidateL - this.originalL, candidateC - this.originalC);
    const currentDistance = Math.hypot(current.l - this.originalL, current.c - this.originalC);
    const result = !CvdCandidateSelection.clearsAll(current) || candidateLowerBound <= currentDistance + epsilon;
    return result;
  }

  result(): CvdCorrectionCandidate | undefined {
    const result = !CvdCandidateSelection.isExtreme(this.originalRgb) && this.bestNonExtreme !== undefined
      ? this.bestNonExtreme
      : this.bestAny;
    return result;
  }

  private isEligible(candidate: CvdCorrectionCandidate): boolean {
    const result = candidate.trichromatBaselineDeficitCount === 0
      && candidate.novelFailureCount === 0
      && candidate.failureCount < this.originalFailureCount;
    return result;
  }

  private prefer(candidate: CvdCorrectionCandidate, current: CvdCorrectionCandidate | undefined): boolean {
    if (current === undefined) {
      return true;
    }
    const epsilon = 1e-12;
    if (candidate.failureCount < current.failureCount) {
      return true;
    }
    if (candidate.failureCount > current.failureCount) {
      return false;
    }
    const candidateDistance = Math.hypot(candidate.l - this.originalL, candidate.c - this.originalC);
    const currentDistance = Math.hypot(current.l - this.originalL, current.c - this.originalC);
    if (candidateDistance < currentDistance - epsilon) {
      return true;
    }
    const result = Math.abs(candidateDistance - currentDistance) <= epsilon && candidate.c > current.c + epsilon;
    return result;
  }

  private static isExtreme(rgb: ColorRecordInterfaceTypeEntity.Type['rgb']): boolean {
    const hexRoundingBoundary = 0.5 / 255;
    const result = (rgb.r < hexRoundingBoundary && rgb.g < hexRoundingBoundary && rgb.b < hexRoundingBoundary)
      || (rgb.r >= 1 - hexRoundingBoundary && rgb.g >= 1 - hexRoundingBoundary && rgb.b >= 1 - hexRoundingBoundary);
    return result;
  }
}

class CvdDependencyPlanner {
  private readonly components: CvdForegroundGroup[][] = [];
  private currentIndex = 0;
  private readonly indices = new Map<string, number>();
  private readonly lowLinks = new Map<string, number>();
  private readonly onStack = new Set<string>();
  private readonly stack: CvdForegroundGroup[] = [];

  plan(groups: ReadonlyMap<string, CvdForegroundGroup>): CvdForegroundGroup[][] {
    const values = Array.from(groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (group !== undefined && this.indices.get(group.foreground) === undefined) {
        this.connect(group, groups);
      }
    }
    const result = this.components;
    return result;
  }

  private connect(group: CvdForegroundGroup, groups: ReadonlyMap<string, CvdForegroundGroup>): void {
    this.enter(group);
    this.connectDependencies(group, groups);
    this.completeComponent(group);
  }

  private enter(group: CvdForegroundGroup): void {
    this.indices.set(group.foreground, this.currentIndex);
    this.lowLinks.set(group.foreground, this.currentIndex);
    this.currentIndex += 1;
    this.stack.push(group);
    this.onStack.add(group.foreground);
  }

  private connectDependencies(group: CvdForegroundGroup, groups: ReadonlyMap<string, CvdForegroundGroup>): void {
    for (let index = 0; index < group.constraints.length; index += 1) {
      const constraint = group.constraints[index];
      if (constraint !== undefined) {
        this.connectDependency(group, constraint, groups);
      }
    }
  }

  private connectDependency(group: CvdForegroundGroup, constraint: CvdPairConstraint, groups: ReadonlyMap<string, CvdForegroundGroup>): void {
    const dependency = groups.get(constraint.backgroundName);
    if (dependency === undefined) {return;}
    const dependencyIndex = this.indices.get(dependency.foreground);
    if (dependencyIndex === undefined) {
      this.connect(dependency, groups);
      this.updateLowLink(group.foreground, this.lowLinks.get(dependency.foreground));
      return;
    }
    if (this.onStack.has(dependency.foreground)) {
      this.updateLowLink(group.foreground, dependencyIndex);
    }
  }

  private updateLowLink(foreground: string, candidate: number | undefined): void {
    const current = this.lowLinks.get(foreground);
    if (current !== undefined && candidate !== undefined) {
      this.lowLinks.set(foreground, Math.min(current, candidate));
    }
  }

  private completeComponent(group: CvdForegroundGroup): void {
    if (this.lowLinks.get(group.foreground) !== this.indices.get(group.foreground)) {return;}
    const component: CvdForegroundGroup[] = [];
    while (this.stack.length > 0) {
      const member = this.stack.pop();
      if (member === undefined) {break;}
      this.onStack.delete(member.foreground);
      component.push(member);
      if (member.foreground === group.foreground) {break;}
    }
    this.components.push(component);
  }
}

class CvdCorrectionCoordinator {
  private static readonly cycleIterations = 12;

  static resolve(groups: ReadonlyMap<string, CvdForegroundGroup>, originalRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const resolvedRoles = new Map(originalRoles);
    const components = new CvdDependencyPlanner().plan(groups);
    const emittedColors = new CvdEmittedColorCache();
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      if (component !== undefined) {CvdCorrectionCoordinator.resolveComponent(component, resolvedRoles, emittedColors);}
    }
    const result = CvdCorrectionCoordinator.audit(groups, resolvedRoles, originalRoles);
    return result;
  }

  private static resolveComponent(component: readonly CvdForegroundGroup[], resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>, emittedColors: CvdEmittedColorCache): void {
    const group = component.length === 1 ? component[0] : undefined;
    if (group !== undefined && !group.dependsOn(group.foreground)) {
      const constraints = group.resolve(resolvedRoles);
      resolvedRoles.set(group.foreground, CvdSimulation.correctForeground(group, constraints, emittedColors));
      return;
    }
    CvdCorrectionCoordinator.resolveCycle(component, resolvedRoles, emittedColors);
  }

  private static audit(groups: ReadonlyMap<string, CvdForegroundGroup>, resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>, originalRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    for (let pass = 0; pass <= groups.size; pass += 1) {
      const invalid = CvdCorrectionCoordinator.invalidGroups(groups, resolvedRoles);
      if (invalid.length === 0) {return resolvedRoles;}
      if (!CvdCorrectionCoordinator.restoreInvalidGroups(invalid, groups, resolvedRoles)) {break;}
    }
    const result = new Map(originalRoles);
    return result;
  }

  private static invalidGroups(groups: ReadonlyMap<string, CvdForegroundGroup>, resolvedRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): CvdForegroundGroup[] {
    const invalid: CvdForegroundGroup[] = [];
    const values = Array.from(groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (group !== undefined && !CvdCorrectionCoordinator.isResolvedGroupValid(group, resolvedRoles)) {invalid.push(group);}
    }
    return invalid;
  }

  private static isResolvedGroupValid(group: CvdForegroundGroup, resolvedRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): boolean {
    const foreground = resolvedRoles.get(group.foreground);
    const result = foreground !== undefined && CvdCorrectionCoordinator.isValid(group, foreground, resolvedRoles);
    return result;
  }

  private static restoreInvalidGroups(invalid: readonly CvdForegroundGroup[], groups: ReadonlyMap<string, CvdForegroundGroup>, resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>): boolean {
    let restoredCount = 0;
    for (let index = 0; index < invalid.length; index += 1) {
      const group = invalid[index];
      if (group !== undefined) {restoredCount += CvdCorrectionCoordinator.restoreGroup(group, groups, resolvedRoles);}
    }
    const result = restoredCount > 0;
    return result;
  }

  private static restoreGroup(group: CvdForegroundGroup, groups: ReadonlyMap<string, CvdForegroundGroup>, resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>): number {
    const foreground = resolvedRoles.get(group.foreground);
    if (foreground !== undefined && foreground !== group.original) {
      resolvedRoles.set(group.foreground, group.original);
      return 1;
    }
    let restoredCount = 0;
    for (let index = 0; index < group.constraints.length; index += 1) {
      const constraint = group.constraints[index];
      const dependency = constraint === undefined ? undefined : groups.get(constraint.backgroundName);
      if (dependency !== undefined && resolvedRoles.get(dependency.foreground) !== dependency.original) {
        resolvedRoles.set(dependency.foreground, dependency.original);
        restoredCount += 1;
      }
    }
    return restoredCount;
  }

  private static isValid(group: CvdForegroundGroup, foreground: ColorRecordInterfaceTypeEntity.Type, resolvedRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): boolean {
    const constraints = group.resolve(resolvedRoles);
    const result = CvdSimulation.preservesBaselines(foreground, constraints)
      && CvdSimulation.preservesFailureSets(foreground, constraints)
      && (foreground === group.original || CvdSimulation.improves(foreground, constraints));
    return result;
  }

  private static resolveCycle(component: readonly CvdForegroundGroup[], resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>, emittedColors: CvdEmittedColorCache): void {
    for (let iteration = 0; iteration < CvdCorrectionCoordinator.cycleIterations; iteration += 1) {
      if (CvdCorrectionCoordinator.applyCycle(component, resolvedRoles, emittedColors)) {return;}
    }
    if (!CvdCorrectionCoordinator.allValid(component, resolvedRoles)) {CvdCorrectionCoordinator.restoreComponent(component, resolvedRoles);}
  }

  private static applyCycle(component: readonly CvdForegroundGroup[], resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>, emittedColors: CvdEmittedColorCache): boolean {
    const snapshot = new Map(resolvedRoles);
    let unchangedCount = 0;
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (group === undefined) {continue;}
      const corrected = CvdSimulation.correctForeground(group, group.resolve(snapshot), emittedColors);
      const current = snapshot.get(group.foreground);
      if (current !== undefined && CvdCorrectionCoordinator.sameColor(current, corrected)) {unchangedCount += 1;}
      resolvedRoles.set(group.foreground, corrected);
    }
    const result = unchangedCount === component.length;
    return result;
  }

  private static allValid(component: readonly CvdForegroundGroup[], resolvedRoles: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): boolean {
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (group !== undefined && !CvdCorrectionCoordinator.isResolvedGroupValid(group, resolvedRoles)) {return false;}
    }
    return true;
  }

  private static restoreComponent(component: readonly CvdForegroundGroup[], resolvedRoles: Map<string, ColorRecordInterfaceTypeEntity.Type>): void {
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (group !== undefined) {resolvedRoles.set(group.foreground, group.original);}
    }
  }

  private static sameColor(a: ColorRecordInterfaceTypeEntity.Type, b: ColorRecordInterfaceTypeEntity.Type): boolean {
    const epsilon = 1e-12;
    const result = Math.abs(a.rgb.r - b.rgb.r) <= epsilon && Math.abs(a.rgb.g - b.rgb.g) <= epsilon && Math.abs(a.rgb.b - b.rgb.b) <= epsilon;
    return result;
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
 *    `minimumSimulatedContrast` ([WCAG21] SC 1.4.11 non-text floor).
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

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'CVD simulation against published thresholds: protanopia, deuteranopia, tritanopia, achromatopsia. Advisory by default; when input.contrast.cvdCorrect is true, also auto-corrects failing pairs and writes roles.',
    'name':        'enforce:cvdSimulate',
    'reads':       ['input.roles.contrastPairs', 'input.contrast.cvdCorrect', 'roles'],
    'writes':      ['roles', 'metadata[\'contrast:cvd\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }
    const originals = this.snapshotRoles(state);
    const correcting = state.input.contrast?.cvdCorrect === true;
    if (correcting) {
      this.correctRoles(pairs, originals, state);
    }
    const results = correcting
      ? this.reportCorrected(pairs, originals, state, context)
      : this.reportAdvisory(pairs, originals, state, context);
    const metadata = { 'corrections': results.corrections, 'warnings': results.warnings };
    state.metadata['contrast:cvd'] = metadata;
    context.logger.debug(LogBody.create({ 'component': 'EnforceCvdSimulate', 'context': { 'correctionCount': results.corrections.length, 'cvdMeta': metadata, 'warningCount': results.warnings.length }, 'message': 'CVD simulation complete', 'operation': 'run', 'status': LOG_STATUS.SUCCESS }));
  }

  private reportSummary(warnings: readonly CvdPairWarningInterfaceTypeEntity.Type[], message: string, context: PipelineContextInterface): void {
    if (warnings.length === 0) {
      return;
    }
    const cvdTypes = new Set<string>();
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning !== undefined) {cvdTypes.add(warning.cvdType);}
    }
    context.logger.warn(LogBody.create({ 'component': 'EnforceCvdSimulate', 'context': { 'cvdTypes': Array.from(cvdTypes), 'warningCount': warnings.length }, 'message': message, 'operation': 'reportSummary', 'status': LOG_STATUS.PARTIAL }));
  }

  private snapshotRoles(state: PaletteStateInterface): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const originals = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    const entries = Object.entries(state.roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      const [name, role] = entry;
      originals.set(name, colorRecordFactory.fromHex(role.hex, { 'alphaOverride': role.alpha, 'hints': role.hints, 'sourceFormat': role.sourceFormat }));
    }
    return originals;
  }

  private correctRoles(pairs: readonly { readonly 'background': string; readonly 'foreground': string; }[], originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, state: PaletteStateInterface): void {
    const groups = this.groupsFor(pairs, originals);
    const resolved = CvdCorrectionCoordinator.resolve(groups, originals);
    const values = Array.from(groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (group === undefined) {continue;}
      const corrected = resolved.get(group.foreground);
      if (corrected !== undefined && corrected !== group.original) {
        Object.defineProperty(state.roles, group.foreground, { 'configurable': true, 'enumerable': true, 'value': corrected, 'writable': true });
      }
    }
  }

  private groupsFor(pairs: readonly { readonly 'background': string; readonly 'foreground': string; }[], originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>): Map<string, CvdForegroundGroup> {
    const groups = new Map<string, CvdForegroundGroup>();
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair === undefined) {continue;}
      const foreground = originals.get(pair.foreground);
      const background = originals.get(pair.background);
      if (foreground === undefined || background === undefined) {continue;}
      let group = groups.get(pair.foreground);
      if (group === undefined) {
        group = new CvdForegroundGroup(pair.foreground, foreground);
        groups.set(pair.foreground, group);
      }
      group.add(pair.background, background);
    }
    return groups;
  }

  private reportCorrected(pairs: readonly { readonly 'background': string; readonly 'foreground': string; }[], originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, state: PaletteStateInterface, context: PipelineContextInterface): { readonly 'corrections': CvdCorrectionInterfaceTypeEntity.Type[]; readonly 'warnings': CvdPairWarningInterfaceTypeEntity.Type[]; } {
    const corrections: CvdCorrectionInterfaceTypeEntity.Type[] = [];
    const warnings = this.reportPairs(pairs, originals, state, context, corrections);
    this.reportSummary(warnings, 'CVD correction could not clear every failing type', context);
    return { 'corrections': corrections, 'warnings': warnings };
  }

  private reportAdvisory(pairs: readonly { readonly 'background': string; readonly 'foreground': string; }[], originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, state: PaletteStateInterface, context: PipelineContextInterface): { readonly 'corrections': CvdCorrectionInterfaceTypeEntity.Type[]; readonly 'warnings': CvdPairWarningInterfaceTypeEntity.Type[]; } {
    const warnings = this.reportPairs(pairs, originals, state, context);
    this.reportSummary(warnings, 'CVD advisory: pairs fail perceptual-stability threshold', context);
    return { 'corrections': [], 'warnings': warnings };
  }

  private reportPairs(pairs: readonly { readonly 'background': string; readonly 'foreground': string; }[], originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, state: PaletteStateInterface, context: PipelineContextInterface, corrections?: CvdCorrectionInterfaceTypeEntity.Type[]): CvdPairWarningInterfaceTypeEntity.Type[] {
    const warnings: CvdPairWarningInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        this.reportPair(pair, originals, state, context, warnings, corrections);
      }
    }
    return warnings;
  }

  private reportPair(pair: { readonly 'background': string; readonly 'foreground': string; }, originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, state: PaletteStateInterface, context: PipelineContextInterface, warnings: CvdPairWarningInterfaceTypeEntity.Type[], corrections: CvdCorrectionInterfaceTypeEntity.Type[] | undefined): void {
    const finalForeground = state.roles[pair.foreground];
    const finalBackground = state.roles[pair.background];
    if (finalForeground === undefined || finalBackground === undefined) {
      return;
    }
    const foreground = colorRecordFactory.fromHex(finalForeground.hex);
    const background = colorRecordFactory.fromHex(finalBackground.hex);
    const evaluations = CvdSimulation.evaluate(foreground.rgb, background.rgb, contrastWcag21.apply(foreground, background));
    const failures = this.failing(evaluations);
    this.addWarnings(pair, failures, warnings, context);
    if (corrections !== undefined) {
      if (failures.length > 0) {
        this.logRemaining(pair, failures, context);
      }
      this.addCorrection(pair, originals, foreground, background, failures, corrections);
    }
  }

  private failing(evaluations: readonly CvdEvalInterfaceTypeEntity.Type[]): CvdEvalInterfaceTypeEntity.Type[] {
    const failures: CvdEvalInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (evaluation?.fail === true) {failures.push(evaluation);}
    }
    return failures;
  }

  private addWarnings(pair: { readonly 'background': string; readonly 'foreground': string; }, failures: readonly CvdEvalInterfaceTypeEntity.Type[], warnings: CvdPairWarningInterfaceTypeEntity.Type[], context: PipelineContextInterface): void {
    for (let index = 0; index < failures.length; index += 1) {
      const failure = failures[index];
      if (failure !== undefined) {warnings.push(CvdWarning.create(pair.foreground, pair.background, failure, context));}
    }
  }

  private logRemaining(pair: { readonly 'background': string; readonly 'foreground': string; }, failures: readonly CvdEvalInterfaceTypeEntity.Type[], context: PipelineContextInterface): void {
    const types: CvdEvalInterfaceTypeEntity.Type['cvdType'][] = [];
    for (let index = 0; index < failures.length; index += 1) {
      const failure = failures[index];
      if (failure !== undefined) {types.push(failure.cvdType);}
    }
    context.logger.debug(LogBody.create({ 'component': 'EnforceCvdSimulate', 'context': { 'background': pair.background, 'foreground': pair.foreground, 'remainingCvdTypes': types }, 'message': 'CVD correction could not clear every failing type', 'operation': 'run', 'status': LOG_STATUS.PARTIAL }));
  }

  private addCorrection(pair: { readonly 'background': string; readonly 'foreground': string; }, originals: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>, foreground: ColorRecordInterfaceTypeEntity.Type, background: ColorRecordInterfaceTypeEntity.Type, failures: readonly CvdEvalInterfaceTypeEntity.Type[], corrections: CvdCorrectionInterfaceTypeEntity.Type[]): void {
    const originalForeground = originals.get(pair.foreground);
    const originalBackground = originals.get(pair.background);
    if (originalForeground === undefined || originalBackground === undefined || foreground.hex === originalForeground.hex) {
      return;
    }
    const initial = CvdSimulation.evaluate(originalForeground.rgb, originalBackground.rgb, contrastWcag21.apply(originalForeground, originalBackground));
    const fixed = this.fixedTypes(initial, failures);
    if (fixed.length > 0) {
      corrections.push({ 'background': pair.background, 'cvdTypesFixed': fixed, 'cvdTypesRemaining': this.typesFor(failures), 'foreground': pair.foreground });
    }
  }

  private fixedTypes(initial: readonly CvdEvalInterfaceTypeEntity.Type[], failures: readonly CvdEvalInterfaceTypeEntity.Type[]): CvdEvalInterfaceTypeEntity.Type['cvdType'][] {
    const remaining = new Set(this.typesFor(failures));
    const fixed: CvdEvalInterfaceTypeEntity.Type['cvdType'][] = [];
    for (let index = 0; index < initial.length; index += 1) {
      const evaluation = initial[index];
      if (evaluation?.fail === true && !remaining.has(evaluation.cvdType)) {fixed.push(evaluation.cvdType);}
    }
    return fixed;
  }

  private typesFor(evaluations: readonly CvdEvalInterfaceTypeEntity.Type[]): CvdEvalInterfaceTypeEntity.Type['cvdType'][] {
    const types: CvdEvalInterfaceTypeEntity.Type['cvdType'][] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (evaluation !== undefined) {types.push(evaluation.cvdType);}
    }
    return types;
  }
}

/** Builds a warning entry and emits the advisory log line — identical
 *  shape/message to the pre-correction behavior, reused for both the
 *  no-correction path and the post-correction final report. */
class CvdWarning {
  static create(
    foreground: string,
    background: string,
    evaluation: CvdEvalInterfaceTypeEntity.Type,
    context: PipelineContextInterface
  ): CvdPairWarningInterfaceTypeEntity.Type {
    const threshold = CvdWarning.thresholdFor(evaluation);
    const simulatedContrastRatio = evaluation.originalContrast === 0 ? 0 : evaluation.simContrast / evaluation.originalContrast;
    const simulatedContrastDropRatio = evaluation.originalContrast === 0 ? 0 : evaluation.drop / evaluation.originalContrast;
    const warning: CvdPairWarningInterfaceTypeEntity.Type = {
      'background':                  background,
      'cvdType':                     evaluation.cvdType,
      'drop':                        evaluation.drop,
      'dropThreshold':               threshold.dropMagnitude,
      'foreground':                  foreground,
      'minimumSimulatedContrast':        threshold.minimumSimulatedContrast,
      'originalLuminanceContrast':   evaluation.originalContrast,
      'simulatedContrastDropRatio':  simulatedContrastDropRatio,
      'simulatedContrastRatio':      simulatedContrastRatio,
      'simulatedLuminanceContrast':  evaluation.simContrast
    };
    context.logger.debug(
      LogBody.create({ 'component': 'EnforceCvdSimulate', 'context': { 'background': background, 'cvdType': evaluation.cvdType, 'drop': evaluation.drop, 'dropThreshold': threshold.dropMagnitude, 'foreground': foreground, 'minimumSimulatedContrast': threshold.minimumSimulatedContrast, 'originalContrast': evaluation.originalContrast, 'reason': evaluation.exceedsDrop ? 'drop' : 'floor', 'simulatedContrast': evaluation.simContrast, 'simulatedContrastDropRatio': simulatedContrastDropRatio, 'simulatedContrastRatio': simulatedContrastRatio }, 'message': 'CVD advisory: pair fails perceptual-stability threshold', 'operation': 'run', 'status': LOG_STATUS.PARTIAL })
    );
    return warning;
  }

  private static thresholdFor(evaluation: CvdEvalInterfaceTypeEntity.Type): { readonly 'dropMagnitude': number; readonly 'minimumSimulatedContrast': number; } {
    if (evaluation.cvdType === 'achromatopsia') {
      const result = CVD_THRESHOLDS.achromatopsia;
      return result;
    }
    if (evaluation.cvdType === 'deuteranopia') {
      const result = CVD_THRESHOLDS.deuteranopia;
      return result;
    }
    if (evaluation.cvdType === 'protanopia') {
      const result = CVD_THRESHOLDS.protanopia;
      return result;
    }
    const result = CVD_THRESHOLDS.tritanopia;
    return result;
  }
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
