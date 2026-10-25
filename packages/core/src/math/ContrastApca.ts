// APCA-W3 0.0.98G-4g formula: https://github.com/Myndex/SAPC-APCA
import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { apcaLc } from './ApcaLc.ts';

class ContrastApca {
  readonly 'name' = 'contrastApca';

  apply(text: ColorRecordEntity.Type, background: ColorRecordEntity.Type): number {
    const Ytxt = apcaLc.luminance(text.rgb.r,       text.rgb.g,       text.rgb.b);
    const Ybg  = apcaLc.luminance(background.rgb.r, background.rgb.g, background.rgb.b);

    const contrast = apcaLc.apply(Ytxt, Ybg);
    return contrast;
  }
}

/** Singleton instance registered as the `contrastApca` math primitive. */
export const contrastApca = new ContrastApca();
