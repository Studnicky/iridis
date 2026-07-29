import { colorRecordFactory } from '@studnicky/iridis';

import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';

import { getAnalogousHues } from '~/utils/getAnalogousHues.ts';
import { getCompoundHues } from '~/utils/getCompoundHues.ts';
import { getSplitComplementaryHues } from '~/utils/getSplitComplementaryHues.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';

class HueDerivationAlgorithm {
  public readonly description: string;
  public readonly key: HueAlgorithmType.Type;
  public readonly label: string;

  public constructor(description: string, key: HueAlgorithmType.Type, label: string) {
    this.description = description;
    this.key = key;
    this.label = label;
  }
}

class HueDerivationSpecimen {
  public readonly countLabel: string;
  public readonly description: string;
  public readonly hues: number[];
  public readonly key: HueAlgorithmType.Type;
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
      return new HueDerivationSpecimen(algorithm, this.deriveHues(algorithm.key, baseHue, spacing));
    });
    return result;
  }

  public static resolveHexAt(hue: number): string {
    const result = colorRecordFactory.fromOklch(0.68, 0.15, hue).hex;
    return result;
  }

  public static resolveBaseHue(
    roleViews: readonly { 'h': number; 'name': string }[],
    selectedRole: string
  ): number {
    const role = roleViews.find((view) => {
      return view.name === selectedRole;
    }) ?? roleViews.find((view) => {
      return view.name === 'brand';
    }) ?? roleViews[0];
    return role?.h ?? 0;
  }

  private static deriveHues(
    algorithm: HueAlgorithmType.Type,
    baseHue: number,
    spacing: number
  ): number[] {
    if (algorithm === 'analogous') {
      return getAnalogousHues(baseHue, spacing);
    }
    if (algorithm === 'split-complementary') {
      return getSplitComplementaryHues(baseHue, spacing);
    }
    if (algorithm === 'compound') {
      return getCompoundHues(baseHue, spacing);
    }
    if (algorithm === 'freeform') {
      const freeformHues = this.freeformIllustrativeOffsets.map((offset) => {
        const result = normalizeHue(baseHue + offset);
        return result;
      });
      return selectHueAlgorithm('freeform', baseHue, freeformHues);
    }
    return selectHueAlgorithm(algorithm, baseHue);
  }
};
