import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { InputEntity } from '../../entities/InputEntity.ts';
import type { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';

import { ContrastAlgorithmTypeEntity } from '../../entities/ContrastAlgorithmTypeEntity.ts';
import { ContrastPairClassEntity } from '../../entities/ContrastPairClassEntity.ts';
import { ContrastPairEntity } from '../../entities/ContrastPairEntity.ts';

interface WcagMinimumOptionsInterface {
  readonly 'contrastClass': ContrastPairClassEntity.Type;
  readonly 'declaredMinimum': number | undefined;
  readonly 'level': string | undefined;
  readonly 'nonMandatoryLevel': string | undefined;
}

class ContrastStandard {
  static readonly #NON_TEXT_RATIO = 3;

  static algorithm(
    input: InputEntity.Type
  ): ContrastAlgorithmTypeEntity.Type {
    const result = ContrastAlgorithmTypeEntity.intake(
      input.contrast?.algorithm ?? 'wcag21'
    );
    return result;
  }

  static selectedLevel(options: WcagMinimumOptionsInterface): string | undefined {
    const result = options.contrastClass === 'text' ? options.level : options.nonMandatoryLevel;
    return result;
  }

  static wcagMinimum(options: WcagMinimumOptionsInterface): number {
    const declaredMinimum = options.declaredMinimum;
    if (options.contrastClass === 'text') {
      const floor = options.level === 'AAA' ? 7 : 4.5;
      const result = Math.max(declaredMinimum ?? 0, floor);
      return result;
    }
    const floor = options.nonMandatoryLevel === 'AAA' ? 4.5 : 0;
    const result = Math.max(declaredMinimum ?? ContrastStandard.#NON_TEXT_RATIO, floor);
    return result;
  }

  static wcagTarget(options: WcagMinimumOptionsInterface): string {
    const result = ContrastStandard.selectedLevel(options) === 'AAA' ? 'AAA' : 'AA';
    return result;
  }

  static targetPrefix(
    input: InputEntity.Type,
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
  static readonly #NON_TEXT = 45;
  static readonly MEANINGFUL_TEXT = 60;
  static forPair(
    requirement: ContrastPairEntity.Type,
    roles: PaletteRoleState,
    nonMandatoryLevel: string | undefined
  ): number {
    const foreground = roles.get(requirement.foreground);
    const background = roles.get(requirement.background);
    if (
      foreground?.hints?.intent === 'text' &&
      background?.hints?.intent === 'background'
    ) {
      return ApcaTarget.#BODY_READING;
    }
    if (requirement.contrastClass === 'text') {
      const result = nonMandatoryLevel === 'AAA'
        ? ApcaTarget.#BODY_READING
        : ApcaTarget.MEANINGFUL_TEXT;
      return result;
    }
    const result = nonMandatoryLevel === 'AAA'
      ? ApcaTarget.MEANINGFUL_TEXT
      : ApcaTarget.#NON_TEXT;
    return result;
  }
}

/** Canonical selected-standard requirements for every schema and run-level contrast pair. */
export class ContrastPolicy {
  static allowsRange(
    range: ContrastPolicy.RoleRangeInterface,
    coordinate: Readonly<{ 'c': number; 'l': number }>
  ): boolean {
    const result =
      (range.chromaRange === undefined ||
        (coordinate.c >= range.chromaRange[0] && coordinate.c <= range.chromaRange[1])) &&
      (range.lightnessRange === undefined ||
        (coordinate.l >= range.lightnessRange[0] && coordinate.l <= range.lightnessRange[1]));
    return result;
  }

  static allowsRoleCoordinates(
    input: InputEntity.Type,
    roleName: string,
    coordinate: Readonly<{ 'c': number; 'l': number }>
  ): boolean {
    const range = ContrastPolicy.roleRange(input, roleName);
    const result = ContrastPolicy.allowsRange(range, coordinate);
    return result;
  }

  static allowsRoleRecord(
    input: InputEntity.Type,
    roleName: string,
    record: ColorRecordEntity.Type
  ): boolean {
    const result = ContrastPolicy.allowsRoleCoordinates(input, roleName, record.oklch);
    return result;
  }

  static roleRange(
    input: InputEntity.Type,
    roleName: string
  ): ContrastPolicy.RoleRangeInterface {
    const definition = input.roles?.roles.find((role): boolean => {
      const result = role.name === roleName;
      return result;
    });
    const result: ContrastPolicy.RoleRangeInterface = {
      ...(definition?.chromaRange === undefined
        ? {}
        : { 'chromaRange': definition.chromaRange }),
      ...(definition?.lightnessRange === undefined
        ? {}
        : { 'lightnessRange': definition.lightnessRange })
    };
    return result;
  }

  static selection(
    input: InputEntity.Type
  ): ContrastPolicy.SelectionInterface {
    const algorithm = ContrastStandard.algorithm(input);
    const target = algorithm === 'apca'
      ? `${ContrastStandard.targetPrefix(input, algorithm)}-${ApcaTarget.MEANINGFUL_TEXT}`
      : ContrastStandard.targetPrefix(input, algorithm);
    const result: ContrastPolicy.SelectionInterface = { 'algorithm': algorithm, 'target': target };
    return result;
  }

  static normalize(
    input: InputEntity.Type,
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
      const pair = ContrastPairEntity.intake(sourcePair);
      const contrastClass = ContrastPairClassEntity.intake(pair.contrastClass);
      const nonMandatoryLevel = input.contrast?.nonMandatoryLevel;
      const wcagOptions: WcagMinimumOptionsInterface = {
        'contrastClass': contrastClass,
        'declaredMinimum': pair.minimumContrastRatio,
        'level': input.contrast?.level,
        'nonMandatoryLevel': nonMandatoryLevel
      };
      const minimumContrastRatio = algorithm === 'apca'
        ? ApcaTarget.forPair(pair, roles, nonMandatoryLevel)
        : ContrastStandard.wcagMinimum(wcagOptions);
      const cvdMinimumContrastRatio = ContrastStandard.wcagMinimum({
        'contrastClass': contrastClass,
        'declaredMinimum': pair.minimumContrastRatio,
        'level': algorithm === 'apca' ? 'AA' : input.contrast?.level,
        'nonMandatoryLevel': nonMandatoryLevel
      });
      const wcagTarget = ContrastStandard.wcagTarget(wcagOptions);
      const maximumContrastRatio = pair.maximumContrastRatio;
      requirements.push({
        'algorithm': algorithm,
        'background': pair.background,
        'contrastClass': contrastClass,
        'cvdMinimumContrastRatio': cvdMinimumContrastRatio,
        'foreground': pair.foreground,
        ...(maximumContrastRatio === undefined
          ? {}
          : { 'maximumContrastRatio': maximumContrastRatio }),
        'minimumContrastRatio': minimumContrastRatio,
        'target':
          algorithm === 'apca'
            ? `${targetPrefix}-${minimumContrastRatio}`
            : wcagTarget
      });
    }
    return requirements;
  }
}

export namespace ContrastPolicy {
  export interface RoleRangeInterface {
    readonly 'chromaRange'?: readonly [number, number];
    readonly 'lightnessRange'?: readonly [number, number];
  }

  export interface SelectionInterface {
    readonly 'algorithm': ContrastAlgorithmTypeEntity.Type;
    readonly 'target': string;
  }

  export interface RequirementInterface {
    readonly 'algorithm': ContrastAlgorithmTypeEntity.Type;
    readonly 'background': string;
    readonly 'contrastClass': ContrastPairClassEntity.Type;
    /** WCAG ratio floor used by CVD simulation regardless of selected standard units. */
    readonly 'cvdMinimumContrastRatio': number;
    readonly 'foreground': string;
    readonly 'maximumContrastRatio'?: number;
    readonly 'minimumContrastRatio': number;
    readonly 'target': string;
  }
}
