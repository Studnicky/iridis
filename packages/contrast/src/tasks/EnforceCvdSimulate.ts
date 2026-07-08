import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { clamp01, contrastWcag21, linearToSrgb, srgbToLinear } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { CvdPairWarningInterfaceType } from '../types/augmentation.ts';
import type { CvdMatrixInterfaceType } from '../types/index.ts';

import { cvdMatrices } from '../data/cvdMatrices.ts';
import { CVD_THRESHOLDS } from '../data/cvdThresholds.ts';

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
  color: ColorRecordInterfaceType,
  cvd: CvdMatrixInterfaceType
): { readonly 'b': number; readonly 'g': number; readonly 'r': number; } {
  // Convert gamma-encoded sRGB → linear sRGB
  const lin = srgbToLinear.apply(color.rgb.r, color.rgb.g, color.rgb.b);

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

/**
 * Evaluates every contrast pair against all four CVD types
 * (protanopia, deuteranopia, tritanopia, achromatopsia) and emits a
 * warning on `metadata.wcag.cvd.warnings` for any pair × type whose
 * perceptual-stability signals violate the published thresholds in
 * `CVD_THRESHOLDS`. Two signals are evaluated per pair × type:
 *  - The magnitude of the trichromat-vs-simulated WCAG-21 contrast
 *    drop must not exceed `dropMagnitude` (perceptible-difference
 *    boundary per [CIE76] / [SWD05] mapped to WCAG ratio space).
 *  - The post-simulation WCAG-21 contrast must stay ≥
 *    `minSimulatedContrast` ([WCAG21] SC 1.4.11 non-text floor).
 *
 * Advisory only; the task does not auto-fix.
 */
class EnforceCvdSimulate implements TaskInterface {
  readonly 'name' = 'enforce:cvdSimulate';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Advisory CVD simulation against published thresholds: protanopia, deuteranopia, tritanopia, achromatopsia. Warns but does not auto-fix.',
    'name':        'enforce:cvdSimulate',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['metadata[\'contrast:cvd\']']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const warnings: CvdPairWarningInterfaceType[] = [];

    for (const pair of pairs) {
      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (fgRecord === undefined || bgRecord === undefined) {
        continue;
      }

      const originalContrast = contrastWcag21.apply(fgRecord, bgRecord);

      for (const cvd of cvdMatrices) {
        const threshold   = CVD_THRESHOLDS[cvd.name];
        const simFg       = simulateColor(fgRecord, cvd);
        const simBg       = simulateColor(bgRecord, cvd);
        const simContrast = simulatedContrast(simFg, simBg);
        const drop        = originalContrast - simContrast;

        const exceedsDrop  = Math.abs(drop) > threshold.dropMagnitude;
        const belowFloor   = simContrast < threshold.minSimulatedContrast;

        // For achromatopsia, dropMagnitude is 0 and the drop is
        // identically 0 by definition of the BT.709 grayscale
        // projection, so only the floor signal can fire. For the
        // dichromacies, either signal can trigger.
        if (!exceedsDrop && !belowFloor) {
          continue;
        }

        const warning: CvdPairWarningInterfaceType = {
          'background':                  pair.background,
          'cvdType':                     cvd.name,
          'drop':                        drop,
          'dropThreshold':               threshold.dropMagnitude,
          'foreground':                  pair.foreground,
          'minSimulatedContrast':        threshold.minSimulatedContrast,
          'originalLuminanceContrast':   originalContrast,
          'simulatedLuminanceContrast':  simContrast
        };
        warnings.push(warning);
        ctx.logger.warn(
          LogBody.create()
            .component('EnforceCvdSimulate')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('CVD advisory: pair fails perceptual-stability threshold')
            .context({
              'background':            pair.background,
              'cvdType':               cvd.name,
              'drop':                  drop,
              'dropThreshold':         threshold.dropMagnitude,
              'foreground':            pair.foreground,
              'minSimulatedContrast':  threshold.minSimulatedContrast,
              'originalContrast':      originalContrast,
              'reason':                exceedsDrop ? 'drop' : 'floor',
              'simulatedContrast':     simContrast
            })
            .build()
        );
      }
    }

    state.metadata['contrast:cvd'] = { 'warnings': warnings };

    ctx.logger.debug(
      LogBody.create()
        .component('EnforceCvdSimulate')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('CVD simulation complete')
        .context({ 'cvdMeta': state.metadata['contrast:cvd'], 'warningCount': warnings.length })
        .build()
    );
  }
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
