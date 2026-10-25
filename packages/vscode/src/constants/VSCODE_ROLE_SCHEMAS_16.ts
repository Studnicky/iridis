import { RoleRelationshipGraphEntity, RoleSchemaEntity } from '@studnicky/iridis';

import { VSCODE_ROLE_SCHEMAS_64 } from './VSCODE_ROLE_SCHEMAS_64.ts';

/** Backward-compatible 16-role views of the canonical 64-role VS Code schemas. */
class VscodeRoleSchemas16 {
  static readonly dark: RoleSchemaEntity.Type = VscodeRoleSchemas16.baseView(VSCODE_ROLE_SCHEMAS_64.dark);

  static readonly light: RoleSchemaEntity.Type = VscodeRoleSchemas16.baseView(VSCODE_ROLE_SCHEMAS_64.light);

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
    const description = schema.description?.replace('64-role', '16-role');
    const relationshipGraph = VscodeRoleSchemas16.relationshipGraph(schema, roleNames);
    const result = RoleSchemaEntity.create({
      ...(contrastPairs === undefined ? {} : { 'contrastPairs': contrastPairs }),
      ...(description === undefined ? {} : { 'description': description }),
      'name': schema.name.replace('64', '16'),
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
        if (relationship !== undefined && VscodeRoleSchemas16.includesRoles(relationship, roleNames)) {
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
    const names = VscodeRoleSchemas16.relationshipNames(relationship);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name === undefined || !roleNames.has(name)) {
        return false;
      }
    }
    return true;
  }

  private static relationshipNames(
    relationship: RoleRelationshipGraphEntity.Type['groups'][number]['relationships'][number]
  ): readonly string[] {
    if (relationship.operation === 'alpha-overlay') {
      const result = [relationship.base, relationship.overlay, relationship.target];
      return result;
    }
    if (relationship.operation === 'oklch-interpolate') {
      const result = [relationship.source, relationship.toward, relationship.target];
      return result;
    }
    if (relationship.operation === 'hue-target' && relationship.source === undefined) {
      const result = [relationship.target];
      return result;
    }
    const source = relationship.source;
    if (source === undefined) {
      throw new TypeError('Only hue-target relationships may omit a source role.');
    }
    const result = [source, relationship.target];
    return result;
  }
}

export const VSCODE_ROLE_SCHEMAS_16 = VscodeRoleSchemas16;
