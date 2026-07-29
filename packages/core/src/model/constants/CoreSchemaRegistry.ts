import type { SchemaInterfaceType } from '../../types/index.ts';

import { ColorRecordSchema }  from '../ColorRecordSchema.ts';
import { InputSchema }        from '../InputSchema.ts';
import { PaletteStateSchema } from '../PaletteStateSchema.ts';
import { PluginSchema }       from '../PluginSchema.ts';
import { RoleSchemaSchema }   from '../RoleSchemaSchema.ts';
import { TaskManifestSchema } from '../TaskManifestSchema.ts';

/**
 * The six core schemas shared by every `Validator` instance, and an
 * `$id`-keyed index over them used to resolve `$ref`s while walking a
 * validation-error path back to its subschema node.
 */
export const CORE_SCHEMAS = [
  ColorRecordSchema,
  InputSchema,
  PaletteStateSchema,
  PluginSchema,
  RoleSchemaSchema,
  TaskManifestSchema
] as const;

export const CORE_ID_INDEX = new Map<string, SchemaInterfaceType>(
  CORE_SCHEMAS.map((schema) => { return [schema.$id, schema]; })
);
