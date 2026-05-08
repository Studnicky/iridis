import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { SCOPE_MAPPINGS } from '../data/scopeMappings.ts';

/** VS Code editor.semanticTokenColorCustomizations.rules entry shape. */
interface SemanticRuleOutputInterface {
  'foreground'?: string;
  'fontStyle'?: string;
}

interface VscodeMetaInterface {
  'semanticTokenRules'?: Record<string, { 'foreground': string; 'fontStyle'?: string }>;
  'baseTokens'?: Record<string, string>;
}

interface VscodeOutputInterface {
  'semanticTokenRules'?: Record<string, SemanticRuleOutputInterface>;
}

function getVscodeMeta(state: PaletteStateInterface): VscodeMetaInterface {
  const existing = state.metadata['vscode'];
  if (existing !== null && typeof existing === 'object') {
    return existing as VscodeMetaInterface;
  }
  return {};
}

function getVscodeOutput(state: PaletteStateInterface): VscodeOutputInterface {
  const outputs = state.outputs;
  const existing = outputs['vscode'];
  if (existing !== null && typeof existing === 'object') {
    return existing as VscodeOutputInterface;
  }
  const out: VscodeOutputInterface = {};
  (outputs as Record<string, unknown>)['vscode'] = out;
  return out;
}

export class EmitVscodeSemanticRules implements TaskInterface {
  readonly 'name' = 'emit:vscodeSemanticRules';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:vscodeSemanticRules',
    'reads':       ['metadata.vscode.semanticTokenRules', 'metadata.vscode.baseTokens'],
    'writes':      ['outputs.vscode.semanticTokenRules'],
    'description': 'Shapes the 345-rule map for VS Code editor.semanticTokenColorCustomizations.rules. Uses SCOPE_MAPPINGS and FONT_STYLES.',
    'requires':    ['vscode:applyModifiers'],
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getVscodeMeta(state);
    const semanticRules = meta['semanticTokenRules'];

    if (!semanticRules) {
      throw new Error('EmitVscodeSemanticRules: metadata.vscode.semanticTokenRules not found — run vscode:applyModifiers first');
    }

    const out = getVscodeOutput(state);
    const result: Record<string, SemanticRuleOutputInterface> = {};

    for (const [selector, rule] of Object.entries(semanticRules)) {
      const entry: SemanticRuleOutputInterface = {};
      if (rule.foreground) {
        entry['foreground'] = rule.foreground;
      }
      // Apply font style: modifier transform style takes precedence,
      // then fall back to FONT_STYLES for the base token type part of the selector.
      const fontStyle = rule.fontStyle ?? this.defaultFontStyle(selector);
      if (fontStyle) {
        entry['fontStyle'] = fontStyle;
      }
      result[selector] = entry;
    }

    out['semanticTokenRules'] = result;
    ctx.logger.debug(
      'EmitVscodeSemanticRules',
      'run',
      `Emitted ${Object.keys(result).length} semantic token rules`,
    );

    // Validate scope coverage — log any SCOPE_MAPPINGS keys with no colour
    const baseTokens = meta['baseTokens'] ?? {};
    for (const key of Object.keys(SCOPE_MAPPINGS)) {
      if (!(key in baseTokens) && !(key in result)) {
        ctx.logger.debug('EmitVscodeSemanticRules', 'run', `No colour assigned for scope group '${key}'`);
      }
    }
  }

  private defaultFontStyle(selector: string): string | undefined {
    // selector may be 'variable' or 'variable.readonly'
    const baseType = selector.includes('.') ? selector.split('.')[0] : selector;
    return baseType ? (FONT_STYLES[baseType] ?? undefined) : undefined;
  }
}

export const emitVscodeSemanticRules = new EmitVscodeSemanticRules();
