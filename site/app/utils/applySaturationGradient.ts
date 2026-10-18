import type { HueSaturationType } from '../composables/types/hueSaturationType.ts';

import { lerpSteps } from './lerpSteps.ts';

class ApplySaturationGradientOperation {
  static run(hues: number[], count = 5): HueSaturationType[] {
    const result: HueSaturationType[] = [];
    if (count <= 0) {return result;}
    const saturationValues = lerpSteps(0, 100, count, 100);
    for (let hueIndex = 0; hueIndex < hues.length; hueIndex += 1) {
      const hue = hues[hueIndex];
      if (hue === undefined) {continue;}
      for (let saturationIndex = 0; saturationIndex < saturationValues.length; saturationIndex += 1) {
        const saturation = saturationValues[saturationIndex];
        if (saturation === undefined) {continue;}
        result.push({ 'hue': hue, 'saturation': saturation });
      }
    }
    return result;
  }
}

export const applySaturationGradient = ApplySaturationGradientOperation.run;
