import type { VscodeRoleBridgeEntity } from '@studnicky/iridis-vscode';
import type { RoleSchemaEntity } from '@studnicky/iridis/model';

export declare class SchemaPair {
  'dark':  RoleSchemaEntity.Type;
  'light': RoleSchemaEntity.Type;
  'vscodeRoleBridge': {
    readonly 'dark': VscodeRoleBridgeEntity.Type;
    readonly 'light': VscodeRoleBridgeEntity.Type;
  };
}
