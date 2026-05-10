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

export const contrastText = new ContrastText();
