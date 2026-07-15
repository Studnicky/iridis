import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  ContrastAlgorithmType,
  ContrastPairInterfaceType,
  ContrastReportEntryInterfaceType,
  PaletteStateInterface,
  PendingContrastEntryInterfaceType,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { contrastApca }   from '../../math/ContrastApca.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';

/**
 * Measures contrast for `algorithm`. APCA's Lc is signed — positive for
 * dark-text-on-light-bg, negative for light-text-on-dark-bg — but callers
 * compare against an always-positive `minRatio`, so the magnitude is what
 * is returned here (consistent with `ensureContrast`'s own APCA measure).
 */
function measureContrast(
  algorithm: ContrastAlgorithmType,
  fg: ColorRecordInterfaceType,
  bg: ColorRecordInterfaceType
): number {
  if (algorithm === 'apca') {
    return Math.abs(contrastApca.apply(fg, bg));
  }
  return contrastWcag21.apply(fg, bg);
}

/**
 * Converts `input.contrast.level` to a minimum WCAG 21 ratio floor.
 *
 * - `'AAA'` → 7.0 (WCAG 2.1 enhanced contrast for normal text)
 * - `'AA'`  → 4.5 (WCAG 2.1 minimum contrast for normal text)
 * - anything else → 1.0 (no floor; pair's own minRatio governs)
 *
 * When a pair's declared `minRatio` already exceeds this floor the pair's
 * value wins. The level is a global minimum; it never lowers a pair's ratio.
 */
function levelFloor(level: string | undefined): number {
  if (level === 'AAA') {return 7.0;}
  if (level === 'AA')  {return 4.5;}
  return 1.0;
}

class EnforceContrast implements TaskInterface {
  readonly 'name' = 'enforce:contrast';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Checks and nudges foreground role colors to meet minRatio for each contrast pair.',
    'name':        'enforce:contrast',
    'reads':       ['roles', 'input.roles', 'input.contrast'],
    'requires':    ['contrastWcag21', 'contrastApca', 'ensureContrast'],
    'writes':      ['roles', 'metadata[\'core:contrastReport\']']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const schemaPairs  = state.input.roles?.contrastPairs ?? [];
    const extraPairs   = state.input.contrast?.extra       ?? [];
    const defaultAlgo  = state.input.contrast?.algorithm   ?? 'wcag21';
    const floor        = levelFloor(state.input.contrast?.level);

    const allPairs: readonly ContrastPairInterfaceType[] = [...schemaPairs, ...extraPairs];

    if (allPairs.length === 0) {
      return;
    }

    const pending: PendingContrastEntryInterfaceType[] = [];

    for (const pair of allPairs) {
      const fgColor = state.roles[pair.foreground];
      const bgColor = state.roles[pair.background];

      if (fgColor === undefined || bgColor === undefined) {
        ctx.logger.warn(
          LogBody.create()
            .component('EnforceContrast')
            .operation('run')
            .status(LOG_STATUS.INVALID)
            .message('Contrast pair has missing role(s)')
            .context({
              'background': pair.background,
              'foreground': pair.foreground
            })
            .build()
        );
        continue;
      }

      const algo     = pair.algorithm ?? defaultAlgo;
      // input.contrast.level acts as a global floor; never lowers a pair's declared ratio.
      const minRatio = Math.max(pair.minRatio, floor);

      const ratio  = measureContrast(algo, fgColor, bgColor);
      const passed = ratio >= minRatio;

      let adjusted = false;

      if (!passed) {
        ctx.logger.info(
          LogBody.create()
            .component('EnforceContrast')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('Pair below minimum ratio; nudging')
            .context({
              'background': pair.background,
              'foreground': pair.foreground,
              'minRatio':   minRatio,
              'ratio':      ratio
            })
            .build()
        );

        state.roles[pair.foreground] = ensureContrast.apply(fgColor, bgColor, minRatio, algo);
        adjusted = true;
      }

      pending.push({ 'adjusted': adjusted, 'algo': algo, 'minRatio': minRatio, 'pair': pair });
    }

    // Reconciliation: a foreground role shared across multiple pairs can be
    // re-nudged by a later pair, which invalidates an earlier pair's already
    // chosen color. Re-measure every pending pair against the terminal
    // state.roles so each report entry reflects the color actually left in
    // place, not the intermediate one observed when the pair was processed.
    const report: ContrastReportEntryInterfaceType[] = [];

    for (const entry of pending) {
      const finalFg = state.roles[entry.pair.foreground];
      const finalBg = state.roles[entry.pair.background];

      // Both roles were confirmed present when this pair was queued, and
      // roles are only ever overwritten (never deleted), so this holds.
      if (finalFg === undefined || finalBg === undefined) {
        continue;
      }

      const finalRatio = measureContrast(entry.algo, finalFg, finalBg);

      report.push({
        'adjusted':   entry.adjusted,
        'algorithm':  entry.algo,
        'background': entry.pair.background,
        'foreground': entry.pair.foreground,
        'minRatio':   entry.minRatio,
        'passed':     finalRatio >= entry.minRatio,
        'ratio':      finalRatio
      });
    }

    state.metadata['core:contrastReport'] = report;
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
