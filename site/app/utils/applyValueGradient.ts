import type { HueLightnessType } from '../composables/types/hueLightness.ts';

import { lerpSteps } from './lerpSteps.ts';

export function applyValueGradient(hues: number[], count = 5): HueLightnessType[] {
  const result: HueLightnessType[] = [];
  if (count <= 0) {return result;}
  const lightnessValues = lerpSteps(30, 90, count);
  for (const hue of hues) {
    for (const lightness of lightnessValues) {
      result.push({ 'hue': hue, 'lightness': lightness });
    }
  }
  return result;
}
