import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { SemanticRuleEntryEntity } from './SemanticRuleEntryEntity.ts';

/** A VS Code `tokenColors[]` entry: `{ name, scope, settings }`. */
export namespace TokenColorRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name':     { 'type': 'string' },
      'scope':    { 'anyOf': [{ 'type': 'string' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
      'settings': SemanticRuleEntryEntity.Schema
    },
    'required': ['name', 'scope', 'settings'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
