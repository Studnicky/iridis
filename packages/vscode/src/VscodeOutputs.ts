import type { JSONSchema7Type } from 'json-schema';

import { SemanticRuleEntryInterfaceTypeEntity } from './entities/SemanticRuleEntryInterfaceTypeEntity.ts';
import { VscodeOutputSlotInterfaceTypeEntity } from './entities/VscodeOutputSlotInterfaceTypeEntity.ts';

/** Typed read boundary for VS Code plugin outputs. */
export class VscodeOutputs {
  static semanticTokenRules(outputs: Record<string, JSONSchema7Type>): Map<string, SemanticRuleEntryInterfaceTypeEntity.Type> {
    const value = outputs['vscode:semanticTokenRules'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeOutputSlotInterfaceTypeEntity.intake({ 'semanticTokenRules': value });
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

  static workbenchColors(outputs: Record<string, JSONSchema7Type>): Map<string, string> {
    const value = outputs['vscode:workbenchColors'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = VscodeOutputSlotInterfaceTypeEntity.intake({ 'workbenchColors': value });
    const entries = Object.entries(normalized.workbenchColors ?? {});
    const result = new Map<string, string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry !== undefined) {
        const [name, color] = entry;
        result.set(name, color);
      }
    }
    return result;
  }
}
