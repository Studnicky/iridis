import type { LerpOptionsInterfaceTypeEntity } from '../entities/LerpOptionsInterfaceTypeEntity.ts';
import type { OklchInterfaceTypeEntity } from '../entities/OklchInterfaceTypeEntity.ts';

export type OklchInterfaceType = OklchInterfaceTypeEntity.Type;

/** A palette is a point in OKLCH×N space: role name → OKLCH triple. */
export type PaletteInterfaceType = Record<string, OklchInterfaceType>;

export type HueDirectionType = 'clockwise' | 'counterClockwise' | 'shortestArc';

type LerpOptionsSchemaShapeType = LerpOptionsInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim).
 */
export type LerpOptionsInterfaceType = { [K in keyof LerpOptionsSchemaShapeType]-?: {} extends Pick<LerpOptionsSchemaShapeType, K> ? LerpOptionsSchemaShapeType[K] | undefined : LerpOptionsSchemaShapeType[K] };

export type PaletteDistanceMetricType = (
  a: PaletteInterfaceType,
  b: PaletteInterfaceType
) => number;
