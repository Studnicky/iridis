/**
 * Schema-derived TypeScript types.
 *
 * Each type is derived from its canonical JSON Schema via `FromSchema<typeof Schema>`.
 * The schema is the single source of truth; these types are compile-time projections.
 *
 * Where the handwritten interfaces carry `readonly` constraints for V8 hidden-class
 * stability, the schema-derived types serve as the validation shape contract.
 * Consumers can use either; the schema validates at runtime.
 */

import type { FromSchema } from 'json-schema-to-ts';
import { ColorRecordSchema }  from '../model/ColorRecordSchema.ts';
import { InputSchema }        from '../model/InputSchema.ts';
import { PaletteStateSchema } from '../model/PaletteStateSchema.ts';
import { PluginSchema }       from '../model/PluginSchema.ts';
import { RoleSchemaSchema }   from '../model/RoleSchemaSchema.ts';
import { TaskManifestSchema } from '../model/TaskManifestSchema.ts';

/** Schema-derived type for a color record (validation shape). */
export type ColorRecordSchemaType    = FromSchema<typeof ColorRecordSchema>;

/** Schema-derived type for engine run input. */
export type InputSchemaType          = FromSchema<typeof InputSchema>;

/** Schema-derived type for palette pipeline state. */
export type PaletteStateSchemaType   = FromSchema<typeof PaletteStateSchema>;

/** Schema-derived type for plugin descriptor. */
export type PluginSchemaType         = FromSchema<typeof PluginSchema>;

/** Schema-derived type for role schema descriptor. */
export type RoleSchemaSchemaType     = FromSchema<typeof RoleSchemaSchema>;

/** Schema-derived type for task manifest. */
export type TaskManifestSchemaType   = FromSchema<typeof TaskManifestSchema>;
