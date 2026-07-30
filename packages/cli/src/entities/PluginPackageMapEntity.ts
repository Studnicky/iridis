import type { FromSchema, JsonValueType } from '@studnicky/types';

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

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
