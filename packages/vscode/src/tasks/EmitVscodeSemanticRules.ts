import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { SemanticRuleEntryInterfaceType } from '../types/augmentation.ts';

import { FONT_STYLES } from '../data/fontStyles.ts';
import { SCOPE_MAPPINGS } from '../data/scopeMappings.ts';

function defaultFontStyle(selector: string): string | undefined {
  // selector may be 'variable' or 'variable.readonly'
  const baseType = selector.includes('.') ? selector.split('.')[0] : selector;
  return baseType !== undefined && baseType.length > 0 ? (FONT_STYLES[baseType] ?? undefined) : undefined;
}

class EmitVscodeSemanticRules implements TaskInterface {
  readonly 'name' = 'emit:vscodeSemanticRules';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Shapes the semantic token rule map for VS Code editor.semanticTokenColorCustomizations.rules using SCOPE_MAPPINGS and FONT_STYLES.',
    'name':        'emit:vscodeSemanticRules',
    'reads':       ['metadata.vscode:semanticTokenRules', 'metadata.vscode:baseTokens'],
    'requires':    ['vscode:applyModifiers'],
    'writes':      ['outputs.vscode:semanticTokenRules']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const semanticRules = (state.metadata['vscode:semanticTokenRules'] ?? {}) as Record<string, SemanticRuleEntryInterfaceType>;
    const result: Record<string, SemanticRuleEntryInterfaceType> = {};

    for (const [selector, rule] of Object.entries(semanticRules)) {
      const entry: SemanticRuleEntryInterfaceType = {};
      if (rule.foreground !== undefined && rule.foreground.length > 0) {
        entry.foreground = rule.foreground;
      }
      // Apply font style: modifier transform style takes precedence,
      // then fall back to FONT_STYLES for the base token type part of the selector.
      const fontStyle = rule.fontStyle ?? defaultFontStyle(selector);
      if (fontStyle !== undefined && fontStyle.length > 0) {
        entry.fontStyle = fontStyle;
      }
      result[selector] = entry;
    }

    state.outputs['vscode:semanticTokenRules'] = result;
    ctx.logger.debug(
      LogBody.create()
        .component('EmitVscodeSemanticRules')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Emitted semantic token rules')
        .context({ 'count': Object.keys(result).length })
        .build()
    );

    // Validate scope coverage: log any SCOPE_MAPPINGS keys with no colour
    const baseTokens = (state.metadata['vscode:baseTokens'] ?? {}) as Record<string, ColorRecordInterfaceType>;
    for (const key of Object.keys(SCOPE_MAPPINGS)) {
      if (!(key in baseTokens) && !(key in result)) {
        ctx.logger.debug(
          LogBody.create()
            .component('EmitVscodeSemanticRules')
            .operation('run')
            .status(LOG_STATUS.SKIPPED)
            .message('No colour assigned for scope group')
            .context({ 'scope': key })
            .build()
        );
      }
    }
  }
}

export const emitVscodeSemanticRules = new EmitVscodeSemanticRules();
