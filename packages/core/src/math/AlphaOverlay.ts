import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { linearToSrgb } from './LinearToSrgb.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

/** Composites an overlay over a base record with Porter-Duff source-over in linear sRGB. */
class AlphaOverlay {
  readonly 'name' = 'alphaOverlay';

  apply(
    base: ColorRecordEntity.Type,
    overlay: ColorRecordEntity.Type,
    alpha: number
  ): ColorRecordEntity.Type {
    const overlayAlpha = clamp01.apply(alpha) * overlay.alpha;
    const baseAlpha = base.alpha;
    const outputAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha);
    const baseLinear = srgbToLinear.apply(base.rgb.r, base.rgb.g, base.rgb.b);
    const overlayLinear = srgbToLinear.apply(overlay.rgb.r, overlay.rgb.g, overlay.rgb.b);
    const inverseOutputAlpha = outputAlpha === 0 ? 0 : 1 / outputAlpha;
    const red = (overlayLinear.r * overlayAlpha + baseLinear.r * baseAlpha * (1 - overlayAlpha)) * inverseOutputAlpha;
    const green = (overlayLinear.g * overlayAlpha + baseLinear.g * baseAlpha * (1 - overlayAlpha)) * inverseOutputAlpha;
    const blue = (overlayLinear.b * overlayAlpha + baseLinear.b * baseAlpha * (1 - overlayAlpha)) * inverseOutputAlpha;
    const rgb = linearToSrgb.apply(red, green, blue);
    const result = colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { 'alpha': outputAlpha });
    return result;
  }
}

/** Singleton math primitive for relationship alpha-overlay operations. */
export const alphaOverlay = new AlphaOverlay();
