import type { HueAlgorithmType, RoleRelationDerivationType } from '~/composables/types/colorDerivation.ts';
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import { SEMANTIC_HUE } from '~/theme/semanticHue.ts';
import { capitalize } from '~/utils/capitalize.ts';
import { getAnalogousHues } from '~/utils/getAnalogousHues.ts';
import { getComplementaryHues } from '~/utils/getComplementaryHues.ts';
import { getCompoundHues } from '~/utils/getCompoundHues.ts';
import { getFreeformHues } from '~/utils/getFreeformHues.ts';
import { getMonochromaticHues } from '~/utils/getMonochromaticHues.ts';
import { getSplitComplementaryHues } from '~/utils/getSplitComplementaryHues.ts';
import { getTetracticHues } from '~/utils/getTetracticHues.ts';
import { getTriadicHues } from '~/utils/getTriadicHues.ts';
import { hueCircularDistance } from '~/utils/hueCircularDistance.ts';
import { hueVariantLabel } from '~/utils/hueVariantLabel.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';

abstract class HueAlgorithmBehavior {
  public abstract readonly derive: (baseHue: number) => number[];

  public abstract createRelation(freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType;
  public abstract isFreeform(): boolean;
  public abstract serialize(): HueAlgorithmType.Type;
}

class MonochromaticHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getMonochromaticHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'monochromatic',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'monochromatic';
  }
}

class ComplementaryHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getComplementaryHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'complementary',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'complementary';
  }
}

class AnalogousHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getAnalogousHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'analogous',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'analogous';
  }
}

class TriadicHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getTriadicHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'triadic',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'triadic';
  }
}

class TetradicHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getTetracticHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'tetradic',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'tetradic';
  }
}

class SplitComplementaryHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getSplitComplementaryHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'split-complementary',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'split-complementary';
  }
}

class CompoundHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = getCompoundHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': undefined,
      'hueAlgorithm': 'compound',
      'hueVariantIndex': hueVariantIndex
    };
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'compound';
  }
}

class FreeformHueAlgorithm extends HueAlgorithmBehavior {
  public readonly derive = (baseHue: number): number[] => {
    const offsets = [baseHue];
    const result = getFreeformHues(offsets);
    return result;
  };

  public createRelation(freeformOffset: number, _hueVariantIndex: number): RoleRelationDerivationType {
    const result: RoleRelationDerivationType = {
      'freeformOffset': freeformOffset,
      'hueAlgorithm': 'freeform',
      'hueVariantIndex': 0
    };
    return result;
  }

  public isFreeform(): boolean {
    return true;
  }

  public serialize(): HueAlgorithmType.Type {
    return 'freeform';
  }
}

class DerivationRelationGroup {
  public readonly children: RoleMathEntry[];
  public readonly parentHex: string;
  public readonly parentHue: number;
  public readonly parentName: string;

  public constructor(
    children: RoleMathEntry[],
    parentHex: string,
    parentHue: number,
    parentName: string
  ) {
    this.children = children;
    this.parentHex = parentHex;
    this.parentHue = parentHue;
    this.parentName = parentName;
  }
}

class SemanticHueGuideEntry {
  public readonly familyName: string;
  public readonly hue: number;
  public readonly role: string;

  public constructor(familyName: string, hue: number, role: string) {
    this.familyName = familyName;
    this.hue = hue;
    this.role = role;
  }
}

class HueFamilyRange {
  public readonly maximum: number;
  public readonly name: string;

  public constructor(maximum: number, name: string) {
    this.maximum = maximum;
    this.name = name;
  }
}

class HueAlgorithmOption {
  public readonly algorithm: HueAlgorithmBehavior;
  public readonly label: string;

  public constructor(algorithm: HueAlgorithmBehavior, label: string) {
    this.algorithm = algorithm;
    this.label = label;
  }
}

class HueVariantOption {
  public readonly label: string;
  public readonly value: number;

  public constructor(label: string, value: number) {
    this.label = label;
    this.value = value;
  }
}

