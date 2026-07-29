import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { ColorRecordSchema, Validator } from '@studnicky/iridis/model';

import { SemanticRuleEntryInterfaceTypeEntity } from './SemanticRuleEntryInterfaceTypeEntity.ts';

export namespace VscodeMetaSlotInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/VscodeMetaSlot',
    'additionalProperties': false,
    'properties': {
      'baseTokens': {
        'additionalProperties': ColorRecordSchema,
        'type': 'object'
      },
      'semanticTokenRules': {
        'additionalProperties': SemanticRuleEntryInterfaceTypeEntity.Schema,
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
