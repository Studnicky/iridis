import type { PaletteStateInterface } from '@studnicky/iridis';

import type { SemanticRuleEntryEntity } from '../../../src/entities/SemanticRuleEntryEntity.ts';

import { ThemeJsonEntity } from '../../../src/entities/ThemeJsonEntity.ts';
import { VscodeMetaSlotEntity } from '../../../src/entities/VscodeMetaSlotEntity.ts';
import { VscodeOutputSlotEntity } from '../../../src/entities/VscodeOutputSlotEntity.ts';

/** Admits plugin-owned metadata and output slots for VS Code E2E assertions. */
export class VscodePluginState {
  static semanticMetadata(state: PaletteStateInterface): Record<string, SemanticRuleEntryEntity.Type> {
    const candidate = state.metadata['vscode:semanticTokenRules'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeMetaSlotEntity.intake({ 'semanticTokenRules': candidate });
    const result = admitted.semanticTokenRules ?? {};
    return result;
  }

  static semanticOutput(state: PaletteStateInterface): Record<string, SemanticRuleEntryEntity.Type> {
    const candidate = state.outputs['vscode:semanticTokenRules'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeOutputSlotEntity.intake({ 'semanticTokenRules': candidate });
    const result = admitted.semanticTokenRules ?? {};
    return result;
  }

  static requiredThemeJson(state: PaletteStateInterface): ThemeJsonEntity.Type {
    const result = VscodePluginState.themeJson(state);
    if (result === undefined) {
      throw new Error('VS Code theme JSON output is required for this scenario');
    }
    return result;
  }

  static themeJson(state: PaletteStateInterface): ThemeJsonEntity.Type | undefined {
    const candidate = state.outputs['vscode:themeJson'];
    if (candidate === undefined) {
      return undefined;
    }
    const result = ThemeJsonEntity.intake(candidate);
    return result;
  }

  static workbenchColors(state: PaletteStateInterface): Record<string, string> {
    const candidate = state.outputs['vscode:workbenchColors'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeOutputSlotEntity.intake({ 'workbenchColors': candidate });
    const result = admitted.workbenchColors ?? {};
    return result;
  }
}
