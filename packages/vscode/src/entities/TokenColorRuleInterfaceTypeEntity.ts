import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Guard, JsonValue } from '@studnicky/types';

import { SemanticRuleEntryInterfaceTypeEntity } from './SemanticRuleEntryInterfaceTypeEntity.ts';

/** A VS Code `tokenColors[]` entry: `{ name, scope, settings }`. */
export namespace TokenColorRuleInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name':     { 'type': 'string' },
      'scope':    { 'anyOf': [{ 'type': 'string' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
      'settings': SemanticRuleEntryInterfaceTypeEntity.Schema
    },
    'required': ['name', 'scope', 'settings'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: JsonValueType): candidate is Type => {
    if (!Guard.isObject(candidate)) {return false;}
    const nameValid  = typeof candidate.name === 'string';
    const scopeValid = typeof candidate.scope === 'string' || Array.isArray(candidate.scope);
    const settingsValid = SemanticRuleEntryInterfaceTypeEntity.validate(JsonValue.from(candidate.settings));
    return nameValid && scopeValid && settingsValid;
  };
}
