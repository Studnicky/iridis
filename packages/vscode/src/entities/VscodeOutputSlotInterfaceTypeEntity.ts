import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { SemanticRuleEntryInterfaceTypeEntity } from './SemanticRuleEntryInterfaceTypeEntity.ts';
import { ThemeJsonInterfaceTypeEntity } from './ThemeJsonInterfaceTypeEntity.ts';

export namespace VscodeOutputSlotInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/VscodeOutputSlot',
    'additionalProperties': false,
    'properties': {
      'semanticTokenRules': {
        'additionalProperties': SemanticRuleEntryInterfaceTypeEntity.Schema,
        'type': 'object'
      },
      'themeJson': ThemeJsonInterfaceTypeEntity.Schema,
      'workbenchColors': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
