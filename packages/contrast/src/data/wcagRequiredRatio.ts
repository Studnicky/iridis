import type { ColorRecordInterface, ContrastPairInterface } from '@studnicky/iridis';

function isTextPair(
  pair: ContrastPairInterface,
  roles: Record<string, ColorRecordInterface>,
): boolean {
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

export class WcagRequiredRatio {
  readonly 'name' = 'wcagRequiredRatio';

  apply(
    level: 'aa' | 'aaa',
    pair: ContrastPairInterface,
    roles: Record<string, ColorRecordInterface>,
  ): number {
    if (pair.minRatio > 0) {
      return pair.minRatio;
    }

    if (level === 'aa') {
      if (isTextPair(pair, roles)) {
        // Large text (≥18pt or ≥14pt bold): pairs with minRatio at/below 3.0 are large-text.
        return pair.minRatio <= 3.0 ? 3.0 : 4.5;
      }
      return 3.0;
    }

    // AAA level — roles must exist; default to 7.0 when absent.
    if (!roles[pair.foreground] || !roles[pair.background]) {
      return 7.0;
    }
    if (isTextPair(pair, roles)) {
      return 7.0;
    }
    return 4.5;
  }
}

export const wcagRequiredRatio = new WcagRequiredRatio();
