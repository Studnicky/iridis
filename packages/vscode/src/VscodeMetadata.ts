import type { JSONSchema7Type } from 'json-schema';

import { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';

import { SemanticRuleEntryInterfaceTypeEntity } from './entities/SemanticRuleEntryInterfaceTypeEntity.ts';
import { VscodeMetaSlotInterfaceTypeEntity } from './entities/VscodeMetaSlotInterfaceTypeEntity.ts';

export class VscodeMetadata {
  static baseTokens(metadata: Record<string, JSONSchema7Type>): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const value = metadata['vscode:baseTokens'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeMetaSlotInterfaceTypeEntity.intake({ 'baseTokens': value });
    const entries = Object.entries(normalized.baseTokens ?? {});
    const result = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [name, candidate] = entry;
        result.set(name, ColorRecordInterfaceTypeEntity.intake(candidate));
      }
    }
    return result;
  }
  static semanticTokenRules(metadata: Record<string, JSONSchema7Type>): Map<string, SemanticRuleEntryInterfaceTypeEntity.Type> {
    const value = metadata['vscode:semanticTokenRules'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeMetaSlotInterfaceTypeEntity.intake({ 'semanticTokenRules': value });
    const entries = Object.entries(normalized.semanticTokenRules ?? {});
    const result = new Map<string, SemanticRuleEntryInterfaceTypeEntity.Type>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [selector, candidate] = entry;
        result.set(selector, SemanticRuleEntryInterfaceTypeEntity.intake(candidate));
      }
    }
    return result;
  }
}
