import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';

import {
  clamp01,
  colorRecordFactory,
  ContrastPolicy,
  contrastWcag21,
  gamutMapSrgb,
  linearToSrgb,
  Metadata,
  oklchToRgbRaw,
  PaletteRoleState,
  rgbToHex,
  srgbToLinear
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { CvdEvalEntity } from '../entities/CvdEvalEntity.ts';
import type { CvdMatrixEntity } from '../entities/CvdMatrixEntity.ts';
import type { CvdPairWarningEntity } from '../entities/CvdPairWarningEntity.ts';

import { CvdFailurePolicy } from '../CvdFailurePolicy.ts';
import { cvdMatrices } from '../data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../data/cvdThresholds.ts';
import { CvdBlockedPairEntity } from '../entities/CvdBlockedPairEntity.ts';
import { CvdCorrectionEntity } from '../entities/CvdCorrectionEntity.ts';
import { CvdResultSetEntity } from '../entities/CvdResultSetEntity.ts';

class CvdPairConstraint {
  readonly background: ColorRecordEntity.Type;
  readonly backgroundLuminance: number;
  readonly backgroundName: string;
  readonly baseline: number;
  readonly failurePolicy: CvdFailurePolicy;
  readonly foregroundName: string;
  readonly originalFailureTypes: ReadonlySet<
    CvdEvalEntity.Type['cvdType']
  >;
  readonly requiredTrichromat: number;
  readonly simulatedBackgroundLuminances: readonly number[];

  constructor(
    backgroundName: string,
    background: ColorRecordEntity.Type,
    baseline: number,
    foregroundName: string,
    originalFailureTypes: ReadonlySet<
      CvdEvalEntity.Type['cvdType']
    >,
    requiredTrichromat: number,
    failurePolicy: CvdFailurePolicy
  ) {
    this.background = background;
    this.backgroundLuminance = CvdSimulation.luminance(background.rgb);
    this.backgroundName = backgroundName;
    this.baseline = baseline;
    this.foregroundName = foregroundName;
    this.originalFailureTypes = originalFailureTypes;
    this.requiredTrichromat = requiredTrichromat;
    this.failurePolicy = failurePolicy;
    const simulatedBackgroundLuminances: number[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd !== undefined) {
        simulatedBackgroundLuminances.push(
          CvdSimulation.luminance(CvdSimulation.color(background.rgb, cvd))
        );
      }
    }
    this.simulatedBackgroundLuminances = simulatedBackgroundLuminances;
  }
}

class CvdMoverGroup {
  readonly constraints: CvdPairConstraint[];
  readonly failurePolicy: CvdFailurePolicy;
  readonly mover: string;
  readonly original: ColorRecordEntity.Type;
  readonly roleRange: ContrastPolicy.RoleRangeInterface;

  constructor(
    mover: string,
    original: ColorRecordEntity.Type,
    failurePolicy: CvdFailurePolicy,
    roleRange: ContrastPolicy.RoleRangeInterface
  ) {
    this.constraints = [];
    this.failurePolicy = failurePolicy;
    this.mover = mover;
    this.original = original;
    this.roleRange = roleRange;
  }

  add(
    backgroundName: string,
    background: ColorRecordEntity.Type,
    foregroundName: string,
    requiredTrichromat: number
  ): void {
    const originalContrast = contrastWcag21.apply(this.original, background);
    this.constraints.push(
      new CvdPairConstraint(
        backgroundName,
        background,
        Math.max(originalContrast, requiredTrichromat),
        foregroundName,
        CvdSimulation.failureTypes(
          this.original,
          background,
          requiredTrichromat,
          this.failurePolicy
        ),
        requiredTrichromat,
        this.failurePolicy
      )
    );
  }

  dependsOn(mover: string): boolean {
    for (
      let constraintIndex = 0;
      constraintIndex < this.constraints.length;
      constraintIndex += 1
    ) {
      const constraint = this.constraints[constraintIndex];
      if (constraint?.backgroundName === mover) {
        return true;
      }
    }
    return false;
  }

  resolve(
    roles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): CvdPairConstraint[] {
    const resolved: CvdPairConstraint[] = [];
    for (
      let constraintIndex = 0;
      constraintIndex < this.constraints.length;
      constraintIndex += 1
    ) {
      const constraint = this.constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const background =
        roles.get(constraint.backgroundName) ?? constraint.background;
      resolved.push(
        new CvdPairConstraint(
          constraint.backgroundName,
          background,
          constraint.baseline,
          constraint.foregroundName,
          constraint.originalFailureTypes,
          constraint.requiredTrichromat,
          constraint.failurePolicy
        )
      );
    }
    return resolved;
  }
}

class CvdMover {
  readonly counterpartName: string;
  readonly roleName: string;

  private constructor(roleName: string, counterpartName: string) {
    this.counterpartName = counterpartName;
    this.roleName = roleName;
  }

  static select(
    foreground: string,
    background: string,
    provenance: ReadonlyMap<string, { readonly 'origin': string }>
  ): CvdMover | undefined {
    if (provenance.get(foreground)?.origin !== 'stated') {
      return new CvdMover(foreground, background);
    }
    if (provenance.get(background)?.origin !== 'stated') {
      return new CvdMover(background, foreground);
    }
    return undefined;
  }
}

class CvdGroups {
  readonly blocked: CvdBlockedPairEntity.Type[];
  readonly groups: Map<string, CvdMoverGroup>;

  constructor(
    groups: Map<string, CvdMoverGroup>,
    blocked: CvdBlockedPairEntity.Type[]
  ) {
    this.blocked = blocked;
    this.groups = groups;
  }
}

class CvdCorrectionCandidate {
  readonly c: number;
  readonly failureCount: number;
  readonly l: number;
  readonly novelFailureCount: number;
  readonly rgb: ColorRecordEntity.Type['rgb'];
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
    rgb: ColorRecordEntity.Type['rgb'],
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
    cvd: CvdMatrixEntity.Type,
    r: number,
    g: number,
    b: number
  ): readonly [number, number, number] {
    const m = cvd.matrix;
    // Row-major: [m0 m1 m2 / m3 m4 m5 / m6 m7 m8]
    const rp = m[0] * r + m[1] * g + m[2] * b;
    const gp = m[3] * r + m[4] * g + m[5] * b;
    const bp = m[6] * r + m[7] * g + m[8] * b;
    return [clamp01.apply(rp), clamp01.apply(gp), clamp01.apply(bp)] as const;
  }
}

class CvdEmittedColorCache {
  private readonly records: Map<string, ColorRecordEntity.Type>;

  constructor() {
    this.records = new Map();
  }

