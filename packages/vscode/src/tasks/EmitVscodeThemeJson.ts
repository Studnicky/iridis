import type { ColorRecordEntity, PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import { FramingSurface, Metadata, TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';

import { VSCODE_SCOPE_MAPPINGS } from '../constants/VscodeScopeMappings.ts';
import { VSCODE_WORKBENCH_ALPHA } from '../constants/VscodeWorkbenchAlpha.ts';
import { FONT_STYLES } from '../data/fontStyles.ts';
import { VscodeTokenData } from '../data/VscodeTokenData.ts';
import { SemanticRuleEntryEntity } from '../entities/SemanticRuleEntryEntity.ts';
import { ThemeJsonEntity } from '../entities/ThemeJsonEntity.ts';
import { TokenColorRuleEntity } from '../entities/TokenColorRuleEntity.ts';
import { VscodeWorkbenchPropertyEntity } from '../entities/VscodeWorkbenchPropertyEntity.ts';
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

  static tokenColors(roles: Readonly<Record<string, ColorRecordEntity.Type>>): TokenColorRuleEntity.Type[] {
    const entries = Object.entries(VSCODE_SCOPE_MAPPINGS.mappings);
    const result: TokenColorRuleEntity.Type[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) { continue; }
      const [paletteKey, scopes] = entry;
      const tokenType = VSCODE_SCOPE_MAPPINGS.baseTokens[paletteKey];
      if (tokenType === undefined) {
        throw new RangeError(`VS Code scope group '${paletteKey}' has no token type.`);
      }
      const family = VscodeTokenData.TOKEN_FAMILY[tokenType];
      if (family === undefined) {
        throw new RangeError(`VS Code token '${tokenType}' has no role family.`);
      }
      const foreground = roles[family];
      if (foreground === undefined) {
        throw new RangeError(`VS Code token role '${family}' is unresolved.`);
      }
      const fontStyle = FONT_STYLES[paletteKey];
      result.push(TokenColorRuleEntity.create({
        'name': paletteKey,
        'scope': [...scopes],
        'settings': SemanticRuleEntryEntity.create({
          ...(fontStyle === undefined || fontStyle.length === 0 ? {} : { 'fontStyle': fontStyle }),
          'foreground': foreground.hex
        })
      }));
    }
    return result;
  }

  static workbenchColors(state: PaletteStateInterface): Record<string, string> {
    const roles = FramingSurface.resolve(state);
    const color = (name: string, alphaProperty?: VscodeWorkbenchPropertyEntity.Type): string => {
      const record = roles[name];
      if (record === undefined) {
        throw new RangeError(`VS Code theme role '${name}' is unresolved.`);
      }
      if (alphaProperty === undefined) {
        return record.hex;
      }
      const result = VSCODE_WORKBENCH_ALPHA.serialize(alphaProperty, record);
      return result;
    };
    const provenance = Metadata.roleProvenance(state.metadata);
    const bracketMatchProvenance = provenance.get('bracketMatch');
    const bracketBackgroundRole = bracketMatchProvenance?.origin === 'stated' ? 'bracketMatch' : 'selection';
    const bracketBorderRole = bracketMatchProvenance?.origin === 'stated' ? 'bracketMatch' : 'accent';
    const workbenchColors: Record<string, string> = {
      'activityBar.background':                        color('chromeInactive'),
      'activityBar.border':                            color('border'),
      'activityBar.foreground':                        color('foreground'),
      'activityBar.inactiveForeground':                color('muted'),
      'activityBarBadge.background':                   color('accent'),
      'activityBarBadge.foreground':                   color('onAccent'),
      'badge.background':                              color('accent'),
      'badge.foreground':                              color('onAccent'),
      'button.background':                             color('accent'),
      'button.foreground':                             color('onAccent'),
      'button.hoverBackground':                        color('accentHover'),
      'button.secondaryBackground':                    color('buttonSecondary'),
      'button.secondaryForeground':                    color('foreground'),
      'button.secondaryHoverBackground':               color('buttonSecondaryHover'),
      'diffEditor.insertedLineBackground':             color('diffInserted', VscodeWorkbenchPropertyEntity.intake('diffEditor.insertedLineBackground')),
      'diffEditor.insertedTextBackground':             color('diffInserted', VscodeWorkbenchPropertyEntity.intake('diffEditor.insertedTextBackground')),
      'diffEditor.removedLineBackground':              color('diffRemoved', VscodeWorkbenchPropertyEntity.intake('diffEditor.removedLineBackground')),
      'diffEditor.removedTextBackground':              color('diffRemoved', VscodeWorkbenchPropertyEntity.intake('diffEditor.removedTextBackground')),
      'editor.background':                             color('background'),
      'editor.findMatchBackground':                    color('findMatch', VscodeWorkbenchPropertyEntity.intake('editor.findMatchBackground')),
      'editor.findMatchHighlightBackground':           color('findMatch', VscodeWorkbenchPropertyEntity.intake('editor.findMatchHighlightBackground')),
      'editor.foreground':                             color('foreground'),
      'editor.lineHighlightBackground':                color('hover'),
      'editor.selectionBackground':                    color('selection'),
      'editor.selectionHighlightBackground':           color('selection', VscodeWorkbenchPropertyEntity.intake('editor.selectionHighlightBackground')),
      'editorBracketHighlight.foreground1':            color('bracketLevel1'),
      'editorBracketHighlight.foreground2':            color('bracketLevel2'),
      'editorBracketHighlight.foreground3':            color('bracketLevel3'),
      'editorBracketHighlight.foreground4':            color('bracketLevel4'),
      'editorBracketHighlight.foreground5':            color('bracketLevel5'),
      'editorBracketHighlight.foreground6':            color('bracketLevel6'),
      'editorBracketMatch.background':                 color(bracketBackgroundRole, VscodeWorkbenchPropertyEntity.intake('editorBracketMatch.background')),
      'editorBracketMatch.border':                     color(bracketBorderRole, VscodeWorkbenchPropertyEntity.intake('editorBracketMatch.border')),
      'editorCursor.foreground':                       color('accent'),
      'editorError.foreground':                        color('error'),
      'editorGroupHeader.tabsBackground':              color('surface'),
      'editorGroupHeader.tabsBorder':                  color('border'),
      'editorGutter.addedBackground':                  color('gitAdded'),
      'editorGutter.deletedBackground':                color('gitDeleted'),
      'editorGutter.modifiedBackground':               color('gitModified'),
      'editorHint.foreground':                         color('success'),
      'editorHoverWidget.background':                 color('widgetBackground'),
      'editorHoverWidget.border':                     color('widgetBorder'),
      'editorIndentGuide.activeBackground1':           color('guideActive'),
      'editorIndentGuide.background1':                 color('guide'),
      'editorInfo.foreground':                          color('info'),
      'editorLineNumber.activeForeground':             color('foreground'),
      'editorLineNumber.foreground':                   color('muted'),
      'editorSuggestWidget.background':                color('widgetBackground'),
      'editorSuggestWidget.border':                    color('widgetBorder'),
      'editorWarning.foreground':                      color('warning'),
      'editorWhitespace.foreground':                   color('guide'),
      'editorWidget.background':                       color('widgetBackground'),
      'editorWidget.border':                           color('widgetBorder'),
      'errorForeground':                               color('error'),
      'focusBorder':                                   color('accent', VscodeWorkbenchPropertyEntity.intake('focusBorder')),
      'gitDecoration.addedResourceForeground':         color('gitAdded'),
      'gitDecoration.conflictingResourceForeground':   color('gitConflicting'),
      'gitDecoration.deletedResourceForeground':       color('gitDeleted'),
      'gitDecoration.ignoredResourceForeground':       color('muted'),
      'gitDecoration.modifiedResourceForeground':      color('gitModified'),
      'gitDecoration.untrackedResourceForeground':     color('gitUntracked'),
      'input.background':                              color('inputBackground'),
      'input.border':                                  color('border'),
      'input.foreground':                              color('foreground'),
      'input.placeholderForeground':                   color('muted'),
      'inputOption.activeBackground':                  color('findMatch', VscodeWorkbenchPropertyEntity.intake('inputOption.activeBackground')),
      'inputOption.activeBorder':                      color('accent'),
      'list.activeSelectionBackground':                color('selectionList'),
      'list.activeSelectionForeground':                color('foreground'),
      'list.focusBackground':                          color('selectionList'),
      'list.highlightForeground':                      color('accent'),
      'list.hoverBackground':                          color('hover'),
      'list.warningForeground':                        color('warning'),
      'menu.background':                               color('widgetBackground'),
      'menu.border':                                   color('widgetBorder'),
      'notifications.background':                      color('widgetBackground'),
      'notifications.border':                          color('widgetBorder'),
      'panel.background':                              color('surface'),
      'panel.border':                                  color('border'),
      'panelTitle.activeForeground':                   color('foreground'),
      'panelTitle.inactiveForeground':                 color('muted'),
      'peekView.border':                               color('accent'),
      'progressBar.background':                        color('accent'),
      'quickInput.background':                         color('widgetBackground'),
      'scrollbarSlider.activeBackground':              color('muted', VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.activeBackground')),
      'scrollbarSlider.background':                    color('muted', VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.background')),
      'scrollbarSlider.hoverBackground':               color('muted', VscodeWorkbenchPropertyEntity.intake('scrollbarSlider.hoverBackground')),
      'sideBar.background':                            color('surface'),
      'sideBar.border':                                color('border'),
      'sideBar.foreground':                            color('chromeForeground'),
      'sideBarSectionHeader.foreground':               color('foreground'),
      'statusBar.background':                          color('chrome'),
      'statusBar.border':                              color('border'),
      'statusBar.debuggingBackground':                 color('accent'),
      'statusBar.debuggingForeground':                 color('onAccent'),
      'statusBar.foreground':                          color('chromeForeground'),
      'statusBar.noFolderBackground':                  color('chrome'),
      'statusBar.noFolderBorder':                      color('border'),
      'statusBar.noFolderForeground':                  color('chromeForeground'),
      'tab.activeBackground':                          color('background'),
      'tab.activeBorder':                              color('accent'),
      'tab.activeForeground':                          color('foreground'),
      'tab.border':                                    color('border'),
      'tab.hoverBackground':                           color('hover'),
      'tab.inactiveBackground':                        color('surface'),
      'tab.inactiveForeground':                        color('muted'),
      'terminal.ansiBlack':                            color('ansiBlack'),
      'terminal.ansiBlue':                             color('ansiBlue'),
      'terminal.ansiBrightBlack':                      color('ansiBrightBlack'),
      'terminal.ansiBrightBlue':                       color('ansiBrightBlue'),
      'terminal.ansiBrightCyan':                       color('ansiBrightCyan'),
      'terminal.ansiBrightGreen':                      color('ansiBrightGreen'),
      'terminal.ansiBrightMagenta':                    color('ansiBrightMagenta'),
      'terminal.ansiBrightRed':                        color('ansiBrightRed'),
      'terminal.ansiBrightWhite':                      color('ansiBrightWhite'),
      'terminal.ansiBrightYellow':                     color('ansiBrightYellow'),
      'terminal.ansiCyan':                             color('ansiCyan'),
      'terminal.ansiGreen':                            color('ansiGreen'),
      'terminal.ansiMagenta':                          color('ansiMagenta'),
      'terminal.ansiRed':                              color('ansiRed'),
      'terminal.ansiWhite':                            color('ansiWhite'),
      'terminal.ansiYellow':                           color('ansiYellow'),
      'terminal.background':                           color('background'),
      'terminal.foreground':                           color('foreground'),
      'textLink.activeForeground':                     color('link'),
      'textLink.foreground':                           color('link'),
      'titleBar.activeBackground':                     color('chrome'),
      'titleBar.activeForeground':                     color('chromeForeground'),
      'titleBar.border':                               color('border'),
      'titleBar.inactiveBackground':                   color('chromeInactive'),
      'titleBar.inactiveForeground':                   color('muted')
    };
    return workbenchColors;
  }
}

class EmitVscodeThemeJson implements TaskInterface {
  readonly 'name' = 'emit:vscodeThemeJson';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Assembles VS Code theme JSON directly from resolved roles and canonical semantic rules.',
    'name':        'emit:vscodeThemeJson',
    'reads':       ['outputs.vscode:semanticTokenRules', 'roles', 'metadata.core:roleProvenance', 'runtime.framing'],
    'requires':    ['emit:vscodeSemanticRules'],
    'writes':      ['outputs.vscode:themeJson', 'outputs.vscode:workbenchColors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = FramingSurface.resolve(state);
    const workbenchColors = ThemeJsonValues.workbenchColors(state);
    const semanticTokenRules = VscodeOutputs.semanticTokenRules(state.outputs);
    const tokenColors = ThemeJsonValues.tokenColors(roles);
    const themeJson = ThemeJsonEntity.create({
      'colors':               workbenchColors,
      'name':                 ThemeJsonValues.name(state),
      'semanticHighlighting': true,
      'semanticTokenColors':  ThemeJsonValues.semanticTokenColors(semanticTokenRules),
      'tokenColors':          tokenColors,
      'type':                 FramingSurface.isLight(roles) ? 'light' : 'dark'
    });
    state.outputs['vscode:themeJson'] = themeJson;
    state.outputs['vscode:workbenchColors'] = workbenchColors;
    context.logger.debug(
      LogBody.create({
        'component': 'EmitVscodeThemeJson',
        'context': {
          'colors': Object.keys(workbenchColors).length,
          'semanticTokenColors': semanticTokenRules.size,
          'tokenColors': tokenColors.length
        },
        'message': 'Assembled VS Code theme JSON from resolved roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitVscodeThemeJson = new EmitVscodeThemeJson();
