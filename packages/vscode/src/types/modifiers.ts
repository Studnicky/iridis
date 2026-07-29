/**
 * VS Code semantic-token modifier transforms.
 *
 * Domain: theming. Transforms describe per-modifier deltas
 * (lightness/saturation/font-style) applied on top of a token's base color.
 * Data literals live in `data/modifierTransforms.ts`.
 */

import type { ModifierTransformInterfaceTypeEntity } from '../entities/ModifierTransformInterfaceTypeEntity.ts';

export type FontStyleType = 'bold' | 'bold italic' | 'italic' | 'strikethrough' | 'underline';

type ModifierTransformSchemaShapeType = ModifierTransformInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention.
 */
export type ModifierTransformInterfaceType = {
  [K in keyof ModifierTransformSchemaShapeType]-?: {} extends Pick<ModifierTransformSchemaShapeType, K> ? ModifierTransformSchemaShapeType[K] | undefined : ModifierTransformSchemaShapeType[K];
};
