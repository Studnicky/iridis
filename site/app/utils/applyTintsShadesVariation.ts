import type { HueLightnessType } from '../composables/types/hueLightnessType.ts';

import { lerpSteps } from './lerpSteps.ts';

class ApplyTintsShadesVariationOperation {
  static run(hues: number[], count = 5): HueLightnessType[] {
    const result: HueLightnessType[] = [];
    if (count <= 0) {return result;}
    const lightnessValues = count === 5
      ? [20, 35, 50, 65, 80]
      : lerpSteps(20, 80, count);
    for (let hueIndex = 0; hueIndex < hues.length; hueIndex += 1) {
      const hue = hues[hueIndex];
      if (hue === undefined) {continue;}
      for (let lightnessIndex = 0; lightnessIndex < lightnessValues.length; lightnessIndex += 1) {
        const lightness = lightnessValues[lightnessIndex];
        if (lightness === undefined) {continue;}
        result.push({ 'hue': hue, 'lightness': lightness });
      }
    }
    return result;
  }
}

export const applyTintsShadesVariation = ApplyTintsShadesVariationOperation.run;
