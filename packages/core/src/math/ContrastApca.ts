// APCA-W3 0.0.98G-4g formula: https://github.com/Myndex/SAPC-APCA
import type { ColorRecordInterfaceType } from '../types/index.ts';

import { apcaLc } from './ApcaLc.ts';

class ContrastApca {
  readonly 'name' = 'contrastApca';

  apply(text: ColorRecordInterfaceType, background: ColorRecordInterfaceType): number {
    const Ytxt = apcaLc.luminance(text.rgb.r,       text.rgb.g,       text.rgb.b);
    const Ybg  = apcaLc.luminance(background.rgb.r, background.rgb.g, background.rgb.b);

    return apcaLc.apply(Ytxt, Ybg);
  }
}

/** Singleton instance registered as the `contrastApca` math primitive. */
export const contrastApca = new ContrastApca();
