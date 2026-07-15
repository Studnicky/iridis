import type { VariationAlgorithmType } from '../composables/types/colorDerivation.ts';
import type { HueVariationType } from '../composables/types/hueVariation.ts';

import { applySaturationGradient } from './applySaturationGradient.ts';
import { applyTintsShadesVariation } from './applyTintsShadesVariation.ts';
import { applyValueGradient } from './applyValueGradient.ts';

export function applyVariationAlgorithms(
  hues: number[],
  algorithms: VariationAlgorithmType[],
  count = 5
): HueVariationType[] {
  let working: HueVariationType[] = hues.map((hue) => {return { 'hue': hue, 'lightness': 50 };});

  for (const algo of algorithms) {
    const currentHues = working.map((w) => { const result = w.hue; return result; });
    if (algo === 'tints-shades') {
      working = applyTintsShadesVariation(currentHues, count);
    } else if (algo === 'saturation-gradient') {
      working = applySaturationGradient(currentHues, count);
    } else if (algo === 'value-gradient') {
      working = applyValueGradient(currentHues, count);
    }
  }
  return working;
}
