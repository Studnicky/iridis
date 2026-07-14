import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import type { RoleType } from '~/composables/types/colorDerivation.ts';
import { selectHueAlgorithm } from '~/utils/colorDerivation.ts';
import { colorRecordFactory } from '@studnicky/iridis';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { complianceFor, sortRoleRows } from '~/utils/roleSort.ts';

export interface RoleMathClamp {
  seedHex: string;
  resolvedHex: string;
  seedOklch: string;
  roleOklch: string;
}

export interface RoleMathCandidate {
  hex: string;
  dist: number;
  isWinner: boolean;
}

export interface RoleMathAlgorithmInfo {
  hueAlgorithm: string;
  baseHue: number;
  computedHues: number[];
}

export interface RoleMathEntry {
  name: string;
  hex: string;
  l: number;
  c: number;
  h: number;
  ratio: number;
  compliance: string;
  synthesized: boolean;
  isPinned: boolean;
  isDerived: boolean;
  parentRole: string | undefined;
  def: any;
  candidates: RoleMathCandidate[];
  clamp: RoleMathClamp | null;
  pinnedSeedHex: string | null;
  algorithmInfo: RoleMathAlgorithmInfo | null;
}

export function useRoleMathList() {
  const { roles, roleClamps, roleDistances, rolesSynthesized, rolesPinned, rolesDerived, schemaName, framing, derivationConfig, roleSortKeys } = useIridis();

  const allMathList = computed<RoleMathEntry[]>(() => {
    const schema = roleSchemaByName[schemaName.value]?.[framing.value];
    const roleDefs = schema?.roles || [];

    // 'background' is required in every schema tier and resolved synchronously
    // before any component reads this — never a hardcoded placeholder.
    const bg = roles.value['background']!;

    const entries = Object.keys(roles.value).map(roleName => {
      const clamp = roleClamps.value[roleName];
      const distances = roleDistances.value[roleName] || {};
      const synthesized = rolesSynthesized.value.includes(roleName);
      const isPinned = rolesPinned.value.includes(roleName);
      const isDerived = rolesDerived.value.includes(roleName);

      const candidates = Object.entries(distances).map(([hex, dist]) => ({
        hex,
        dist,
        isWinner: false,
      })).sort((a, b) => a.dist - b.dist);

      const hasCandidates = candidates.length > 0;
      if (!synthesized && !isPinned && !isDerived && hasCandidates) {
        candidates[0]!.isWinner = true;
      }

      const def = roleDefs.find(r => r.name === roleName);

      const roleDerivation = derivationConfig.value.roles[roleName as RoleType];
      const parentHex = def?.derivedFrom ? roles.value[def.derivedFrom] : undefined;
      let algorithmInfo: RoleMathAlgorithmInfo | null = null;
      if (isDerived && roleDerivation && parentHex) {
        const baseHue = colorRecordFactory.fromHex(parentHex).oklch.h ?? 0;
        const computedHues = selectHueAlgorithm(roleDerivation.hueAlgorithm, baseHue, roleDerivation.freeformOffsets);
        algorithmInfo = {
          hueAlgorithm: roleDerivation.hueAlgorithm,
          baseHue,
          computedHues,
        };
      }

      // roleName comes from Object.keys(roles.value) itself, so this lookup
      // can never miss — never a hardcoded placeholder.
      const hex = roles.value[roleName]!;
      const oklch = colorRecordFactory.fromHex(hex).oklch;
      const ratio = contrastRatio(hex, bg);

      return {
        name: roleName,
        hex,
        l: oklch.l,
        c: oklch.c,
        h: oklch.h,
        ratio,
        compliance: complianceFor(ratio),
        synthesized,
        isPinned,
        isDerived,
        parentRole: def?.derivedFrom,
        def: def as any,
        candidates,
        clamp: clamp ? {
          seedHex: clamp.seedHex.toLowerCase(),
          resolvedHex: clamp.resolvedHex.toLowerCase(),
          seedOklch: `L ${clamp.seedOklch.l.toFixed(2)} · C ${clamp.seedOklch.c.toFixed(2)} · H ${Math.round(clamp.seedOklch.h)}`,
          roleOklch: `L ${clamp.resolvedOklch.l.toFixed(2)} · C ${clamp.resolvedOklch.c.toFixed(2)} · H ${Math.round(clamp.resolvedOklch.h)}`,
        } : null,
        pinnedSeedHex: isPinned ? (clamp?.seedHex.toLowerCase() ?? null) : null,
        algorithmInfo,
      };
    });

    return sortRoleRows(entries, roleSortKeys.value);
  });

  return { mathList: allMathList };
}
