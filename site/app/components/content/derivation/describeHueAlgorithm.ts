import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';

export const describeHueAlgorithm = class HueAlgorithmDescription {
  private static readonly labels: Record<HueAlgorithmType.Type, string> = {
    'analogous': 'Analogous — hues sit 30° on either side of the seed',
    'complementary': 'Complementary — hue sits 180° from the seed',
    'compound': 'Compound — analogous hues around both the seed and its complement',
    'freeform': 'Freeform — user-specified hue offsets',
    'monochromatic': 'Monochromatic — no hue shift',
    'split-complementary': 'Split-complementary — hues sit 30° on either side of the complement',
    'tetradic': 'Tetradic — hues spaced 90° apart around the wheel',
    'triadic': 'Triadic — hues spaced 120° apart around the wheel'
  };

  public static describe(algorithm: HueAlgorithmType.Type | undefined): string {
    if (algorithm === undefined) {
      return HueAlgorithmDescription.labels.monochromatic;
    }
    return HueAlgorithmDescription.labels[algorithm] ?? algorithm;
  }
};
