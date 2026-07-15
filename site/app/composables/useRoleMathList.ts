import { colorRecordFactory } from '@studnicky/iridis';

import type { RoleMathAlgorithmInfoType } from '~/composables/types/roleMathAlgorithmInfo.ts';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { complianceFor } from '~/utils/complianceFor.ts';
import { effectiveRelation } from '~/utils/effectiveRelation.ts';
import { minRatioForRole } from '~/utils/minRatioForRole.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { resolveHueOffset } from '~/utils/resolveHueOffset.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

export function useRoleMathList() {
  const { derivationConfig, framing, roleClamps, roleDistances, roles, rolesDerived, roleSortKeys, rolesPinned, rolesSynthesized, schemaName } = useIridis();

  const allMathList = computed<RoleMathEntryType[]>(() => {
    const schema = roleSchemaByName[schemaName.value]?.[framing.value];
    const roleDefs = schema?.roles ?? [];

    // 'background' is required in every schema tier and resolved synchronously
    // before any component reads this — never a hardcoded placeholder.
    const bg = roles.value.background!;

    const entries = Object.keys(roles.value).map(roleName => {
      const clamp = roleClamps.value[roleName];
      const distances = roleDistances.value[roleName] ?? {};
      const synthesized = rolesSynthesized.value.includes(roleName);
      const isPinned = rolesPinned.value.includes(roleName);
      const isDerived = rolesDerived.value.includes(roleName);

      const candidates = Object.entries(distances).map(([hex, dist]) => {return {
        'dist': dist,
        'hex': hex,
        'isWinner': false
      };}).sort((a, b) => {return a.dist - b.dist;});

      const hasCandidates = candidates.length > 0;
      if (!synthesized && !isPinned && !isDerived && hasCandidates) {
        candidates[0]!.isWinner = true;
      }

      const def = roleDefs.find(r => {return r.name === roleName;});

      const parentHex = def?.derivedFrom !== undefined && def.derivedFrom !== '' ? roles.value[def.derivedFrom] : undefined;
      let algorithmInfo: RoleMathAlgorithmInfoType | null = null;
      if (isDerived && def?.derivedFrom !== undefined && def.derivedFrom !== '' && parentHex !== undefined && parentHex !== '') {
        const relation = effectiveRelation(def.hueOffset, derivationConfig.value.relations[roleName]);
        const baseHue = colorRecordFactory.fromHex(parentHex).oklch.h ?? 0;
        // Freeform stores a relative offset (added to the parent's hue by the
        // engine), while every other algorithm already returns absolute hues
        // — so freeform is resolved to an absolute hue here too, keeping
        // computedHues in one coordinate system across all algorithms.
        const computedHues = relation.hueAlgorithm === 'freeform'
          ? [normalizeHue(baseHue + (relation.freeformOffset ?? 0))]
          : selectHueAlgorithm(relation.hueAlgorithm, baseHue);
        algorithmInfo = {
          'baseHue': baseHue,
          'computedHues': computedHues,
          'freeformOffset': relation.freeformOffset,
          'hueAlgorithm': relation.hueAlgorithm,
          'hueVariantIndex': relation.hueVariantIndex,
          'offsetDeg': resolveHueOffset(relation)
        };
      }

      // roleName comes from Object.keys(roles.value) itself, so this lookup
      // can never miss — never a hardcoded placeholder.
      const hex = roles.value[roleName]!;
      const oklch = colorRecordFactory.fromHex(hex).oklch;
      const ratio = contrastRatio(hex, bg);

      return {
        'algorithmInfo': algorithmInfo,
        'c': oklch.c,
        'candidates': candidates,
        'clamp': clamp !== undefined ? {
          'resolvedHex': clamp.resolvedHex.toLowerCase(),
          'roleOklch': `L ${clamp.resolvedOklch.l.toFixed(2)} · C ${clamp.resolvedOklch.c.toFixed(2)} · H ${Math.round(clamp.resolvedOklch.h)}`,
          'seedHex': clamp.seedHex.toLowerCase(),
          'seedOklch': `L ${clamp.seedOklch.l.toFixed(2)} · C ${clamp.seedOklch.c.toFixed(2)} · H ${Math.round(clamp.seedOklch.h)}`
        } : null,
        'compliance': complianceFor(ratio, minRatioForRole(schema, roleName)),
        'def': def,
        'h': oklch.h,
        'hex': hex,
        'isDerived': isDerived,
        'isPinned': isPinned,
        'l': oklch.l,
        'name': roleName,
        'parentRole': def?.derivedFrom,
        'pinnedSeedHex': isPinned ? (clamp?.seedHex.toLowerCase() ?? null) : null,
        'ratio': ratio,
        'synthesized': synthesized
      };
    });

    return sortRoleRows(entries, roleSortKeys.value);
  });

  return { 'mathList': allMathList };
}
