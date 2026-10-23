import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';
import { luminance }          from './Luminance.ts';

class ContrastText {
  readonly 'name' = 'contrastText';

  apply(background: ColorRecordEntity.Type, threshold = 0.179): ColorRecordEntity.Type {
    const lum = luminance.apply(background);

    if (lum > threshold) {
      const text = colorRecordFactory.fromHex('#000000');
      return text;
    }

    const text = colorRecordFactory.fromHex('#ffffff');
    return text;
  }
}

/** Singleton instance registered as the `contrastText` math primitive. */
export const contrastText = new ContrastText();
