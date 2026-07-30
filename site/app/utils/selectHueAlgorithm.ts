import type { HueAlgorithmType } from '../composables/types/colorDerivation.ts';

import { getAnalogousHues } from './getAnalogousHues.ts';
import { getComplementaryHues } from './getComplementaryHues.ts';
import { getCompoundHues } from './getCompoundHues.ts';
import { getFreeformHues } from './getFreeformHues.ts';
import { getMonochromaticHues } from './getMonochromaticHues.ts';
import { getSplitComplementaryHues } from './getSplitComplementaryHues.ts';
import { getTetracticHues } from './getTetracticHues.ts';
import { getTriadicHues } from './getTriadicHues.ts';

class SelectHueAlgorithmOperation {
  static run(algorithm: HueAlgorithmType.Type, baseHue: number, freeformOffsets?: number[]): number[] {
    switch (algorithm) {
      case 'analogous': return getAnalogousHues(baseHue);
      case 'complementary': return getComplementaryHues(baseHue);
      case 'compound': return getCompoundHues(baseHue);
      case 'freeform': return getFreeformHues(freeformOffsets ?? [0]);
      case 'monochromatic': return getMonochromaticHues(baseHue);
      case 'split-complementary': return getSplitComplementaryHues(baseHue);
      case 'tetradic': return getTetracticHues(baseHue);
      case 'triadic': return getTriadicHues(baseHue);
      default: return [baseHue];
    }
  }
}

export const selectHueAlgorithm = SelectHueAlgorithmOperation.run;
