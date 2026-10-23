import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Options controlling hue interpolation at the vector API boundary. */
export namespace LerpOptionsEntity {
  export const Schema = SchemaNode.defineObject(
    { '$id': 'urn:iridis-algebra:LerpOptionsEntity', 'type': 'object' },
    {
      'hueDirection': SchemaNode.defineEnum(
        { 'type': 'string' },
        ['clockwise', 'counterClockwise', 'shortestArc']
      )
    },
    [],
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  export type Type = NodeStaticType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema.schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema.schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema.schema);
}
