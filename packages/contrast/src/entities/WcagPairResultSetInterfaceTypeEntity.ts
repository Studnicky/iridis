import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { WcagPairResultInterfaceTypeEntity } from './WcagPairResultInterfaceTypeEntity.ts';

/** A WCAG 2.1 metadata slot: the full set of pair-enforcement results for one level (AA or AAA). */
export namespace WcagPairResultSetInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': WcagPairResultInterfaceTypeEntity.Schema, 'type': 'array' } },
    'required': ['pairs'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
