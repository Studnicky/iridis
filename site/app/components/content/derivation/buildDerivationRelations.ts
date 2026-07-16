import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import type { HueAlgorithmType, RoleRelationDerivationType } from '~/composables/types/colorDerivation.ts';
import { capitalize } from '~/utils/capitalize.ts';
import { hueCircularDistance } from '~/utils/hueCircularDistance.ts';
import { hueVariantLabel } from '~/utils/hueVariantLabel.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';
import { SEMANTIC_HUE } from '~/theme/semanticHue.ts';

export type DerivationRelationGroup = {
  readonly parentName: string;
  readonly parentHex: string;
  readonly parentHue: number;
  readonly children: readonly RoleMathEntryType[];
};

export type SemanticHueGuideEntry = {
  readonly familyName: string;
  readonly hue: number;
  readonly role: string;
};

const HUE_FAMILY_NAMES: readonly { max: number; name: string }[] = [
  { 'max': 20, 'name': 'red' },
  { 'max': 50, 'name': 'orange' },
  { 'max': 90, 'name': 'yellow' },
  { 'max': 170, 'name': 'green' },
  { 'max': 200, 'name': 'teal' },
  { 'max': 260, 'name': 'blue' },
  { 'max': 300, 'name': 'violet' },
  { 'max': 340, 'name': 'magenta' },
  { 'max': 361, 'name': 'red' },
];

export const HUE_ALGORITHM_OPTIONS: { label: string; value: HueAlgorithmType }[] = [
  { label: 'Monochromatic', value: 'monochromatic' },
  { label: 'Complementary', value: 'complementary' },
  { label: 'Analogous', value: 'analogous' },
  { label: 'Triadic', value: 'triadic' },
  { label: 'Tetradic', value: 'tetradic' },
  { label: 'Split-complementary', value: 'split-complementary' },
  { label: 'Compound', value: 'compound' },
  { label: 'Freeform', value: 'freeform' },
];

export function buildSemanticHueGuide(): SemanticHueGuideEntry[] {
  return Object.entries(SEMANTIC_HUE).map(([role, hue]) => ({
    'role': role,
    'hue': hue,
    'familyName': hueFamilyName(hue),
  }));
}

export function buildSemanticHueGuideDisplayEntries(
  entries: readonly SemanticHueGuideEntry[]
): readonly SemanticHueGuideEntry[] {
  return entries.map((entry) => ({
    ...entry,
    role: capitalize(entry.role)
  }));
}

export function buildRelationGroups(
  mathList: readonly RoleMathEntryType[],
  parentHexFallback: string
): readonly DerivationRelationGroup[] {
  const byParent = new Map<string, RoleMathEntryType[]>();
  for (const role of mathList) {
    if (!role.isDerived || role.parentRole === undefined) continue;
    const list = byParent.get(role.parentRole) ?? [];
    list.push(role);
    byParent.set(role.parentRole, list);
  }
  const parents = new Map(mathList.map((role) => [role.name, role]));
  return Array.from(byParent.entries()).map(([parentName, children]) => ({
    'parentName': parentName,
    'parentHex': parents.get(parentName)?.hex ?? parentHexFallback,
    'parentHue': parents.get(parentName)?.h ?? 0,
    'children': children,
  }));
}

export function buildVariantOptions(algorithm: HueAlgorithmType): { label: string; value: number }[] {
  return selectHueAlgorithm(algorithm, 0).map((offset, index) => ({ 'label': hueVariantLabel(offset), 'value': index }));
}

export function buildGroupRelationBatch(
  group: DerivationRelationGroup,
  algorithm: HueAlgorithmType
): Record<string, RoleRelationDerivationType> {
  const offsets = selectHueAlgorithm(algorithm, 0);
  const candidateHues = offsets.map((offset) => normalizeHue(group.parentHue + offset));
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
    batch[child.name] = { 'freeformOffset': undefined, 'hueAlgorithm': algorithm, 'hueVariantIndex': bestIndex };
  }
  return batch;
}

export function buildAlgorithmRelationUpdate(
  role: RoleMathEntryType,
  algorithm: HueAlgorithmType
): RoleRelationDerivationType {
  return algorithm === 'freeform'
    ? { 'hueAlgorithm': algorithm, 'hueVariantIndex': 0, 'freeformOffset': role.algorithmInfo?.offsetDeg ?? 0 }
    : { 'freeformOffset': undefined, 'hueAlgorithm': algorithm, 'hueVariantIndex': 0 };
}

export function buildVariantRelationUpdate(role: RoleMathEntryType, hueVariantIndex: number): RoleRelationDerivationType {
  const algorithm = role.algorithmInfo?.hueAlgorithm ?? 'monochromatic';
  return { 'freeformOffset': undefined, 'hueAlgorithm': algorithm, 'hueVariantIndex': hueVariantIndex };
}

export function buildFreeformRelationUpdate(offsetDeg: number): RoleRelationDerivationType {
  return { 'hueAlgorithm': 'freeform', 'hueVariantIndex': 0, 'freeformOffset': offsetDeg };
}

export function defaultBulkAlgorithmFor(group: DerivationRelationGroup): HueAlgorithmType {
  return group.children[0]?.algorithmInfo?.hueAlgorithm ?? 'analogous';
}

export function buildBulkAlgorithmState(
  current: Readonly<Record<string, HueAlgorithmType>>,
  parentName: string,
  algorithm: HueAlgorithmType
): Record<string, HueAlgorithmType> {
  return {
    ...current,
    [parentName]: algorithm
  };
}

function hueFamilyName(hueDeg: number): string {
  return HUE_FAMILY_NAMES.find((family) => hueDeg <= family.max)?.name ?? 'red';
}
