import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

/** Composites straight-alpha sRGB records with Porter-Duff source-over for browser and editor CSS compositing. */
class AlphaOverlay {
  readonly 'name' = 'alphaOverlay';

  apply(
    base: ColorRecordEntity.Type,
    overlay: ColorRecordEntity.Type,
    alpha: number
  ): ColorRecordEntity.Type {
    const overlayAlpha = clamp01.apply(alpha) * overlay.alpha;
    const baseContribution = base.alpha * (1 - overlayAlpha);
    const outputAlpha = overlayAlpha + baseContribution;
    const inverseOutputAlpha = outputAlpha === 0 ? 0 : 1 / outputAlpha;
    const red = (overlay.rgb.r * overlayAlpha + base.rgb.r * baseContribution) * inverseOutputAlpha;
    const green = (overlay.rgb.g * overlayAlpha + base.rgb.g * baseContribution) * inverseOutputAlpha;
    const blue = (overlay.rgb.b * overlayAlpha + base.rgb.b * baseContribution) * inverseOutputAlpha;
    const result = colorRecordFactory.fromRgb(red, green, blue, { 'alpha': outputAlpha });
    return result;
  }
}

/** Singleton math primitive that materializes canonical ColorRecords for relationship alpha-overlay operations. */
export const alphaOverlay = new AlphaOverlay();
