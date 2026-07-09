import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ThemeJsonInterfaceType,
  TokenColorRuleInterfaceType
} from '../types/augmentation.ts';

import { FONT_STYLES } from '../data/fontStyles.ts';
import { SCOPE_MAPPINGS } from '../data/scopeMappings.ts';
import { recordToVscodeColor } from '../util/recordToVscodeColor.ts';

class EmitVscodeThemeJson implements TaskInterface {
  readonly 'name' = 'emit:vscodeThemeJson';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assembles the complete VS Code theme JSON: { name, type, colors, semanticTokenColors, tokenColors }.',
    'name':        'emit:vscodeThemeJson',
    'reads':       [
      'outputs.vscode:workbenchColors',
      'outputs.vscode:semanticTokenRules',
      'metadata.vscode:baseTokens'
    ],
    'requires':    ['emit:vscodeSemanticRules', 'emit:vscodeUiPalette'],
    'writes':      ['outputs.vscode:themeJson']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const themeName   = (state.input.metadata?.themeName as string | undefined) ?? 'Color Engine Theme';
    const baseTokens  = (state.metadata['vscode:baseTokens'] ?? {}) as Record<string, ColorRecordInterfaceType>;
    const workbenchColors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const semanticTokenRules = (state.outputs['vscode:semanticTokenRules'] ?? {}) as Record<string, { 'fontStyle'?: string; 'foreground'?: string; }>;

    // Determine dark/light from background luminance
    const bgRecord = state.roles.background;
    const bgLum = bgRecord !== undefined ? bgRecord.oklch.l : 0;
    const themeType: 'dark' | 'light' = bgLum > 0.5 ? 'light' : 'dark';

    // semanticTokenColors: copy from outputs['vscode:semanticTokenRules']
    const semanticTokenColors: Record<string, string | { 'fontStyle'?: string; 'foreground'?: string; }> = {};
    for (const [selector, rule] of Object.entries(semanticTokenRules)) {
      if (rule.fontStyle !== undefined && rule.fontStyle.length > 0) {
        semanticTokenColors[selector] = { ...rule };
      } else if (rule.foreground !== undefined && rule.foreground.length > 0) {
        semanticTokenColors[selector] = rule.foreground;
      }
    }

    // tokenColors: build from SCOPE_MAPPINGS + baseTokens + FONT_STYLES.
    // Each foreground is serialised via {@link recordToVscodeColor} so any
    // record carrying `displayP3` emits `color(display-p3 r g b)` instead
    // of the gamut-mapped hex; sRGB-only records stay as hex.
    const tokenColors: TokenColorRuleInterfaceType[] = [];
    for (const [paletteKey, scopes] of Object.entries(SCOPE_MAPPINGS)) {
      const foregroundRecord = baseTokens[paletteKey];
      if (foregroundRecord === undefined) {continue;}

      const fontStyle = FONT_STYLES[paletteKey];
      const settings: TokenColorRuleInterfaceType['settings'] = {
        'foreground': recordToVscodeColor(foregroundRecord)
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
    ctx.logger.debug(
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
