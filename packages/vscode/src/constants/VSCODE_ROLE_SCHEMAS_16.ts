import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { VSCODE_ROLE_SCHEMAS_64 } from './VSCODE_ROLE_SCHEMAS_64.ts';

/** Backward-compatible 16-role views of the canonical 64-role VS Code schemas. */
export class VSCODE_ROLE_SCHEMAS_16 {
  static readonly dark: RoleSchemaInterfaceType = VSCODE_ROLE_SCHEMAS_16.baseView(VSCODE_ROLE_SCHEMAS_64.dark);

  static readonly light: RoleSchemaInterfaceType = VSCODE_ROLE_SCHEMAS_16.baseView(VSCODE_ROLE_SCHEMAS_64.light);

  static baseView(schema: RoleSchemaInterfaceType): RoleSchemaInterfaceType {
    const roles = schema.roles.slice(0, 16);
    const roleNames = new Set<string>();
    for (const role of roles) { roleNames.add(role.name); }
    return {
      'contrastPairs': schema.contrastPairs?.filter((pair) => { return roleNames.has(pair.background) && roleNames.has(pair.foreground); }),
      'description': schema.description?.replace('64-role', '16-role'),
      'name': schema.name.replace('64', '16'),
      'roles': roles
    };
  }
}
