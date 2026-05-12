import type {
  ColorRecordInterface,
  ContrastPairInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { contrastWcag21, darken, getOrCreateMetadata, lighten, luminance } from '@studnicky/iridis';
import type { WcagPairResultInterface } from '../types/augmentation.ts';

function requiredRatioAaa(pair: ContrastPairInterface, roles: Record<string, ColorRecordInterface>): number {
  if (pair.minRatio > 0) {
    return pair.minRatio;
  }
  const fgRecord = roles[pair.foreground];
  const bgRecord = roles[pair.background];
  if (!fgRecord || !bgRecord) {
    return 7.0;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  const isText =
    (fgIntent === 'text' || bgIntent === 'text') &&
    (fgIntent === 'surface' || fgIntent === 'base' || bgIntent === 'surface' || bgIntent === 'base');

  if (isText) {
    // Large text (≥18pt or ≥14pt bold) threshold is 4.5; normal text is 7.0.
    // Treat pairs with minRatio explicitly at/below 4.5 as large-text.
    return 7.0;
  }
  return 4.5;
}

export class EnforceWcagAaa implements TaskInterface {
  readonly 'name' = 'enforce:wcagAAA';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'enforce:wcagAAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata.wcag.aaa'],
    'description': 'Enforce WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI) on all role pairs.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const results: WcagPairResultInterface[] = [];

    for (const pair of pairs) {
      const algo = pair.algorithm ?? 'wcag21';
      if (algo !== 'wcag21') {
        continue;
      }

      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (!fgRecord || !bgRecord) {
        ctx.logger.warn('EnforceWcagAaa', 'run', `Role not found for pair ${pair.foreground}/${pair.background}`);
        continue;
      }

      const required = requiredRatioAaa(pair, state.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);

      let currentFg = fgRecord;
      const currentBg = bgRecord;
      let current   = before;
      let iterations = 0;
      const maxIterations = 30;

      while (current < required && iterations < maxIterations) {
        iterations++;
        const fgLum = luminance.apply(currentFg);
        const bgLum = luminance.apply(currentBg);

        if (fgLum >= bgLum) {
          currentFg = lighten.apply(currentFg, 0.04);
        } else {
          currentFg = darken.apply(currentFg, 0.04);
        }
        current = contrastWcag21.apply(currentFg, currentBg);
      }

      if (current < required) {
        ctx.logger.warn('EnforceWcagAaa', 'run', `Pair ${pair.foreground}/${pair.background} could not reach ${required}:1 (achieved ${current.toFixed(2)}) after ${maxIterations} iterations`);
      }

      state.roles[pair.foreground] = currentFg;

      results.push({
        'foreground': pair.foreground,
        'background': pair.background,
        'algorithm':  'wcag21',
        'required':   required,
        'before':     before,
        'after':      current,
        'pass':       current >= required,
      });
    }

    const wcagMeta = getOrCreateMetadata(state, 'wcag');
    wcagMeta['aaa'] = { 'pairs': results };

    ctx.logger.debug('EnforceWcagAaa', 'run', `Processed ${results.length} pair(s)`, wcagMeta['aaa']);
  }
}

export const enforceWcagAaa = new EnforceWcagAaa();
