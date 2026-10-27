import type {
  PluginInterface,
  PluginSchemaContributionInterfaceEntity,
  TaskInterface
} from '@studnicky/iridis';

import { emitVscodeSemanticRules } from './tasks/EmitVscodeSemanticRules.ts';
import { emitVscodeThemeJson } from './tasks/EmitVscodeThemeJson.ts';
import { seedVscodeRoles } from './tasks/SeedVscodeRoles.ts';

const VSCODE_PLUGIN_SCHEMAS = {
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
 * Registers the canonical role-seeding and role-projection tasks for VS Code themes.
 */
class VscodePlugin implements PluginInterface {
  readonly 'name'    = 'vscode';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [seedVscodeRoles, emitVscodeSemanticRules, emitVscodeThemeJson];
  }

  schemas(): PluginSchemaContributionInterfaceEntity.Type {
    return {
      'outputs': {
        'vscode:semanticTokenRules': VSCODE_PLUGIN_SCHEMAS.semanticTokenRules,
        'vscode:themeJson':          VSCODE_PLUGIN_SCHEMAS.themeJson,
        'vscode:workbenchColors':    VSCODE_PLUGIN_SCHEMAS.workbenchColors
      }
    };
  }
}

export const vscodePlugin = new VscodePlugin();
