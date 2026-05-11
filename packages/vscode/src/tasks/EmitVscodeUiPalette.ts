import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { colorRecordFactory, getOrCreateOutput } from '@studnicky/iridis';

/**
 * Derives all 101 VS Code workbench colors from the 16-role palette.
 *
 * Lifted from vscode-arcade-blaster/dev/themes/tools/uiPaletteGenerator.ts
 * The derivation formulas are reproduced here verbatim using ctx.math primitives
 * instead of arcade-blaster's colorMath helpers.
 */

interface VscodeOutputInterface {
  'workbenchColors'?: Record<string, string>;
  [key: string]: unknown;
}

function getRole(state: PaletteStateInterface, name: string): ColorRecordInterface {
  const record = state.roles[name];
  if (!record) {
    throw new Error(`EmitVscodeUiPalette: role '${name}' not found in state.roles`);
  }
  return record;
}

export class EmitVscodeUiPalette implements TaskInterface {
  readonly 'name' = 'emit:vscodeUiPalette';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:vscodeUiPalette',
    'reads':       ['roles'],
    'writes':      ['outputs.vscode.workbenchColors'],
    'description': 'Derives 101 VS Code workbench colors from the 16-role palette. Lifts uiPaletteGenerator.ts derivation.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const bgRole      = getRole(state, 'background');
    const fgRole      = getRole(state, 'foreground');
    const accentRole  = getRole(state, 'keyword');
    const mutedRole   = getRole(state, 'muted');
    const surfaceRole = getRole(state, 'surface');
    const errorRole   = getRole(state, 'error');
    const infoRole    = getRole(state, 'info');
    const successRole = getRole(state, 'success');
    const warningRole = getRole(state, 'warning');
    const fnRole      = getRole(state, 'function');
    const typeRole    = getRole(state, 'type');

    const bg      = bgRole.hex;
    const fg      = fgRole.hex;
    const accent  = accentRole.hex;
    const muted   = mutedRole.hex;
    const surface = surfaceRole.hex;
    const error   = errorRole.hex;
    const info    = infoRole.hex;
    const success = successRole.hex;
    const warning = warningRole.hex;
    const fn_     = fnRole.hex;
    const type_   = typeRole.hex;

    // Theme type: luminance > 0.5 → light. Pass the ColorRecord; Luminance
    // requires it (hex strings would throw).
    const bgLum   = ctx.math.invoke<number>('luminance', bgRole);
    const isLight = bgLum > 0.5;

    // Math primitives consume + return ColorRecord. Adapt at the boundary
    // so the workbench-color recipes below can keep their natural hex
    // string idiom.
    const rec = (hex: string): ColorRecordInterface => colorRecordFactory.fromHex(hex);
    const mixHsl = (a: string, b: string, w: number): string =>
      ctx.math.invoke<ColorRecordInterface>('mixHsl', rec(a), rec(b), w).hex;
    const lighten = (c: string, a: number): string =>
      ctx.math.invoke<ColorRecordInterface>('lighten', rec(c), a).hex;
    const darken = (c: string, a: number): string =>
      ctx.math.invoke<ColorRecordInterface>('darken', rec(c), a).hex;
    const contrastText = (c: string): string =>
      ctx.math.invoke<ColorRecordInterface>('contrastText', rec(c)).hex;

    const activeSelection = mixHsl(bg, accent, isLight ? 0.28 : 0.35);
    const border = mixHsl(bg, fg, isLight ? 0.14 : 0.12);
    const chromeBackground = isLight ? mixHsl(bg, fg, 0.06) : darken(bg, 0.2);
    const chromeInactiveBackground = isLight ? mixHsl(bg, fg, 0.04) : darken(bg, 0.15);
    const hover = mixHsl(bg, fg, isLight ? 0.06 : 0.08);
    const inputBackground = isLight ? mixHsl(bg, fg, 0.04) : darken(bg, 0.1);
    const selection = mixHsl(bg, accent, isLight ? 0.18 : 0.25);

