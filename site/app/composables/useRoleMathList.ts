import { colorRecordFactory, RoleDefinitionInterfaceTypeEntity } from '@studnicky/iridis';
import { computed } from 'vue';

import type { RoleMathAlgorithmInfoType } from '~/composables/types/roleMathAlgorithmInfo.ts';
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import { RoleMathOrigin } from '~/composables/types/roleMathOrigin.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { complianceFor } from '~/utils/complianceFor.ts';
import { effectiveRelation } from '~/utils/effectiveRelation.ts';
import { minimumRatioForRole } from '~/utils/minimumRatioForRole.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { resolveHueOffset } from '~/utils/resolveHueOffset.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class UseRoleMathListOperation {
  static run() {
    const { derivationConfig, framing, roleClamps, roleDistances, roles, rolesDerived, roleSortKeys, rolesPinned, rolesSynthesized, schemaName } = useIridis();

    const allMathList = computed<RoleMathEntry[]>(() => {
      const schema = roleSchemaByName[schemaName.value]?.[framing.value];
      const roleDefs = schema?.roles ?? [];

      // 'background' is required in every schema tier and resolved synchronously
      // before any component reads this — never a hardcoded placeholder.
      const bg = roles.value.background!;

      const roleDefinitionsByName = new Map<string, typeof roleDefs[number]>();
      for (let index = 0; index < roleDefs.length; index += 1) {
        const definition = roleDefs[index];
        if (definition === undefined) {
          throw new RangeError(`Role schema is missing definition ${index}`);
        }
        roleDefinitionsByName.set(definition.name, definition);
      }
      const synthesizedRoleNames = new Set(rolesSynthesized.value);
      const pinnedRoleNames = new Set(rolesPinned.value);
      const derivedRoleNames = new Set(rolesDerived.value);
      const entries = Object.keys(roles.value).map(roleName => {
        const clamp = roleClamps.value.get(roleName);
        const distances = roleDistances.value.get(roleName) ?? new Map<string, number>();
        const synthesized = synthesizedRoleNames.has(roleName);
        const isPinned = pinnedRoleNames.has(roleName);
        const isDerived = derivedRoleNames.has(roleName);

        const candidates = [...distances].map(([hex, dist]) => {
          const candidate = {
            'dist': dist,
            'hex': hex,
            'isWinner': false
          };
          return candidate;
        }).sort((left, right) => {
          const result = left.dist - right.dist;
          return result;
        });

        const hasCandidates = candidates.length > 0;
        if (!synthesized && !isPinned && !isDerived && hasCandidates) {
          candidates[0]!.isWinner = true;
        }

        const def = roleDefinitionsByName.get(roleName);

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

        const origin = RoleMathOrigin.resolve(
          roleName,
          pinnedRoleNames,
          synthesizedRoleNames,
          derivedRoleNames
        );

        return {
          'algorithmInfo': algorithmInfo,
          'c': oklch.c,
          'candidates': candidates,
          'clamp': clamp ?? null,
          'compliance': complianceFor(ratio, minimumRatioForRole(schema, roleName)),
          'def': def === undefined ? undefined : RoleDefinitionInterfaceTypeEntity.intake(def),
          'h': oklch.h,
          'hex': hex,
          'l': oklch.l,
          'name': roleName,
          'origin': origin,
          'parentRole': def?.derivedFrom,
          'pinnedSeedHex': origin.isPinned() ? (clamp?.seedHex.toLowerCase() ?? null) : null,
          'ratio': ratio
        };
      });

      const result = sortRoleRows(entries, roleSortKeys.value);
      return result;
    });

    const result = { 'mathList': allMathList };
    return result;
  }
}

export const useRoleMathList = UseRoleMathListOperation.run;