  fromRgb(
    rgb: ColorRecordEntity.Type['rgb']
  ): ColorRecordEntity.Type {
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
  readonly emitted: ColorRecordEntity.Type;
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

class CvdOrderedSearchCandidate {
  readonly candidate: CvdSearchColor;
  readonly distance: number;
  readonly ordinal: number;

  constructor(candidate: CvdSearchColor, distance: number, ordinal: number) {
    this.candidate = candidate;
    this.distance = distance;
    this.ordinal = ordinal;
  }
}

class CvdScoreMeasurements {
  failureCount = 0;
  novelFailureCount = 0;
  worstContrast = Infinity;
}

class CvdSimulation {
  private static readonly cubeCorners: readonly ColorRecordEntity.Type['rgb'][] =
    [
      { 'b': 0, 'g': 0, 'r': 0 },
      { 'b': 0, 'g': 0, 'r': 1 },
      { 'b': 0, 'g': 1, 'r': 0 },
      { 'b': 0, 'g': 1, 'r': 1 },
      { 'b': 1, 'g': 0, 'r': 0 },
      { 'b': 1, 'g': 0, 'r': 1 },
      { 'b': 1, 'g': 1, 'r': 0 },
      { 'b': 1, 'g': 1, 'r': 1 }
    ];
  private static readonly searchCoarseChromaPartitions = 40;
  private static readonly searchCoarseLightnessPartitions = 80;
  private static readonly searchFineChromaPartitions = 80;
  private static readonly searchFineLightnessPartitions = 200;
  private static readonly searchRefinementLevels = 4;
  private static readonly searchRefinementRadius = 4;

  static color(
    rgb: ColorRecordEntity.Type['rgb'],
    cvd: CvdMatrixEntity.Type
  ): ColorRecordEntity.Type['rgb'] {
    // Convert gamma-encoded sRGB → linear sRGB
    const lin = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);

    // Apply CVD matrix in linear sRGB
    const [rp, gp, bp] = Matrix.apply(cvd, lin.r, lin.g, lin.b);

    // Convert back to gamma-encoded sRGB
    const encoded = linearToSrgb.apply(rp, gp, bp);
    const result = { 'b': encoded.b, 'g': encoded.g, 'r': encoded.r };
    return result;
  }

  static luminance(simulated: {
    readonly 'b': number;
    readonly 'g': number;
    readonly 'r': number;
  }): number {
    const linear = srgbToLinear.apply(simulated.r, simulated.g, simulated.b);
    const result = 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
    return result;
  }

  /** WCAG-21 style contrast ratio between two gamma-encoded sRGB triples.
   *  Used both for CVD-simulated contrast and, fed un-simulated triples,
   *  for the trichromat contrast of a correction candidate — the formula
   *  is identical either way. */
  static contrast(
    fg: { readonly 'b': number; readonly 'g': number; readonly 'r': number },
    bg: { readonly 'b': number; readonly 'g': number; readonly 'r': number }
  ): number {
    const l1 = CvdSimulation.luminance(fg);
    const l2 = CvdSimulation.luminance(bg);
    const result = CvdSimulation.contrastFromLuminances(l1, l2);
    return result;
  }

  private static contrastFromLuminances(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const result = (lighter + 0.05) / (darker + 0.05);
    return result;
  }

  /** Evaluates a foreground/background rgb pair against every CVD matrix.
   *  Pure — no metadata writes, no logging. Shared by the initial
   *  detection pass and the post-correction final pass. */
  static evaluate(
    fgRgb: ColorRecordEntity.Type['rgb'],
    bgRgb: ColorRecordEntity.Type['rgb'],
    originalContrast: number,
    requiredTrichromat: number,
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type[] {
    const EPS = 1e-12;
    const evals: CvdEvalEntity.Type[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd === undefined) {
        continue;
      }
      const threshold = CvdSimulation.thresholdFor(cvd);
      const simulatedForeground = CvdSimulation.color(fgRgb, cvd);
      const simulatedBackground = CvdSimulation.color(bgRgb, cvd);
      const simContrast = CvdSimulation.contrast(
        simulatedForeground,
        simulatedBackground
      );
      const drop = originalContrast - simContrast;

      const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude + EPS;
      const belowFloor =
        simContrast <
        Math.max(threshold.minimumSimulatedContrast, requiredTrichromat) - EPS;

      const evaluation: CvdEvalEntity.Type = {
        'belowFloor': belowFloor,
        'cvdType': cvd.name,
        'drop': drop,
        'exceedsDrop': exceedsDrop,
        'fail': false,
        'originalContrast': originalContrast,
        'simContrast': simContrast
      };
      evaluation.fail = failurePolicy.blocks(evaluation);
      evals.push(evaluation);
    }
    return evals;
  }

  static infeasibleTypes(
    constraint: CvdPairConstraint
  ): CvdEvalEntity.Type['cvdType'][] {
    const epsilon = 1e-12;
    const infeasible: CvdEvalEntity.Type['cvdType'][] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      const simulatedBackgroundLuminance =
        constraint.simulatedBackgroundLuminances[cvdIndex];
      if (cvd === undefined || simulatedBackgroundLuminance === undefined) {
        throw new TypeError(
          'CVD simulation matrices and luminance measurements are misaligned'
        );
      }
      const threshold = CvdSimulation.thresholdFor(cvd);
      const required = Math.max(
        threshold.minimumSimulatedContrast,
        constraint.requiredTrichromat
      );
      const maximum = CvdSimulation.maximumCubeContrast(
        cvd,
        simulatedBackgroundLuminance
      );
      if (maximum + epsilon < required) {
        infeasible.push(cvd.name);
      }
    }
    return infeasible;
  }

  static failureTypes(
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    requiredTrichromat: number,
    failurePolicy: CvdFailurePolicy
  ): ReadonlySet<CvdEvalEntity.Type['cvdType']> {
    const contrast = contrastWcag21.apply(foreground, background);
    const evaluations = CvdSimulation.evaluate(
      foreground.rgb,
      background.rgb,
      contrast,
      requiredTrichromat,
      failurePolicy
    );
    const failureTypes = new Set<CvdEvalEntity.Type['cvdType']>();
    for (
      let evaluationIndex = 0;
      evaluationIndex < evaluations.length;
      evaluationIndex += 1
    ) {
      const evaluation = evaluations[evaluationIndex];
      if (evaluation !== undefined && failurePolicy.corrects(evaluation)) {
        failureTypes.add(evaluation.cvdType);
      }
    }
    return failureTypes;
  }

