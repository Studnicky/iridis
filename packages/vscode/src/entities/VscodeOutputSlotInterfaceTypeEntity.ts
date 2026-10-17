import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Object } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
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

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Object[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
