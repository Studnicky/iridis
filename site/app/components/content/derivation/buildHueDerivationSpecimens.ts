import { colorRecordFactory } from '@studnicky/iridis';
import { getAnalogousHues } from '~/utils/getAnalogousHues.ts';
import { getCompoundHues } from '~/utils/getCompoundHues.ts';
import { getSplitComplementaryHues } from '~/utils/getSplitComplementaryHues.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';
import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';

export const HUE_DERIVATION_ALGORITHMS: { key: HueAlgorithmType; label: string; description: string }[] = [
  { 'key': 'monochromatic', 'label': 'Monochromatic', 'description': 'No hue shift — every derived role reads as the same hue as the seed.' },
  { 'key': 'complementary', 'label': 'Complementary', 'description': 'One hue sitting exactly 180° from the seed, on the opposite side of the wheel.' },
  { 'key': 'analogous', 'label': 'Analogous', 'description': 'The seed plus two neighbours, spaced evenly on either side.' },
  { 'key': 'triadic', 'label': 'Triadic', 'description': 'Three hues spaced 120° apart — an equilateral triangle around the wheel.' },
  { 'key': 'tetradic', 'label': 'Tetradic', 'description': 'Four hues spaced 90° apart — a square around the wheel.' },
  { 'key': 'split-complementary', 'label': 'Split-complementary', 'description': 'The seed plus the two hues neighbouring its complement, rather than the complement itself.' },
  { 'key': 'compound', 'label': 'Compound', 'description': 'Analogous around the seed AND analogous around its complement — six hues total.' },
  { 'key': 'freeform', 'label': 'Freeform', 'description': 'User-specified hue offsets, set per role in Derivation Settings below — shown here with an illustrative default.' }
];

const FREEFORM_ILLUSTRATIVE_OFFSETS = [0, 45, 200];

export type HueDerivationSpecimen = {
  readonly countLabel: string;
  readonly description: string;
  readonly hues: readonly number[];
  readonly key: HueAlgorithmType;
  readonly label: string;
};

export function buildHueDerivationRoleNames(
  roleViews: readonly { readonly name: string }[]
): readonly string[] {
  return roleViews.map((role) => {
    return role.name;
  });
}

export function deriveHueSpecimens(baseHue: number, spacing: number): readonly HueDerivationSpecimen[] {
  return HUE_DERIVATION_ALGORITHMS.map((algorithm) => {
    let hues: number[];
    if (algorithm.key === 'analogous') hues = getAnalogousHues(baseHue, spacing);
    else if (algorithm.key === 'split-complementary') hues = getSplitComplementaryHues(baseHue, spacing);
    else if (algorithm.key === 'compound') hues = getCompoundHues(baseHue, spacing);
    else if (algorithm.key === 'freeform') {
      hues = selectHueAlgorithm('freeform', baseHue, FREEFORM_ILLUSTRATIVE_OFFSETS.map((offset) => normalizeHue(baseHue + offset)));
    } else {
      hues = selectHueAlgorithm(algorithm.key, baseHue);
    }
    return {
      ...algorithm,
      countLabel: `${hues.length} hue${hues.length === 1 ? '' : 's'}`,
      hues
    };
  });
}

export function hueHexAt(hue: number): string {
  return colorRecordFactory.fromOklch(0.68, 0.15, hue).hex;
}

export function resolveBaseHue(
  roleViews: readonly { name: string; h: number }[],
  selectedRole: string
): number {
  const role = roleViews.find((view) => view.name === selectedRole)
    ?? roleViews.find((view) => view.name === 'brand')
    ?? roleViews[0];
  return role?.h ?? 0;
}
