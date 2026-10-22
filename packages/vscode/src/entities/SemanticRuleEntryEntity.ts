import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** A single VS Code semantic token rule: `{ fontStyle?, foreground? }`. */
export namespace SemanticRuleEntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'fontStyle':  { 'type': 'string' },
      'foreground': { 'type': 'string' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
