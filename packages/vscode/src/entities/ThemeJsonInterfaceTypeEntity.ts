import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Object } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { SemanticRuleEntryInterfaceTypeEntity } from './SemanticRuleEntryInterfaceTypeEntity.ts';
import { TokenColorRuleInterfaceTypeEntity } from './TokenColorRuleInterfaceTypeEntity.ts';

export namespace ThemeJsonInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/ThemeJson',
    'additionalProperties': false,
    'properties': {
      'colors': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'name': { 'type': 'string' },
      'semanticHighlighting': { 'enum': [true], 'type': 'boolean' },
      'semanticTokenColors': {
        'additionalProperties': {
          'anyOf': [
            { 'type': 'string' },
            SemanticRuleEntryInterfaceTypeEntity.Schema
          ]
        },
        'type': 'object'
      },
      'tokenColors': {
        'items': TokenColorRuleInterfaceTypeEntity.Schema,
        'type': 'array'
      },
      'type': {
        'enum': ['dark', 'light', 'hc-dark', 'hc-light'],
        'type': 'string'
      }
    },
    'required': ['colors', 'name', 'semanticHighlighting', 'semanticTokenColors', 'tokenColors', 'type'],
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
