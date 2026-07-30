import type { JsonObjectType } from '@studnicky/types';

import type { EngineMetadataInterfaceTypeEntity } from '../entities/EngineMetadataInterfaceTypeEntity.ts';
import type { HueTargetOverrideInterfaceTypeEntity } from '../entities/HueTargetOverrideInterfaceTypeEntity.ts';
import type { RoleClampInterfaceTypeEntity } from '../entities/RoleClampInterfaceTypeEntity.ts';

/** One clamp record written by `resolve:roles` when a seed color is nudged into a role's declared ranges. */
export type RoleClampInterfaceType = RoleClampInterfaceTypeEntity.Type;

/** `metadata['core:roleClamps']`: per-role clamp record, keyed by role name. */
export type RoleClampMapInterfaceType = Record<string, RoleClampInterfaceType>;

/** `metadata['core:roleDistances']`: per-role OKLCH distance to each candidate color's hex, keyed by role name. */
export type RoleDistanceMapInterfaceType = Record<string, Record<string, number>>;

/**
 * `metadata['core:hueOffsetOverrides']`: per-role `hueOffset` override,
 * keyed by role name, consulted by `expand:family` in place of the
 * schema's own `hueOffset` for that role. `state.input` stays immutable —
 * any task (site-specific or otherwise) that needs to compute a role's
 * derivation hue writes here instead of mutating the schema, keeping the
 * override visible to and produced by the registered pipeline rather than
 * pre-processing the schema outside it.
 */
export type HueOffsetOverrideMapInterfaceType = Record<string, number>;

type HueTargetOverrideSchemaShapeType = HueTargetOverrideInterfaceTypeEntity.Type;

/**
 * One role's absolute-hue-target override — see `core:hueTargetOverrides`.
 * `hueClamp` is widened from an optional key to a required key holding
 * `T | undefined`, matching this codebase's monomorphic-shape convention —
 * `FromSchema` marks a non-`required` field optional (`field?: T`), not
 * present-but-`undefined`, and JSON Schema has no way to express the
 * latter, so the widening happens here at the consumption site instead of
 * inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim).
 */
export type HueTargetOverrideInterfaceType = { [K in keyof HueTargetOverrideSchemaShapeType]-?: {} extends Pick<HueTargetOverrideSchemaShapeType, K> ? HueTargetOverrideSchemaShapeType[K] | undefined : HueTargetOverrideSchemaShapeType[K] };

/**
 * `metadata['core:hueTargetOverrides']`: per-role absolute `hue`/`hueClamp`
 * override, keyed by role name, consulted by both `resolve:roles` (for a
 * directly-resolved role) and `expand:family` (for a derived role) in place
 * of the schema's own `hue`/`hueClamp` for that role. Same rationale as
 * `core:hueOffsetOverrides` — a task computes it, `state.input` stays
 * immutable.
 */
export type HueTargetOverrideMapInterfaceType = Record<string, HueTargetOverrideInterfaceType>;

type EngineMetadataSchemaShapeType = EngineMetadataInterfaceTypeEntity.Type;

/**
 * Known `state.metadata` keys written by core tasks, and their runtime
 * shapes. Every field is widened from an optional key to a required key
 * holding `T | undefined` (see {@link HueTargetOverrideInterfaceType}).
 * `core:hueTargetOverrides` is additionally pinned to a map of
 * {@link HueTargetOverrideInterfaceType} — nesting another entity's
 * `Schema` object literal makes `FromSchema` re-derive that nested shape
 * from scratch, losing its own optional-field widening.
 */
export type EngineMetadataInterfaceType = {
  [K in keyof EngineMetadataSchemaShapeType]-?: K extends 'core:hueTargetOverrides'
    ? Record<string, HueTargetOverrideInterfaceType> | undefined
    : {} extends Pick<EngineMetadataSchemaShapeType, K> ? EngineMetadataSchemaShapeType[K] | undefined : EngineMetadataSchemaShapeType[K];
};

/** Type-safe accessor for a known `state.metadata` key, returning `undefined` when unset. */
export class EngineMetadata {
  static get<K extends keyof EngineMetadataInterfaceType>(
    metadata: JsonObjectType,
    key: K
  ): EngineMetadataInterfaceType[K] {
    const result = metadata[key] as EngineMetadataInterfaceType[K];
    return result;
  }
}
