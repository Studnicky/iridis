import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { getOrCreateOutput } from '@studnicky/iridis';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { SCOPE_MAPPINGS } from '../data/scopeMappings.ts';

/** VS Code tokenColors rule shape. */
interface TokenColorRuleInterface {
  'name': string;
  'scope': string | readonly string[];
  'settings': {
    'foreground'?: string;
    'fontStyle'?: string;
  };
}

/** VS Code theme JSON shape. */
interface ThemeJsonInterface {
  'name': string;
  'type': 'dark' | 'light' | 'hc-dark' | 'hc-light';
  'semanticHighlighting': true;
  'colors': Record<string, string>;
  'semanticTokenColors': Record<string, string | { 'foreground'?: string; 'fontStyle'?: string }>;
  'tokenColors': TokenColorRuleInterface[];
}

interface VscodeMetaInterface {
  'baseTokens'?: Record<string, string>;
  'semanticTokenRules'?: Record<string, { 'foreground': string; 'fontStyle'?: string }>;
}

interface VscodeOutputInterface {
  'workbenchColors'?: Record<string, string>;
  'semanticTokenRules'?: Record<string, { 'foreground'?: string; 'fontStyle'?: string }>;
  'themeJson'?: ThemeJsonInterface;
  [key: string]: unknown;
}

function getVscodeMeta(state: PaletteStateInterface): VscodeMetaInterface {
  const existing = state.metadata['vscode'];
  if (existing !== null && typeof existing === 'object') {
    return existing as VscodeMetaInterface;
  }
  return {};
}


export class EmitVscodeThemeJson implements TaskInterface {
  readonly 'name' = 'emit:vscodeThemeJson';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:vscodeThemeJson',
    'reads':       [
      'outputs.vscode.workbenchColors',
      'outputs.vscode.semanticTokenRules',
      'metadata.vscode.baseTokens',
    ],
    'writes':      ['outputs.vscode.themeJson'],
    'requires':    ['emit:vscodeSemanticRules', 'emit:vscodeUiPalette'],
    'description': 'Assembles the complete VS Code theme JSON: { name, type, colors, semanticTokenColors, tokenColors }.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const out = getOrCreateOutput<VscodeOutputInterface>(state, 'vscode');
    const meta = getVscodeMeta(state);

    if (!out.workbenchColors) {
      throw new Error('EmitVscodeThemeJson: outputs.vscode.workbenchColors not found — run emit:vscodeUiPalette first');
    }
    if (!out.semanticTokenRules) {
      throw new Error('EmitVscodeThemeJson: outputs.vscode.semanticTokenRules not found — run emit:vscodeSemanticRules first');
    }

    const themeName = (state.input.metadata?.['themeName'] as string | undefined) ?? 'Color Engine Theme';
    const baseTokens = meta['baseTokens'] ?? {};

    // Determine dark/light from background luminance
    const bgRecord = state.roles['background'];
    const bgLum = bgRecord ? bgRecord.oklch.l : 0;
    const themeType: 'dark' | 'light' = bgLum > 0.5 ? 'light' : 'dark';

    // semanticTokenColors: copy from outputs.vscode.semanticTokenRules
    const semanticTokenColors: Record<string, string | { 'foreground'?: string; 'fontStyle'?: string }> = {};
    for (const [selector, rule] of Object.entries(out.semanticTokenRules)) {
      if (rule.fontStyle) {
        semanticTokenColors[selector] = { ...rule };
      } else if (rule.foreground) {
        semanticTokenColors[selector] = rule.foreground;
      }
    }

    // tokenColors: build from SCOPE_MAPPINGS + baseTokens + FONT_STYLES
    const tokenColors: TokenColorRuleInterface[] = [];
    for (const [paletteKey, scopes] of Object.entries(SCOPE_MAPPINGS)) {
      const foreground = baseTokens[paletteKey];
      if (!foreground) continue;

      const fontStyle = FONT_STYLES[paletteKey];
      const settings: TokenColorRuleInterface['settings'] = { 'foreground': foreground };
      if (fontStyle) {
        settings['fontStyle'] = fontStyle;
      }
      tokenColors.push({
        'name':     paletteKey,
        'scope':    scopes,
        'settings': settings,
      });
    }

    const themeJson: ThemeJsonInterface = {
      'name':                 themeName,
      'type':                 themeType,
      'semanticHighlighting': true,
      'colors':               out.workbenchColors,
      'semanticTokenColors':  semanticTokenColors,
      'tokenColors':          tokenColors,
    };

    out['themeJson'] = themeJson;
    ctx.logger.debug(
      'EmitVscodeThemeJson',
      'run',
      `Assembled theme JSON: ${Object.keys(out.workbenchColors).length} colors, ` +
      `${Object.keys(semanticTokenColors).length} semanticTokenColors, ` +
      `${tokenColors.length} tokenColors entries`,
    );
  }
}

export const emitVscodeThemeJson = new EmitVscodeThemeJson();
