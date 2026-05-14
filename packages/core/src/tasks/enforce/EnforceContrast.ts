import type {
  ColorRecordInterface,
  ContrastAlgorithmType,
  ContrastPairInterface,
  ContrastReportEntryInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { contrastApca }   from '../../math/ContrastApca.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';

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

/**
 * Converts `input.contrast.level` to a minimum WCAG 21 ratio floor.
 *
 * - `'AAA'` → 7.0 (WCAG 2.1 enhanced contrast for normal text)
 * - `'AA'`  → 4.5 (WCAG 2.1 minimum contrast for normal text)
 * - anything else → 1.0 (no floor — pair's own minRatio governs)
 *
 * When a pair's declared `minRatio` already exceeds this floor the pair's
 * value wins. The level is a global minimum; it never lowers a pair's ratio.
 */
function levelFloor(level: string | undefined): number {
  if (level === 'AAA') return 7.0;
  if (level === 'AA')  return 4.5;
  return 1.0;
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
    const floor        = levelFloor(state.input.contrast?.level);

    const allPairs: readonly ContrastPairInterface[] = [...schemaPairs, ...extraPairs];

    if (allPairs.length === 0) {
      return;
    }

    const report: ContrastReportEntryInterface[] = [];

    for (const pair of allPairs) {
      const fgColor = state.roles[pair.foreground];
      const bgColor = state.roles[pair.background];

      if (!fgColor || !bgColor) {
        ctx.logger.warn('EnforceContrast', 'run', 'Contrast pair has missing role(s)', {
          'foreground': pair.foreground,
          'background': pair.background,
        });
        continue;
      }

      const algo     = pair.algorithm ?? defaultAlgo;
      // input.contrast.level acts as a global floor — never lowers a pair's declared ratio.
      const minRatio = Math.max(pair.minRatio, floor);

      const ratio  = measureContrast(algo, fgColor, bgColor);
      const passed = ratio >= minRatio;

      let adjusted = false;
      let finalFg = fgColor;

      if (!passed) {
        ctx.logger.info('EnforceContrast', 'run', 'Pair below minimum ratio — nudging', {
          'foreground': pair.foreground,
          'background': pair.background,
          'ratio':      ratio,
          'minRatio':   minRatio,
        });

        finalFg = ensureContrast.apply(fgColor, bgColor, minRatio, algo);

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
        'minRatio':   minRatio,
        'passed':     finalRatio >= minRatio,
        'adjusted':   adjusted,
      });
    }

    state.metadata['contrastReport'] = report;
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
