import type { InputInterfaceTypeEntity } from '../../entities/InputInterfaceTypeEntity.ts';
import type { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';

import { ContrastAlgorithmTypeEntity } from '../../entities/ContrastAlgorithmTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../entities/ContrastPairInterfaceTypeEntity.ts';

interface WcagMinimumOptionsInterface {
  readonly 'declaredMinimum': number | undefined;
  readonly 'level': string | undefined;
}

class ContrastStandard {
  static algorithm(
    input: InputInterfaceTypeEntity.Type
  ): ContrastAlgorithmTypeEntity.Type {
    const result = ContrastAlgorithmTypeEntity.intake(
      input.contrast?.algorithm ?? 'wcag21'
    );
    return result;
  }

  static wcagMinimum(options: WcagMinimumOptionsInterface): number {
    const declaredMinimum = options.declaredMinimum;
    if (options.level !== 'AAA') {
      const result = declaredMinimum ?? 4.5;
      return result;
    }
    if (declaredMinimum === undefined || declaredMinimum >= 7) {
      const result = declaredMinimum ?? 7;
      return result;
    }
    const result = declaredMinimum >= 4.5 ? 7 : 4.5;
    return result;
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
  static readonly MEANINGFUL_TEXT = 60;
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
    return ApcaTarget.MEANINGFUL_TEXT;
  }
}

/** Canonical selected-standard requirements for every schema and run-level contrast pair. */
export class ContrastPolicy {
  static selection(
    input: InputInterfaceTypeEntity.Type
  ): ContrastPolicy.SelectionInterface {
    const algorithm = ContrastStandard.algorithm(input);
    const target = algorithm === 'apca'
      ? `${ContrastStandard.targetPrefix(input, algorithm)}-${ApcaTarget.MEANINGFUL_TEXT}`
      : ContrastStandard.targetPrefix(input, algorithm);
    const result: ContrastPolicy.SelectionInterface = { 'algorithm': algorithm, 'target': target };
    return result;
  }

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
      const minimumContrastRatio = algorithm === 'apca'
        ? ApcaTarget.forPair(pair, roles)
        : ContrastStandard.wcagMinimum({
          'declaredMinimum': pair.minimumContrastRatio,
          'level': input.contrast?.level
        });
      const cvdMinimumContrastRatio = ContrastStandard.wcagMinimum({
        'declaredMinimum': pair.minimumContrastRatio,
        'level': algorithm === 'apca' ? 'AA' : input.contrast?.level
      });
      const maximumContrastRatio = pair.maximumContrastRatio;
      requirements.push({
        'algorithm': algorithm,
        'background': pair.background,
        'cvdMinimumContrastRatio': cvdMinimumContrastRatio,
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
  export interface SelectionInterface {
    readonly 'algorithm': ContrastAlgorithmTypeEntity.Type;
    readonly 'target': string;
  }

  export interface RequirementInterface {
    readonly 'algorithm': ContrastAlgorithmTypeEntity.Type;
    readonly 'background': string;
    /** WCAG ratio floor used by CVD simulation regardless of selected standard units. */
    readonly 'cvdMinimumContrastRatio': number;
    readonly 'foreground': string;
    readonly 'maximumContrastRatio'?: number;
    readonly 'minimumContrastRatio': number;
    readonly 'target': string;
  }
}
