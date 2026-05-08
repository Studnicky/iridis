import type {
  ColorRecordInterface,
  ContrastPairInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';

interface ApcaPairResultInterface {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm: 'apca';
  readonly requiredLc: number;
  readonly beforeLc: number;
  readonly afterLc: number;
  readonly pass: boolean;
}

interface ApcaMetaInterface {
  readonly pairs: readonly ApcaPairResultInterface[];
}

// APCA Lc target selection per WCAG 3 Bronze level working draft (2023).
// Reference: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
// Lc 75 — body / paragraph text (normal size, normal weight).
// Lc 60 — fluent / headline / large text (≥18pt or ≥14pt bold).
// Lc 45 — non-text UI components (icons, separators, input borders).
function apcaLcTarget(
  pair: ContrastPairInterface,
  roles: Record<string, ColorRecordInterface>,
): number {
  const fgRecord = roles[pair.foreground];
  const bgRecord = roles[pair.background];
  if (!fgRecord || !bgRecord) {
    return 75;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  const isText   = fgIntent === 'text' || bgIntent === 'text';
  const isSurface = fgIntent === 'surface' || fgIntent === 'base' ||
                    bgIntent === 'surface' || bgIntent === 'base';

  if (isText && isSurface) {
    // body text: Lc 75
    return 75;
  }
  if (isText) {
    // headline / fluent text on accent/muted: Lc 60
    return 60;
  }
  // non-text UI component: Lc 45
  return 45;
}

export class EnforceApca implements TaskInterface {
  readonly name = 'enforce:apca';

  readonly manifest: TaskManifestInterface = {
    'name':        'enforce:apca',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata.wcag.apca'],
    'description': 'Enforce APCA (WCAG 3 draft) Lc targets: Lc 75 body text, Lc 60 fluent text, Lc 45 non-text UI.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    const extraPairs = state.input.contrast?.extra ?? [];
    const allPairs: readonly ContrastPairInterface[] = [...pairs, ...extraPairs];

    const apcaPairs = allPairs.filter((p) => (p.algorithm ?? 'wcag21') === 'apca');
    if (apcaPairs.length === 0) {
      return;
    }

    const results: ApcaPairResultInterface[] = [];

    for (const pair of apcaPairs) {
      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (!fgRecord || !bgRecord) {
        ctx.logger.warn('EnforceApca', 'run', `Role not found for pair ${pair.foreground}/${pair.background}`);
        continue;
      }

      const requiredLc = apcaLcTarget(pair, state.roles);
      const beforeLc = Math.abs(ctx.math.invoke<number>('contrastApca', fgRecord, bgRecord));

      let currentFg = fgRecord;
      let current   = beforeLc;
      let iterations = 0;
      const maxIterations = 25;

      while (current < requiredLc && iterations < maxIterations) {
        iterations++;
        // APCA: adjust lightness of foreground toward the pole that increases contrast.
        // If foreground is lighter than background, lighten further; otherwise darken.
        currentFg = ctx.math.invoke<ColorRecordInterface>('ensureContrast', currentFg, bgRecord, requiredLc);
        current = Math.abs(ctx.math.invoke<number>('contrastApca', currentFg, bgRecord));
        // ensureContrast should converge in one call if implemented; iterate as safety net.
      }

      if (current < requiredLc) {
        ctx.logger.warn('EnforceApca', 'run', `Pair ${pair.foreground}/${pair.background} could not reach Lc ${requiredLc} (achieved Lc ${current.toFixed(1)}) after ${maxIterations} iterations`);
      }

      (state.roles as Record<string, ColorRecordInterface>)[pair.foreground] = currentFg;

      results.push({
        'foreground': pair.foreground,
        'background': pair.background,
        'algorithm':  'apca',
        'requiredLc': requiredLc,
        'beforeLc':   beforeLc,
        'afterLc':    current,
        'pass':       current >= requiredLc,
      });
    }

    const wcagMeta = (state.metadata['wcag'] ?? {}) as Record<string, unknown>;
    const apcaResult: ApcaMetaInterface = { 'pairs': results };
    (state.metadata as Record<string, unknown>)['wcag'] = { ...wcagMeta, 'apca': apcaResult };

    ctx.logger.debug('EnforceApca', 'run', `Processed ${results.length} APCA pair(s)`, apcaResult);
  }
}

export const enforceApca = new EnforceApca();
