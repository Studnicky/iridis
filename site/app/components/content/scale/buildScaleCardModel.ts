import type { RoleHexMapType, ScaleMapType } from '~/composables/types/index.ts';

import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { Tokens } from '~/theme/Tokens.ts';

class ScaleCardAdjacentRatio {
  public readonly from: number;
  public readonly ratio: number;
  public readonly to: number;

  public constructor(from: number, ratio: number, to: number) {
    this.from = from;
    this.ratio = ratio;
    this.to = to;
  }
}

export const buildScaleCardModel = class ScaleCardModel {
  private static readonly shadeValues: readonly number[] = [
    50,
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
    950
  ];

  public readonly adjacentRatios: readonly ScaleCardAdjacentRatio[];
  public readonly shades: readonly number[];

  private constructor(
    adjacentRatios: readonly ScaleCardAdjacentRatio[],
    shades: readonly number[]
  ) {
    this.adjacentRatios = adjacentRatios;
    this.shades = shades;
  }

  public static build(
    roles: RoleHexMapType,
    scales: ScaleMapType,
    aliasKey: string
  ): ScaleCardModel {
    const adjacentRatios: ScaleCardAdjacentRatio[] = [];
    let previousHex: string | undefined;
    let previousShade: number | undefined;
    for (const shade of ScaleCardModel.shadeValues) {
      const hex = Tokens.resolveAliasShadeHex(roles, scales, aliasKey, shade);
      if (previousHex !== undefined && previousShade !== undefined && hex !== undefined) {
        adjacentRatios.push(new ScaleCardAdjacentRatio(
          previousShade,
          contrastRatio(previousHex, hex),
          shade
        ));
      }
      previousHex = hex;
      previousShade = shade;
    }
    return new ScaleCardModel(adjacentRatios, ScaleCardModel.shadeValues);
  }
};
