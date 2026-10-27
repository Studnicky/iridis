import { RelationshipSources, RoleRelationshipGraphEntity, RoleSchemaEntity } from '@studnicky/iridis';

import { VSCODE_FULL_ROLE_SCHEMAS } from './VscodeFullRoleSchemas.ts';

/** Defines compact views of the canonical full VS Code schemas. */
class VscodeCompactRoleSchemas {
  static readonly dark: RoleSchemaEntity.Type = VscodeCompactRoleSchemas.baseView(VSCODE_FULL_ROLE_SCHEMAS.dark);

  static readonly light: RoleSchemaEntity.Type = VscodeCompactRoleSchemas.baseView(VSCODE_FULL_ROLE_SCHEMAS.light);

  static baseView(schema: RoleSchemaEntity.Type): RoleSchemaEntity.Type {
    const roles = schema.roles.slice(0, 16);
    const roleNames = new Set<string>();
    for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
      const role = roles.at(roleIndex);
      if (role !== undefined) {
        roleNames.add(role.name);
      }
    }
    const contrastPairs = schema.contrastPairs?.filter((pair) => {
      const included = roleNames.has(pair.background) && roleNames.has(pair.foreground);
      return included;
    });
    const description = schema.description?.replace('Full', 'Compact');
    const relationshipGraph = VscodeCompactRoleSchemas.relationshipGraph(schema, roleNames);
    const result = RoleSchemaEntity.create({
      ...(contrastPairs === undefined ? {} : { 'contrastPairs': contrastPairs }),
      ...(description === undefined ? {} : { 'description': description }),
      'name': schema.name.replace('full', 'compact'),
      ...(relationshipGraph === undefined ? {} : { 'relationshipGraph': relationshipGraph }),
      'roles': roles
    });
    return result;
  }

  private static relationshipGraph(
    schema: RoleSchemaEntity.Type,
    roleNames: ReadonlySet<string>
  ): RoleRelationshipGraphEntity.Type | undefined {
    const graph = schema.relationshipGraph;
    if (graph === undefined) {
      return undefined;
    }
    const groups: RoleRelationshipGraphEntity.Type['groups'][number][] = [];
    for (let groupIndex = 0; groupIndex < graph.groups.length; groupIndex += 1) {
      const group = graph.groups[groupIndex];
      if (group === undefined) {
        continue;
      }
      const relationships: RoleRelationshipGraphEntity.Type['groups'][number]['relationships'][number][] = [];
      for (let relationshipIndex = 0; relationshipIndex < group.relationships.length; relationshipIndex += 1) {
        const relationship = group.relationships[relationshipIndex];
        if (relationship !== undefined && VscodeCompactRoleSchemas.includesRoles(relationship, roleNames)) {
          relationships.push(relationship);
        }
      }
      groups.push({ ...group, 'relationships': relationships });
    }
    const result = RoleRelationshipGraphEntity.intake({ 'groups': groups });
    return result;
  }

  private static includesRoles(
    relationship: RoleRelationshipGraphEntity.Type['groups'][number]['relationships'][number],
    roleNames: ReadonlySet<string>
  ): boolean {
    const sourcesIncluded = RelationshipSources.names(relationship).every((name) => {
      const included = roleNames.has(name);
      return included;
    });
    const targetIncluded = roleNames.has(relationship.target);
    const result = sourcesIncluded && targetIncluded;
    return result;
  }
}

export const VSCODE_COMPACT_ROLE_SCHEMAS = VscodeCompactRoleSchemas;
