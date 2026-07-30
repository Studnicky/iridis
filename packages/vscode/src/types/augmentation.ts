// VSCode plugin type definitions.
// Module augmentation on PluginOutputsRegistry / PluginMetadataRegistry
// has been replaced with explicit schema contribution via VscodePlugin.schemas().

import type { ColorRecordInterfaceType } from '@studnicky/iridis';

import type { SemanticRuleEntryInterfaceTypeEntity } from '../entities/SemanticRuleEntryInterfaceTypeEntity.ts';
import type { ThemeJsonInterfaceTypeEntity } from '../entities/ThemeJsonInterfaceTypeEntity.ts';
import type { TokenColorRuleInterfaceTypeEntity } from '../entities/TokenColorRuleInterfaceTypeEntity.ts';
import type { VscodeMetaSlotInterfaceTypeEntity } from '../entities/VscodeMetaSlotInterfaceTypeEntity.ts';
import type { VscodeOutputSlotInterfaceTypeEntity } from '../entities/VscodeOutputSlotInterfaceTypeEntity.ts';

type SemanticRuleEntrySchemaShapeType = SemanticRuleEntryInterfaceTypeEntity.Type;

/**
 * Every optional schema field is widened from an optional key to a required
 * key holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention.
 */
export type SemanticRuleEntryInterfaceType = {
  [K in keyof SemanticRuleEntrySchemaShapeType]-?: {} extends Pick<SemanticRuleEntrySchemaShapeType, K> ? SemanticRuleEntrySchemaShapeType[K] | undefined : SemanticRuleEntrySchemaShapeType[K];
};

type TokenColorRuleSchemaShapeType = TokenColorRuleInterfaceTypeEntity.Type;

/**
 * `settings` is pinned to {@link SemanticRuleEntryInterfaceType} — nesting
 * another entity's `Schema` object literal makes `FromSchema` re-derive that
 * nested shape from scratch, losing the nested entity's own optional-field
 * widening.
 */
export type TokenColorRuleInterfaceType = {
  [K in keyof TokenColorRuleSchemaShapeType]-?: K extends 'settings'
    ? SemanticRuleEntryInterfaceType
    : {} extends Pick<TokenColorRuleSchemaShapeType, K> ? TokenColorRuleSchemaShapeType[K] | undefined : TokenColorRuleSchemaShapeType[K];
};

type ThemeJsonSchemaShapeType = ThemeJsonInterfaceTypeEntity.Type;

export type ThemeJsonInterfaceType = {
  [K in keyof ThemeJsonSchemaShapeType]-?: K extends 'semanticTokenColors'
    ? Record<string, string | SemanticRuleEntryInterfaceType>
    : K extends 'tokenColors'
      ? TokenColorRuleInterfaceType[]
      : ThemeJsonSchemaShapeType[K];
};

type VscodeOutputSlotSchemaShapeType = VscodeOutputSlotInterfaceTypeEntity.Type;

export type VscodeOutputSlotInterfaceType = {
  [K in keyof VscodeOutputSlotSchemaShapeType]-?: K extends 'semanticTokenRules'
    ? Record<string, SemanticRuleEntryInterfaceType> | undefined
    : K extends 'themeJson'
      ? ThemeJsonInterfaceType | undefined
      : K extends 'workbenchColors'
        ? Record<string, string> | undefined
        : VscodeOutputSlotSchemaShapeType[K];
};

type VscodeMetaSlotSchemaShapeType = VscodeMetaSlotInterfaceTypeEntity.Type;

export type VscodeMetaSlotInterfaceType = {
  [K in keyof VscodeMetaSlotSchemaShapeType]-?: K extends 'baseTokens'
    ? Record<string, ColorRecordInterfaceType> | undefined
    : K extends 'semanticTokenRules'
      ? Record<string, SemanticRuleEntryInterfaceType> | undefined
      : VscodeMetaSlotSchemaShapeType[K];
};
