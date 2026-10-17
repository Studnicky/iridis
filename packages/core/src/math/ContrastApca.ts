// APCA-W3 0.0.98G-4g formula: https://github.com/Myndex/SAPC-APCA
import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { apcaLc } from './ApcaLc.ts';

class ContrastApca {
  readonly 'name' = 'contrastApca';

  apply(text: ColorRecordInterfaceTypeEntity.Type, background: ColorRecordInterfaceTypeEntity.Type): number {
    const Ytxt = apcaLc.luminance(text.rgb.r,       text.rgb.g,       text.rgb.b);
    const Ybg  = apcaLc.luminance(background.rgb.r, background.rgb.g, background.rgb.b);

    const contrast = apcaLc.apply(Ytxt, Ybg);
    return contrast;
  }
}

/** Singleton instance registered as the `contrastApca` math primitive. */
export const contrastApca = new ContrastApca();
