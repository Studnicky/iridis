import type { TaskManifestInterfaceTypeEntity } from '../entities/TaskManifestInterfaceTypeEntity.ts';
import type { RequiredSchemaShapeType } from './RequiredSchemaShapeType.ts';

export type LifecyclePhaseType = 'onRunStart' | 'onRunEnd';

type TaskManifestSchemaShapeType = TaskManifestInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim).
 */
export type TaskManifestInterfaceType = RequiredSchemaShapeType<TaskManifestSchemaShapeType>;
