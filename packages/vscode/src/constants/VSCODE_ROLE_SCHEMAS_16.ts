import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

import { VSCODE_ROLE_SCHEMAS_64 } from './VSCODE_ROLE_SCHEMAS_64.ts';

/** Backward-compatible 16-role views of the canonical 64-role VS Code schemas. */
class VscodeRoleSchemas16 {
  static readonly dark: RoleSchemaInterfaceTypeEntity.Type = VscodeRoleSchemas16.baseView(VSCODE_ROLE_SCHEMAS_64.dark);

  static readonly light: RoleSchemaInterfaceTypeEntity.Type = VscodeRoleSchemas16.baseView(VSCODE_ROLE_SCHEMAS_64.light);

  static baseView(schema: RoleSchemaInterfaceTypeEntity.Type): RoleSchemaInterfaceTypeEntity.Type {
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
    const result = RoleSchemaInterfaceTypeEntity.create({
      ...(contrastPairs === undefined ? {} : { 'contrastPairs': contrastPairs }),
      ...(description === undefined ? {} : { 'description': description }),
      'name': schema.name.replace('64', '16'),
      'roles': roles
    });
    return result;
  }
}

export const VSCODE_ROLE_SCHEMAS_16 = VscodeRoleSchemas16;
