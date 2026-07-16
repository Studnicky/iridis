import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import type { FramingType } from '~/composables/types/index.ts';
import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKey.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

export type RoleComplianceRowType = RoleSortableRowType & {
  hex: string;
};

/**
 * Roles with no contrastPairs entry read against the page background — pure
 * chrome (border, divider, surface, code-bg, overlay…) or a role declared
 * against a different background (on-brand vs brand) — never had a "does
 * this read against the page background" intent in the first place.
 */
function isStructuralRole(schema: RoleSchemaInterfaceType | undefined, roleName: string): boolean {
  const ownPairs = (schema?.contrastPairs ?? []).filter((pair) => pair.foreground === roleName);
  if (ownPairs.length === 0) {
    return true;
  }
  return ownPairs.every((pair) => pair.background !== 'background');
}

export function buildRolesComplianceRows(
  framing: FramingType,
  schemaName: string,
  rows: readonly RoleComplianceRowType[],
  roleSortKeys: readonly RoleSortKeyType[]
): RoleComplianceRowType[] {
  const schema = roleSchemaByName[schemaName]?.[framing];
  const labeled = rows.map((row) => {
    return isStructuralRole(schema, row.name) ? { ...row, compliance: 'n/a' } : row;
  });
  return sortRoleRows(labeled, roleSortKeys);
}