  /** Scores a candidate (l, c, h) against the requested CVD types,
   *  gated by the trichromat-contrast baseline. */
  static scoreCandidate(
    candidate: CvdSearchColor,
    constraints: readonly CvdPairConstraint[],
    simulatedLuminanceCache: Map<string, readonly number[]>
  ): CvdCorrectionCandidate {
    const epsilon = 1e-12;
    const emitted = candidate.emitted;
    const foregroundLuminance = CvdSimulation.luminance(emitted.rgb);
    const baseline = CvdSimulation.measureBaselines(
      foregroundLuminance,
      constraints,
      epsilon
    );
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
      epsilon,
      simulatedLuminanceCache
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
  ): { readonly 'deficitCount': number; readonly 'minimumContrast': number } {
    let deficitCount = 0;
    let minimumContrast = Infinity;
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const contrast = CvdSimulation.contrastFromLuminances(
        foregroundLuminance,
        constraint.backgroundLuminance
      );
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
    rgb: ColorRecordEntity.Type['rgb'],
    constraints: readonly CvdPairConstraint[],
    epsilon: number,
    simulatedLuminanceCache: Map<string, readonly number[]>
  ): CvdScoreMeasurements {
    const foregroundLuminances = CvdSimulation.simulatedLuminances(
      rgb,
      simulatedLuminanceCache
    );
    const measurements = new CvdScoreMeasurements();
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      CvdSimulation.accumulateConstraintSimulations(
        constraint,
        foregroundLuminance,
        foregroundLuminances,
        epsilon,
        measurements
      );
    }
    return measurements;
  }

  private static accumulateConstraintSimulations(
    constraint: CvdPairConstraint,
    foregroundLuminance: number,
    foregroundLuminances: readonly number[],
    epsilon: number,
    measurements: CvdScoreMeasurements
  ): void {
    const contrast = CvdSimulation.contrastFromLuminances(
      foregroundLuminance,
      constraint.backgroundLuminance
    );
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      const simulatedForegroundLuminance = foregroundLuminances[cvdIndex];
      const simulatedBackgroundLuminance =
        constraint.simulatedBackgroundLuminances[cvdIndex];
      if (
        cvd === undefined ||
        simulatedForegroundLuminance === undefined ||
        simulatedBackgroundLuminance === undefined
      ) {
        throw new TypeError(
          'CVD simulation matrices and luminance measurements are misaligned'
        );
      }
      const threshold = CvdSimulation.thresholdFor(cvd);
      const simulatedContrast = CvdSimulation.contrastFromLuminances(
        simulatedForegroundLuminance,
        simulatedBackgroundLuminance
      );
      const evaluation: CvdEvalEntity.Type = {
        'belowFloor': simulatedContrast < Math.max(threshold.minimumSimulatedContrast, constraint.requiredTrichromat) - epsilon,
        'cvdType': cvd.name,
        'drop': contrast - simulatedContrast,
        'exceedsDrop': Math.abs(contrast - simulatedContrast) > threshold.dropMagnitude + epsilon,
        'fail': false,
        'originalContrast': contrast,
        'simContrast': simulatedContrast
      };
      const failed = constraint.failurePolicy.corrects(evaluation);
      if (failed) {
        measurements.failureCount += 1;
        if (!constraint.originalFailureTypes.has(cvd.name)) {
          measurements.novelFailureCount += 1;
        }
      }
      if (simulatedContrast < measurements.worstContrast) {
        measurements.worstContrast = simulatedContrast;
      }
    }
  }

  private static simulatedLuminances(
    rgb: ColorRecordEntity.Type['rgb'],
    cache: Map<string, readonly number[]>
  ): readonly number[] {
    const hex = rgbToHex.apply(rgb.r, rgb.g, rgb.b);
    const cached = cache.get(hex);
    if (cached !== undefined) {
      return cached;
    }
    const luminances: number[] = [];
    for (let cvdIndex = 0; cvdIndex < cvdMatrices.length; cvdIndex += 1) {
      const cvd = cvdMatrices[cvdIndex];
      if (cvd === undefined) {
        throw new TypeError('CVD simulation matrix is missing');
      }
      luminances.push(CvdSimulation.luminance(CvdSimulation.color(rgb, cvd)));
    }
    cache.set(hex, luminances);
    return luminances;
  }

  private static thresholdFor(cvd: CvdMatrixEntity.Type): {
    readonly 'dropMagnitude': number;
    readonly 'minimumSimulatedContrast': number;
  } {
    const thresholds = new Map([
      ['achromatopsia', CVD_THRESHOLDS.achromatopsia],
      ['deuteranopia', CVD_THRESHOLDS.deuteranopia],
      ['protanopia', CVD_THRESHOLDS.protanopia],
      ['tritanopia', CVD_THRESHOLDS.tritanopia]
    ]);
    const result = thresholds.get(cvd.name);
    if (result === undefined) {
      throw new TypeError(`Unknown CVD matrix: ${cvd.name}`);
    }
    return result;
  }

  private static searchCandidates(
    selection: CvdCandidateSelection,
    candidates: readonly CvdSearchColor[],
    constraints: readonly CvdPairConstraint[],
    budget: CvdSearchBudget
  ): boolean {
    const ordered: CvdOrderedSearchCandidate[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate !== undefined) {
        ordered.push(
          new CvdOrderedSearchCandidate(
            candidate,
            selection.distanceFromOriginal(candidate),
            index
          )
        );
      }
    }
    ordered.sort((left, right) => {
      const distance = left.distance - right.distance;
      const result = distance === 0 ? left.ordinal - right.ordinal : distance;
      return result;
    });
    for (
      let candidateIndex = 0;
      candidateIndex < ordered.length;
      candidateIndex += 1
    ) {
      const candidate = ordered[candidateIndex];
      if (candidate === undefined) {
        continue;
      }
      if (!selection.couldImprove(candidate.candidate)) {
        return true;
      }
      const score = budget.score(candidate.candidate, constraints);
      if (score === undefined) {
        return false;
      }
      selection.consider(score, candidate.candidate.emitted);
    }
    return true;
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
    group: CvdMoverGroup,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): ColorRecordEntity.Type {
    const fgRecord = group.original;
    const cachedCorrection = budget.cachedCorrection(
      fgRecord,
      constraints,
      group.roleRange
    );
    if (cachedCorrection !== undefined) {
      const result = CvdSimulation.materializeCorrection(
        cachedCorrection,
        fgRecord
      );
      return result;
    }
    if (budget.exhausted) {
      return fgRecord;
    }
    const fgL = fgRecord.oklch.l;
    const c = fgRecord.oklch.c;
    const h = fgRecord.oklch.h;
    const fineChromaPartitions =
      c === 0 ? 0 : CvdSimulation.searchFineChromaPartitions;
    const originalCandidate = budget.score(
      new CvdSearchColor(fgL, c, h, emittedColors),
      constraints
    );
    if (originalCandidate === undefined) {
      return fgRecord;
    }
    const selection = new CvdCandidateSelection(
      fgRecord,
      CvdSimulation.originalFailureCount(constraints),
      group.roleRange
    );

    if (CvdCandidateSelection.clearsAll(originalCandidate)) {
      return fgRecord;
    }
    if (
      !CvdSimulation.searchLocalGrid(
        selection,
        fgL,
        c,
        h,
        constraints,
        emittedColors,
        budget
      )
    ) {
      return fgRecord;
    }
    const initialSearchComplete = CvdSimulation.searchCoverageCandidates(
      selection,
      c,
      h,
      constraints,
      emittedColors,
      budget
    );
    if (!initialSearchComplete) {
      const partial = selection.result();
      if (partial !== undefined && CvdCandidateSelection.clearsAll(partial)) {
        budget.storeCorrection(fgRecord, constraints, group.roleRange, partial);
        const result = CvdSimulation.materializeCorrection(partial, fgRecord);
        return result;
      }
      return fgRecord;
    }

    let best = selection.result();
    if (best === undefined) {
      return fgRecord;
    }

    best = CvdSimulation.refine(
      selection,
      best,
      c,
      h,
      fineChromaPartitions,
      constraints,
      emittedColors,
      budget
    );
    if (best === undefined || budget.exhausted) {
      return fgRecord;
    }

    budget.storeCorrection(fgRecord, constraints, group.roleRange, best);
    const result = CvdSimulation.materializeCorrection(best, fgRecord);
    return result;
  }

  private static searchLocalGrid(
    selection: CvdCandidateSelection,
    lightness: number,
    chroma: number,
    hue: number,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): boolean {
    const candidates: CvdSearchColor[] = [];
    const lightnessStep = 1 / CvdSimulation.searchCoarseLightnessPartitions;
    const chromaPartitions = 16;
    for (let lightnessOffset = -4; lightnessOffset <= 4; lightnessOffset += 1) {
      const candidateLightness = clamp01.apply(
        lightness + lightnessOffset * lightnessStep
      );
      for (
        let chromaIndex = 0;
        chromaIndex <= chromaPartitions;
        chromaIndex += 1
      ) {
        const candidateChroma =
          (chroma * (chromaPartitions - chromaIndex)) / chromaPartitions;
        candidates.push(
          new CvdSearchColor(
            candidateLightness,
            candidateChroma,
            hue,
            emittedColors
          )
        );
      }
    }
    const result = CvdSimulation.searchCandidates(
      selection,
      candidates,
      constraints,
      budget
    );
    return result;
  }

  private static materializeCorrection(
    candidate: CvdCorrectionCandidate,
    original: ColorRecordEntity.Type
  ): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromHex(
      rgbToHex.apply(candidate.rgb.r, candidate.rgb.g, candidate.rgb.b),
      {
        'alphaOverride': original.alpha,
        'hints': original.hints,
        'sourceFormat': original.sourceFormat
      }
    );
    return result;
  }

  private static refine(
    selection: CvdCandidateSelection,
    initial: CvdCorrectionCandidate,
    c: number,
    h: number,
    fineChromaPartitions: number,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): CvdCorrectionCandidate | undefined {
    let best: CvdCorrectionCandidate | undefined = initial;
    let lightnessStep = 1 / CvdSimulation.searchFineLightnessPartitions;
    let chromaStep = fineChromaPartitions === 0 ? 0 : c / fineChromaPartitions;
    for (
      let level = 0;
      level < CvdSimulation.searchRefinementLevels;
      level += 1
    ) {
      if (best === undefined) {
        return undefined;
      }
      lightnessStep /= CvdSimulation.searchRefinementRadius;
      chromaStep /= CvdSimulation.searchRefinementRadius;
      if (
        !CvdSimulation.refineAt(
          selection,
          best,
          lightnessStep,
          chromaStep,
          c,
          h,
          constraints,
          emittedColors,
          budget
        )
      ) {
        return undefined;
      }
      best = selection.result();
    }
    return best;
  }

  private static refineAt(
    selection: CvdCandidateSelection,
    best: CvdCorrectionCandidate,
    lightnessStep: number,
    chromaStep: number,
    c: number,
    h: number,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): boolean {
    for (
      let lightnessOffset = -CvdSimulation.searchRefinementRadius;
      lightnessOffset <= CvdSimulation.searchRefinementRadius;
      lightnessOffset += 1
    ) {
      const lightness = clamp01.apply(
        best.searchL + lightnessOffset * lightnessStep
      );
      if (
        !CvdSimulation.refineChroma(
          selection,
          lightness,
          best.searchC,
          chromaStep,
          c,
          h,
          constraints,
          emittedColors,
          budget
        )
      ) {
        return false;
      }
    }
    return true;
  }

  private static refineChroma(
    selection: CvdCandidateSelection,
    lightness: number,
    centerC: number,
    chromaStep: number,
    c: number,
    h: number,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): boolean {
    const start = chromaStep === 0 ? 0 : -CvdSimulation.searchRefinementRadius;
    const end = chromaStep === 0 ? 0 : CvdSimulation.searchRefinementRadius;
    for (let chromaOffset = start; chromaOffset <= end; chromaOffset += 1) {
      const chroma =
        chromaStep === 0
          ? 0
          : Math.max(0, Math.min(c, centerC + chromaOffset * chromaStep));
      const candidate = new CvdSearchColor(
        lightness,
        chroma,
        h,
        emittedColors
      );
      const score = budget.score(candidate, constraints);
      if (score === undefined) {
        return false;
      }
      selection.consider(score, candidate.emitted);
    }
    return true;
  }

  private static searchCoverageCandidates(
    selection: CvdCandidateSelection,
    chroma: number,
    hue: number,
    constraints: readonly CvdPairConstraint[],
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): boolean {
    const candidates: CvdSearchColor[] = [];
    const sampleCount = 96;
    for (let sample = 0; sample < sampleCount; sample += 1) {
      const lightness = (sample + 0.5) / sampleCount;
      const candidateChroma =
        chroma * CvdSimulation.radicalInverseBaseTwo(sample);
      candidates.push(
        new CvdSearchColor(lightness, candidateChroma, hue, emittedColors)
      );
    }
    candidates.push(
      new CvdSearchColor(0, 0, hue, emittedColors),
      new CvdSearchColor(0, chroma, hue, emittedColors),
      new CvdSearchColor(1, 0, hue, emittedColors),
      new CvdSearchColor(1, chroma, hue, emittedColors)
    );
    const result = CvdSimulation.searchCandidates(
      selection,
      candidates,
      constraints,
      budget
    );
    return result;
  }

  private static radicalInverseBaseTwo(value: number): number {
    let source = value;
    let factor = 0.5;
    let result = 0;
    while (source > 0) {
      result += factor * (source % 2);
      source = Math.floor(source / 2);
      factor *= 0.5;
    }
    return result;
  }

  static preservesBaselines(
    foreground: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    const EPS = 1e-12;
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (
        constraint !== undefined &&
        contrastWcag21.apply(foreground, constraint.background) + EPS <
          constraint.baseline
      ) {
        return false;
      }
    }
    return true;
  }

  static improves(
    foreground: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    const result =
      CvdSimulation.preservesBaselines(foreground, constraints) &&
      CvdSimulation.preservesFailureSets(foreground, constraints) &&
      CvdSimulation.failureCount(foreground, constraints) <
        CvdSimulation.originalFailureCount(constraints);
    return result;
  }

  static preservesFailureSets(
    foreground: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): boolean {
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const failureTypes = CvdSimulation.failureTypes(
        foreground,
        constraint.background,
        constraint.requiredTrichromat,
        constraint.failurePolicy
      );
      for (const failureType of failureTypes) {
        if (!constraint.originalFailureTypes.has(failureType)) {
          return false;
        }
      }
    }
    return true;
  }

  private static maximumCubeContrast(
    cvd: CvdMatrixEntity.Type,
    simulatedBackgroundLuminance: number
  ): number {
    let maximum = 0;
    for (
      let cornerIndex = 0;
      cornerIndex < CvdSimulation.cubeCorners.length;
      cornerIndex += 1
    ) {
      const corner = CvdSimulation.cubeCorners[cornerIndex];
      if (corner === undefined) {
        continue;
      }
      const simulatedCorner = CvdSimulation.luminance(
        CvdSimulation.color(corner, cvd)
      );
      const contrast = CvdSimulation.contrastFromLuminances(
        simulatedCorner,
        simulatedBackgroundLuminance
      );
      if (contrast > maximum) {
        maximum = contrast;
      }
    }
    return maximum;
  }

  private static originalFailureCount(
    constraints: readonly CvdPairConstraint[]
  ): number {
    let failureCount = 0;
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (constraint !== undefined) {
        failureCount += constraint.originalFailureTypes.size;
      }
    }
    return failureCount;
  }

  private static failureCount(
    foreground: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[]
  ): number {
    let failureCount = 0;
    for (
      let constraintIndex = 0;
      constraintIndex < constraints.length;
      constraintIndex += 1
    ) {
      const constraint = constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const contrast = contrastWcag21.apply(foreground, constraint.background);
      const evaluations = CvdSimulation.evaluate(
        foreground.rgb,
        constraint.background.rgb,
        contrast,
        constraint.requiredTrichromat,
        constraint.failurePolicy
      );
      for (
        let evaluationIndex = 0;
        evaluationIndex < evaluations.length;
        evaluationIndex += 1
      ) {
        const evaluation = evaluations[evaluationIndex];
        if (evaluation !== undefined && constraint.failurePolicy.corrects(evaluation)) {
          failureCount += 1;
        }
      }
    }
    return failureCount;
  }
}

