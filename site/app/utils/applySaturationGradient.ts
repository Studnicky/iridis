import type { HueSaturationType } from '../composables/types/hueSaturation.ts';

import { lerpSteps } from './lerpSteps.ts';

export function applySaturationGradient(hues: number[], count = 5): HueSaturationType[] {
  const result: HueSaturationType[] = [];
  if (count <= 0) {return result;}
  const saturationValues = lerpSteps(0, 100, count, 100);
  for (const hue of hues) {
    for (const saturation of saturationValues) {
      result.push({ 'hue': hue, 'saturation': saturation });
    }
  }
  return result;
}
