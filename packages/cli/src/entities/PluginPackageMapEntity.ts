import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/**
 * A complete mapping from every {@link FlagKeyEntity.Type} flag to a string —
 * a package name (`PLUGIN_PACKAGES`) or an export name (`PLUGIN_EXPORT_NAMES`),
 * both declared in `constants/PluginPackages.ts`.
 */
export namespace PluginPackageMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enableCapacitor':  { 'type': 'string' },
      'enableContrast':   { 'type': 'string' },
      'enableImage':      { 'type': 'string' },
      'enableRdf':        { 'type': 'string' },
      'enableStylesheet': { 'type': 'string' },
      'enableTailwind':   { 'type': 'string' },
      'enableVscode':     { 'type': 'string' }
    },
    'required': [
      'enableCapacitor',
      'enableContrast',
      'enableImage',
      'enableRdf',
      'enableStylesheet',
      'enableTailwind',
      'enableVscode'
    ],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
