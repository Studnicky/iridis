import type { VariantConfigInterfaceTypeEntity } from '../entities/VariantConfigInterfaceTypeEntity.ts';

type VariantConfigSchemaShapeType = VariantConfigInterfaceTypeEntity.Type;

/**
 * Shape of a single variant configuration entry (read by derive:variant).
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim).
 */
export type VariantConfigInterfaceType = { [K in keyof VariantConfigSchemaShapeType]-?: {} extends Pick<VariantConfigSchemaShapeType, K> ? VariantConfigSchemaShapeType[K] | undefined : VariantConfigSchemaShapeType[K] };
