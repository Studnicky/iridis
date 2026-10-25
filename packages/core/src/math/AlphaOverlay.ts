import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

/** Composites straight-alpha gamma-encoded sRGB records with Porter-Duff source-over for browser and editor CSS compositing. */
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
    const red = this.#compositeChannel(overlay.rgb.r, base.rgb.r, overlayAlpha, baseContribution, inverseOutputAlpha);
    const green = this.#compositeChannel(overlay.rgb.g, base.rgb.g, overlayAlpha, baseContribution, inverseOutputAlpha);
    const blue = this.#compositeChannel(overlay.rgb.b, base.rgb.b, overlayAlpha, baseContribution, inverseOutputAlpha);
    const result = colorRecordFactory.fromRgb(red, green, blue, { 'alpha': outputAlpha });
    return result;
  }

  #compositeChannel(
    overlayChannel: number,
    baseChannel: number,
    overlayAlpha: number,
    baseContribution: number,
    inverseOutputAlpha: number
  ): number {
    const result = (overlayChannel * overlayAlpha + baseChannel * baseContribution) * inverseOutputAlpha;
    return result;
  }
}

/** Singleton math primitive that materializes canonical ColorRecords for relationship alpha-overlay operations. */
export const alphaOverlay = new AlphaOverlay();
