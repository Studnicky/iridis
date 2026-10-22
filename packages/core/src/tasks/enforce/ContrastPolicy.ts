import type { InputInterfaceTypeEntity } from '../../entities/InputInterfaceTypeEntity.ts';
import type { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';

import { ContrastAlgorithmTypeEntity } from '../../entities/ContrastAlgorithmTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../entities/ContrastPairInterfaceTypeEntity.ts';

class ContrastStandard {
  static algorithm(
    input: InputInterfaceTypeEntity.Type
  ): ContrastAlgorithmTypeEntity.Type {
    const result = ContrastAlgorithmTypeEntity.intake(
      input.contrast?.algorithm ?? 'wcag21'
    );
    return result;
  }

  static wcagFloor(level: string | undefined): number {
    if (level === 'AAA') {
      return 7;
    }
    if (level === 'AA') {
      return 4.5;
    }
    return 1;
  }

  static targetPrefix(
    input: InputInterfaceTypeEntity.Type,
    algorithm: ContrastAlgorithmTypeEntity.Type
  ): string {
    if (algorithm === 'apca') {
      return 'APCA-Lc';
    }
    if (input.contrast?.level === 'AAA') {
      return 'AAA';
    }
    return 'AA';
  }
}

/** APCA targets: https://git.apcacontrast.com/documentation/APCAeasyIntro */
class ApcaTarget {
  static readonly #BODY_READING = 75;
  static readonly #MEANINGFUL_TEXT = 60;
  static readonly #DISPLAY_OR_PICTOGRAM = 45;
  static readonly #SOLID_NON_TEXT = 30;
  static forPair(
    requirement: ContrastPairInterfaceTypeEntity.Type,
    roles: PaletteRoleState
  ): number {
    const foreground = roles.get(requirement.foreground);
    const background = roles.get(requirement.background);
    if (
      foreground?.hints?.intent === 'text' &&
      background?.hints?.intent === 'background'
    ) {
      return ApcaTarget.#BODY_READING;
    }
    const foregroundIntent = foreground?.hints?.intent;
    if (
      foregroundIntent === 'link' ||
      foregroundIntent === 'muted' ||
      foregroundIntent === 'onAccent' ||
      foregroundIntent === 'onButton' ||
      foregroundIntent === 'text'
    ) {
      return ApcaTarget.#MEANINGFUL_TEXT;
    }
    return ApcaTarget.#MEANINGFUL_TEXT;
  }
}

/** Canonical selected-standard requirements for every schema and run-level contrast pair. */
export class ContrastPolicy {
  static normalize(
    input: InputInterfaceTypeEntity.Type,
    roles: PaletteRoleState
  ): readonly ContrastPolicy.RequirementInterface[] {
    const schemaPairs = input.roles?.contrastPairs ?? [];
    const extraPairs = input.contrast?.extra ?? [];
    const sourcePairs = [...schemaPairs, ...extraPairs];
    const algorithm = ContrastStandard.algorithm(input);
    const requirements: ContrastPolicy.RequirementInterface[] = [];
    const targetPrefix = ContrastStandard.targetPrefix(input, algorithm);
    for (let index = 0; index < sourcePairs.length; index += 1) {
      const sourcePair = sourcePairs[index];
      if (sourcePair === undefined) {
        continue;
      }
      const pair = ContrastPairInterfaceTypeEntity.intake(sourcePair);
      const pairMinimum = pair.minimumContrastRatio ?? 0;
      const minimumContrastRatio =
        algorithm === 'apca'
          ? Math.max(ApcaTarget.forPair(pair, roles), pairMinimum)
          : Math.max(
            ContrastStandard.wcagFloor(input.contrast?.level),
            pairMinimum
          );
      const maximumContrastRatio = pair.maximumContrastRatio;
      requirements.push({
        'algorithm': algorithm,
        'background': pair.background,
        'foreground': pair.foreground,
        ...(maximumContrastRatio === undefined
          ? {}
          : { 'maximumContrastRatio': maximumContrastRatio }),
        'minimumContrastRatio': minimumContrastRatio,
        'target':
          algorithm === 'apca'
            ? `${targetPrefix}-${minimumContrastRatio}`
            : targetPrefix
      });
    }
    return requirements;
  }
}

export namespace ContrastPolicy {
  export interface RequirementInterface {
    readonly 'algorithm': ContrastAlgorithmTypeEntity.Type;
    readonly 'background': string;
    readonly 'foreground': string;
    readonly 'maximumContrastRatio'?: number;
    readonly 'minimumContrastRatio': number;
    readonly 'target': string;
  }
}
