import type {
  ColorRecordInterface,
  ContrastPairInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { contrastWcag21, darken, lighten, luminance } from '@studnicky/iridis';

interface WcagPairResultInterface {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm: 'wcag21' | 'apca';
  readonly required: number;
  readonly before: number;
  readonly after: number;
  readonly pass: boolean;
}

interface WcagAaMetaInterface {
  readonly pairs: readonly WcagPairResultInterface[];
}

function isTextPair(pair: ContrastPairInterface, roles: Record<string, ColorRecordInterface>): boolean {
  const fgRecord = roles[pair.foreground];
  const bgRecord = roles[pair.background];
  if (!fgRecord || !bgRecord) {
    return false;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  return (
    (fgIntent === 'text' || bgIntent === 'text') &&
    (fgIntent === 'surface' || fgIntent === 'base' || bgIntent === 'surface' || bgIntent === 'base')
  );
}

function isLargeText(pair: ContrastPairInterface): boolean {
  // Consumers signal large text via role name suffix or minRatio <= 3.0 override.
  // Treat pairs with minRatio explicitly set to 3.0 as large-text intented.
  return pair.minRatio <= 3.0;
}

function requiredRatioAa(pair: ContrastPairInterface, roles: Record<string, ColorRecordInterface>): number {
  if (pair.minRatio > 0) {
    return pair.minRatio;
  }
  if (isTextPair(pair, roles)) {
    return isLargeText(pair) ? 3.0 : 4.5;
  }
  return 3.0;
}

export class EnforceWcagAa implements TaskInterface {
  readonly name = 'enforce:wcagAA';

  readonly manifest: TaskManifestInterface = {
    'name':        'enforce:wcagAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata.wcag.aa'],
    'description': 'Enforce WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs.',
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
        ctx.logger.warn('EnforceWcagAa', 'run', `Role not found for pair ${pair.foreground}/${pair.background}`);
        continue;
      }

      const required = requiredRatioAa(pair, state.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);

      let currentFg = fgRecord;
      const currentBg = bgRecord;
      let current   = before;
      let iterations = 0;
      const maxIterations = 20;

      while (current < required && iterations < maxIterations) {
        iterations++;
        const fgLum = luminance.apply(currentFg);
        const bgLum = luminance.apply(currentBg);

        if (fgLum >= bgLum) {
          // foreground is lighter — lighten it further
          currentFg = lighten.apply(currentFg, 0.05);
        } else {
          // foreground is darker — darken it further
          currentFg = darken.apply(currentFg, 0.05);
        }
        current = contrastWcag21.apply(currentFg, currentBg);
      }

      if (current < required) {
        ctx.logger.warn('EnforceWcagAa', 'run', `Pair ${pair.foreground}/${pair.background} could not reach ${required}:1 (achieved ${current.toFixed(2)}) after ${maxIterations} iterations`);
      }

      // Mutate state.roles with adjusted foreground
      (state.roles as Record<string, ColorRecordInterface>)[pair.foreground] = currentFg;

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

    const wcagMeta = (state.metadata['wcag'] ?? {}) as Record<string, unknown>;
    const aaResult: WcagAaMetaInterface = { 'pairs': results };
    (state.metadata as Record<string, unknown>)['wcag'] = { ...wcagMeta, 'aa': aaResult };

    ctx.logger.debug('EnforceWcagAa', 'run', `Processed ${results.length} pair(s)`, aaResult);
  }
}

export const enforceWcagAa = new EnforceWcagAa();
