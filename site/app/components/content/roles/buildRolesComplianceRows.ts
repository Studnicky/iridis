import type { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis/model';

import type { RoleSortKeyType } from '~/composables/types/roleSortKeyType.ts';

import { RoleSortableRowInterfaceTypeEntity } from '~/composables/entities/RoleSortableRowInterfaceTypeEntity.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';


export const buildRolesComplianceRows = class RolesComplianceRows {
  /**
   * Roles with no contrastPairs entry read against the page background — pure
   * chrome (border, divider, surface, code-bg, overlay…) or a role declared
   * against a different background (on-brand vs brand) — never had a "does
   * this read against the page background" intent in the first place.
   */
  private static structuralRole(
    schema: RoleSchemaInterfaceTypeEntity.Type | undefined,
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
    schema: RoleSchemaInterfaceTypeEntity.Type | undefined,
    rows: readonly RoleSortableRowInterfaceTypeEntity.Type[],
    roleSortKeys: readonly RoleSortKeyType[]
  ): RoleSortableRowInterfaceTypeEntity.Type[] {
    const labeled: RoleSortableRowInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row === undefined) {
        continue;
      }
      const isStructural = RolesComplianceRows.structuralRole(schema, row.name);
      const labeledRow = RoleSortableRowInterfaceTypeEntity.create({ 'c': row.c, 'compliance': isStructural === true ? 'n/a' : row.compliance, 'h': row.h, 'hex': row.hex, 'l': row.l, 'name': row.name, 'ratio': row.ratio });
      labeled.push(labeledRow);
    }
    const behaviors = roleSortKeys.map((key) => { return key.behavior; });
    const result = sortRoleRows(labeled, behaviors);
    return result;
  }
};