class CvdInfeasibility {
  static blocked(
    group: CvdMoverGroup
  ): CvdBlockedPairEntity.Type[] {
    const blocked: CvdBlockedPairEntity.Type[] = [];
    for (
      let constraintIndex = 0;
      constraintIndex < group.constraints.length;
      constraintIndex += 1
    ) {
      const constraint = group.constraints[constraintIndex];
      if (constraint === undefined) {
        continue;
      }
      const cvdTypes = CvdSimulation.infeasibleTypes(constraint);
      if (cvdTypes.length === 0) {
        continue;
      }
      blocked.push(
        CvdBlockedPairEntity.intake({
          'background':
            constraint.foregroundName === group.mover
              ? constraint.backgroundName
              : group.mover,
          'cvdTypes': cvdTypes,
          'foreground': constraint.foregroundName,
          'reason': 'solver-infeasible'
        })
      );
    }
    return blocked;
  }
}

class CvdSearchBudget {
  private static readonly productionMaximumCandidateScores = 8_000;
  private static readonly productionMaximumWeightedUnits = 48_000;

  private candidateScores = 0;
  private readonly maximumCandidateScores: number;
  private readonly maximumWeightedUnits: number;
  private exhaustedValue = false;
  private readonly correctionCache = new Map<string, CvdCorrectionCandidate>();
  private readonly constraintSignatures = new WeakMap<
    readonly CvdPairConstraint[],
    string
  >();
  private readonly scoreCache = new Map<string, CvdCorrectionCandidate>();
  private readonly simulatedLuminanceCache = new Map<
    string,
    readonly number[]
  >();
  private weightedUnits = 0;

  constructor(maximumCandidateScores: number, maximumWeightedUnits: number) {
    this.maximumCandidateScores = maximumCandidateScores;
    this.maximumWeightedUnits = maximumWeightedUnits;
  }

  get exhausted(): boolean {
    return this.exhaustedValue;
  }

  usage(): {
    readonly 'candidateScores': number;
    readonly 'weightedUnits': number;
  } {
    const result = {
      'candidateScores': this.candidateScores,
      'weightedUnits': this.weightedUnits
    };
    return result;
  }

  cachedCorrection(
    original: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[],
    roleRange: ContrastPolicy.RoleRangeInterface
  ): CvdCorrectionCandidate | undefined {
    const result = this.correctionCache.get(
      this.groupKey(original, constraints, roleRange)
    );
    return result;
  }

  storeCorrection(
    original: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[],
    roleRange: ContrastPolicy.RoleRangeInterface,
    correction: CvdCorrectionCandidate
  ): void {
    this.correctionCache.set(this.groupKey(original, constraints, roleRange), correction);
  }

  static create(options?: {
    readonly 'maximumCandidateScores'?: number;
    readonly 'maximumWeightedUnits'?: number;
  }): CvdSearchBudget {
    const maximumCandidateScores =
      options?.maximumCandidateScores ??
      CvdSearchBudget.productionMaximumCandidateScores;
    const maximumWeightedUnits =
      options?.maximumWeightedUnits ??
      CvdSearchBudget.productionMaximumWeightedUnits;
    const result = new CvdSearchBudget(
      maximumCandidateScores,
      maximumWeightedUnits
    );
    return result;
  }

  score(
    candidate: CvdSearchColor,
    constraints: readonly CvdPairConstraint[]
  ): CvdCorrectionCandidate | undefined {
    if (this.exhaustedValue) {
      return undefined;
    }
    const key = this.scoreKey(candidate, constraints);
    const cached = this.scoreCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const weightedCost =
      1 + constraints.length + cvdMatrices.length * constraints.length;
    if (
      this.candidateScores >= this.maximumCandidateScores ||
      this.weightedUnits + weightedCost > this.maximumWeightedUnits
    ) {
      this.exhaustedValue = true;
      return undefined;
    }
    this.candidateScores += 1;
    this.weightedUnits += weightedCost;
    const score = CvdSimulation.scoreCandidate(
      candidate,
      constraints,
      this.simulatedLuminanceCache
    );
    this.scoreCache.set(key, score);
    return score;
  }

  private groupKey(
    original: ColorRecordEntity.Type,
    constraints: readonly CvdPairConstraint[],
    roleRange: ContrastPolicy.RoleRangeInterface
  ): string {
    const result = [
      original.hex,
      this.constraintSignature(constraints),
      roleRange.chromaRange?.join(',') ?? '',
      roleRange.lightnessRange?.join(',') ?? ''
    ].join('\u0000');
    return result;
  }

  private scoreKey(
    candidate: CvdSearchColor,
    constraints: readonly CvdPairConstraint[]
  ): string {
    const result = [
      candidate.emitted.hex,
      this.constraintSignature(constraints)
    ].join('\u0000');
    return result;
  }

  private constraintSignature(
    constraints: readonly CvdPairConstraint[]
  ): string {
    const cached = this.constraintSignatures.get(constraints);
    if (cached !== undefined) {
      return cached;
    }
    const parts: string[] = [];
    for (let index = 0; index < constraints.length; index += 1) {
      const constraint = constraints[index];
      if (constraint === undefined) {
        continue;
      }
      parts.push(
        constraint.background.hex,
        constraint.baseline.toString(),
        constraint.requiredTrichromat.toString(),
        constraint.failurePolicy.constructor.name,
        Array.from(constraint.originalFailureTypes).join(',')
      );
    }
    const result = parts.join('\u0000');
    this.constraintSignatures.set(constraints, result);
    return result;
  }
}

class CvdCandidateSelection {
  private bestAny: CvdCorrectionCandidate | undefined;
  private bestNonExtreme: CvdCorrectionCandidate | undefined;
  private readonly originalFailureCount: number;
  private readonly originalC: number;
  private readonly originalL: number;
  private readonly originalRgb: ColorRecordEntity.Type['rgb'];
  private readonly roleRange: ContrastPolicy.RoleRangeInterface;

  constructor(
    original: ColorRecordEntity.Type,
    originalFailureCount: number,
    roleRange: ContrastPolicy.RoleRangeInterface
  ) {
    this.bestAny = undefined;
    this.bestNonExtreme = undefined;
    this.originalFailureCount = originalFailureCount;
    this.originalC = original.oklch.c;
    this.originalL = original.oklch.l;
    this.originalRgb = original.rgb;
    this.roleRange = roleRange;
  }

  static clearsAll(candidate: CvdCorrectionCandidate): boolean {
    const result =
      candidate.trichromatBaselineDeficitCount === 0 &&
      candidate.failureCount === 0 &&
      candidate.novelFailureCount === 0;
    return result;
  }

  consider(
    candidate: CvdCorrectionCandidate,
    record: ColorRecordEntity.Type
  ): void {
    if (!this.isEligible(candidate, record)) {
      return;
    }
    if (this.prefer(candidate, this.bestAny)) {
      this.bestAny = candidate;
    }
    if (
      !CvdCandidateSelection.isExtreme(candidate.rgb) &&
      this.prefer(candidate, this.bestNonExtreme)
    ) {
      this.bestNonExtreme = candidate;
    }
  }

  couldImprove(candidate: CvdSearchColor): boolean {
    const current = this.result();
    if (current === undefined) {
      return true;
    }
    const epsilon = 1e-12;
    const candidateDistance = this.distanceFromOriginal(candidate);
    const currentDistance = Math.hypot(
      current.l - this.originalL,
      current.c - this.originalC
    );
    const result =
      !CvdCandidateSelection.clearsAll(current) ||
      candidateDistance <= currentDistance + epsilon;
    return result;
  }

  distanceFromOriginal(candidate: CvdSearchColor): number {
    const result = Math.hypot(
      candidate.emitted.oklch.l - this.originalL,
      candidate.emitted.oklch.c - this.originalC
    );
    return result;
  }

