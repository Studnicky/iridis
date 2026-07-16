import type { FramingType, RoleHexMapType } from '~/composables/types/index.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKey.ts';
import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';
import type { SchemaNameType } from '~/composables/types/schemaName.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

const TIER_ORDER: readonly SchemaNameType[] = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];

export type SchemaTreeLeaf = RoleSortableRowType & {
  derivedFrom: string | undefined;
  hex: string;
  label: string;
  value: string;
};

export type SchemaTreeTier = {
  children: SchemaTreeLeaf[];
  defaultExpanded: boolean;
  label: string;
  value: string;
};

export function buildSchemaTree(
  framing: FramingType,
  schemaName: string,
  roles: RoleHexMapType,
  roleSortKeys: readonly RoleSortKeyType[],
  contrastRowsByName: ReadonlyMap<string, RoleSortableRowType>
): SchemaTreeTier[] {
  const seen = new Set<string>();
  return TIER_ORDER.map((tierName) => {
    const schema = roleSchemaByName[tierName]?.[framing];
    const addedRoles = (schema?.roles ?? []).filter((role) => {
      if (seen.has(role.name)) {
        return false;
      }
      seen.add(role.name);
      return true;
    });
    const leafRows: SchemaTreeLeaf[] = addedRoles.map((role) => {
      const row = contrastRowsByName.get(role.name);
      const hex = roles[role.name] ?? roles.background!;
      return {
        c: row?.c ?? 0,
        compliance: row?.compliance ?? 'fail',
        derivedFrom: role.derivedFrom,
        h: row?.h ?? 0,
        hex,
        l: row?.l ?? 0,
        label: role.name,
        name: role.name,
        ratio: row?.ratio ?? 1,
        value: `${tierName}:${role.name}`
      };
    });
    return {
      children: sortRoleRows(leafRows, roleSortKeys),
      defaultExpanded: tierName === schemaName,
      label: tierName,
      value: tierName
    };
  });
}
