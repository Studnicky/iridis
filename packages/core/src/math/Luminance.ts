import type { ColorRecordInterfaceType } from '../types/index.ts';

import { srgbToLinear } from './SrgbToLinear.ts';

class Luminance {
  readonly 'name' = 'luminance';

  apply(color: ColorRecordInterfaceType): number {
    const lin = srgbToLinear.apply(color.rgb.r, color.rgb.g, color.rgb.b);
    return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
  }
}

/** Singleton instance registered as the `luminance` math primitive. */
export const luminance = new Luminance();
