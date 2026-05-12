import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { luminance }          from './Luminance.ts';

export class ContrastText {
  readonly 'name' = 'contrastText';

  apply(background: ColorRecordInterface, threshold: number = 0.179): ColorRecordInterface {
    const lum = luminance.apply(background);

    if (lum > threshold) {
      return colorRecordFactory.fromHex('#000000');
    }

    return colorRecordFactory.fromHex('#ffffff');
  }
}

/** Singleton instance registered as the `contrastText` math primitive. */
export const contrastText = new ContrastText();
