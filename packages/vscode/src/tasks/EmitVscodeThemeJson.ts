import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors';
import { FramingSurface } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  SemanticRuleEntryInterfaceType,
  ThemeJsonInterfaceType,
  TokenColorRuleInterfaceType
} from '../types/augmentation.ts';

import { VSCODE_SCOPE_MAPPINGS } from '../constants/VscodeScopeMappings.ts';
import { FONT_STYLES } from '../data/fontStyles.ts';

class EmitVscodeThemeJson implements TaskInterface {
  readonly 'name' = 'emit:vscodeThemeJson';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assembles the complete VS Code theme JSON: { name, type, colors, semanticTokenColors, tokenColors }.',
    'name':        'emit:vscodeThemeJson',
    'phase':       undefined,
    'reads':       [
      'outputs.vscode:workbenchColors',
      'outputs.vscode:semanticTokenRules',
      'metadata.vscode:baseTokens',
      'roles',
      'runtime.framing',
      'variants'
    ],
    'requires':    ['emit:vscodeSemanticRules', 'emit:vscodeUiPalette'],
    'writes':      ['outputs.vscode:themeJson']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const themeName   = (state.input.metadata?.themeName as string | undefined) ?? 'Color Engine Theme';
    const baseTokens  = (state.metadata['vscode:baseTokens'] ?? {}) as Record<string, ColorRecordInterfaceType>;
    const workbenchColors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const semanticTokenRules = (state.outputs['vscode:semanticTokenRules'] ?? {}) as Record<string, SemanticRuleEntryInterfaceType>;

    // Same resolved surface emit:vscodeUiPalette derived `workbenchColors`
    // from (see FramingSurface), read through the same WCAG relative-luminance
    // measure, so `type` always agrees with the colors above it.
    const roles = FramingSurface.resolve(state);
    const themeType: 'dark' | 'light' = FramingSurface.isLight(roles) ? 'light' : 'dark';

    // semanticTokenColors: copy from outputs['vscode:semanticTokenRules']
    const semanticTokenColors: Record<string, string | SemanticRuleEntryInterfaceType> = {};
    for (const [selector, rule] of Object.entries(semanticTokenRules)) {
      if (rule.fontStyle !== undefined && rule.fontStyle.length > 0) {
        semanticTokenColors[selector] = { ...rule };
      } else if (rule.foreground !== undefined && rule.foreground.length > 0) {
        semanticTokenColors[selector] = rule.foreground;
      }
    }

    // Every published TextMate scope group resolves through SCOPE_BASE_TOKENS
    // to a generated base token and serialises as canonical sRGB hex.
    const tokenColors: TokenColorRuleInterfaceType[] = [];
    for (const [paletteKey, scopes] of Object.entries(VSCODE_SCOPE_MAPPINGS.mappings)) {
      const baseToken = VSCODE_SCOPE_MAPPINGS.baseTokens[paletteKey];
      const foregroundRecord = baseToken === undefined ? undefined : baseTokens[baseToken];
      if (foregroundRecord === undefined) {
        throw ModuleError.create('EmitVscodeThemeJson: missing mapped base token', {
          'context':  { 'baseToken': baseToken, 'paletteKey': paletteKey, 'task': 'EmitVscodeThemeJson' },
          'scenario': 'NOT_FOUND'
        });
      }

      const fontStyle = FONT_STYLES[paletteKey];
      const settings: TokenColorRuleInterfaceType['settings'] = {
        'fontStyle':  undefined,
        'foreground': foregroundRecord.hex
      };
      if (fontStyle !== undefined && fontStyle.length > 0) {
        settings.fontStyle = fontStyle;
      }
      tokenColors.push({
        'name':     paletteKey,
        'scope':    [...scopes],
        'settings': settings
      });
    }

    const themeJson: ThemeJsonInterfaceType = {
      'colors':               workbenchColors,
      'name':                 themeName,
      'semanticHighlighting': true,
      'semanticTokenColors':  semanticTokenColors,
      'tokenColors':          tokenColors,
      'type':                 themeType
    };

    state.outputs['vscode:themeJson'] = themeJson;
    context.logger.debug(
      LogBody.create()
        .component('EmitVscodeThemeJson')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Assembled theme JSON')
        .context({
          'colors':              Object.keys(workbenchColors).length,
          'semanticTokenColors': Object.keys(semanticTokenColors).length,
          'tokenColors':         tokenColors.length
        })
        .build()
    );
  }
}

export const emitVscodeThemeJson = new EmitVscodeThemeJson();
