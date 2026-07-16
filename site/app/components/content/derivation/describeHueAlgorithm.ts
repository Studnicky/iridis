import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';

const HUE_ALGORITHM_LABELS: Record<HueAlgorithmType, string> = {
  analogous: 'Analogous — hues sit 30° on either side of the seed',
  complementary: 'Complementary — hue sits 180° from the seed',
  compound: 'Compound — analogous hues around both the seed and its complement',
  freeform: 'Freeform — user-specified hue offsets',
  monochromatic: 'Monochromatic — no hue shift',
  'split-complementary': 'Split-complementary — hues sit 30° on either side of the complement',
  tetradic: 'Tetradic — hues spaced 90° apart around the wheel',
  triadic: 'Triadic — hues spaced 120° apart around the wheel'
};

export function describeHueAlgorithm(algorithm: HueAlgorithmType | undefined): string {
  if (algorithm === undefined) {
    return HUE_ALGORITHM_LABELS.monochromatic;
  }
  return HUE_ALGORITHM_LABELS[algorithm] ?? algorithm;
}