  result(): CvdCorrectionCandidate | undefined {
    const result =
      !CvdCandidateSelection.isExtreme(this.originalRgb) &&
      this.bestNonExtreme !== undefined
        ? this.bestNonExtreme
        : this.bestAny;
    return result;
  }

  private isEligible(
    candidate: CvdCorrectionCandidate,
    record: ColorRecordEntity.Type
  ): boolean {
    const inRange =
      (this.roleRange.chromaRange === undefined ||
        (record.oklch.c >= this.roleRange.chromaRange[0] &&
          record.oklch.c <= this.roleRange.chromaRange[1])) &&
      (this.roleRange.lightnessRange === undefined ||
        (record.oklch.l >= this.roleRange.lightnessRange[0] &&
          record.oklch.l <= this.roleRange.lightnessRange[1]));
    const result =
      inRange &&
      candidate.trichromatBaselineDeficitCount === 0 &&
      candidate.novelFailureCount === 0 &&
      candidate.failureCount < this.originalFailureCount;
    return result;
  }

  private prefer(
    candidate: CvdCorrectionCandidate,
    current: CvdCorrectionCandidate | undefined
  ): boolean {
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
    const candidateDistance = Math.hypot(
      candidate.l - this.originalL,
      candidate.c - this.originalC
    );
    const currentDistance = Math.hypot(
      current.l - this.originalL,
      current.c - this.originalC
    );
    if (candidateDistance < currentDistance - epsilon) {
      return true;
    }
    const result =
      Math.abs(candidateDistance - currentDistance) <= epsilon &&
      candidate.c > current.c + epsilon;
    return result;
  }

  private static isExtreme(
    rgb: ColorRecordEntity.Type['rgb']
  ): boolean {
    const hexRoundingBoundary = 0.5 / 255;
    const result =
      (rgb.r < hexRoundingBoundary &&
        rgb.g < hexRoundingBoundary &&
        rgb.b < hexRoundingBoundary) ||
      (rgb.r >= 1 - hexRoundingBoundary &&
        rgb.g >= 1 - hexRoundingBoundary &&
        rgb.b >= 1 - hexRoundingBoundary);
    return result;
  }
}

class CvdDependencyPlanner {
  private readonly components: CvdMoverGroup[][] = [];
  private currentIndex = 0;
  private readonly indices = new Map<string, number>();
  private readonly lowLinks = new Map<string, number>();
  private readonly onStack = new Set<string>();
  private readonly stack: CvdMoverGroup[] = [];

  plan(groups: ReadonlyMap<string, CvdMoverGroup>): CvdMoverGroup[][] {
    const values = Array.from(groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (group !== undefined && this.indices.get(group.mover) === undefined) {
        this.connect(group, groups);
      }
    }
    const result = this.components;
    return result;
  }

  private connect(
    group: CvdMoverGroup,
    groups: ReadonlyMap<string, CvdMoverGroup>
  ): void {
    this.enter(group);
    this.connectDependencies(group, groups);
    this.completeComponent(group);
  }

  private enter(group: CvdMoverGroup): void {
    this.indices.set(group.mover, this.currentIndex);
    this.lowLinks.set(group.mover, this.currentIndex);
    this.currentIndex += 1;
    this.stack.push(group);
    this.onStack.add(group.mover);
  }

  private connectDependencies(
    group: CvdMoverGroup,
    groups: ReadonlyMap<string, CvdMoverGroup>
  ): void {
    for (let index = 0; index < group.constraints.length; index += 1) {
      const constraint = group.constraints[index];
      if (constraint !== undefined) {
        this.connectDependency(group, constraint, groups);
      }
    }
  }

  private connectDependency(
    group: CvdMoverGroup,
    constraint: CvdPairConstraint,
    groups: ReadonlyMap<string, CvdMoverGroup>
  ): void {
    const dependency = groups.get(constraint.backgroundName);
    if (dependency === undefined) {
      return;
    }
    const dependencyIndex = this.indices.get(dependency.mover);
    if (dependencyIndex === undefined) {
      this.connect(dependency, groups);
      this.updateLowLink(group.mover, this.lowLinks.get(dependency.mover));
      return;
    }
    if (this.onStack.has(dependency.mover)) {
      this.updateLowLink(group.mover, dependencyIndex);
    }
  }

  private updateLowLink(
    foreground: string,
    candidate: number | undefined
  ): void {
    const current = this.lowLinks.get(foreground);
    if (current !== undefined && candidate !== undefined) {
      this.lowLinks.set(foreground, Math.min(current, candidate));
    }
  }

  private completeComponent(group: CvdMoverGroup): void {
    if (this.lowLinks.get(group.mover) !== this.indices.get(group.mover)) {
      return;
    }
    const component: CvdMoverGroup[] = [];
    while (this.stack.length > 0) {
      const member = this.stack.pop();
      if (member === undefined) {
        break;
      }
      this.onStack.delete(member.mover);
      component.push(member);
      if (member.mover === group.mover) {
        break;
      }
    }
    this.components.push(component);
  }
}

class CvdCorrectionCoordinator {
  private static readonly cycleIterations = 12;

