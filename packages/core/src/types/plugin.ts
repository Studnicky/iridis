import type { DeepReadonlyType, JsonSchemaObjectType } from '@studnicky/types';

import type { PluginSchemaContributionInterfaceEntity } from '../entities/PluginSchemaContributionInterfaceEntity.ts';
import type { RequiredSchemaShapeType } from './RequiredSchemaShapeType.ts';

/** A JSON Schema object contributed by a plugin for output/metadata slot validation. */
export type JSONSchemaType = DeepReadonlyType<JsonSchemaObjectType>;

type PluginSchemaContributionSchemaShapeType = PluginSchemaContributionInterfaceEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim). `metadata`/`outputs` are additionally
 * narrowed to a map of JSON Schema objects — the open-ended shape JSON
 * Schema's bare `'type': 'object'` cannot express — since each slot holds
 * a full JSON Schema contributed by a plugin.
 */
export type PluginSchemaContributionInterfaceType = RequiredSchemaShapeType<
  PluginSchemaContributionSchemaShapeType,
  {
    'metadata': Record<string, JSONSchemaType>;
    'outputs':  Record<string, JSONSchemaType>;
  }
>;
