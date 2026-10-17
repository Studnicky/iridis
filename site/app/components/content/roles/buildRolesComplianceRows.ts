import type { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis/model';

import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKey.ts';

import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class RoleComplianceRow implements RoleSortableRowType {
  public readonly c: number;
  public readonly compliance: string;
  public readonly h: number;
  public readonly hex: string;
  public readonly l: number;
  public readonly name: string;
  public readonly ratio: number;

  public constructor(
    c: number,
    compliance: string,
    h: number,
    hex: string,
    l: number,
    name: string,
    ratio: number
  ) {
    this.c = c;
    this.compliance = compliance;
    this.h = h;
    this.hex = hex;
    this.l = l;
    this.name = name;
    this.ratio = ratio;
  }
}

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
    rows: readonly RoleComplianceRow[],
    roleSortKeys: readonly RoleSortKeyType[]
  ): RoleComplianceRow[] {
    const labeled: RoleComplianceRow[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row === undefined) {
        continue;
      }
      labeled.push(new RoleComplianceRow(
        row.c,
        RolesComplianceRows.structuralRole(schema, row.name) ? 'n/a' : row.compliance,
        row.h,
        row.hex,
        row.l,
        row.name,
        row.ratio
      ));
    }
    const result = sortRoleRows(labeled, roleSortKeys);
    return result;
  }
};
