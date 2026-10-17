import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { clamp } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Desaturate {
  readonly 'name' = 'desaturate';

  apply(color: ColorRecordInterfaceTypeEntity.Type, deltaC: number): ColorRecordInterfaceTypeEntity.Type {
    const c = clamp.apply(0, 0.5, color.oklch.c - deltaC);
    const desaturated = colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, { 'alpha': color.alpha });
    return desaturated;
  }
}

/** Singleton instance registered as the `desaturate` math primitive. */
export const desaturate = new Desaturate();
