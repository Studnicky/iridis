import type { ClockBindingOptionsInterfaceTypeEntity } from '../entities/ClockBindingOptionsInterfaceTypeEntity.ts';
import type { SignalBindingInterfaceTypeEntity } from '../entities/SignalBindingInterfaceTypeEntity.ts';
import type { ValueBindingOptionsInterfaceTypeEntity } from '../entities/ValueBindingOptionsInterfaceTypeEntity.ts';

export type SignalBindingInterfaceType = SignalBindingInterfaceTypeEntity.Type;

export type ClockBindingOptionsInterfaceType = ClockBindingOptionsInterfaceTypeEntity.Type;

type ValueBindingOptionsSchemaShapeType = ValueBindingOptionsInterfaceTypeEntity.Type;

/**
 * `clamp` is widened from an optional key to a required key holding
 * `boolean | undefined`, matching this codebase's `T | undefined` convention
 * for optional fields — `FromSchema` marks a non-`required` field optional
 * (`field?: T`), not present-but-`undefined`, and JSON Schema has no way to
 * express the latter, so the widening happens here at the consumption site
 * instead of inside the entity (where the lint-mandated `Type =
 * FromSchema<typeof Schema>` shape must stay verbatim).
 */
export type ValueBindingOptionsInterfaceType = { [K in keyof ValueBindingOptionsSchemaShapeType]-?: {} extends Pick<ValueBindingOptionsSchemaShapeType, K> ? ValueBindingOptionsSchemaShapeType[K] | undefined : ValueBindingOptionsSchemaShapeType[K] };
