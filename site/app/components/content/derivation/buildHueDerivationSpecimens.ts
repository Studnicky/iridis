import { getAnalogousHues } from '~/utils/getAnalogousHues.ts';
import { getCompoundHues } from '~/utils/getCompoundHues.ts';
import { getSplitComplementaryHues } from '~/utils/getSplitComplementaryHues.ts';

import { buildDerivationRelations } from './buildDerivationRelations.ts';

class HueDerivationAlgorithm {
  public readonly description: string;
  public readonly key: string;
  public readonly label: string;

  public constructor(description: string, key: string, label: string) {
    this.description = description;
    this.key = key;
    this.label = label;
  }
}

class HueDerivationSpecimen {
  public readonly countLabel: string;
  public readonly description: string;
  public readonly hues: number[];
  public readonly key: string;
  public readonly label: string;

  public constructor(algorithm: HueDerivationAlgorithm, hues: number[]) {
    this.countLabel = `${hues.length} hue${hues.length === 1 ? '' : 's'}`;
    this.description = algorithm.description;
    this.hues = hues;
    this.key = algorithm.key;
    this.label = algorithm.label;
  }
}

export const buildHueDerivationSpecimens = class HueDerivationSpecimensBuilder {
  private static readonly algorithms: readonly HueDerivationAlgorithm[] = [
    new HueDerivationAlgorithm('No hue shift — every derived role reads as the same hue as the seed.', 'monochromatic', 'Monochromatic'),
    new HueDerivationAlgorithm('One hue sitting exactly 180° from the seed, on the opposite side of the wheel.', 'complementary', 'Complementary'),
    new HueDerivationAlgorithm('The seed plus two neighbours, spaced evenly on either side.', 'analogous', 'Analogous'),
    new HueDerivationAlgorithm('Three hues spaced 120° apart — an equilateral triangle around the wheel.', 'triadic', 'Triadic'),
    new HueDerivationAlgorithm('Four hues spaced 90° apart — a square around the wheel.', 'tetradic', 'Tetradic'),
    new HueDerivationAlgorithm('The seed plus the two hues neighbouring its complement, rather than the complement itself.', 'split-complementary', 'Split-complementary'),
    new HueDerivationAlgorithm('Analogous around the seed AND analogous around its complement — six hues total.', 'compound', 'Compound'),
    new HueDerivationAlgorithm('User-specified hue offsets, set per role in Derivation Settings below — shown here with an illustrative default.', 'freeform', 'Freeform')
  ];

  private static readonly freeformIllustrativeOffsets = [0, 45, 200];

  public static buildRoleNames(
    roleViews: readonly { readonly 'name': string }[]
  ): readonly string[] {
    const result = roleViews.map((role) => {
      const result = role.name;
      return result;
    });
    return result;
  }

  public static buildSpecimens(baseHue: number, spacing: number): readonly HueDerivationSpecimen[] {
    const result = this.algorithms.map((algorithm) => {
      let hues: readonly number[];
      if (algorithm.key === 'analogous') {
        hues = getAnalogousHues(baseHue, spacing);
      } else if (algorithm.key === 'split-complementary') {
        hues = getSplitComplementaryHues(baseHue, spacing);
      } else if (algorithm.key === 'compound') {
        hues = getCompoundHues(baseHue, spacing);
      } else if (algorithm.key === 'freeform') {
        hues = buildDerivationRelations.resolveHueAlgorithm(algorithm.key).apply(baseHue, {
          'freeformOffsets': this.freeformIllustrativeOffsets
        });
      } else {
        hues = buildDerivationRelations.resolveHueAlgorithm(algorithm.key).apply(baseHue);
      }
      const specimen = new HueDerivationSpecimen(algorithm, [...hues]);
      return specimen;
    });
    return result;
  }

  public static resolveBaseHue(
    roleViews: readonly { 'h': number; 'name': string }[],
    selectedRole: string
  ): number {
    const role = roleViews.find((view) => {
      const result = view.name === selectedRole;
      return result;
    }) ?? roleViews.find((view) => {
      const result = view.name === 'brand';
      return result;
    }) ?? roleViews[0];
    const result = role?.h ?? 0;
    return result;
  }

};
