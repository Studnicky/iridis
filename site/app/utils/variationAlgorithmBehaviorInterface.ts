import type { HueVariationType } from '../composables/types/hueVariationType.ts';

export interface VariationAlgorithmBehaviorInterface {
  apply(hues: readonly number[], count: number): readonly HueVariationType[];
}
