import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class HueShift {
  readonly 'name' = 'hueShift';

  apply(color: ColorRecordInterfaceTypeEntity.Type, degrees: number): ColorRecordInterfaceTypeEntity.Type {
    const h = ((color.oklch.h + degrees) % 360 + 360) % 360;
    const shifted = colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h, { 'alpha': color.alpha });
    return shifted;
  }
}

/** Singleton instance registered as the `hueShift` math primitive. */
export const hueShift = new HueShift();
