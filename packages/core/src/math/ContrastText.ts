import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { luminance }          from './Luminance.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;

  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

/**
 * Math primitive that picks the higher-contrast monochrome text color
 * (`#000000` or `#ffffff`) for a given background, using a luminance
 * cutoff (default 0.179, the WCAG-recommended "should-use-white" threshold).
 * Cheap and stable — useful as a fallback when a full `enforce:contrast`
 * pass is overkill (e.g. inline previews).
 */
export class ContrastText implements MathPrimitiveInterface {
  readonly 'name' = 'contrastText';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [background, threshold] = args;

    if (!isColorRecord(background)) {
      throw new Error('ContrastText.apply: expected (background: ColorRecordInterface, threshold?: number)');
    }
    const cutoff = typeof threshold === 'number' ? threshold : 0.179;
    const lum    = luminance.apply(background) as number;

    if (lum > cutoff) {
      return colorRecordFactory.fromHex('#000000');
    }

    return colorRecordFactory.fromHex('#ffffff');
  }
}

/** Singleton instance registered as the `contrastText` math primitive. */
export const contrastText = new ContrastText();
