import type { HueAlgorithmType, RoleRelationDerivationType } from '~/composables/types/colorDerivation.ts';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

import { SEMANTIC_HUE } from '~/theme/semanticHue.ts';
import { capitalize } from '~/utils/capitalize.ts';
import { hueCircularDistance } from '~/utils/hueCircularDistance.ts';
import { hueVariantLabel } from '~/utils/hueVariantLabel.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';

class DerivationRelationGroup {
  public readonly children: RoleMathEntryType[];
  public readonly parentHex: string;
  public readonly parentHue: number;
  public readonly parentName: string;

  public constructor(
    children: RoleMathEntryType[],
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
  public readonly label: string;
  public readonly value: HueAlgorithmType.Type;

  public constructor(label: string, value: HueAlgorithmType.Type) {
    this.label = label;
    this.value = value;
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
    new HueAlgorithmOption('Monochromatic', 'monochromatic'),
    new HueAlgorithmOption('Complementary', 'complementary'),
    new HueAlgorithmOption('Analogous', 'analogous'),
    new HueAlgorithmOption('Triadic', 'triadic'),
    new HueAlgorithmOption('Tetradic', 'tetradic'),
    new HueAlgorithmOption('Split-complementary', 'split-complementary'),
    new HueAlgorithmOption('Compound', 'compound'),
    new HueAlgorithmOption('Freeform', 'freeform')
  ];

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
    mathList: readonly RoleMathEntryType[]
  ): readonly DerivationRelationGroup[] {
    const byParent = new Map<string, RoleMathEntryType[]>();
    for (const role of mathList) {
      if (!role.isDerived || role.parentRole === undefined) {
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

  public static buildVariantOptions(algorithm: HueAlgorithmType.Type): readonly HueVariantOption[] {
    const result = selectHueAlgorithm(algorithm, 0).map((offset, index) => {
      return new HueVariantOption(hueVariantLabel(offset), index);
    });
    return result;
  }

  public static buildGroupRelationBatch(
    group: DerivationRelationGroup,
    algorithm: HueAlgorithmType.Type
  ): Record<string, RoleRelationDerivationType> {
    const offsets = selectHueAlgorithm(algorithm, 0);
    const candidateHues = offsets.map((offset) => {
      const result = normalizeHue(group.parentHue + offset);
      return result;
    });
    const batch: Record<string, RoleRelationDerivationType> = {};
    for (const child of group.children) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      candidateHues.forEach((candidateHue, index) => {
        const distance = hueCircularDistance(child.h, candidateHue);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      batch[child.name] = {
        'freeformOffset': undefined,
        'hueAlgorithm': algorithm,
        'hueVariantIndex': bestIndex
      };
    }
    return batch;
  }

  public static buildAlgorithmRelationUpdate(
    role: RoleMathEntryType,
    algorithm: HueAlgorithmType.Type
  ): RoleRelationDerivationType {
    if (algorithm === 'freeform') {
      return {
        'freeformOffset': role.algorithmInfo?.offsetDeg ?? 0,
        'hueAlgorithm': algorithm,
        'hueVariantIndex': 0
      };
    }
    return {
      'freeformOffset': undefined,
      'hueAlgorithm': algorithm,
      'hueVariantIndex': 0
    };
  }

  public static buildVariantRelationUpdate(
    role: RoleMathEntryType,
    hueVariantIndex: number
  ): RoleRelationDerivationType {
    const algorithm = role.algorithmInfo?.hueAlgorithm ?? 'monochromatic';
    return {
      'freeformOffset': undefined,
      'hueAlgorithm': algorithm,
      'hueVariantIndex': hueVariantIndex
    };
  }

  public static buildFreeformRelationUpdate(offsetDegrees: number): RoleRelationDerivationType {
    return {
      'freeformOffset': offsetDegrees,
      'hueAlgorithm': 'freeform',
      'hueVariantIndex': 0
    };
  }

  public static resolveDefaultBulkAlgorithm(group: DerivationRelationGroup): HueAlgorithmType.Type {
    return group.children[0]?.algorithmInfo?.hueAlgorithm ?? 'analogous';
  }

  public static buildBulkAlgorithmState(
    current: Readonly<Record<string, HueAlgorithmType.Type>>,
    parentName: string,
    algorithm: HueAlgorithmType.Type
  ): Record<string, HueAlgorithmType.Type> {
    const result: Record<string, HueAlgorithmType.Type> = { ...current };
    result[parentName] = algorithm;
    return result;
  }

  private static resolveHueFamilyName(hueDegrees: number): string {
    return this.hueFamilyRanges.find((family) => {
      return hueDegrees <= family.maximum;
    })?.name ?? 'red';
  }
};
