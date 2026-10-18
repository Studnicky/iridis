import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

export const StylesheetRoleSchemas = Object.freeze({
  'single': RoleSchemaInterfaceTypeEntity.intake({ 'name': 'single', 'roles': [{ 'name': 'primary', 'required': true }] }),
  'two': RoleSchemaInterfaceTypeEntity.intake({ 'name': 'two', 'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'secondary' }] })
});