  static resolve(
    groups: ReadonlyMap<string, CvdMoverGroup>,
    originalRoles: ReadonlyMap<string, ColorRecordEntity.Type>,
    budget: CvdSearchBudget
  ): Map<string, ColorRecordEntity.Type> {
    const resolvedRoles = new Map(originalRoles);
    const components = new CvdDependencyPlanner().plan(groups);
    const emittedColors = new CvdEmittedColorCache();
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      if (component !== undefined) {
        CvdCorrectionCoordinator.resolveComponent(
          component,
          resolvedRoles,
          emittedColors,
          budget
        );
      }
    }
    const result = CvdCorrectionCoordinator.audit(
      groups,
      resolvedRoles,
      originalRoles
    );
    return result;
  }

  private static resolveComponent(
    component: readonly CvdMoverGroup[],
    resolvedRoles: Map<string, ColorRecordEntity.Type>,
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): void {
    const group = component.length === 1 ? component[0] : undefined;
    if (group !== undefined && !group.dependsOn(group.mover)) {
      const constraints = group.resolve(resolvedRoles);
      resolvedRoles.set(
        group.mover,
        CvdSimulation.correctForeground(
          group,
          constraints,
          emittedColors,
          budget
        )
      );
      return;
    }
    CvdCorrectionCoordinator.resolveCycle(
      component,
      resolvedRoles,
      emittedColors,
      budget
    );
  }

  private static audit(
    groups: ReadonlyMap<string, CvdMoverGroup>,
    resolvedRoles: Map<string, ColorRecordEntity.Type>,
    originalRoles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): Map<string, ColorRecordEntity.Type> {
    for (let pass = 0; pass <= groups.size; pass += 1) {
      const invalid = CvdCorrectionCoordinator.invalidGroups(
        groups,
        resolvedRoles
      );
      if (invalid.length === 0) {
        return resolvedRoles;
      }
      if (
        !CvdCorrectionCoordinator.restoreInvalidGroups(
          invalid,
          groups,
          resolvedRoles
        )
      ) {
        break;
      }
    }
    const result = new Map(originalRoles);
    return result;
  }

  private static invalidGroups(
    groups: ReadonlyMap<string, CvdMoverGroup>,
    resolvedRoles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): CvdMoverGroup[] {
    const invalid: CvdMoverGroup[] = [];
    const values = Array.from(groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (
        group !== undefined &&
        !CvdCorrectionCoordinator.isResolvedGroupValid(group, resolvedRoles)
      ) {
        invalid.push(group);
      }
    }
    return invalid;
  }

  private static isResolvedGroupValid(
    group: CvdMoverGroup,
    resolvedRoles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): boolean {
    const foreground = resolvedRoles.get(group.mover);
    const result =
      foreground !== undefined &&
      CvdCorrectionCoordinator.isValid(group, foreground, resolvedRoles);
    return result;
  }

  private static restoreInvalidGroups(
    invalid: readonly CvdMoverGroup[],
    groups: ReadonlyMap<string, CvdMoverGroup>,
    resolvedRoles: Map<string, ColorRecordEntity.Type>
  ): boolean {
    let restoredCount = 0;
    for (let index = 0; index < invalid.length; index += 1) {
      const group = invalid[index];
      if (group !== undefined) {
        restoredCount += CvdCorrectionCoordinator.restoreGroup(
          group,
          groups,
          resolvedRoles
        );
      }
    }
    const result = restoredCount > 0;
    return result;
  }

  private static restoreGroup(
    group: CvdMoverGroup,
    groups: ReadonlyMap<string, CvdMoverGroup>,
    resolvedRoles: Map<string, ColorRecordEntity.Type>
  ): number {
    const foreground = resolvedRoles.get(group.mover);
    if (foreground !== undefined && foreground !== group.original) {
      resolvedRoles.set(group.mover, group.original);
      return 1;
    }
    let restoredCount = 0;
    for (let index = 0; index < group.constraints.length; index += 1) {
      const constraint = group.constraints[index];
      const dependency =
        constraint === undefined
          ? undefined
          : groups.get(constraint.backgroundName);
      if (
        dependency !== undefined &&
        resolvedRoles.get(dependency.mover) !== dependency.original
      ) {
        resolvedRoles.set(dependency.mover, dependency.original);
        restoredCount += 1;
      }
    }
    return restoredCount;
  }

  private static isValid(
    group: CvdMoverGroup,
    foreground: ColorRecordEntity.Type,
    resolvedRoles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): boolean {
    const constraints = group.resolve(resolvedRoles);
    const result =
      CvdSimulation.preservesBaselines(foreground, constraints) &&
      CvdSimulation.preservesFailureSets(foreground, constraints) &&
      (foreground === group.original ||
        CvdSimulation.improves(foreground, constraints));
    return result;
  }

  private static resolveCycle(
    component: readonly CvdMoverGroup[],
    resolvedRoles: Map<string, ColorRecordEntity.Type>,
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): void {
    for (
      let iteration = 0;
      iteration < CvdCorrectionCoordinator.cycleIterations;
      iteration += 1
    ) {
      if (
        CvdCorrectionCoordinator.applyCycle(
          component,
          resolvedRoles,
          emittedColors,
          budget
        )
      ) {
        return;
      }
    }
    if (!CvdCorrectionCoordinator.allValid(component, resolvedRoles)) {
      CvdCorrectionCoordinator.restoreComponent(component, resolvedRoles);
    }
  }

  private static applyCycle(
    component: readonly CvdMoverGroup[],
    resolvedRoles: Map<string, ColorRecordEntity.Type>,
    emittedColors: CvdEmittedColorCache,
    budget: CvdSearchBudget
  ): boolean {
    const snapshot = new Map(resolvedRoles);
    let unchangedCount = 0;
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (group === undefined) {
        continue;
      }
      const corrected = CvdSimulation.correctForeground(
        group,
        group.resolve(snapshot),
        emittedColors,
        budget
      );
      const current = snapshot.get(group.mover);
      if (
        current !== undefined &&
        CvdCorrectionCoordinator.sameColor(current, corrected)
      ) {
        unchangedCount += 1;
      }
      resolvedRoles.set(group.mover, corrected);
    }
    const result = unchangedCount === component.length;
    return result;
  }

  private static allValid(
    component: readonly CvdMoverGroup[],
    resolvedRoles: ReadonlyMap<string, ColorRecordEntity.Type>
  ): boolean {
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (
        group !== undefined &&
        !CvdCorrectionCoordinator.isResolvedGroupValid(group, resolvedRoles)
      ) {
        return false;
      }
    }
    return true;
  }

  private static restoreComponent(
    component: readonly CvdMoverGroup[],
    resolvedRoles: Map<string, ColorRecordEntity.Type>
  ): void {
    for (let index = 0; index < component.length; index += 1) {
      const group = component[index];
      if (group !== undefined) {
        resolvedRoles.set(group.mover, group.original);
      }
    }
  }

  private static sameColor(
    a: ColorRecordEntity.Type,
    b: ColorRecordEntity.Type
  ): boolean {
    const epsilon = 1e-12;
    const result =
      Math.abs(a.rgb.r - b.rgb.r) <= epsilon &&
      Math.abs(a.rgb.g - b.rgb.g) <= epsilon &&
      Math.abs(a.rgb.b - b.rgb.b) <= epsilon;
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
 * Warn mode observes CVD evidence without mutating roles. Nudge mode corrects
 * unpinned roles for CVD evidence without terminal blockers. Enforce mode
 * corrects and emits terminal blockers for unresolved evidence. All pairs that
 * share a provenance-selected movable role
 * are optimized as one constraint group; that mover can be the semantic
 * foreground or background. Role dependencies are solved from terminal
 * counterparts toward their mover consumers; strongly connected role sets use a
 * bounded deterministic iteration. A bounded OKLCH lightness/chroma search
 * chooses the closest in-gamut candidate among those with the fewest remaining
 * failures, without regressing any declared pair's trichromat contrast or
 * introducing a CVD failure type that the original pair did not have. A
 * graph-wide terminal audit rolls back only invalid dependent corrections
 * before staged writes are applied. Warnings and correction metadata describe
 * only those final values. If no valid candidate exists, the selected movable
 * role remains unchanged and its unresolved warnings remain advisory.
 */
class EnforceCvdSimulate {
  private lastTestingSearchBudgetUsage:
    | { readonly 'candidateScores': number; readonly 'weightedUnits': number }
    | undefined;
  private testingSearchBudget:
    | {
      readonly 'maximumCandidateScores': number;
      readonly 'maximumWeightedUnits': number;
    }
    | undefined;

  configureSearchBudgetForTesting(
    maximumCandidateScores: number,
    maximumWeightedUnits: number
  ): void {
    if (
      !Number.isSafeInteger(maximumCandidateScores) ||
      maximumCandidateScores < 0
    ) {
      throw new RangeError(
        'maximumCandidateScores must be a non-negative safe integer'
      );
    }
    if (
      !Number.isSafeInteger(maximumWeightedUnits) ||
      maximumWeightedUnits < 0
    ) {
      throw new RangeError(
        'maximumWeightedUnits must be a non-negative safe integer'
      );
    }
    this.lastTestingSearchBudgetUsage = undefined;
    this.testingSearchBudget = {
      'maximumCandidateScores': maximumCandidateScores,
      'maximumWeightedUnits': maximumWeightedUnits
    };
  }

  clearSearchBudgetForTesting(): void {
    this.lastTestingSearchBudgetUsage = undefined;
    this.testingSearchBudget = undefined;
  }

  searchBudgetUsageForTesting():
    | { readonly 'candidateScores': number; readonly 'weightedUnits': number }
    | undefined {
    const result = this.lastTestingSearchBudgetUsage;
    return result;
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const requirements = ContrastPolicy.normalize(
      state.input,
      PaletteRoleState.admit(state.roles)
    );
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    if (failurePolicy.mutatesRoles()) {
      this.correct(state, context, requirements, failurePolicy);
      return;
    }
    this.recordObservation(state, context, requirements, failurePolicy);
  }

  refine(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[]
  ): void {
    this.correct(state, context, requirements, CvdFailurePolicy.resolve(state.input.contrast));
  }

  observe(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[],
    baseline?: ReadonlyMap<string, ColorRecordEntity.Type>
  ): void {
    this.recordObservation(
      state,
      context,
      requirements,
      CvdFailurePolicy.resolve(state.input.contrast),
      baseline
    );
  }

  reconcile(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[],
    baseline: ReadonlyMap<string, ColorRecordEntity.Type>
  ): void {
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    const results = this.reportCorrected(
      requirements,
      baseline,
      state,
      context,
      failurePolicy
    );
    const blocked = failurePolicy.emitsBlockers()
      ? this.terminalBlocked([], requirements, state, failurePolicy)
      : [];
    this.writeMetadata(
      state,
      context,
      blocked,
      results.corrections,
      results.warnings
    );
  }

  private correct(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[],
    failurePolicy: CvdFailurePolicy
  ): void {
    if (requirements.length === 0) {
      state.metadata['contrast:cvd'] = {
        'blocked': [],
        'corrections': [],
        'warnings': []
      };
      return;
    }
    const originals = this.snapshotRoles(state);
    const budget = this.createSearchBudget();
    const blocked = this.correctRoles(
      requirements,
      originals,
      state,
      budget,
      failurePolicy
    );
    if (this.testingSearchBudget !== undefined) {
      this.lastTestingSearchBudgetUsage = budget.usage();
    }
    const results = this.reportCorrected(
      requirements,
      originals,
      state,
      context,
      failurePolicy
    );
    const terminalBlocked = failurePolicy.emitsBlockers()
      ? this.terminalBlocked(blocked, requirements, state, failurePolicy)
      : [];
    this.writeMetadata(
      state,
      context,
      terminalBlocked,
      results.corrections,
      results.warnings
    );
  }

  private recordObservation(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    requirements: readonly ContrastPolicy.RequirementInterface[],
    failurePolicy: CvdFailurePolicy,
    baseline?: ReadonlyMap<string, ColorRecordEntity.Type>
  ): void {
    if (requirements.length === 0) {
      state.metadata['contrast:cvd'] = {
        'blocked': [],
        'corrections': [],
        'warnings': []
      };
      return;
    }
    const originals = baseline ?? this.snapshotRoles(state);
    const results = this.reportAdvisory(
      requirements,
      originals,
      state,
      context,
      failurePolicy
    );
    this.writeMetadata(
      state,
      context,
      [],
      results.corrections,
      results.warnings
    );
  }

  private terminalBlocked(
    existing: readonly CvdBlockedPairEntity.Type[],
    requirements: readonly ContrastPolicy.RequirementInterface[],
    state: PaletteStateInterface,
    failurePolicy: CvdFailurePolicy
  ): CvdBlockedPairEntity.Type[] {
    const blocked = [...existing];
    const known = new Set<string>();
    for (let index = 0; index < existing.length; index += 1) {
      const pair = existing[index];
      if (pair !== undefined) {
        known.add(`${pair.foreground}\u0000${pair.background}`);
      }
    }
    const groups = this.terminalFailureGroups(
      requirements,
      state,
      known,
      failurePolicy
    );
    const provenance = Metadata.roleProvenance(state.metadata);
    for (const group of groups.values()) {
      const mover = CvdMover.select(
        group.foreground,
        group.background,
        provenance
      );
      blocked.push(
        CvdBlockedPairEntity.intake({
          'background': group.background,
          'cvdTypes': group.cvdTypes,
          'foreground': group.foreground,
          'reason': mover === undefined ? 'stated-both' : 'solver-exhausted'
        })
      );
    }
    return blocked;
  }

  private terminalFailureGroups(
    requirements: readonly ContrastPolicy.RequirementInterface[],
    state: PaletteStateInterface,
    known: ReadonlySet<string>,
    failurePolicy: CvdFailurePolicy
  ): ReadonlyMap<
    string,
    {
      readonly 'background': string;
      readonly 'cvdTypes': string[];
      readonly 'foreground': string;
    }
  > {
    const groups = new Map<
      string,
      {
        readonly 'background': string;
        readonly 'cvdTypes': string[];
        readonly 'foreground': string;
      }
    >();
    for (let index = 0; index < requirements.length; index += 1) {
      const pair = requirements[index];
      if (pair === undefined) {
        continue;
      }
      const group = this.terminalFailureGroup(
        pair,
        state,
        known,
        failurePolicy
      );
      if (group !== undefined) {
        groups.set(`${group.foreground}\u0000${group.background}`, group);
      }
    }
    return groups;
  }

  private terminalFailureGroup(
    pair: ContrastPolicy.RequirementInterface,
    state: PaletteStateInterface,
    known: ReadonlySet<string>,
    failurePolicy: CvdFailurePolicy
  ): {
    readonly 'background': string;
    readonly 'cvdTypes': string[];
    readonly 'foreground': string;
  } | undefined {
    const foreground = state.roles[pair.foreground];
    const background = state.roles[pair.background];
    const key = `${pair.foreground}\u0000${pair.background}`;
    if (foreground === undefined || background === undefined || known.has(key)) {
      return undefined;
    }
    const emittedForeground = colorRecordFactory.fromHex(foreground.hex);
    const emittedBackground = colorRecordFactory.fromHex(background.hex);
    const evaluations = CvdSimulation.evaluate(
      emittedForeground.rgb,
      emittedBackground.rgb,
      contrastWcag21.apply(emittedForeground, emittedBackground),
      pair.cvdMinimumContrastRatio,
      failurePolicy
    );
    const failures = this.failing(evaluations);
    if (failures.length === 0) {
      return undefined;
    }
    return {
      'background': pair.background,
      'cvdTypes': this.typesFor(failures),
      'foreground': pair.foreground
    };
  }

  private writeMetadata(
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    blocked: readonly CvdBlockedPairEntity.Type[],
    corrections: readonly CvdCorrectionEntity.Type[],
    warnings: readonly CvdPairWarningEntity.Type[]
  ): void {
    const metadata = CvdResultSetEntity.intake({
      'blocked': [...blocked],
      'corrections': [...corrections],
      'warnings': [...warnings]
    });
    state.metadata['contrast:cvd'] = metadata;
    context.logger.debug(
      LogBody.create({
        'component': 'EnforceCvdSimulate',
        'context': {
          'correctionCount': corrections.length,
          'cvdMeta': metadata,
          'warningCount': warnings.length
        },
        'message': 'CVD simulation complete',
        'operation': 'writeMetadata',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  private reportSummary(
    warnings: readonly CvdPairWarningEntity.Type[],
    message: string,
    context: PipelineContextInterface
  ): void {
    if (warnings.length === 0) {
      return;
    }
    const cvdTypes = new Set<string>();
    for (let index = 0; index < warnings.length; index += 1) {
      const warning = warnings[index];
      if (warning !== undefined) {
        cvdTypes.add(warning.cvdType);
      }
    }
    context.logger.warn(
      LogBody.create({
        'component': 'EnforceCvdSimulate',
        'context': {
          'cvdTypes': Array.from(cvdTypes),
          'warningCount': warnings.length
        },
        'message': message,
        'operation': 'reportSummary',
        'status': LOG_STATUS.PARTIAL
      })
    );
  }

  private snapshotRoles(
    state: PaletteStateInterface
  ): Map<string, ColorRecordEntity.Type> {
    const originals = new Map<string, ColorRecordEntity.Type>();
    const entries = Object.entries(state.roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [name, role] = entry;
      originals.set(
        name,
        colorRecordFactory.fromHex(role.hex, {
          'alphaOverride': role.alpha,
          'hints': role.hints,
          'sourceFormat': role.sourceFormat
        })
      );
    }
    return originals;
  }

  private correctRoles(
    pairs: readonly ContrastPolicy.RequirementInterface[],
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    budget: CvdSearchBudget,
    failurePolicy: CvdFailurePolicy
  ): CvdBlockedPairEntity.Type[] {
    const grouped = this.groupsFor(pairs, originals, state, failurePolicy);
    const resolved = CvdCorrectionCoordinator.resolve(
      grouped.groups,
      originals,
      budget
    );
    const values = Array.from(grouped.groups.values());
    for (let index = 0; index < values.length; index += 1) {
      const group = values[index];
      if (group === undefined) {
        continue;
      }
      const corrected = resolved.get(group.mover);
      if (
        corrected !== undefined &&
        corrected !== group.original &&
        ContrastPolicy.allowsRoleRecord(state.input, group.mover, corrected)
      ) {
        Object.defineProperty(state.roles, group.mover, {
          'configurable': true,
          'enumerable': true,
          'value': corrected,
          'writable': true
        });
      }
    }
    return grouped.blocked;
  }

  private createSearchBudget(): CvdSearchBudget {
    const configured = this.testingSearchBudget;
    if (configured === undefined) {
      const result = CvdSearchBudget.create();
      return result;
    }
    const result = CvdSearchBudget.create(configured);
    return result;
  }

  private groupsFor(
    pairs: readonly ContrastPolicy.RequirementInterface[],
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    failurePolicy: CvdFailurePolicy
  ): CvdGroups {
    const groups = new Map<string, CvdMoverGroup>();
    const blocked: CvdBlockedPairEntity.Type[] = [];
    const provenance = Metadata.roleProvenance(state.metadata);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        this.addPairGroup(
          pair,
          originals,
          state,
          provenance,
          groups,
          blocked,
          failurePolicy
        );
      }
    }
    const entries = Array.from(groups.entries());
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [mover, group] = entry;
      const infeasible = CvdInfeasibility.blocked(group);
      if (infeasible.length === 0) {
        continue;
      }
      if (failurePolicy.emitsBlockers()) {
        blocked.push(...infeasible);
      }
      groups.delete(mover);
    }
    return new CvdGroups(groups, blocked);
  }

  private addPairGroup(
    pair: ContrastPolicy.RequirementInterface,
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    provenance: ReadonlyMap<string, { readonly 'origin': string }>,
    groups: Map<string, CvdMoverGroup>,
    blocked: CvdBlockedPairEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): void {
    const foreground = originals.get(pair.foreground);
    const background = originals.get(pair.background);
    if (foreground === undefined || background === undefined) {
      return;
    }
    const mover = CvdMover.select(pair.foreground, pair.background, provenance);
    if (mover === undefined) {
      const cvdTypes = Array.from(
        CvdSimulation.failureTypes(
          foreground,
          background,
          pair.cvdMinimumContrastRatio,
          failurePolicy
        )
      );
      if (cvdTypes.length > 0 && failurePolicy.emitsBlockers()) {
        blocked.push(
          CvdBlockedPairEntity.create({
            'background': pair.background,
            'cvdTypes': cvdTypes,
            'foreground': pair.foreground,
            'reason': 'stated-both'
          })
        );
      }
      return;
    }
    const moverRecord = originals.get(mover.roleName);
    const counterpart = originals.get(mover.counterpartName);
    if (moverRecord === undefined || counterpart === undefined) {
      return;
    }
    let group = groups.get(mover.roleName);
    if (group === undefined) {
      group = new CvdMoverGroup(
        mover.roleName,
        moverRecord,
        failurePolicy,
        ContrastPolicy.roleRange(state.input, mover.roleName)
      );
      groups.set(mover.roleName, group);
    }
    group.add(
      mover.counterpartName,
      counterpart,
      pair.foreground,
      pair.cvdMinimumContrastRatio
    );
  }

  private reportCorrected(
    pairs: readonly ContrastPolicy.RequirementInterface[],
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    failurePolicy: CvdFailurePolicy
  ): {
    readonly 'corrections': CvdCorrectionEntity.Type[];
    readonly 'warnings': CvdPairWarningEntity.Type[];
  } {
    const corrections: CvdCorrectionEntity.Type[] = [];
    const warnings = this.reportPairs(
      pairs,
      originals,
      state,
      context,
      corrections,
      failurePolicy
    );
    this.reportSummary(
      warnings,
      'CVD simulation emitted terminal advisory evidence',
      context
    );
    return { 'corrections': corrections, 'warnings': warnings };
  }

  private reportAdvisory(
    pairs: readonly ContrastPolicy.RequirementInterface[],
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    failurePolicy: CvdFailurePolicy
  ): {
    readonly 'corrections': CvdCorrectionEntity.Type[];
    readonly 'warnings': CvdPairWarningEntity.Type[];
  } {
    const corrections: CvdCorrectionEntity.Type[] = [];
    const warnings = this.reportPairs(
      pairs,
      originals,
      state,
      context,
      undefined,
      failurePolicy
    );
    this.reportSummary(
      warnings,
      'CVD advisory: pairs fail perceptual-stability threshold',
      context
    );
    return { 'corrections': corrections, 'warnings': warnings };
  }

  private reportPairs(
    pairs: readonly ContrastPolicy.RequirementInterface[],
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    corrections: CvdCorrectionEntity.Type[] | undefined,
    failurePolicy: CvdFailurePolicy
  ): CvdPairWarningEntity.Type[] {
    const warnings: CvdPairWarningEntity.Type[] = [];
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        this.reportPair(
          pair,
          originals,
          state,
          context,
          warnings,
          corrections,
          failurePolicy
        );
      }
    }
    return warnings;
  }

  private reportPair(
    pair: ContrastPolicy.RequirementInterface,
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    context: PipelineContextInterface,
    warnings: CvdPairWarningEntity.Type[],
    corrections: CvdCorrectionEntity.Type[] | undefined,
    failurePolicy: CvdFailurePolicy
  ): void {
    const finalForeground = state.roles[pair.foreground];
    const finalBackground = state.roles[pair.background];
    if (finalForeground === undefined || finalBackground === undefined) {
      return;
    }
    const foreground = colorRecordFactory.fromHex(finalForeground.hex);
    const background = colorRecordFactory.fromHex(finalBackground.hex);
    const cvdMinimum = pair.cvdMinimumContrastRatio;
    const evaluations = CvdSimulation.evaluate(
      foreground.rgb,
      background.rgb,
      contrastWcag21.apply(foreground, background),
      cvdMinimum,
      failurePolicy
    );
    const advisories = this.advisories(evaluations);
    const correctionEvidence = this.correctionEvidence(evaluations, failurePolicy);
    this.addWarnings(pair, advisories, warnings, context, cvdMinimum);
    if (corrections !== undefined) {
      if (correctionEvidence.length > 0) {
        this.logRemaining(pair, correctionEvidence, context);
      }
      this.addCorrection(
        pair,
        originals,
        foreground,
        background,
        correctionEvidence,
        corrections,
        state,
        failurePolicy
      );
    }
  }

  private advisories(
    evaluations: readonly CvdEvalEntity.Type[]
  ): CvdEvalEntity.Type[] {
    const advisories: CvdEvalEntity.Type[] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (
        evaluation !== undefined &&
        (evaluation.belowFloor || evaluation.exceedsDrop)
      ) {
        advisories.push(evaluation);
      }
    }
    return advisories;
  }

  private correctionEvidence(
    evaluations: readonly CvdEvalEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type[] {
    const evidence: CvdEvalEntity.Type[] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (evaluation !== undefined && failurePolicy.corrects(evaluation)) {
        evidence.push(evaluation);
      }
    }
    return evidence;
  }

  private failing(
    evaluations: readonly CvdEvalEntity.Type[]
  ): CvdEvalEntity.Type[] {
    const failures: CvdEvalEntity.Type[] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (evaluation?.fail === true) {
        failures.push(evaluation);
      }
    }
    return failures;
  }

  private addWarnings(
    pair: ContrastPolicy.RequirementInterface,
    failures: readonly CvdEvalEntity.Type[],
    warnings: CvdPairWarningEntity.Type[],
    context: PipelineContextInterface,
    requiredTrichromat: number
  ): void {
    for (let index = 0; index < failures.length; index += 1) {
      const failure = failures[index];
      if (failure !== undefined) {
        warnings.push(
          CvdWarning.create(
            pair.foreground,
            pair.background,
            failure,
            context,
            requiredTrichromat
          )
        );
      }
    }
  }

  private logRemaining(
    pair: { readonly 'background': string; readonly 'foreground': string },
    failures: readonly CvdEvalEntity.Type[],
    context: PipelineContextInterface
  ): void {
    const types: CvdEvalEntity.Type['cvdType'][] = [];
    for (let index = 0; index < failures.length; index += 1) {
      const failure = failures[index];
      if (failure !== undefined) {
        types.push(failure.cvdType);
      }
    }
    context.logger.debug(
      LogBody.create({
        'component': 'EnforceCvdSimulate',
        'context': {
          'background': pair.background,
          'foreground': pair.foreground,
          'remainingCvdTypes': types
        },
        'message': 'CVD correction could not clear every failing type',
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      })
    );
  }

  private addCorrection(
    pair: ContrastPolicy.RequirementInterface,
    originals: ReadonlyMap<string, ColorRecordEntity.Type>,
    foreground: ColorRecordEntity.Type,
    background: ColorRecordEntity.Type,
    failures: readonly CvdEvalEntity.Type[],
    corrections: CvdCorrectionEntity.Type[],
    state: PaletteStateInterface,
    failurePolicy: CvdFailurePolicy
  ): void {
    const originalForeground = originals.get(pair.foreground);
    const originalBackground = originals.get(pair.background);
    if (originalForeground === undefined || originalBackground === undefined) {
      return;
    }
    const mover = CvdMover.select(
      pair.foreground,
      pair.background,
      Metadata.roleProvenance(state.metadata)
    );
    if (mover === undefined) {
      return;
    }
    const adjustedRoles: string[] = [];
    if (foreground.hex !== originalForeground.hex) {
      adjustedRoles.push(pair.foreground);
    }
    if (background.hex !== originalBackground.hex) {
      adjustedRoles.push(pair.background);
    }
    if (adjustedRoles.length === 0) {
      return;
    }
    const initial = CvdSimulation.evaluate(
      originalForeground.rgb,
      originalBackground.rgb,
      contrastWcag21.apply(originalForeground, originalBackground),
      pair.cvdMinimumContrastRatio,
      failurePolicy
    );
    const fixed = this.fixedTypes(initial, failures, failurePolicy);
    if (fixed.length > 0) {
      const disposition =
        mover.roleName === pair.foreground
          ? 'adjusted-foreground'
          : 'adjusted-background';
      corrections.push(
        CvdCorrectionEntity.intake({
          'adjustedRoles': adjustedRoles,
          'background': pair.background,
          'cvdTypesFixed': fixed,
          'cvdTypesRemaining': this.typesFor(failures),
          'disposition': disposition,
          'foreground': pair.foreground
        })
      );
    }
  }

  private fixedTypes(
    initial: readonly CvdEvalEntity.Type[],
    failures: readonly CvdEvalEntity.Type[],
    failurePolicy: CvdFailurePolicy
  ): CvdEvalEntity.Type['cvdType'][] {
    const remaining = new Set(this.typesFor(failures));
    const fixed: CvdEvalEntity.Type['cvdType'][] = [];
    for (let index = 0; index < initial.length; index += 1) {
      const evaluation = initial[index];
      if (
        evaluation !== undefined &&
        failurePolicy.corrects(evaluation) &&
        !remaining.has(evaluation.cvdType)
      ) {
        fixed.push(evaluation.cvdType);
      }
    }
    return fixed;
  }

  private typesFor(
    evaluations: readonly CvdEvalEntity.Type[]
  ): CvdEvalEntity.Type['cvdType'][] {
    const types: CvdEvalEntity.Type['cvdType'][] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = evaluations[index];
      if (evaluation !== undefined) {
        types.push(evaluation.cvdType);
      }
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
    evaluation: CvdEvalEntity.Type,
    context: PipelineContextInterface,
    requiredTrichromat: number
  ): CvdPairWarningEntity.Type {
    const threshold = CvdWarning.thresholdFor(evaluation, requiredTrichromat);
    const simulatedContrastRatio =
      evaluation.originalContrast === 0
        ? 0
        : evaluation.simContrast / evaluation.originalContrast;
    const simulatedContrastDropRatio =
      evaluation.originalContrast === 0
        ? 0
        : evaluation.drop / evaluation.originalContrast;
    const warning: CvdPairWarningEntity.Type = {
      'background': background,
      'cvdType': evaluation.cvdType,
      'drop': evaluation.drop,
      'dropThreshold': threshold.dropMagnitude,
      'foreground': foreground,
      'minimumSimulatedContrast': threshold.minimumSimulatedContrast,
      'originalLuminanceContrast': evaluation.originalContrast,
      'simulatedContrastDropRatio': simulatedContrastDropRatio,
      'simulatedContrastRatio': simulatedContrastRatio,
      'simulatedLuminanceContrast': evaluation.simContrast
    };
    context.logger.debug(
      LogBody.create({
        'component': 'EnforceCvdSimulate',
        'context': {
          'background': background,
          'cvdType': evaluation.cvdType,
          'drop': evaluation.drop,
          'dropThreshold': threshold.dropMagnitude,
          'foreground': foreground,
          'minimumSimulatedContrast': threshold.minimumSimulatedContrast,
          'originalContrast': evaluation.originalContrast,
          'reason': evaluation.exceedsDrop ? 'drop' : 'floor',
          'simulatedContrast': evaluation.simContrast,
          'simulatedContrastDropRatio': simulatedContrastDropRatio,
          'simulatedContrastRatio': simulatedContrastRatio
        },
        'message': 'CVD advisory: pair fails perceptual-stability threshold',
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      })
    );
    return warning;
  }

  private static thresholdFor(
    evaluation: CvdEvalEntity.Type,
    requiredTrichromat: number
  ): {
    readonly 'dropMagnitude': number;
    readonly 'minimumSimulatedContrast': number;
  } {
    const threshold = CVD_THRESHOLDS[evaluation.cvdType];
    const result = {
      'dropMagnitude': threshold.dropMagnitude,
      'minimumSimulatedContrast': Math.max(
        threshold.minimumSimulatedContrast,
        requiredTrichromat
      )
    };
    return result;
  }
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
