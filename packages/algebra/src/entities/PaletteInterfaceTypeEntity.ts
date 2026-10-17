import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { OklchInterfaceTypeEntity } from './OklchInterfaceTypeEntity.ts';

/** A palette maps role names to canonical OKLCH coordinates. */
export namespace PaletteInterfaceTypeEntity {
  export const Schema = SchemaNode.defineObject(
    { '$id': 'urn:iridis-algebra:PaletteInterfaceType', 'type': 'object' },
    {},
    [],
    { 'additionalProperties': OklchInterfaceTypeEntity.Schema, 'patternProperties': {} }
  );

  export type Type = NodeStaticType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema.schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema.schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema.schema);
}
