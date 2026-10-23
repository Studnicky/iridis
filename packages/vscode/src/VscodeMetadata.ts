import type { JSONSchema7Type } from 'json-schema';

import { ColorRecordEntity } from '@studnicky/iridis';

import { SemanticRuleEntryEntity } from './entities/SemanticRuleEntryEntity.ts';
import { VscodeMetaSlotEntity } from './entities/VscodeMetaSlotEntity.ts';

export class VscodeMetadata {
  static baseTokens(metadata: Record<string, JSONSchema7Type>): Map<string, ColorRecordEntity.Type> {
    const value = metadata['vscode:baseTokens'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeMetaSlotEntity.intake({ 'baseTokens': value });
    const entries = Object.entries(normalized.baseTokens ?? {});
    const result = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [name, candidate] = entry;
        result.set(name, ColorRecordEntity.intake(candidate));
      }
    }
    return result;
  }
  static semanticTokenRules(metadata: Record<string, JSONSchema7Type>): Map<string, SemanticRuleEntryEntity.Type> {
    const value = metadata['vscode:semanticTokenRules'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeMetaSlotEntity.intake({ 'semanticTokenRules': value });
    const entries = Object.entries(normalized.semanticTokenRules ?? {});
    const result = new Map<string, SemanticRuleEntryEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [selector, candidate] = entry;
        result.set(selector, SemanticRuleEntryEntity.intake(candidate));
      }
    }
    return result;
  }
}
