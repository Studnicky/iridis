import type { HueVariationType } from '../composables/types/hueVariationType.ts';
import type { VariationAlgorithmBehaviorInterface } from './variationAlgorithmBehaviorInterface.ts';

class ApplyVariationAlgorithmsOperation {
  static run(
    hues: readonly number[],
    algorithms: readonly VariationAlgorithmBehaviorInterface[],
    count = 5
  ): HueVariationType[] {
    let working: HueVariationType[] = hues.map((hue) => {
      const variation: HueVariationType = { 'hue': hue, 'lightness': 50, 'saturation': undefined };
      return variation;
    });

    for (let algorithmIndex = 0; algorithmIndex < algorithms.length; algorithmIndex += 1) {
      const algorithm = algorithms[algorithmIndex];
      if (algorithm === undefined) {continue;}
      const currentHues = working.map((variation) => {
        const hue = variation.hue;
        return hue;
      });
      working = Array.from(algorithm.apply(currentHues, count));
    }
    return working;
  }
}

export const applyVariationAlgorithms = ApplyVariationAlgorithmsOperation.run;
