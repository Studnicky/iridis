import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { applyModifiers }          from './tasks/ApplyModifiers.ts';
import { emitVscodeSemanticRules } from './tasks/EmitVscodeSemanticRules.ts';
import { emitVscodeThemeJson }     from './tasks/EmitVscodeThemeJson.ts';
import { emitVscodeUiPalette }     from './tasks/EmitVscodeUiPalette.ts';
import { expandTokens }            from './tasks/ExpandTokens.ts';

const semanticRuleEntrySchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'foreground': { 'type': 'string' },
    'fontStyle':  { 'type': 'string' },
  },
} as const;

const vscodeOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'workbenchColors': {
      'type':                 'object',
      'additionalProperties': { 'type': 'string' },
    },
    'semanticTokenRules': {
      'type':                 'object',
      'additionalProperties': semanticRuleEntrySchema,
    },
    'themeJson': {
      'type': 'object',
      'additionalProperties': true,
    },
  },
} as const;

const vscodeMetadataSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'baseTokens': {
      'type':                 'object',
      'additionalProperties': true,
    },
    'semanticTokenRules': {
      'type':                 'object',
      'additionalProperties': semanticRuleEntrySchema,
    },
  },
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
export class VscodePlugin implements PluginInterface {
  readonly 'name'    = 'vscode';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      expandTokens,
      applyModifiers,
      emitVscodeSemanticRules,
      emitVscodeUiPalette,
      emitVscodeThemeJson,
    ];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs':  { 'vscode': vscodeOutputSchema },
      'metadata': { 'vscode': vscodeMetadataSchema },
    };
  }
}

export const vscodePlugin = new VscodePlugin();
