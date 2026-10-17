import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** OKLCH color: lightness, chroma, hue. */
export namespace OklchInterfaceTypeEntity {
  export const Schema = SchemaNode.defineObject(
    { '$id': 'urn:iridis-algebra:OklchInterfaceType', 'type': 'object' },
    {
      'c': SchemaNode.defineNumber({ 'type': 'number' }),
      'h': SchemaNode.defineNumber({ 'type': 'number' }),
      'l': SchemaNode.defineNumber({ 'type': 'number' })
    },
    ['c', 'h', 'l'],
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  export type Type = NodeStaticType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema.schema);

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema.schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema.schema);
}
