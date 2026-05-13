import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { clamp01, contrastWcag21, getOrCreateMetadata, linearToSrgb, srgbToLinear } from '@studnicky/iridis';
import { cvdMatrices } from '../data/cvdMatrices.ts';
import type { CvdMatrixInterface } from '../types/index.ts';
import type { CvdPairWarningInterface } from '../types/augmentation.ts';

function applyMatrix(
  cvd: CvdMatrixInterface,
  r: number,
  g: number,
  b: number,
): readonly [number, number, number] {
  const m = cvd.matrix;
  // Row-major: [m0 m1 m2 / m3 m4 m5 / m6 m7 m8]
  const rp = m[0]! * r + m[1]! * g + m[2]! * b;
  const gp = m[3]! * r + m[4]! * g + m[5]! * b;
  const bp = m[6]! * r + m[7]! * g + m[8]! * b;
  return [
    clamp01(rp),
    clamp01(gp),
    clamp01(bp),
  ] as const;
}

function simulateColor(
  color: ColorRecordInterface,
  cvd: CvdMatrixInterface,
): { readonly r: number; readonly g: number; readonly b: number } {
  // Convert gamma-encoded sRGB → linear sRGB
  const lin = srgbToLinear.apply(color.rgb.r, color.rgb.g, color.rgb.b);

  // Apply CVD matrix in linear sRGB
  const [rp, gp, bp] = applyMatrix(cvd, lin.r, lin.g, lin.b);

  // Convert back to gamma-encoded sRGB
  const encoded = linearToSrgb.apply(rp, gp, bp);
  return { 'r': encoded.r, 'g': encoded.g, 'b': encoded.b };
}

function simulatedLuminance(sim: { readonly r: number; readonly g: number; readonly b: number }): number {
  const lin = srgbToLinear.apply(sim.r, sim.g, sim.b);
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}

function simulatedContrast(
  fg: { readonly r: number; readonly g: number; readonly b: number },
  bg: { readonly r: number; readonly g: number; readonly b: number },
): number {
  const l1 = simulatedLuminance(fg);
  const l2 = simulatedLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export class EnforceCvdSimulate implements TaskInterface {
  readonly 'name' = 'enforce:cvdSimulate';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'enforce:cvdSimulate',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['metadata.wcag.cvd'],
    'description': 'Advisory CVD simulation: checks contrast drop under protanopia, deuteranopia, tritanopia. Warns but does not auto-fix.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    // Advisory drop threshold: warn if simulated contrast drops more than 1.0 below original.
    const DROP_THRESHOLD = 1.0;

    const warnings: CvdPairWarningInterface[] = [];

    for (const pair of pairs) {
      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (!fgRecord || !bgRecord) {
        continue;
      }

      const originalContrast = contrastWcag21.apply(fgRecord, bgRecord);

      for (const cvd of cvdMatrices) {
        const simFg = simulateColor(fgRecord, cvd);
        const simBg = simulateColor(bgRecord, cvd);
        const simContrast = simulatedContrast(simFg, simBg);
        const drop = originalContrast - simContrast;

        if (drop > DROP_THRESHOLD) {
          const warning: CvdPairWarningInterface = {
            'foreground':               pair.foreground,
            'background':               pair.background,
            'cvdType':                  cvd.name,
            'originalLuminanceContrast': originalContrast,
            'simulatedLuminanceContrast': simContrast,
            'drop':                     drop,
            'threshold':                DROP_THRESHOLD,
          };
          warnings.push(warning);
          ctx.logger.warn(
            'EnforceCvdSimulate',
            'run',
            `CVD advisory: ${pair.foreground}/${pair.background} contrast drops ${drop.toFixed(2)} under ${cvd.name} (${originalContrast.toFixed(2)} → ${simContrast.toFixed(2)})`,
            warning,
          );
        }
      }
    }

    const wcagMeta = getOrCreateMetadata(state, 'wcag');
    wcagMeta['cvd'] = { 'warnings': warnings };

    ctx.logger.debug('EnforceCvdSimulate', 'run', `CVD simulation complete. ${warnings.length} warning(s).`, wcagMeta['cvd']);
  }
}

export const enforceCvdSimulate = new EnforceCvdSimulate();
