import { RoleDefinitionInterfaceTypeEntity } from '../entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../entities/RoleSchemaInterfaceTypeEntity.ts';

/** Four-role dark-framing schema used by {@link import('../QuickPalette.ts').QuickPalette}. */
const SCHEMA_DARK = RoleSchemaInterfaceTypeEntity.create({
  'name':          'quick-dark',
  'roles': [
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.04], 'intent': 'background', 'lightnessRange': [0.05, 0.12], 'name': 'background', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.03], 'intent': 'text', 'lightnessRange': [0.94, 0.99], 'name': 'foreground', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0.14, 0.28], 'intent': 'accent', 'lightnessRange': [0.62, 0.78], 'name': 'accent', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.05], 'intent': 'muted', 'lightnessRange': [0.55, 0.70], 'name': 'muted', 'required': true })
  ]
});

/** Four-role light-framing schema used by {@link import('../QuickPalette.ts').QuickPalette}. */
const SCHEMA_LIGHT = RoleSchemaInterfaceTypeEntity.create({
  'name':          'quick-light',
  'roles': [
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.02], 'intent': 'background', 'lightnessRange': [0.96, 1.0], 'name': 'background', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.03], 'intent': 'text', 'lightnessRange': [0.10, 0.20], 'name': 'foreground', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0.12, 0.24], 'intent': 'accent', 'lightnessRange': [0.42, 0.55], 'name': 'accent', 'required': true }),
    RoleDefinitionInterfaceTypeEntity.create({ 'chromaRange': [0, 0.04], 'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'muted', 'required': true })
  ]
});

export const QUICK_PALETTE_DEFAULTS = {
  'PIPELINE':     ['intake:hex', 'resolve:roles'],
  'SCHEMA_DARK':  SCHEMA_DARK,
  'SCHEMA_LIGHT': SCHEMA_LIGHT
} as const;
