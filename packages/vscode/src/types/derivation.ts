/**
 * Token-derivation parameters for VS Code semantic tokens.
 *
 * Domain: theming. Parameters describe HSL deltas applied to derive each
 * token type from its family root color. Data literals live in
 * `data/VscodeTokenData.ts`.
 */

import type { InferType } from '@studnicky/json-tology/types';

import type { DerivationParametersSchema } from '../DerivationParametersSchema.ts';
import type { DerivationParametersInterfaceTypeEntity } from '../entities/DerivationParametersInterfaceTypeEntity.ts';

type DerivationParametersSchemaShapeType = DerivationParametersInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity.
 */
export type DerivationParametersInterfaceType = {
  [K in keyof DerivationParametersSchemaShapeType]-?: {} extends Pick<DerivationParametersSchemaShapeType, K> ? DerivationParametersSchemaShapeType[K] | undefined : DerivationParametersSchemaShapeType[K];
};

export type DerivationParametersSchemaType = InferType<typeof DerivationParametersSchema>;
