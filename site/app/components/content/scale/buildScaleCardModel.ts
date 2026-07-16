import type { RoleHexMapType, ScaleMapType } from '~/composables/types/index.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { Tokens } from '~/theme/Tokens.ts';

export const SCALE_CARD_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ScaleCardAdjacentRatioType = {
  from: number;
  to: number;
  ratio: number;
};

export function buildScaleCardAdjacentRatios(
  roles: RoleHexMapType,
  scales: ScaleMapType,
  aliasKey: string
): ScaleCardAdjacentRatioType[] {
  const hexes = SCALE_CARD_SHADES.map((shade) => Tokens.resolveAliasShadeHex(roles, scales, aliasKey, shade));
  const pairs: ScaleCardAdjacentRatioType[] = [];
  for (let index = 0; index < SCALE_CARD_SHADES.length - 1; index += 1) {
    const fromHex = hexes[index];
    const toHex = hexes[index + 1];
    if (fromHex === undefined || toHex === undefined) {
      continue;
    }
    pairs.push({
      from: SCALE_CARD_SHADES[index]!,
      to: SCALE_CARD_SHADES[index + 1]!,
      ratio: contrastRatio(fromHex, toHex)
    });
  }
  return pairs;
}
