import type { HueVariationType } from '../composables/types/hueVariationType.ts';
import type { VariationAlgorithmBehaviorInterface } from './variationAlgorithmBehaviorInterface.ts';

import { applySaturationGradient } from './applySaturationGradient.ts';
import { applyTintsShadesVariation } from './applyTintsShadesVariation.ts';
import { applyValueGradient } from './applyValueGradient.ts';

class TintsShadesVariationBehavior implements VariationAlgorithmBehaviorInterface {
  public apply(hues: readonly number[], count: number): readonly HueVariationType[] {
    const values = applyTintsShadesVariation([...hues], count);
    const variations = values.map((value) => {
      const variation: HueVariationType = { 'hue': value.hue, 'lightness': value.lightness, 'saturation': undefined };
      return variation;
    });
    return variations;
  }
}

class SaturationGradientVariationBehavior implements VariationAlgorithmBehaviorInterface {
  public apply(hues: readonly number[], count: number): readonly HueVariationType[] {
    const values = applySaturationGradient([...hues], count);
    const variations = values.map((value) => {
      const variation: HueVariationType = { 'hue': value.hue, 'lightness': undefined, 'saturation': value.saturation };
      return variation;
    });
    return variations;
  }
}

class ValueGradientVariationBehavior implements VariationAlgorithmBehaviorInterface {
  public apply(hues: readonly number[], count: number): readonly HueVariationType[] {
    const values = applyValueGradient([...hues], count);
    const variations = values.map((value) => {
      const variation: HueVariationType = { 'hue': value.hue, 'lightness': value.lightness, 'saturation': undefined };
      return variation;
    });
    return variations;
  }
}

/** Resolves serialized variation selections at the UI/configuration boundary. */
export class VariationAlgorithmBehaviors {
  private static readonly byToken: ReadonlyMap<string, VariationAlgorithmBehaviorInterface> = new Map([
    ['saturation-gradient', new SaturationGradientVariationBehavior()],
    ['tints-shades', new TintsShadesVariationBehavior()],
    ['value-gradient', new ValueGradientVariationBehavior()]
  ]);

  public static resolve(serializedAlgorithm: string): VariationAlgorithmBehaviorInterface {
    const behavior = this.byToken.get(serializedAlgorithm);
    if (behavior === undefined) {
      throw new TypeError(`Unknown variation algorithm: ${serializedAlgorithm}`);
    }
    return behavior;
  }
}
