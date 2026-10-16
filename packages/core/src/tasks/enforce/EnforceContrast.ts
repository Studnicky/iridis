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
  RoleProvenanceMapInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { contrastApca }   from '../../math/ContrastApca.ts';
import { contrastWcag21 } from '../../math/ContrastWcag21.ts';
import { ensureContrast } from '../../math/EnsureContrast.ts';
import { EngineMetadata } from '../../types/metadata.ts';

class ContrastMeasurement {
  /**
   * Measures contrast for `algorithm`. APCA's Lc is signed — positive for
   * dark-text-on-light-bg, negative for light-text-on-dark-bg — but callers
   * compare against an always-positive minimum ratio, so the magnitude is
   * what is returned here (consistent with `ensureContrast`'s own APCA
   * measure).
   */
  static measure(
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
   * - anything else → 1.0 (no floor; pair's own minimum ratio governs)
   *
   * When a pair's declared minimum ratio already exceeds this floor the
   * pair's value wins. The level is a global minimum; it never lowers a
   * pair's ratio.
   */
  static levelFloor(level: string | undefined): number {
    if (level === 'AAA') {return 7.0;}
    if (level === 'AA')  {return 4.5;}
    return 1.0;
  }

  static sameRecord(left: ColorRecordInterfaceType, right: ColorRecordInterfaceType): boolean {
    const leftP3 = left.displayP3;
    const rightP3 = right.displayP3;
    const leftHints = left.hints;
    const rightHints = right.hints;
    const sameP3 = leftP3?.r === rightP3?.r
      && leftP3?.g === rightP3?.g
      && leftP3?.b === rightP3?.b
      && (leftP3 === undefined) === (rightP3 === undefined);
    const sameHints = leftHints?.intent === rightHints?.intent
      && leftHints?.role === rightHints?.role
      && leftHints?.weight === rightHints?.weight
      && (leftHints === undefined) === (rightHints === undefined);

    return left === right || (
      left.alpha === right.alpha
      && left.hex === right.hex
      && left.oklch.l === right.oklch.l
      && left.oklch.c === right.oklch.c
      && left.oklch.h === right.oklch.h
      && left.rgb.r === right.rgb.r
      && left.rgb.g === right.rgb.g
      && left.rgb.b === right.rgb.b
      && left.sourceFormat === right.sourceFormat
      && sameP3
      && sameHints
    );
  }
}

class ContrastProvenance {
  static isStated(state: PaletteStateInterface, roleName: string): boolean {
    const provenance = EngineMetadata.get(state.metadata, 'core:roleProvenance');
    return provenance?.[roleName]?.origin === 'stated';
  }

  static recordAdjustment(
    state:     PaletteStateInterface,
    roleName:  string,
    beforeHex: string,
    afterHex:  string
  ): void {
    const existing = EngineMetadata.get(state.metadata, 'core:roleProvenance');
    const provenance: RoleProvenanceMapInterfaceType = existing ?? {};
    const role = provenance[roleName] ?? { 'adjustments': [], 'origin': 'derived' };

    const next: RoleProvenanceMapInterfaceType = { ...provenance };
    next[roleName] = {
      'adjustments': [...role.adjustments, { 'afterHex': afterHex, 'beforeHex': beforeHex, 'operation': 'contrast' }],
      'origin':      role.origin
    };
    state.metadata['core:roleProvenance'] = next;
  }
}

class EnforceContrast implements TaskInterface {
  readonly 'name' = 'enforce:contrast';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Checks foreground role colors against each contrast-pair ratio band, preserving caller-stated colors and recording adjustments to derived colors.',
    'name':        'enforce:contrast',
    'phase':       undefined,
    'reads':       ['roles', 'input.roles', 'input.contrast', 'metadata[\'core:roleProvenance\']'],
    'requires':    ['contrastWcag21', 'contrastApca', 'ensureContrast'],
    'writes':      ['roles', 'metadata[\'core:contrastReport\']', 'metadata[\'core:roleProvenance\']']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const schemaPairs  = state.input.roles?.contrastPairs ?? [];
    const extraPairs   = state.input.contrast?.extra       ?? [];
    const defaultAlgo  = state.input.contrast?.algorithm   ?? 'wcag21';
    const floor        = ContrastMeasurement.levelFloor(state.input.contrast?.level);

    const allPairs: readonly ContrastPairInterfaceType[] = [...schemaPairs, ...extraPairs];

    if (allPairs.length === 0) {
      return;
    }

    const pending: PendingContrastEntryInterfaceType[] = [];

    for (const pair of allPairs) {
      const fgColor = state.roles[pair.foreground];
      const bgColor = state.roles[pair.background];

      if (fgColor === undefined || bgColor === undefined) {
        context.logger.warn(
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

      const algo          = pair.algorithm ?? defaultAlgo;
      // input.contrast.level acts as a global floor; never lowers a pair's declared ratio.
      const minimumRatio  = Math.max(pair.minRatio, floor);
      const maximumRatio  = pair.maxRatio;

      const ratio  = ContrastMeasurement.measure(algo, fgColor, bgColor);
      const passed = ratio >= minimumRatio && (maximumRatio === undefined || ratio <= maximumRatio);

      let adjusted = false;
      let adjustmentDisposition: PendingContrastEntryInterfaceType['adjustmentDisposition'] = 'not-needed';

      if (!passed) {
        const stated = ContrastProvenance.isStated(state, pair.foreground);
        context.logger.info(
          LogBody.create()
            .component('EnforceContrast')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message(stated ? 'Pair outside contrast band; preserving stated foreground' : 'Pair outside contrast band; nudging')
            .context({
              'background': pair.background,
              'foreground': pair.foreground,
              'maxRatio':   maximumRatio,
              'minRatio':   minimumRatio,
              'ratio':      ratio
            })
            .build()
        );

        if (stated) {
          adjustmentDisposition = 'preserved-stated';
        } else {
          const resolved = ensureContrast.apply(fgColor, bgColor, minimumRatio, {
            'algorithm':    algo,
            ...(maximumRatio === undefined ? {} : { 'maximumRatio': maximumRatio })
          });

          const resolvedRatio = ContrastMeasurement.measure(algo, resolved, bgColor);
          const resolvedPassed = resolvedRatio >= minimumRatio
            && (maximumRatio === undefined || resolvedRatio <= maximumRatio);

          if (!resolvedPassed || ContrastMeasurement.sameRecord(resolved, fgColor)) {
            adjustmentDisposition = 'unresolved';
          } else {
            state.roles[pair.foreground] = resolved;
            ContrastProvenance.recordAdjustment(state, pair.foreground, fgColor.hex, resolved.hex);
            adjusted = true;
            adjustmentDisposition = 'applied';
          }
        }
      }

      pending.push({
        'adjusted':              adjusted,
        'adjustmentDisposition': adjustmentDisposition,
        'algo':                  algo,
        ...(maximumRatio === undefined ? {} : { 'maxRatio': maximumRatio }),
        'minRatio': minimumRatio,
        'pair':     pair
      });
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

      const finalRatio = ContrastMeasurement.measure(entry.algo, finalFg, finalBg);

      report.push({
        'adjusted':              entry.adjusted,
        'adjustmentDisposition': entry.adjustmentDisposition,
        'algorithm':             entry.algo,
        'background': entry.pair.background,
        'foreground': entry.pair.foreground,
        'minRatio':   entry.minRatio,
        ...(entry.maxRatio === undefined ? {} : { 'maxRatio': entry.maxRatio }),
        'passed':     finalRatio >= entry.minRatio && (entry.maxRatio === undefined || finalRatio <= entry.maxRatio),
        'ratio':      finalRatio
      });
    }

    state.metadata['core:contrastReport'] = report;
  }
}

/** Singleton instance registered as the `enforce:contrast` pipeline task. */
export const enforceContrast = new EnforceContrast();
