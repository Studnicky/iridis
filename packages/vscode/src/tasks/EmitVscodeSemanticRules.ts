import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import type { SemanticRuleEntryInterface } from '../types/augmentation.ts';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { SCOPE_MAPPINGS } from '../data/scopeMappings.ts';

function defaultFontStyle(selector: string): string | undefined {
  // selector may be 'variable' or 'variable.readonly'
  const baseType = selector.includes('.') ? selector.split('.')[0] : selector;
  return baseType ? (FONT_STYLES[baseType] ?? undefined) : undefined;
}

export class EmitVscodeSemanticRules implements TaskInterface {
  readonly 'name' = 'emit:vscodeSemanticRules';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:vscodeSemanticRules',
    'reads':       ['metadata.vscode:semanticTokenRules', 'metadata.vscode:baseTokens'],
    'writes':      ['outputs.vscode:semanticTokenRules'],
    'requires':    ['vscode:applyModifiers'],
    'description': 'Shapes the semantic token rule map for VS Code editor.semanticTokenColorCustomizations.rules using SCOPE_MAPPINGS and FONT_STYLES.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const semanticRules = (state.metadata['vscode:semanticTokenRules'] ?? {}) as Record<string, SemanticRuleEntryInterface>;
    const result: Record<string, SemanticRuleEntryInterface> = {};

    for (const [selector, rule] of Object.entries(semanticRules)) {
      const entry: SemanticRuleEntryInterface = {};
      if (rule.foreground) {
        entry['foreground'] = rule.foreground;
      }
      // Apply font style: modifier transform style takes precedence,
      // then fall back to FONT_STYLES for the base token type part of the selector.
      const fontStyle = rule.fontStyle ?? defaultFontStyle(selector);
      if (fontStyle) {
        entry['fontStyle'] = fontStyle;
      }
      result[selector] = entry;
    }

    state.outputs['vscode:semanticTokenRules'] = result;
    ctx.logger.debug('EmitVscodeSemanticRules', 'run', 'Emitted semantic token rules', {
      'count': Object.keys(result).length,
    });

    // Validate scope coverage: log any SCOPE_MAPPINGS keys with no colour
    const baseTokens = (state.metadata['vscode:baseTokens'] ?? {}) as Record<string, ColorRecordInterface>;
    for (const key of Object.keys(SCOPE_MAPPINGS)) {
      if (!(key in baseTokens) && !(key in result)) {
        ctx.logger.debug('EmitVscodeSemanticRules', 'run', 'No colour assigned for scope group', { 'scope': key });
      }
    }
  }
}

export const emitVscodeSemanticRules = new EmitVscodeSemanticRules();