export const buildDerivationRelations = class DerivationRelationsBuilder {
  private static readonly analogous = new AnalogousHueAlgorithm();
  private static readonly complementary = new ComplementaryHueAlgorithm();
  private static readonly compound = new CompoundHueAlgorithm();
  private static readonly freeform = new FreeformHueAlgorithm();
  private static readonly monochromatic = new MonochromaticHueAlgorithm();
  private static readonly splitComplementary = new SplitComplementaryHueAlgorithm();
  private static readonly tetradic = new TetradicHueAlgorithm();
  private static readonly triadic = new TriadicHueAlgorithm();

  private static readonly hueAlgorithmBySerializedValue: ReadonlyMap<string, HueAlgorithmBehavior> = new Map([
    ['analogous', this.analogous],
    ['complementary', this.complementary],
    ['compound', this.compound],
    ['freeform', this.freeform],
    ['monochromatic', this.monochromatic],
    ['split-complementary', this.splitComplementary],
    ['tetradic', this.tetradic],
    ['triadic', this.triadic]
  ]);

  private static readonly hueFamilyRanges: readonly HueFamilyRange[] = [
    new HueFamilyRange(20, 'red'),
    new HueFamilyRange(50, 'orange'),
    new HueFamilyRange(90, 'yellow'),
    new HueFamilyRange(170, 'green'),
    new HueFamilyRange(200, 'teal'),
    new HueFamilyRange(260, 'blue'),
    new HueFamilyRange(300, 'violet'),
    new HueFamilyRange(340, 'magenta'),
    new HueFamilyRange(361, 'red')
  ];

  public static readonly hueAlgorithmOptions: readonly HueAlgorithmOption[] = [
    new HueAlgorithmOption(this.monochromatic, 'Monochromatic'),
    new HueAlgorithmOption(this.complementary, 'Complementary'),
    new HueAlgorithmOption(this.analogous, 'Analogous'),
    new HueAlgorithmOption(this.triadic, 'Triadic'),
    new HueAlgorithmOption(this.tetradic, 'Tetradic'),
    new HueAlgorithmOption(this.splitComplementary, 'Split-complementary'),
    new HueAlgorithmOption(this.compound, 'Compound'),
    new HueAlgorithmOption(this.freeform, 'Freeform')
  ];

  public static resolveHueAlgorithm(serializedAlgorithm: unknown): HueAlgorithmBehavior {
    const key = typeof serializedAlgorithm === 'string' ? serializedAlgorithm : '';
    const result = this.hueAlgorithmBySerializedValue.get(key) ?? this.monochromatic;
    return result;
  }

  public static buildSemanticHueGuide(): readonly SemanticHueGuideEntry[] {
    const result = Object.entries(SEMANTIC_HUE).map(([role, hue]) => {
      return new SemanticHueGuideEntry(this.resolveHueFamilyName(hue), hue, role);
    });
    return result;
  }

  public static buildSemanticHueGuideDisplayEntries(
    entries: readonly SemanticHueGuideEntry[]
  ): readonly SemanticHueGuideEntry[] {
    const result = entries.map((entry) => {
      return new SemanticHueGuideEntry(entry.familyName, entry.hue, capitalize(entry.role));
    });
    return result;
  }

  public static buildRelationGroups(
    mathList: readonly RoleMathEntry[]
  ): readonly DerivationRelationGroup[] {
    const byParent = new Map<string, RoleMathEntry[]>();
    for (let index = 0; index < mathList.length; index += 1) {
      const role = mathList[index];
      if (role === undefined || !role.origin.isDerived() || role.parentRole === undefined) {
        continue;
      }
      const children = byParent.get(role.parentRole) ?? [];
      children.push(role);
      byParent.set(role.parentRole, children);
    }
    const parents = new Map(mathList.map((role) => {
      return [role.name, role];
    }));
    const groups: DerivationRelationGroup[] = [];
    for (const [parentName, children] of byParent.entries()) {
      const parent = parents.get(parentName);
      if (parent === undefined) {continue;}
      groups.push(new DerivationRelationGroup(
        children,
        parent.hex,
        parent.h,
        parentName
      ));
    }
    return groups;
  }

  public static buildVariantOptions(algorithm: HueAlgorithmBehavior): readonly HueVariantOption[] {
    const result = algorithm.derive(0).map((offset, index) => {
      return new HueVariantOption(hueVariantLabel(offset), index);
    });
    return result;
  }

  public static buildGroupRelationBatch(
    group: DerivationRelationGroup,
    algorithm: HueAlgorithmBehavior
  ): Record<string, RoleRelationDerivationType> {
    const offsets = algorithm.derive(0);
    const candidateHues = offsets.map((offset) => {
      const result = normalizeHue(group.parentHue + offset);
      return result;
    });
    const result: Record<string, RoleRelationDerivationType> = {};
    for (let childIndex = 0; childIndex < group.children.length; childIndex += 1) {
      const child = group.children[childIndex];
      if (child === undefined) {continue;}
      let bestIndex = 0;
      let bestDistance = Infinity;
      for (let candidateIndex = 0; candidateIndex < candidateHues.length; candidateIndex += 1) {
        const candidateHue = candidateHues[candidateIndex];
        if (candidateHue === undefined) {continue;}
        const distance = hueCircularDistance(child.h, candidateHue);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = candidateIndex;
        }
      }
      Object.defineProperty(result, child.name, {
        'configurable': true,
        'enumerable': true,
        'value': algorithm.createRelation(0, bestIndex),
        'writable': true
      });
    }
    return result;
  }

  public static buildAlgorithmRelationUpdate(
    role: RoleMathEntry,
    algorithm: HueAlgorithmBehavior
  ): RoleRelationDerivationType {
    const freeformOffset = role.algorithmInfo?.offsetDeg ?? 0;
    const result = algorithm.createRelation(freeformOffset, 0);
    return result;
  }

  public static buildVariantRelationUpdate(
    role: RoleMathEntry,
    hueVariantIndex: number
  ): RoleRelationDerivationType {
    const algorithm = this.resolveHueAlgorithm(role.algorithmInfo?.hueAlgorithm);
    const result = algorithm.createRelation(0, hueVariantIndex);
    return result;
  }

  public static buildFreeformRelationUpdate(offsetDegrees: number): RoleRelationDerivationType {
    const result = this.freeform.createRelation(offsetDegrees, 0);
    return result;
  }

  public static resolveDefaultBulkAlgorithm(group: DerivationRelationGroup): HueAlgorithmBehavior {
    const result = this.resolveHueAlgorithm(group.children[0]?.algorithmInfo?.hueAlgorithm);
    return result;
  }

  public static buildBulkAlgorithmState(
    current: ReadonlyMap<string, HueAlgorithmBehavior>,
    parentName: string,
    algorithm: HueAlgorithmBehavior
  ): Map<string, HueAlgorithmBehavior> {
    const result = new Map(current);
    result.set(parentName, algorithm);
    return result;
  }

  private static resolveHueFamilyName(hueDegrees: number): string {
    const result = this.hueFamilyRanges.find((family) => {
      const result = hueDegrees <= family.maximum;
      return result;
    })?.name ?? 'red';
    return result;
  }
};
