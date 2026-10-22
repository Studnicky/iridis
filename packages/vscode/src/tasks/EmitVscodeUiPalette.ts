import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors/node';
import { FramingSurface, Metadata, mixHsl, TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';


class Role {
  static get(roles: Readonly<Record<string, ColorRecordEntity.Type>>, name: string): ColorRecordEntity.Type {
    const record = roles[name];
    if (record === undefined) {
      throw ModuleError.create(`EmitVscodeUiPalette: role '${name}' not found in state.roles`, {
        'context':  { 'role': name, 'task': 'EmitVscodeUiPalette' },
        'scenario': 'NOT_FOUND'
      });
    }
    return record;
  }
}

class EmitVscodeUiPalette implements TaskInterface {
  readonly 'name' = 'emit:vscodeUiPalette';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Emits 129 VS Code workbench colors from the resolved 64-role VS Code vocabulary.',
    'name':        'emit:vscodeUiPalette',
    'reads':       ['roles', 'metadata.core:roleProvenance', 'runtime.framing', 'variants'],
    'requires':    ['vscode:deriveUiRoles'],
    'writes':      ['outputs.vscode:workbenchColors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = FramingSurface.resolve(state);
    const color = (name: string): string => {
      const record = Role.get(roles, name);
      return record.hex;
    };
    const alpha = (name: string, suffix: string): string => {
      const record = Role.get(roles, name);
      return `${record.hex}${suffix}`;
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
      'button.secondaryHoverBackground':               mixHsl.apply(Role.get(roles, 'buttonSecondary'), Role.get(roles, 'foreground'), 0.1).hex,
      'diffEditor.insertedLineBackground':             alpha('diffInserted', '20'),
      'diffEditor.insertedTextBackground':             alpha('diffInserted', '40'),
      'diffEditor.removedLineBackground':              alpha('diffRemoved', '20'),
      'diffEditor.removedTextBackground':              alpha('diffRemoved', '40'),
      'editor.background':                             color('background'),
      'editor.findMatchBackground':                    alpha('findMatch', '40'),
      'editor.findMatchHighlightBackground':           alpha('findMatch', '25'),
      'editor.foreground':                             color('foreground'),
      'editor.lineHighlightBackground':                color('hover'),
      'editor.selectionBackground':                    color('selection'),
      'editor.selectionHighlightBackground':           alpha('selection', '80'),
      'editorBracketHighlight.foreground1':            color('bracketLevel1'),
      'editorBracketHighlight.foreground2':            color('bracketLevel2'),
      'editorBracketHighlight.foreground3':            color('bracketLevel3'),
      'editorBracketHighlight.foreground4':            color('bracketLevel4'),
      'editorBracketHighlight.foreground5':            color('bracketLevel5'),
      'editorBracketHighlight.foreground6':            color('bracketLevel6'),
      'editorBracketMatch.background':                 alpha(bracketBackgroundRole, '60'),
      'editorBracketMatch.border':                     alpha(bracketBorderRole, '80'),
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
      'focusBorder':                                   alpha('accent', '80'),
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
      'inputOption.activeBackground':                  alpha('findMatch', '30'),
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
      'scrollbarSlider.activeBackground':              alpha('muted', '70'),
      'scrollbarSlider.background':                    alpha('muted', '30'),
      'scrollbarSlider.hoverBackground':               alpha('muted', '50'),
      'sideBar.background':                            color('surface'),
      'sideBar.border':                                color('border'),
      'sideBar.foreground':                            color('chromeForeground'),
      'sideBarSectionHeader.foreground':               color('foreground'),
      'statusBar.background':                          color('chrome'),
      'statusBar.border':                              color('border'),
      'statusBar.debuggingBackground':                 color('accent'),
      'statusBar.debuggingForeground':                 color('onAccent'),
      'statusBar.foreground':                          color('chromeForeground'),
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

    state.outputs['vscode:workbenchColors'] = workbenchColors;
    context.logger.debug(
      LogBody.create({
        'component': 'EmitVscodeUiPalette',
        'context': { 'count': Object.keys(workbenchColors).length },
        'message': 'Emitted workbench colors',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitVscodeUiPalette = new EmitVscodeUiPalette();
