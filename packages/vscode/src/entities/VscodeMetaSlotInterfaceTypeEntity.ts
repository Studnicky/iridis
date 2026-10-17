import type { NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Object } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';
import { Validator } from '@studnicky/iridis/model';

import { SemanticRuleEntryInterfaceTypeEntity } from './SemanticRuleEntryInterfaceTypeEntity.ts';

class VscodeMetaSlotAdmission {
  static baseTokens(value: JSONSchema7Object[string]): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const normalized = VscodeMetaSlotInterfaceTypeEntity.intake({ 'baseTokens': value });
    const entries = Object.entries(normalized.baseTokens ?? {});
    const result = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [name, record] = entry;
        result.set(name, ColorRecordInterfaceTypeEntity.intake(record));
      }
    }
    return result;
  }
}

export namespace VscodeMetaSlotInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/VscodeMetaSlot',
    'additionalProperties': false,
    'properties': {
      'baseTokens': {
        'additionalProperties': ColorRecordInterfaceTypeEntity.Schema,
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
