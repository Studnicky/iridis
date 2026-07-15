import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  CvdType,
  PaletteStateInterface,
  PipelineContextInterface,
  RgbInterfaceType,
  SourceFormatType,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { clamp01, colorRecordFactory, contrastWcag21, linearToSrgb, oklchToRgbRaw, srgbToLinear } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { CvdCorrectionInterfaceType, CvdPairWarningInterfaceType } from '../types/augmentation.ts';
import type { CvdMatrixInterfaceType } from '../types/index.ts';

import { cvdMatrices } from '../data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../data/cvdThresholds.ts';

/** sRGB-family source formats. When the original foreground was sourced from
 *  one of these, the corrected record must remain sRGB (no displayP3 slot).
 *  Mirrors `EnsureContrast`'s gamut-preservation idiom. */
const SRGB_FORMATS: ReadonlySet<SourceFormatType> = new Set([
  'hex', 'hsl', 'imagePixel', 'lab', 'named', 'rgb'
]);

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

function simulateColor(
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

function simulatedLuminance(sim: { readonly 'b': number; readonly 'g': number; readonly 'r': number; }): number {
  const lin = srgbToLinear.apply(sim.r, sim.g, sim.b);
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}

/** WCAG-21 style contrast ratio between two gamma-encoded sRGB triples.
 *  Used both for CVD-simulated contrast and, fed un-simulated triples,
 *  for the trichromat contrast of a correction candidate — the formula
 *  is identical either way. */
function simulatedContrast(
  fg: { readonly 'b': number; readonly 'g': number; readonly 'r': number; },
  bg: { readonly 'b': number; readonly 'g': number; readonly 'r': number; }
): number {
  const l1 = simulatedLuminance(fg);
  const l2 = simulatedLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

type CvdEvalInterfaceType = {
  'belowFloor':      boolean;
  'cvdType':         CvdType;
  'drop':            number;
  'exceedsDrop':     boolean;
  'fail':            boolean;
  'originalContrast': number;
  'simContrast':     number;
};

/** Evaluates a foreground/background rgb pair against every CVD matrix.
 *  Pure — no metadata writes, no logging. Shared by the initial
 *  detection pass and the post-correction final pass. */
function evaluateCvd(
  fgRgb: RgbInterfaceType,
  bgRgb: RgbInterfaceType,
  originalContrast: number
): CvdEvalInterfaceType[] {
  const evals: CvdEvalInterfaceType[] = [];
  for (const cvd of cvdMatrices) {
    const threshold   = CVD_THRESHOLDS[cvd.name];
    const simFg       = simulateColor(fgRgb, cvd);
    const simBg       = simulateColor(bgRgb, cvd);
    const simContrast = simulatedContrast(simFg, simBg);
    const drop        = originalContrast - simContrast;

    const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude;
    const belowFloor   = simContrast < threshold.minSimulatedContrast;

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

type CorrectionCandidateInterfaceType = {
  'allClear':           boolean;
  'c':                  number;
  'l':                  number;
  'rgb':                RgbInterfaceType;
  'trichromatContrast': number;
  'worstSim':           number;
};

/** Scores a candidate (l, c, h) against the currently-failing CVD types,
 *  gated by the trichromat-contrast baseline. */
function scoreCandidate(
  l: number,
  c: number,
  h: number,
  bgRgb: RgbInterfaceType,
  failingTypes: readonly CvdMatrixInterfaceType[]
): CorrectionCandidateInterfaceType {
  const rgb = oklchToRgbRaw.apply(l, c, h);
  const trichromatContrast = simulatedContrast(rgb, bgRgb);

  let worstSim  = Infinity;
  let allClear  = true;
  for (const cvd of failingTypes) {
    const threshold   = CVD_THRESHOLDS[cvd.name];
    const simFg       = simulateColor(rgb, cvd);
    const simBg       = simulateColor(bgRgb, cvd);
    const simContrast = simulatedContrast(simFg, simBg);
    const drop        = trichromatContrast - simContrast;

    const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude;
    const belowFloor   = simContrast < threshold.minSimulatedContrast;

    if (exceedsDrop || belowFloor) {
      allClear = false;
    }
    if (simContrast < worstSim) {
      worstSim = simContrast;
    }
  }

  return { 'allClear': allClear, 'c': c, 'l': l, 'rgb': rgb, 'trichromatContrast': trichromatContrast, 'worstSim': worstSim };
}

/**
 * Corrects `fgRecord` against the given `failingTypes` (CVD matrices the
 * pair currently fails) via a two-phase search: an OKLCH lightness walk
 * (mirrors `EnsureContrast`'s idiom, ±0.02 per step, 50-iteration budget)
 * followed, if lightness alone did not clear every failing type, by a
 * chroma-reduction fallback (×0.9 per step, 20-iteration budget).
 * Every candidate is gated by `baseline`: the trichromat WCAG-21
 * contrast of the corrected foreground must never fall below the
 * trichromat contrast already guaranteed by the earlier wcagAA/wcagAAA/
 * apca enforce tasks. Returns the best candidate found — which may still
 * leave some CVD types failing if no candidate in the search space
 * clears them without breaching the trichromat floor.
 */
function correctForeground(
  fgRecord: ColorRecordInterfaceType,
  bgRecord: ColorRecordInterfaceType,
  failingTypes: readonly CvdMatrixInterfaceType[],
  baseline: number
): ColorRecordInterfaceType {
  const fgL   = fgRecord.oklch.l;
  const c     = fgRecord.oklch.c;
  const h     = fgRecord.oklch.h;
  const alpha = fgRecord.alpha;
  const hints: ColorHintsInterfaceType | undefined = fgRecord.hints;
  const fmt   = fgRecord.sourceFormat;
  const isSrgb = SRGB_FORMATS.has(fmt);
  const bgRgb  = bgRecord.rgb;
  const step   = fgL < bgRecord.oklch.l ? -0.02 : 0.02;

  let best = scoreCandidate(fgL, c, h, bgRgb, failingTypes);

  // Phase 1 — lightness walk.
  let currentL = fgL;
  for (let i = 0; i < 50 && !best.allClear; i++) {
    const newL = clamp01.apply(currentL + step);
    const candidate = scoreCandidate(newL, c, h, bgRgb, failingTypes);

    if (candidate.trichromatContrast >= baseline && candidate.worstSim > best.worstSim) {
      best = candidate;
    }

    currentL = newL;
    if (newL === 0 || newL === 1) {
      break;
    }
  }

  // Phase 2 — chroma fallback, only if lightness alone did not clear
  // every failing type. Desaturating toward the neutral axis helps
  // because CVD failures are frequently hue-confusion; pushing both
  // colors toward neutral lets luminance carry more of the signal.
  if (!best.allClear) {
    let currentC = best.c;
    for (let i = 0; i < 20 && !best.allClear; i++) {
      currentC = currentC * 0.9;
      const candidate = scoreCandidate(best.l, currentC, h, bgRgb, failingTypes);

      if (candidate.trichromatContrast >= baseline && candidate.worstSim > best.worstSim) {
        best = candidate;
      }
    }
  }

  return isSrgb
    ? colorRecordFactory.fromRgb(best.rgb.r, best.rgb.g, best.rgb.b, { 'alpha': alpha, 'hints': hints, 'sourceFormat': fmt })
    : colorRecordFactory.fromOklch(best.l, best.c, h, { 'alpha': alpha, 'hints': hints, 'sourceFormat': fmt });
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
 * corrected in-place: the foreground is walked along the OKLCH L axis
 * (then, if needed, desaturated) until every failing type clears its
 * threshold or the search budget is exhausted, subject to never letting
 * trichromat contrast regress below the pre-correction baseline. The
 * corrected foreground is written to `state.roles[pair.foreground]` and
 * the pair is recorded in `metadata['contrast:cvd'].corrections`.
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

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const cvdCorrect = state.input.contrast?.cvdCorrect === true;
    const warnings: CvdPairWarningInterfaceType[] = [];
    const corrections: CvdCorrectionInterfaceType[] = [];

    for (const pair of pairs) {
      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (fgRecord === undefined || bgRecord === undefined) {
        continue;
      }

      const originalContrast = contrastWcag21.apply(fgRecord, bgRecord);
      const evals = evaluateCvd(fgRecord.rgb, bgRecord.rgb, originalContrast);
      const failing = evals.filter((e) => {const result = e.fail;
        return result;});

      if (!cvdCorrect || failing.length === 0) {
        // Default path (or nothing to fix): identical to advisory-only behavior.
        for (const e of failing) {
          warnings.push(pushWarning(pair.foreground, pair.background, e, ctx));
        }
        continue;
      }

      // Correction is active for this pair. `originalContrast` doubles as
      // the trichromat baseline correction must never regress below.
      const failingMatrices = cvdMatrices.filter((cvd) => {const result = failing.some((e) => {return e.cvdType === cvd.name;});
        return result;});
      const correctedFg = correctForeground(fgRecord, bgRecord, failingMatrices, originalContrast);

      const finalOriginalContrast = contrastWcag21.apply(correctedFg, bgRecord);
      const finalEvals = evaluateCvd(correctedFg.rgb, bgRecord.rgb, finalOriginalContrast);
      const finalFailing = finalEvals.filter((e) => {const result = e.fail;
        return result;});

      for (const e of finalFailing) {
        warnings.push(pushWarning(pair.foreground, pair.background, e, ctx));
      }

      if (finalFailing.length > 0) {
        ctx.logger.warn(
          LogBody.create()
            .component('EnforceCvdSimulate')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('CVD correction could not clear every failing type')
            .context({
              'background':          pair.background,
              'foreground':          pair.foreground,
              'remainingCvdTypes':   finalFailing.map((e) => {const result = e.cvdType;
                return result;})
            })
            .build()
        );
      }

      state.roles[pair.foreground] = correctedFg;

      if (correctedFg.hex !== fgRecord.hex) {
        const failingNames = failing.map((e) => {const result = e.cvdType;
          return result;});
        const remainingNames = finalFailing.map((e) => {const result = e.cvdType;
          return result;});
        corrections.push({
          'background':        pair.background,
          'cvdTypesFixed':     failingNames.filter((name) => {return !remainingNames.includes(name);}),
          'cvdTypesRemaining': remainingNames,
          'foreground':        pair.foreground
        });
      }
    }

    state.metadata['contrast:cvd'] = cvdCorrect
      ? { 'corrections': corrections, 'warnings': warnings }
      : { 'warnings': warnings };

    ctx.logger.debug(
      LogBody.create()
        .component('EnforceCvdSimulate')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('CVD simulation complete')
        .context({
          'correctionCount': corrections.length,
          'cvdMeta':         state.metadata['contrast:cvd'],
          'warningCount':    warnings.length
        })
        .build()
    );
  }
}

/** Builds a warning entry and emits the advisory log line — identical
 *  shape/message to the pre-correction behavior, reused for both the
 *  no-correction path and the post-correction final report. */
function pushWarning(
  foreground: string,
  background: string,
  e: CvdEvalInterfaceType,
  ctx: PipelineContextInterface
): CvdPairWarningInterfaceType {
  const threshold = CVD_THRESHOLDS[e.cvdType];
  const warning: CvdPairWarningInterfaceType = {
    'background':                  background,
    'cvdType':                     e.cvdType,
    'drop':                        e.drop,
    'dropThreshold':               threshold.dropMagnitude,
    'foreground':                  foreground,
    'minSimulatedContrast':        threshold.minSimulatedContrast,
    'originalLuminanceContrast':   e.originalContrast,
    'simulatedLuminanceContrast':  e.simContrast
  };
  ctx.logger.warn(
    LogBody.create()
      .component('EnforceCvdSimulate')
      .operation('run')
      .status(LOG_STATUS.PARTIAL)
      .message('CVD advisory: pair fails perceptual-stability threshold')
      .context({
        'background':            background,
        'cvdType':               e.cvdType,
        'drop':                  e.drop,
        'dropThreshold':         threshold.dropMagnitude,
        'foreground':            foreground,
        'minSimulatedContrast':  threshold.minSimulatedContrast,
        'originalContrast':      e.originalContrast,
        'reason':                e.exceedsDrop ? 'drop' : 'floor',
        'simulatedContrast':     e.simContrast
      })
      .build()
  );
  return warning;
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
