import type { RoleSchemaEntity } from '@studnicky/iridis';

import { RoleRelationshipEntity } from '@studnicky/iridis';

import type { RoleHexMapType } from '~/composables/types/index.ts';
import type { RoleSortKeyType } from '~/composables/types/roleSortKeyType.ts';
import type { RoleSortFieldBehaviorInterface } from '~/utils/roleSortFieldBehaviorInterface.ts';

import { RoleSortableRowEntity } from '~/composables/entities/RoleSortableRowEntity.ts';
import { RelationshipSource } from '~/composables/RelationshipSource.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

class SchemaTreeLeaf {
  public readonly c: number;
  public readonly compliance: string;
  public readonly relationshipSource: string | undefined;
  public readonly h: number;
  public readonly hex: string;
  public readonly l: number;
  public readonly label: string;
  public readonly name: string;
  public readonly ratio: number;
  public readonly value: string;

  public constructor(
    row: RoleSortableRowEntity.Type,
    tierLabel: string,
    options: { readonly 'relationshipSource': string | undefined }
  ) {
    this.c = row.c;
    this.compliance = row.compliance;
    this.relationshipSource = options.relationshipSource;
    this.h = row.h;
    this.hex = row.hex;
    this.l = row.l;
    this.label = row.name;
    this.name = row.name;
    this.ratio = row.ratio;
    this.value = [tierLabel, row.name].join(':');
  }
}

class SchemaTreeTier {
  public readonly children: SchemaTreeLeaf[];
  public readonly label: string;
  public readonly value: string;

  public constructor(children: SchemaTreeLeaf[], label: string) {
    this.children = children;
    this.label = label;
    this.value = label;
  }
}

export const buildSchemaTree = class SchemaTreeBuilder {
  private static relationshipSources(schema: RoleSchemaEntity.Type): ReadonlyMap<string, string | undefined> {
    const sources = new Map<string, string | undefined>();
    const groups = schema.relationshipGraph?.groups ?? [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const relationships = groups[groupIndex]?.relationships ?? [];
      for (let relationshipIndex = 0; relationshipIndex < relationships.length; relationshipIndex += 1) {
        const relationship = relationships[relationshipIndex];
        if (relationship === undefined) {
          continue;
        }
        sources.set(relationship.target, RelationshipSource.label(RoleRelationshipEntity.intake(relationship)));
      }
    }
    return sources;
  }

  private static createTier(
    schema: RoleSchemaEntity.Type,
    label: string,
    seen: Set<string>,
    options: {
      readonly 'contrastRowsByName': ReadonlyMap<string, RoleSortableRowEntity.Type>;
      readonly 'roles': RoleHexMapType;
      readonly 'sortBehaviors': readonly RoleSortFieldBehaviorInterface[];
    }
  ): SchemaTreeTier {
    const leafRows = new Map<string, SchemaTreeLeaf>();
    const relationshipSources = SchemaTreeBuilder.relationshipSources(schema);
    const sortableRows: RoleSortableRowEntity.Type[] = [];
    for (let roleIndex = 0; roleIndex < schema.roles.length; roleIndex += 1) {
      const role = schema.roles[roleIndex];
      if (role === undefined || seen.has(role.name)) {
        continue;
      }
      seen.add(role.name);
      const row = options.contrastRowsByName.get(role.name);
      const sortableRow = RoleSortableRowEntity.create({
        'c': row?.c ?? 0,
        'compliance': row?.compliance ?? 'fail',
        'h': row?.h ?? 0,
        'hex': options.roles[role.name] ?? options.roles.background,
        'l': row?.l ?? 0,
        'name': role.name,
        'ratio': row?.ratio ?? 1
      });
      const leaf = new SchemaTreeLeaf(sortableRow, label, {
        'relationshipSource': relationshipSources.get(role.name)
      });
      leafRows.set(role.name, leaf);
      sortableRows.push(sortableRow);
    }
    const children: SchemaTreeLeaf[] = [];
    const sortedRows = sortRoleRows(sortableRows, options.sortBehaviors);
    for (let rowIndex = 0; rowIndex < sortedRows.length; rowIndex += 1) {
      const sortedRow = sortedRows[rowIndex];
      const leaf = sortedRow === undefined ? undefined : leafRows.get(sortedRow.name);
      if (leaf !== undefined) {
        children.push(leaf);
      }
    }
    const result = new SchemaTreeTier(children, label);
    return result;
  }

  public static build(
    schemaSources: readonly {
      readonly 'label': string;
      readonly 'schema': RoleSchemaEntity.Type;
    }[],
    roles: RoleHexMapType,
    roleSortKeys: readonly RoleSortKeyType[],
    contrastRowsByName: ReadonlyMap<string, RoleSortableRowEntity.Type>
  ): SchemaTreeTier[] {
    const seen = new Set<string>();
    const tiers: SchemaTreeTier[] = [];
    const sortBehaviors = roleSortKeys.map((roleSortKey) => { return roleSortKey.behavior; });
    for (let sourceIndex = 0; sourceIndex < schemaSources.length; sourceIndex += 1) {
      const source = schemaSources[sourceIndex];
      if (source === undefined) {
        continue;
      }
      const tier = SchemaTreeBuilder.createTier(source.schema, source.label, seen, {
        'contrastRowsByName': contrastRowsByName,
        'roles': roles,
        'sortBehaviors': sortBehaviors
      });
      tiers.push(tier);
    }
    return tiers;
  }

  public static isLeaf(item: SchemaTreeLeaf | SchemaTreeTier): item is SchemaTreeLeaf {
    const result = 'hex' in item;
    return result;
  }
};
