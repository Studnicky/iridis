import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { srgbToLinear } from './SrgbToLinear.ts';

class Luminance {
  readonly 'name' = 'luminance';

  rgb(r: number, g: number, b: number): number {
    const result =
      0.2126 * srgbToLinear.channel(r) +
      0.7152 * srgbToLinear.channel(g) +
      0.0722 * srgbToLinear.channel(b);
    return result;
  }

  apply(color: ColorRecordEntity.Type): number {
    const result = this.rgb(color.rgb.r, color.rgb.g, color.rgb.b);
    return result;
  }
}

/** Singleton instance registered as the `luminance` math primitive. */
export const luminance = new Luminance();
