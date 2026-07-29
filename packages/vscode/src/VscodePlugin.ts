import type {
  PluginInterface,
  PluginSchemaContributionInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { applyModifiers }          from './tasks/ApplyModifiers.ts';
import { emitVscodeSemanticRules } from './tasks/EmitVscodeSemanticRules.ts';
import { emitVscodeThemeJson }     from './tasks/EmitVscodeThemeJson.ts';
import { emitVscodeUiPalette }     from './tasks/EmitVscodeUiPalette.ts';
import { expandTokens }            from './tasks/ExpandTokens.ts';

const VSCODE_PLUGIN_SCHEMAS = {
  'baseTokens': {
    'additionalProperties': true,
    'type':                 'object'
  },
  'semanticTokenRules': {
    'additionalProperties': {
      'additionalProperties': false,
      'properties': {
        'fontStyle':  { 'type': 'string' },
        'foreground': { 'type': 'string' }
      },
      'type': 'object'
    },
    'type': 'object'
  },
  'themeJson': {
    'additionalProperties': true,
    'type':                 'object'
  },
  'workbenchColors': {
    'additionalProperties': { 'type': 'string' },
    'type':                 'object'
  }
} as const;

/**
 * VscodePlugin
 *
 * Registers five tasks that produce a complete VS Code theme from a
 * 16-role palette resolved by the engine's core intake/role tasks.
 *
 * Pipeline dependency order:
 *   vscode:expandTokens
 *   → vscode:applyModifiers
 *   → emit:vscodeSemanticRules  (parallel with emit:vscodeUiPalette)
 *   → emit:vscodeUiPalette      (parallel with emit:vscodeSemanticRules)
 *   → emit:vscodeThemeJson
 */
class VscodePlugin implements PluginInterface {
  readonly 'name'    = 'vscode';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      expandTokens,
      applyModifiers,
      emitVscodeSemanticRules,
      emitVscodeUiPalette,
      emitVscodeThemeJson
    ];
  }

  schemas(): PluginSchemaContributionInterfaceType {
    return {
      'metadata': {
        'vscode:baseTokens':         VSCODE_PLUGIN_SCHEMAS.baseTokens,
        'vscode:semanticTokenRules': VSCODE_PLUGIN_SCHEMAS.semanticTokenRules
      },
      'outputs': {
        'vscode:semanticTokenRules': VSCODE_PLUGIN_SCHEMAS.semanticTokenRules,
        'vscode:themeJson':          VSCODE_PLUGIN_SCHEMAS.themeJson,
        'vscode:workbenchColors':    VSCODE_PLUGIN_SCHEMAS.workbenchColors
      }
    };
  }
}

export const vscodePlugin = new VscodePlugin();
