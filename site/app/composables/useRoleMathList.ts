import { colorRecordFactory, RoleDefinitionEntity } from '@studnicky/iridis';
import { computed } from 'vue';

import type { RoleMathAlgorithmInfoType } from '~/composables/types/roleMathAlgorithmInfoType.ts';
import type { RoleMathCandidateType } from '~/composables/types/roleMathCandidateType.ts';
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import { buildDerivationRelations } from '~/components/content/derivation/buildDerivationRelations.ts';
import { RoleSortableRowEntity } from '~/composables/entities/RoleSortableRowEntity.ts';
import { roleSchemaFor } from '~/composables/roleSchemaFor.ts';
import { RoleMathCandidatePresentation } from '~/composables/types/RoleMathCandidatePresentation.ts';
import { RoleMathOrigin } from '~/composables/types/roleMathOrigin.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { complianceFor } from '~/utils/complianceFor.ts';
import { effectiveRelation } from '~/utils/effectiveRelation.ts';
import { minimumRatioForRole } from '~/utils/minimumRatioForRole.ts';
import { resolveHueOffset } from '~/utils/resolveHueOffset.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class UseRoleMathListOperation {
  static run() {
    const { derivationConfig, framing, roleClamps, roleDistances, roles, rolesDerived, roleSortKeys, rolesPinned, rolesSynthesized, schemaName } = useIridis();

    const allMathList = computed<RoleMathEntry[]>(() => {
      const pair = roleSchemaByName[schemaName.value];
      const selected = framing.value === 'dark' ? pair.dark : pair.light;
      const schema = roleSchemaFor(selected);
      const roleDefs = schema.roles ?? [];

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

        const candidates: RoleMathCandidateType[] = [...distances].map(([hex, dist]) => {
          const candidate: RoleMathCandidateType = {
            'dist': dist,
            'hex': hex,
            'presentation': RoleMathCandidatePresentation.unselected()
          };
          return candidate;
        }).sort((left, right) => {
          const result = left.dist - right.dist;
          return result;
        });

        const hasCandidates = candidates.length > 0;
        if (!synthesized && !isPinned && !isDerived && hasCandidates) {
          candidates[0]!.presentation = RoleMathCandidatePresentation.selected();
        }

        const def = roleDefinitionsByName.get(roleName);

        const parentHex = def?.derivedFrom !== undefined && def.derivedFrom !== '' ? roles.value[def.derivedFrom] : undefined;
        let algorithmInfo: RoleMathAlgorithmInfoType | null = null;
        if (isDerived && def?.derivedFrom !== undefined && def.derivedFrom !== '' && parentHex !== undefined && parentHex !== '') {
          const relation = effectiveRelation({
            'relation': derivationConfig.value.relations[roleName],
            'schemaHueOffset': def.hueOffset
          });
          const baseHue = colorRecordFactory.fromHex(parentHex).oklch.h ?? 0;
          const algorithm = buildDerivationRelations.resolveHueAlgorithm(relation.algorithm);
          const computedHues = algorithm.apply(baseHue, {
            'freeformOffsets': [relation.freeformOffset ?? 0]
          });
          algorithmInfo = {
            'algorithm': algorithm,
            'baseHue': baseHue,
            'computedHues': computedHues,
            'freeformOffset': relation.freeformOffset,
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
          'def': def === undefined ? undefined : RoleDefinitionEntity.intake(def),
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

      const entriesByName = new Map(entries.map((entry) => { return [entry.name, entry]; }));
      const sortableRows = entries.map((entry) => {
        const result = RoleSortableRowEntity.create({
          'c': entry.c,
          'compliance': entry.compliance,
          'h': entry.h,
          'hex': entry.hex,
          'l': entry.l,
          'name': entry.name,
          'ratio': entry.ratio
        });
        return result;
      });
      const sortedRows = sortRoleRows(sortableRows, roleSortKeys.value.map((key) => { return key.behavior; }));
      const result = sortedRows.map((row) => {
        const entry = entriesByName.get(row.name);
        if (entry === undefined) {throw new RangeError(`Missing role math entry for ${row.name}`);}
        return entry;
      });
      return result;
    });

    const result = { 'mathList': allMathList };
    return result;
  }
}

export const useRoleMathList = UseRoleMathListOperation.run;
