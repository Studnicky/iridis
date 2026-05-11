import type {
  ColorRecordInterface,
  ContrastPairInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';

interface WcagPairResultInterface {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm: 'wcag21' | 'apca';
  readonly required: number;
  readonly before: number;
  readonly after: number;
  readonly pass: boolean;
}

interface WcagAaaMetaInterface {
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

function luminance(rgb: { readonly r: number; readonly g: number; readonly b: number }): number {
  const lin = (v: number): number =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

function wcag21Contrast(
  fg: ColorRecordInterface,
  bg: ColorRecordInterface,
): number {
  const l1 = luminance(fg.rgb);
  const l2 = luminance(bg.rgb);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

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
      const before = wcag21Contrast(fgRecord, bgRecord);

      let currentFg = fgRecord;
      let currentBg = bgRecord;
      let current   = before;
      let iterations = 0;
      const maxIterations = 30;

      while (current < required && iterations < maxIterations) {
        iterations++;
        const fgLum = luminance(currentFg.rgb);
        const bgLum = luminance(currentBg.rgb);

        if (fgLum >= bgLum) {
          currentFg = ctx.math.invoke<ColorRecordInterface>('lighten', currentFg, 0.04);
        } else {
          currentFg = ctx.math.invoke<ColorRecordInterface>('darken', currentFg, 0.04);
        }
        current = wcag21Contrast(currentFg, currentBg);
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

    const wcagMeta = (state.metadata['wcag'] ?? {}) as Record<string, unknown>;
    const aaaResult: WcagAaaMetaInterface = { 'pairs': results };
    state.metadata['wcag'] = { ...wcagMeta, 'aaa': aaaResult };

    ctx.logger.debug('EnforceWcagAaa', 'run', `Processed ${results.length} pair(s)`, aaaResult);
  }
}

export const enforceWcagAaa = new EnforceWcagAaa();