    const workbenchColors: Record<string, string> = {
      'activityBar.background':                        chromeInactiveBackground,
      'activityBar.border':                            border,
      'activityBar.foreground':                        fg,
      'activityBar.inactiveForeground':                muted,
      'activityBarBadge.background':                   accent,
      'activityBarBadge.foreground':                   contrastText(accent),
      'badge.background':                              accent,
      'badge.foreground':                              contrastText(accent),
      'button.background':                             accent,
      'button.foreground':                             contrastText(accent),
      'button.hoverBackground':                        lighten(accent, 0.1),
      'button.secondaryBackground':                    activeSelection,
      'button.secondaryForeground':                    fg,
      'button.secondaryHoverBackground':               mixHsl(activeSelection, fg, 0.1),
      'editor.background':                             bg,
      'editor.findMatchBackground':                    `${accent}40`,
      'editor.findMatchHighlightBackground':           `${accent}25`,
      'editor.foreground':                             fg,
      'editor.lineHighlightBackground':                hover,
      'editor.selectionBackground':                    selection,
      'editor.selectionHighlightBackground':           `${selection}80`,
      'editorBracketMatch.background':                 `${selection}60`,
      'editorBracketMatch.border':                     `${accent}80`,
      'editorCursor.foreground':                       accent,
      'editorIndentGuide.activeBackground1':           mixHsl(bg, fg, 0.2),
      'editorIndentGuide.background1':                 border,
      'editorLineNumber.activeForeground':             fg,
      'editorLineNumber.foreground':                   muted,
      'editorWhitespace.foreground':                   border,
      'errorForeground':                               error,
      'focusBorder':                                   `${accent}80`,
      'gitDecoration.addedResourceForeground':         success,
      'gitDecoration.conflictingResourceForeground':   warning,
      'gitDecoration.deletedResourceForeground':       error,
      'gitDecoration.ignoredResourceForeground':       muted,
      'gitDecoration.modifiedResourceForeground':      info,
      'gitDecoration.untrackedResourceForeground':     warning,
      'editorHint.foreground':                         success,
      'editorInfo.foreground':                         info,
      'input.background':                              inputBackground,
      'input.border':                                  border,
      'input.foreground':                              fg,
      'input.placeholderForeground':                   muted,
      'inputOption.activeBackground':                  `${accent}30`,
      'inputOption.activeBorder':                      accent,
      'list.activeSelectionBackground':                activeSelection,
      'list.activeSelectionForeground':                fg,
      'list.focusBackground':                          activeSelection,
      'list.highlightForeground':                      accent,
      'list.hoverBackground':                          hover,
      'panel.background':                              surface,
      'panel.border':                                  border,
      'panelTitle.activeForeground':                   fg,
      'panelTitle.inactiveForeground':                 muted,
      'peekView.border':                               accent,
      'progressBar.background':                        accent,
      'scrollbarSlider.activeBackground':              `${muted}70`,
      'scrollbarSlider.background':                    `${muted}30`,
      'scrollbarSlider.hoverBackground':               `${muted}50`,
      'sideBar.background':                            surface,
      'sideBar.border':                                border,
      'sideBar.foreground':                            mixHsl(fg, muted, 0.3),
      'sideBarSectionHeader.foreground':               fg,
      'statusBar.background':                          chromeBackground,
      'statusBar.border':                              border,
      'statusBar.debuggingBackground':                 accent,
      'statusBar.debuggingForeground':                 contrastText(accent),
      'statusBar.foreground':                          mixHsl(fg, muted, 0.5),
      'tab.activeBackground':                          bg,
      'tab.activeBorder':                              accent,
      'tab.activeForeground':                          fg,
      'tab.border':                                    border,
      'tab.hoverBackground':                           hover,
      'tab.inactiveBackground':                        surface,
      'tab.inactiveForeground':                        muted,
      'editorGroupHeader.tabsBackground':              surface,
      'editorGroupHeader.tabsBorder':                  border,
      'terminal.background':                           bg,
      'terminal.ansiBlack':                            border,
      'terminal.ansiBlue':                             info,
      'terminal.ansiBrightBlack':                      muted,
      'terminal.ansiBrightBlue':                       lighten(info, 0.15),
      'terminal.ansiBrightCyan':                       lighten(fn_, 0.15),
      'terminal.ansiBrightGreen':                      lighten(success, 0.15),
      'terminal.ansiBrightMagenta':                    lighten(type_, 0.15),
      'terminal.ansiBrightRed':                        lighten(error, 0.15),
      'terminal.ansiBrightWhite':                      '#ffffff',
      'terminal.ansiBrightYellow':                     lighten(warning, 0.15),
      'terminal.ansiCyan':                             fn_,
      'terminal.foreground':                           fg,
      'terminal.ansiGreen':                            success,
      'terminal.ansiMagenta':                          type_,
      'terminal.ansiRed':                              error,
      'terminal.ansiWhite':                            fg,
      'terminal.ansiYellow':                           warning,
      'titleBar.activeBackground':                     chromeBackground,
      'titleBar.activeForeground':                     mixHsl(fg, muted, 0.3),
      'titleBar.border':                               border,
      'titleBar.inactiveBackground':                   chromeInactiveBackground,
      'titleBar.inactiveForeground':                   muted,
      'warningForeground':                             warning,
    };

    const out = getOrCreateOutput<VscodeOutputInterface>(state, 'vscode');
    out['workbenchColors'] = workbenchColors;
    ctx.logger.debug(
      'EmitVscodeUiPalette',
      'run',
      `Derived ${Object.keys(workbenchColors).length} workbench colors`,
    );
  }
}

export const emitVscodeUiPalette = new EmitVscodeUiPalette();
