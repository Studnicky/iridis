import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Darken {
  readonly 'name' = 'darken';

  apply(color: ColorRecordEntity.Type, deltaL: number): ColorRecordEntity.Type {
    const l = clamp01.apply(color.oklch.l - deltaL);
    const darkened = colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha });
    return darkened;
  }
}

/** Singleton instance registered as the `darken` math primitive. */
export const darken = new Darken();
