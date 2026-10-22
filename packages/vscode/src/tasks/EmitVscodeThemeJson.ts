import type { PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors/node';
import { FramingSurface, TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import { VSCODE_SCOPE_MAPPINGS } from '../constants/VscodeScopeMappings.ts';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { SemanticRuleEntryEntity } from '../entities/SemanticRuleEntryEntity.ts';
import { ThemeJsonEntity } from '../entities/ThemeJsonEntity.ts';
import { TokenColorRuleEntity } from '../entities/TokenColorRuleEntity.ts';
import { VscodeMetadata } from '../VscodeMetadata.ts';
import { VscodeOutputs } from '../VscodeOutputs.ts';

class ThemeJsonValues {
  static name(state: PaletteStateInterface): string {
    const candidate = state.input.metadata?.themeName;
    const result = typeof candidate === 'string' ? candidate : 'Color Engine Theme';
    return result;
  }

  static semanticTokenColors(rules: ReadonlyMap<string, SemanticRuleEntryEntity.Type>): Record<string, string | SemanticRuleEntryEntity.Type> {
    const result = new Map<string, string | SemanticRuleEntryEntity.Type>();
    for (const [selector, rule] of rules) {
      if (rule.fontStyle !== undefined && rule.fontStyle.length > 0) {
        result.set(selector, rule);
      } else if (rule.foreground !== undefined && rule.foreground.length > 0) {
        result.set(selector, rule.foreground);
      }
    }
    const semanticTokenColors = JsonObject.fromEntries(result);
    return semanticTokenColors;
  }

  static tokenColors(baseTokens: ReadonlyMap<string, { readonly 'hex': string }>): TokenColorRuleEntity.Type[] {
    const mappingEntries = Object.entries(VSCODE_SCOPE_MAPPINGS.mappings);
    const mappingBaseTokens = new Map(Object.entries(VSCODE_SCOPE_MAPPINGS.baseTokens));
    const result: TokenColorRuleEntity.Type[] = [];
    for (let index = 0; index < mappingEntries.length; index += 1) {
      const entry = mappingEntries.at(index);
      if (entry === undefined) {
        continue;
      }
      const [paletteKey, scopes] = entry;
      const baseToken = mappingBaseTokens.get(paletteKey);
      const foregroundRecord = baseToken === undefined ? undefined : baseTokens.get(baseToken);
      if (foregroundRecord === undefined) {
        throw ModuleError.create('EmitVscodeThemeJson: missing mapped base token', {
          'context':  { 'baseToken': baseToken, 'paletteKey': paletteKey, 'task': 'EmitVscodeThemeJson' },
          'scenario': 'NOT_FOUND'
        });
      }
      const fontStyle = FONT_STYLES[paletteKey];
      const settings = SemanticRuleEntryEntity.create({
        ...(fontStyle === undefined || fontStyle.length === 0 ? {} : { 'fontStyle': fontStyle }),
        'foreground': foregroundRecord.hex
      });
      result.push(TokenColorRuleEntity.create({
        'name':     paletteKey,
        'scope':    [...scopes],
        'settings': settings
      }));
    }
    return result;
  }
}

class EmitVscodeThemeJson implements TaskInterface {
  readonly 'name' = 'emit:vscodeThemeJson';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Assembles the complete VS Code theme JSON: { name, type, colors, semanticTokenColors, tokenColors }.',
    'name':        'emit:vscodeThemeJson',
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
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const themeName = ThemeJsonValues.name(state);
    const baseTokens = VscodeMetadata.baseTokens(state.metadata);
    const workbenchColors = VscodeOutputs.workbenchColors(state.outputs);
    const semanticTokenRules = VscodeOutputs.semanticTokenRules(state.outputs);
    const roles = FramingSurface.resolve(state);
    const themeType: 'dark' | 'light' = FramingSurface.isLight(roles) ? 'light' : 'dark';
    const semanticTokenColors = ThemeJsonValues.semanticTokenColors(semanticTokenRules);
    const tokenColors = ThemeJsonValues.tokenColors(baseTokens);
    const themeJson = ThemeJsonEntity.create({
      'colors':               JsonObject.fromEntries(workbenchColors),
      'name':                 themeName,
      'semanticHighlighting': true,
      'semanticTokenColors':  semanticTokenColors,
      'tokenColors':          tokenColors,
      'type':                 themeType
    });
    state.outputs['vscode:themeJson'] = themeJson;
    context.logger.debug(
      LogBody.create({
        'component': 'EmitVscodeThemeJson',
        'context': {
          'colors':              workbenchColors.size,
          'semanticTokenColors': semanticTokenRules.size,
          'tokenColors':         tokenColors.length
        },
        'message': 'Assembled theme JSON',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitVscodeThemeJson = new EmitVscodeThemeJson();
