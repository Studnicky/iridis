import type {
  ColorRecordInterface,
  ContrastAlgorithmType,
  ContrastPairInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { contrastApca }   from '../../math/ContrastApca.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';

interface ContrastReport {
  'foreground':  string;
  'background':  string;
  'algorithm':   string;
  'ratio':       number;
  'minRatio':    number;
  'passed':      boolean;
  'adjusted':    boolean;
}

function measureContrast(
  algorithm: ContrastAlgorithmType,
  fg: ColorRecordInterface,
  bg: ColorRecordInterface,
): number {
  if (algorithm === 'apca') {
    return contrastApca.apply(fg, bg);
  }
  return contrastWcag21.apply(fg, bg);
}

export class EnforceContrast implements TaskInterface {
  readonly 'name' = 'enforce:contrast';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'enforce:contrast',
    'reads':       ['roles', 'input.roles', 'input.contrast'],
    'writes':      ['roles', 'metadata.contrastReport'],
    'requires':    ['contrastWcag21', 'contrastApca', 'ensureContrast'],
    'description': 'Checks and nudges foreground role colors to meet minRatio for each contrast pair.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const schemaPairs  = state.input.roles?.contrastPairs ?? [];
    const extraPairs   = state.input.contrast?.extra       ?? [];
    const defaultAlgo  = state.input.contrast?.algorithm   ?? 'wcag21';

    const allPairs: readonly ContrastPairInterface[] = [...schemaPairs, ...extraPairs];

    if (allPairs.length === 0) {
      return;
    }

    const report: ContrastReport[] = [];

    for (const pair of allPairs) {
      const fgColor = state.roles[pair.foreground];
      const bgColor = state.roles[pair.background];

      if (!fgColor || !bgColor) {
        ctx.logger.warn(
          'EnforceContrast',
          'run',
          `Contrast pair "${pair.foreground}"/"${pair.background}" — one or both roles missing`,
        );
        continue;
      }

      const algo = pair.algorithm ?? defaultAlgo;

      const ratio = measureContrast(algo, fgColor, bgColor);
      const passed = ratio >= pair.minRatio;

      let adjusted = false;
      let finalFg = fgColor;

      if (!passed) {
        ctx.logger.info(
          'EnforceContrast',
          'run',
          `Pair ${pair.foreground}/${pair.background}: ratio ${ratio.toFixed(2)} < ${pair.minRatio} — nudging`,
        );

        finalFg = ensureContrast.apply(fgColor, bgColor, pair.minRatio, algo);

        state.roles[pair.foreground] = finalFg;
        adjusted = true;
      }

      const finalRatio = adjusted
        ? measureContrast(algo, finalFg, bgColor)
        : ratio;

      report.push({
        'foreground': pair.foreground,
        'background': pair.background,
        'algorithm':  algo,
        'ratio':      finalRatio,
        'minRatio':   pair.minRatio,
        'passed':     finalRatio >= pair.minRatio,
        'adjusted':   adjusted,
      });
    }

    state.metadata['contrastReport'] = report;
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
