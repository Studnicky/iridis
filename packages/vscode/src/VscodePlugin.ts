import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { applyModifiers }          from './tasks/ApplyModifiers.ts';
import { emitVscodeSemanticRules } from './tasks/EmitVscodeSemanticRules.ts';
import { emitVscodeThemeJson }     from './tasks/EmitVscodeThemeJson.ts';
import { emitVscodeUiPalette }     from './tasks/EmitVscodeUiPalette.ts';
import { expandTokens }            from './tasks/ExpandTokens.ts';

const semanticRuleEntrySchema = {
  'additionalProperties': false,
  'properties': {
    'fontStyle':  { 'type': 'string' },
    'foreground': { 'type': 'string' }
  },
  'type': 'object'
} as const;

const vscodeWorkbenchColorsSchema = {
  'additionalProperties': { 'type': 'string' },
  'type':                 'object'
} as const;

const vscodeSemanticTokenRulesSchema = {
  'additionalProperties': semanticRuleEntrySchema,
  'type':                 'object'
} as const;

const vscodeThemeJsonSchema = {
  'additionalProperties': true,
  'type':                 'object'
} as const;

const vscodeBaseTokensSchema = {
  'additionalProperties': true,
  'type':                 'object'
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

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': {
        'vscode:baseTokens':         vscodeBaseTokensSchema,
        'vscode:semanticTokenRules': vscodeSemanticTokenRulesSchema
      },
      'outputs': {
        'vscode:semanticTokenRules': vscodeSemanticTokenRulesSchema,
        'vscode:themeJson':          vscodeThemeJsonSchema,
        'vscode:workbenchColors':    vscodeWorkbenchColorsSchema
      }
    };
  }
}

export const vscodePlugin = new VscodePlugin();
