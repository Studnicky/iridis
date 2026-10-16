import type { ContrastPairInterfaceTypeEntity } from '../entities/ContrastPairInterfaceTypeEntity.ts';
import type { RoleDefinitionInterfaceTypeEntity } from '../entities/RoleDefinitionInterfaceTypeEntity.ts';
import type { RequiredSchemaShapeType } from './RequiredSchemaShapeType.ts';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

type RoleDefinitionSchemaShapeType = RoleDefinitionInterfaceTypeEntity.Type;
/** Schema-backed role shape with exact contrast-range tuples and optional adjustment controls. */
export type RoleDefinitionInterfaceType = RequiredSchemaShapeType<
  RoleDefinitionSchemaShapeType,
  {
    'chromaRange':    [number, number];
    'lightnessRange': [number, number];
  },
  'chromaScale' | 'lightnessOffset'
>;

type ContrastPairSchemaShapeType = ContrastPairInterfaceTypeEntity.Type;

/** Schema-backed contrast pair with an optional upper contrast bound. */
export type ContrastPairInterfaceType = RequiredSchemaShapeType<
  ContrastPairSchemaShapeType,
  never,
  'maxRatio'
>;

export type RoleSchemaInterfaceType = {
  'contrastPairs': ContrastPairInterfaceType[] | undefined;
  'description':   string | undefined;
  'name':          string;
  'roles':         RoleDefinitionInterfaceType[];
};
