import type { HueAlgorithmBehaviorInterface } from '../../../composables/interfaces/HueAlgorithmBehaviorInterface.ts';
import type { RoleMathEntry } from '../../../composables/types/roleMathEntry.ts';

import { DerivationRelationInterfaceTypeEntity } from '../../../composables/entities/DerivationRelationInterfaceTypeEntity.ts';
import { SEMANTIC_HUE } from '../../../theme/semanticHue.ts';
import { capitalize } from '../../../utils/capitalize.ts';
import { getAnalogousHues } from '../../../utils/getAnalogousHues.ts';
import { getComplementaryHues } from '../../../utils/getComplementaryHues.ts';
import { getCompoundHues } from '../../../utils/getCompoundHues.ts';
import { getFreeformHues } from '../../../utils/getFreeformHues.ts';
import { getMonochromaticHues } from '../../../utils/getMonochromaticHues.ts';
import { getSplitComplementaryHues } from '../../../utils/getSplitComplementaryHues.ts';
import { getTetracticHues } from '../../../utils/getTetracticHues.ts';
import { getTriadicHues } from '../../../utils/getTriadicHues.ts';
import { hueCircularDistance } from '../../../utils/hueCircularDistance.ts';
import { hueVariantLabel } from '../../../utils/hueVariantLabel.ts';
import { normalizeHue } from '../../../utils/normalizeHue.ts';

abstract class HueAlgorithmBehavior implements HueAlgorithmBehaviorInterface {
  public abstract readonly apply: (
    baseHue: number,
    options?: { readonly 'freeformOffsets'?: readonly number[] }
  ) => readonly number[];

  public abstract createRelation(freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type;
  public abstract isFreeform(): boolean;
}

class HueAlgorithmRelationFactory {
  public static create(
    algorithm: string,
    freeformOffset: number | undefined,
    hueVariantIndex: number
  ): DerivationRelationInterfaceTypeEntity.Type {
    const result = DerivationRelationInterfaceTypeEntity.create({
      'algorithm': algorithm,
      'freeformOffset': freeformOffset,
      'hueVariantIndex': hueVariantIndex
    });
    return result;
  }
}

class MonochromaticHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = getMonochromaticHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'monochromatic',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class ComplementaryHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = getComplementaryHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'complementary',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class AnalogousHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = (
    baseHue: number,
    _options?: { readonly 'freeformOffsets'?: readonly number[] }
  ): readonly number[] => {
    const result = getAnalogousHues(baseHue);
    return result;
  };

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'analogous',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class TriadicHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = getTriadicHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'triadic',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class TetradicHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = getTetracticHues;

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'tetradic',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class SplitComplementaryHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = (
    baseHue: number,
    _options?: { readonly 'freeformOffsets'?: readonly number[] }
  ): readonly number[] => {
    const result = getSplitComplementaryHues(baseHue);
    return result;
  };

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'split-complementary',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class CompoundHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = (
    baseHue: number,
    _options?: { readonly 'freeformOffsets'?: readonly number[] }
  ): readonly number[] => {
    const result = getCompoundHues(baseHue);
    return result;
  };

  public createRelation(_freeformOffset: number, hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = HueAlgorithmRelationFactory.create(
      'compound',
      undefined,
      hueVariantIndex
    );
    return result;
  }

  public isFreeform(): boolean {
    return false;
  }
}

class FreeformHueAlgorithm extends HueAlgorithmBehavior {
  public readonly apply = (
    baseHue: number,
    options?: { readonly 'freeformOffsets'?: readonly number[] }
  ): readonly number[] => {
    const offsets = options?.freeformOffsets ?? [0];
    const absoluteHues = offsets.map((offset) => {
      const result = normalizeHue(baseHue + offset);
      return result;
    });
    const result = getFreeformHues(absoluteHues);
    return result;
  };

  public createRelation(freeformOffset: number, _hueVariantIndex: number): DerivationRelationInterfaceTypeEntity.Type {
    const normalizedOffset = normalizeHue(freeformOffset);
    const result = HueAlgorithmRelationFactory.create(
      'freeform',
      normalizedOffset,
      0
    );
    return result;
  }

  public isFreeform(): boolean {
    return true;
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
  public readonly value: string;

  public constructor(algorithm: HueAlgorithmBehavior, label: string, value: string) {
    this.algorithm = algorithm;
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
    new HueAlgorithmOption(this.monochromatic, 'Monochromatic', 'monochromatic'),
    new HueAlgorithmOption(this.complementary, 'Complementary', 'complementary'),
    new HueAlgorithmOption(this.analogous, 'Analogous', 'analogous'),
    new HueAlgorithmOption(this.triadic, 'Triadic', 'triadic'),
    new HueAlgorithmOption(this.tetradic, 'Tetradic', 'tetradic'),
    new HueAlgorithmOption(this.splitComplementary, 'Split-complementary', 'split-complementary'),
    new HueAlgorithmOption(this.compound, 'Compound', 'compound'),
    new HueAlgorithmOption(this.freeform, 'Freeform', 'freeform')
  ];

  public static resolveHueAlgorithm(serializedAlgorithm: unknown): HueAlgorithmBehavior {
    const key = typeof serializedAlgorithm === 'string' ? serializedAlgorithm : '';
    const result = this.hueAlgorithmBySerializedValue.get(key) ?? this.monochromatic;
    return result;
  }

  public static serializeHueAlgorithm(algorithm: HueAlgorithmBehavior): string {
    for (const [value, behavior] of this.hueAlgorithmBySerializedValue) {
      if (behavior === algorithm) {
        return value;
      }
    }
    const result = 'monochromatic';
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
    const result = algorithm.apply(0).map((offset, index) => {
      return new HueVariantOption(hueVariantLabel(offset), index);
    });
    return result;
  }

  public static buildGroupRelationBatch(
    group: DerivationRelationGroup,
    algorithm: HueAlgorithmBehavior
  ): Record<string, DerivationRelationInterfaceTypeEntity.Type> {
    const offsets = algorithm.apply(0);
    const candidateHues = offsets.map((offset) => {
      const result = normalizeHue(group.parentHue + offset);
      return result;
    });
    const result: Record<string, DerivationRelationInterfaceTypeEntity.Type> = {};
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
  ): DerivationRelationInterfaceTypeEntity.Type {
    const freeformOffset = role.algorithmInfo?.offsetDeg ?? 0;
    const result = algorithm.createRelation(freeformOffset, 0);
    return result;
  }

  public static buildVariantRelationUpdate(
    role: RoleMathEntry,
    hueVariantIndex: number
  ): DerivationRelationInterfaceTypeEntity.Type {
    const algorithm = this.resolveHueAlgorithm(role.algorithmInfo?.algorithm);
    const result = algorithm.createRelation(0, hueVariantIndex);
    return result;
  }

  public static buildFreeformRelationUpdate(offsetDegrees: number): DerivationRelationInterfaceTypeEntity.Type {
    const result = this.freeform.createRelation(offsetDegrees, 0);
    return result;
  }

  public static resolveDefaultBulkAlgorithm(group: DerivationRelationGroup): HueAlgorithmBehavior {
    const result = this.resolveHueAlgorithm(group.children[0]?.algorithmInfo?.algorithm);
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
