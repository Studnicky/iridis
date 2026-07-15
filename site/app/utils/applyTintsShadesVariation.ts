import type { HueLightnessType } from '../composables/types/hueLightness.ts';

import { lerpSteps } from './lerpSteps.ts';

export function applyTintsShadesVariation(hues: number[], count = 5): HueLightnessType[] {
  const result: HueLightnessType[] = [];
  if (count <= 0) {return result;}
  const lightnessValues = count === 5
    ? [20, 35, 50, 65, 80]
    : lerpSteps(20, 80, count);
  for (const hue of hues) {
    for (const lightness of lightnessValues) {
      result.push({ 'hue': hue, 'lightness': lightness });
    }
  }
  return result;
}
