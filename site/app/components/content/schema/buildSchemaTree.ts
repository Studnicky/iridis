import type { FramingType, RoleHexMapType } from '~/composables/types/index.ts';
import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKey.ts';
import type { SchemaNameType } from '~/composables/types/schemaName.ts';

import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class SchemaTreeLeaf implements RoleSortableRowType {
  public readonly c: number;
  public readonly compliance: string;
  public readonly derivedFrom: string | undefined;
  public readonly h: number;
  public readonly hex: string | undefined;
  public readonly l: number;
  public readonly label: string;
  public readonly name: string;
  public readonly ratio: number;
  public readonly value: string;

  public constructor(
    derivedFrom: string | undefined,
    hex: string | undefined,
    name: string,
    row: RoleSortableRowType | undefined,
    tierName: SchemaNameType.Type
  ) {
    this.c = row?.c ?? 0;
    this.compliance = row?.compliance ?? 'fail';
    this.derivedFrom = derivedFrom;
    this.h = row?.h ?? 0;
    this.hex = hex;
    this.l = row?.l ?? 0;
    this.label = name;
    this.name = name;
    this.ratio = row?.ratio ?? 1;
    this.value = `${tierName}:${name}`;
  }
}

class SchemaTreeTier {
  public readonly children: SchemaTreeLeaf[];
  public readonly defaultExpanded: boolean;
  public readonly label: string;
  public readonly value: string;

  public constructor(children: SchemaTreeLeaf[], defaultExpanded: boolean, tierName: SchemaNameType.Type) {
    this.children = children;
    this.defaultExpanded = defaultExpanded;
    this.label = tierName;
    this.value = tierName;
  }
}

export const buildSchemaTree = class SchemaTreeBuilder {
  private static readonly tierOrder: readonly SchemaNameType.Type[] = [
    'iridis-4',
    'iridis-8',
    'iridis-12',
    'iridis-16',
    'iridis-32'
  ];

  public static build(
    framing: FramingType.Type,
    schemaName: string,
    roles: RoleHexMapType,
    roleSortKeys: readonly RoleSortKeyType[],
    contrastRowsByName: ReadonlyMap<string, RoleSortableRowType>
  ): SchemaTreeTier[] {
    const seen = new Set<string>();
    const tiers: SchemaTreeTier[] = [];
    for (const tierName of SchemaTreeBuilder.tierOrder) {
      const schema = roleSchemaByName[tierName]?.[framing];
      const leafRows: SchemaTreeLeaf[] = [];
      for (const role of schema?.roles ?? []) {
        if (seen.has(role.name)) {
          continue;
        }
        seen.add(role.name);
        leafRows.push(new SchemaTreeLeaf(
          role.derivedFrom,
          roles[role.name] ?? roles.background,
          role.name,
          contrastRowsByName.get(role.name),
          tierName
        ));
      }
      tiers.push(new SchemaTreeTier(
        sortRoleRows(leafRows, roleSortKeys),
        tierName === schemaName,
        tierName
      ));
    }
    return tiers;
  }

  public static isLeaf(item: SchemaTreeLeaf | SchemaTreeTier): item is SchemaTreeLeaf {
    return 'hex' in item;
  }
};
