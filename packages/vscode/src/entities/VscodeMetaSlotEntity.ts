import type { NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Object } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { ColorRecordEntity } from '@studnicky/iridis';
import { Validator } from '@studnicky/iridis/model';

import { SemanticRuleEntryEntity } from './SemanticRuleEntryEntity.ts';

class VscodeMetaSlotAdmission {
  static baseTokens(value: JSONSchema7Object[string]): Map<string, ColorRecordEntity.Type> {
    const normalized = VscodeMetaSlotEntity.intake({ 'baseTokens': value });
    const entries = Object.entries(normalized.baseTokens ?? {});
    const result = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [name, record] = entry;
        result.set(name, ColorRecordEntity.intake(record));
      }
    }
    return result;
  }
}

export namespace VscodeMetaSlotEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/VscodeMetaSlot',
    'additionalProperties': false,
    'properties': {
      'baseTokens': {
        'additionalProperties': ColorRecordEntity.Schema,
        'type': 'object'
      },
      'semanticTokenRules': {
        'additionalProperties': SemanticRuleEntryEntity.Schema,
        'type': 'object'
      }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = (value: JSONSchema7Object[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
  export const baseTokens = VscodeMetaSlotAdmission.baseTokens;
}
