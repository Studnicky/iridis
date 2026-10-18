import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class RgbToOklch {
  readonly 'name' = 'rgbToOklch';

  apply(r: number, g: number, b: number, alpha = 1): ColorRecordInterfaceTypeEntity.Type {
    const result = colorRecordFactory.fromRgb(r, g, b, { 'alpha': alpha });
    return result;
  }
}

/** Singleton instance registered as the `rgbToOklch` math primitive. */
export const rgbToOklch = new RgbToOklch();
