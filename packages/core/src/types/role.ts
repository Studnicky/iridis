import type { ContrastPairInterfaceTypeEntity } from '../entities/ContrastPairInterfaceTypeEntity.ts';
import type { RoleDefinitionInterfaceTypeEntity } from '../entities/RoleDefinitionInterfaceTypeEntity.ts';
import type { RequiredSchemaShapeType } from './RequiredSchemaShapeType.ts';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

type RoleDefinitionSchemaShapeType = RoleDefinitionInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim). `chromaRange`/`lightnessRange` are
 * additionally narrowed from `number[]` to the exact `[number, number]`
 * tuple JSON Schema's array `items` keyword cannot express.
 */
export type RoleDefinitionInterfaceType = RequiredSchemaShapeType<
  RoleDefinitionSchemaShapeType,
  {
    'chromaRange':    [number, number];
    'lightnessRange': [number, number];
  }
>;

type ContrastPairSchemaShapeType = ContrastPairInterfaceTypeEntity.Type;

/** Every optional schema field is widened from an optional key to a required key holding `T | undefined` (see {@link RoleDefinitionInterfaceType}). */
export type ContrastPairInterfaceType = RequiredSchemaShapeType<ContrastPairSchemaShapeType>;

export type RoleSchemaInterfaceType = {
  'contrastPairs': ContrastPairInterfaceType[] | undefined;
  'description':   string | undefined;
  'name':          string;
  'roles':         RoleDefinitionInterfaceType[];
};
