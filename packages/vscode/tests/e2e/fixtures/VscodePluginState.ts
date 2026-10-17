import type { PaletteStateInterface } from '@studnicky/iridis';

import type { SemanticRuleEntryInterfaceTypeEntity } from '../../../src/entities/SemanticRuleEntryInterfaceTypeEntity.ts';

import { ThemeJsonInterfaceTypeEntity } from '../../../src/entities/ThemeJsonInterfaceTypeEntity.ts';
import { VscodeMetaSlotInterfaceTypeEntity } from '../../../src/entities/VscodeMetaSlotInterfaceTypeEntity.ts';
import { VscodeOutputSlotInterfaceTypeEntity } from '../../../src/entities/VscodeOutputSlotInterfaceTypeEntity.ts';

/** Admits plugin-owned metadata and output slots for VS Code E2E assertions. */
export class VscodePluginState {
  static semanticMetadata(state: PaletteStateInterface): Record<string, SemanticRuleEntryInterfaceTypeEntity.Type> {
    const candidate = state.metadata['vscode:semanticTokenRules'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeMetaSlotInterfaceTypeEntity.intake({ 'semanticTokenRules': candidate });
    const result = admitted.semanticTokenRules ?? {};
    return result;
  }

  static semanticOutput(state: PaletteStateInterface): Record<string, SemanticRuleEntryInterfaceTypeEntity.Type> {
    const candidate = state.outputs['vscode:semanticTokenRules'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeOutputSlotInterfaceTypeEntity.intake({ 'semanticTokenRules': candidate });
    const result = admitted.semanticTokenRules ?? {};
    return result;
  }

  static requiredThemeJson(state: PaletteStateInterface): ThemeJsonInterfaceTypeEntity.Type {
    const result = VscodePluginState.themeJson(state);
    if (result === undefined) {
      throw new Error('VS Code theme JSON output is required for this scenario');
    }
    return result;
  }

  static themeJson(state: PaletteStateInterface): ThemeJsonInterfaceTypeEntity.Type | undefined {
    const candidate = state.outputs['vscode:themeJson'];
    if (candidate === undefined) {
      return undefined;
    }
    const result = ThemeJsonInterfaceTypeEntity.intake(candidate);
    return result;
  }

  static workbenchColors(state: PaletteStateInterface): Record<string, string> {
    const candidate = state.outputs['vscode:workbenchColors'];
    if (candidate === undefined) {
      return {};
    }
    const admitted = VscodeOutputSlotInterfaceTypeEntity.intake({ 'workbenchColors': candidate });
    const result = admitted.workbenchColors ?? {};
    return result;
  }
}
