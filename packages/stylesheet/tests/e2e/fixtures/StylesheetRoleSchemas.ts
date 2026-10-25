import { RoleSchemaEntity } from '@studnicky/iridis';

export const StylesheetRoleSchemas = Object.freeze({
  'single': RoleSchemaEntity.intake({ 'name': 'single', 'roles': [{ 'name': 'primary', 'required': true }] }),
  'two': RoleSchemaEntity.intake({ 'name': 'two', 'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'secondary' }] })
});
