import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

export const StylesheetCellsSevenToNineRoleSchemas = Object.freeze({
  'wideGamut': RoleSchemaInterfaceTypeEntity.intake({
    'name': 'wide-gamut',
    'roles': [{
      'chromaRange': [0, 0.5],
      'intent': 'accent',
      'lightnessRange': [0.05, 0.95],
      'name': 'primary',
      'required': true
    }]
  })
});
