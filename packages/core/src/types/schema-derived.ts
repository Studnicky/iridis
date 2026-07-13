/**
 * Schema-derived TypeScript types.
 *
 * Each type is derived from its canonical JSON Schema via `InferType<typeof Schema>`.
 * The schema is the single source of truth; these types are compile-time projections.
 *
 * Where the handwritten interfaces carry `readonly` constraints for V8 hidden-class
 * stability, the schema-derived types serve as the validation shape contract.
 * Consumers can use either; the schema validates at runtime.
 */

import type { InferType } from '@studnicky/json-tology/types';

import type { ColorRecordSchema }  from '../model/ColorRecordSchema.ts';
import type { InputSchema }        from '../model/InputSchema.ts';
import type { PaletteStateSchema } from '../model/PaletteStateSchema.ts';
import type { PluginSchema }       from '../model/PluginSchema.ts';
import type { RoleSchemaSchema }   from '../model/RoleSchemaSchema.ts';
import type { TaskManifestSchema } from '../model/TaskManifestSchema.ts';

/** Schema-derived type for a color record (validation shape). */
export type ColorRecordSchemaType    = InferType<typeof ColorRecordSchema>;

/** Schema-derived type for engine run input. */
export type InputSchemaType          = InferType<typeof InputSchema>;

/** Schema-derived type for palette pipeline state. */
export type PaletteStateSchemaType   = InferType<typeof PaletteStateSchema>;

/** Schema-derived type for plugin descriptor. */
export type PluginSchemaType         = InferType<typeof PluginSchema>;

/** Schema-derived type for role schema descriptor. */
export type RoleSchemaSchemaType     = InferType<typeof RoleSchemaSchema>;

/** Schema-derived type for task manifest. */
export type TaskManifestSchemaType   = InferType<typeof TaskManifestSchema>;
