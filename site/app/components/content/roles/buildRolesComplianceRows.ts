import type { RoleSchemaEntity } from '@studnicky/iridis/model';

import type { RoleSortFieldBehaviorInterface } from '~/utils/roleSortFieldBehaviorInterface.ts';

import { RoleSortableRowEntity } from '~/composables/entities/RoleSortableRowEntity.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';


export const buildRolesComplianceRows = class RolesComplianceRows {
  /**
   * Roles with no contrastPairs entry read against the page background — pure
   * chrome (border, divider, surface, code-bg, overlay…) or a role declared
   * against a different background (on-brand vs brand) — never had a "does
   * this read against the page background" intent in the first place.
   */
  private static structuralRole(
    schema: RoleSchemaEntity.Type | undefined,
    roleName: string
  ): boolean {
    const contrastPairs = schema?.contrastPairs ?? [];
    for (let index = 0; index < contrastPairs.length; index += 1) {
      const pair = contrastPairs[index];
      if (pair?.foreground === roleName && pair.background === 'background') {
        return false;
      }
    }
    return true;
  }

  public static build(
    schema: RoleSchemaEntity.Type | undefined,
    rows: readonly RoleSortableRowEntity.Type[],
    sortBehaviors: readonly RoleSortFieldBehaviorInterface[]
  ): RoleSortableRowEntity.Type[] {
    const labeled: RoleSortableRowEntity.Type[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row === undefined) {
        continue;
      }
      const isStructural = RolesComplianceRows.structuralRole(schema, row.name);
      const labeledRow = RoleSortableRowEntity.create({ 'c': row.c, 'compliance': isStructural === true ? 'n/a' : row.compliance, 'h': row.h, 'hex': row.hex, 'l': row.l, 'name': row.name, 'ratio': row.ratio });
      labeled.push(labeledRow);
    }
    const result = sortRoleRows(labeled, sortBehaviors);
    return result;
  }
};
