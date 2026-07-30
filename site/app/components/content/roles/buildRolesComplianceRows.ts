import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import type { FramingType } from '~/composables/types/index.ts';
import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKey.ts';

import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
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
    schema: RoleSchemaInterfaceType | undefined,
    roleName: string
  ): boolean {
    for (const pair of schema?.contrastPairs ?? []) {
      if (pair.foreground === roleName && pair.background === 'background') {
        return false;
      }
    }
    return true;
  }

  public static build(
    framing: FramingType.Type,
    schemaName: string,
    rows: readonly RoleComplianceRow[],
    roleSortKeys: readonly RoleSortKeyType[]
  ): RoleComplianceRow[] {
    const schema = roleSchemaByName[schemaName]?.[framing];
    const labeled: RoleComplianceRow[] = [];
    for (const row of rows) {
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
    return sortRoleRows(labeled, roleSortKeys);
  }
};
