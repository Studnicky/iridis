import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Lighten {
  readonly 'name' = 'lighten';

  apply(color: ColorRecordEntity.Type, deltaL: number): ColorRecordEntity.Type {
    const l = clamp01.apply(color.oklch.l + deltaL);
    const lightened = colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha });
    return lightened;
  }
}

/** Singleton instance registered as the `lighten` math primitive. */
export const lighten = new Lighten();
