import { colorRecordFactory, RoleDefinitionEntity, RoleRelationshipEntity } from '@studnicky/iridis';
import { computed } from 'vue';

import type { RoleMathCandidateType } from '~/composables/types/roleMathCandidateType.ts';
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import { RoleSortableRowEntity } from '~/composables/entities/RoleSortableRowEntity.ts';
import { RelationshipSource } from '~/composables/RelationshipSource.ts';
import { roleSchemaFor } from '~/composables/roleSchemaFor.ts';
import { RoleMathCandidatePresentation } from '~/composables/types/RoleMathCandidatePresentation.ts';
import { RoleMathOrigin } from '~/composables/types/roleMathOrigin.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleSortBehaviors } from '~/composables/useRoleSortBehaviors.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { complianceFor } from '~/utils/complianceFor.ts';
import { minimumRatioForRole } from '~/utils/minimumRatioForRole.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class UseRoleMathListOperation {
  static run() {
    const { framing, roleClamps, roleDistances, roles, rolesPinned, rolesSynthesized, schemaName } = useIridis();
    const { roleSortBehaviors } = useRoleSortBehaviors();

    const allMathList = computed<RoleMathEntry[]>(() => {
      const pair = roleSchemaByName[schemaName.value];
      const selected = framing.value === 'dark' ? pair.dark : pair.light;
      const schema = roleSchemaFor(selected);
      const roleDefs = schema.roles ?? [];
      const relationshipsByTarget = new Map<string, RoleRelationshipEntity.Type>();
      const relationshipGroups = schema.relationshipGraph?.groups ?? [];
      for (let groupIndex = 0; groupIndex < relationshipGroups.length; groupIndex += 1) {
        const relationships = relationshipGroups[groupIndex]?.relationships ?? [];
        for (let relationshipIndex = 0; relationshipIndex < relationships.length; relationshipIndex += 1) {
          const relationship = relationships[relationshipIndex];
          if (relationship !== undefined) {
            relationshipsByTarget.set(relationship.target, RoleRelationshipEntity.intake(relationship));
          }
        }
      }

      const derivedRoleNames = new Set(relationshipsByTarget.keys());

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
      const entries = Object.keys(roles.value).map(roleName => {
        const clamp = roleClamps.value.get(roleName);
        const distances = roleDistances.value.get(roleName) ?? new Map<string, number>();
        const synthesized = synthesizedRoleNames.has(roleName);
        const isPinned = pinnedRoleNames.has(roleName);
        const relationship = relationshipsByTarget.get(roleName);
        const isDerived = relationship !== undefined;

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

        const parentRole = RelationshipSource.primary(relationship);
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
          'parentRole': parentRole,
          'pinnedSeedHex': origin.isPinned() ? (clamp?.seedHex.toLowerCase() ?? null) : null,
          'ratio': ratio,
          'relationship': relationship ?? null
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
      const sortedRows = sortRoleRows(sortableRows, roleSortBehaviors.value);
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
