import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Saturate {
  readonly 'name' = 'saturate';

  apply(color: ColorRecordEntity.Type, deltaC: number): ColorRecordEntity.Type {
    const c = clamp.apply(0, 0.5, color.oklch.c + deltaC);
    const saturated = colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, { 'alpha': color.alpha });
    return saturated;
  }
}

/** Singleton instance registered as the `saturate` math primitive. */
export const saturate = new Saturate();
