import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { srgbToLinear } from './SrgbToLinear.ts';

class Luminance {
  readonly 'name' = 'luminance';

  apply(color: ColorRecordEntity.Type): number {
    const lin = srgbToLinear.apply(color.rgb.r, color.rgb.g, color.rgb.b);
    const result = 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
    return result;
  }
}

/** Singleton instance registered as the `luminance` math primitive. */
export const luminance = new Luminance();
