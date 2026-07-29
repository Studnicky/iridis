import type { DeepReadonlyType, JsonSchemaObjectType } from '@studnicky/types';

import type { ValidationErrorInterfaceTypeEntity } from '../entities/ValidationErrorInterfaceTypeEntity.ts';

/**
 * A JSON Schema object acceptable to {@link import('../model/Validator.ts').Validator}.
 */
export type SchemaInterfaceType = DeepReadonlyType<JsonSchemaObjectType>;

export type ValidationErrorInterfaceType = ValidationErrorInterfaceTypeEntity.Type;

export type ValidationResultInterfaceType = {
  'errors': ValidationErrorInterfaceType[];
  'valid':  boolean;
};
