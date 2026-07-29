import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors';
import {
  colorRecordFactory,
  contrastText,
  darken,
  FramingSurface,
  lighten,
  mixHsl
} from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import { recordToVscodeColor } from '../util/recordToVscodeColor.ts';

/**
 * Derives all 101 VS Code workbench colors from the 16-role palette.
 *
 * Lifted from vscode-arcade-blaster/dev/themes/tools/uiPaletteGenerator.ts.
 * The derivation formulas use core math primitives directly via typed
 * imports (no string-keyed dispatch).
 */

class Role {
  static get(roles: Readonly<Record<string, ColorRecordInterfaceType>>, name: string): ColorRecordInterfaceType {
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

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Derives 101 VS Code workbench colors from the 16-role palette. Lifts uiPaletteGenerator.ts derivation.',
    'name':        'emit:vscodeUiPalette',
    'phase':       undefined,
    'reads':       ['roles', 'runtime.framing', 'variants'],
    'requires':    undefined,
    'writes':      ['outputs.vscode:workbenchColors']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    // `state.runtime.framing` selects state.roles or a state.variants
    // entry (see FramingSurface); every slot below derives from that
    // resolved surface, not state.roles directly.
    const roles = FramingSurface.resolve(state);

    const bgRole      = Role.get(roles, 'background');
    const fgRole      = Role.get(roles, 'foreground');
    const accentRole  = Role.get(roles, 'keyword');
    const mutedRole   = Role.get(roles, 'muted');
    const surfaceRole = Role.get(roles, 'surface');
    const errorRole   = Role.get(roles, 'error');
    const infoRole    = Role.get(roles, 'info');
    const successRole = Role.get(roles, 'success');
    const warningRole = Role.get(roles, 'warning');
    const functionRole = Role.get(roles, 'function');
    const typeRole    = Role.get(roles, 'type');

    // Two parallel strings per role:
    //  - `*_HEX` for math/composition paths (mixHsl/lighten/darken/contrastText)
    //    and for the `${...}40` template alpha-suffix idiom (CSS Color 4
    //    `color(display-p3 …)` cannot accept an 8-digit alpha suffix);
    //  - `*` (the P3-aware form via {@link recordToVscodeColor}) for slot
    //    values that pass a role through verbatim, those gain
    //    `color(display-p3 r g b)` when the underlying record carries P3.
    const bg_HEX      = bgRole.hex;
    const fg_HEX      = fgRole.hex;
    const accent_HEX  = accentRole.hex;
    const muted_HEX   = mutedRole.hex;
    const error_HEX   = errorRole.hex;
    const info_HEX    = infoRole.hex;
    const success_HEX = successRole.hex;
    const warning_HEX = warningRole.hex;
    const functionHex = functionRole.hex;
    const type_HEX    = typeRole.hex;

    const bg      = recordToVscodeColor(bgRole);
    const fg      = recordToVscodeColor(fgRole);
    const accent  = recordToVscodeColor(accentRole);
    const muted   = recordToVscodeColor(mutedRole);
    const surface = recordToVscodeColor(surfaceRole);
    const error   = recordToVscodeColor(errorRole);
    const info    = recordToVscodeColor(infoRole);
    const success = recordToVscodeColor(successRole);
    const warning = recordToVscodeColor(warningRole);
    const functionColor = recordToVscodeColor(functionRole);
    const type_   = recordToVscodeColor(typeRole);

    // Single shared light/dark measure (see FramingSurface): WCAG relative
    // luminance of the background role, thresholded at 0.5. EmitVscodeThemeJson
    // reads the same resolved roles through the same measure, so the emitted
    // `type` field always agrees with the chrome-mixing weights derived here.
    const isLight = FramingSurface.isLight(roles);

    const fromHex = (h: string): ColorRecordInterfaceType => { const result = colorRecordFactory.fromHex(h); return result; };

    const mixHslHex = (a: string, b: string, w: number): string =>
    { const result = mixHsl.apply(fromHex(a), fromHex(b), w).hex; return result; };
    const lightenHex = (c: string, a: number): string =>
    { const result = lighten.apply(fromHex(c), a).hex; return result; };
    const darkenHex = (c: string, a: number): string =>
    { const result = darken.apply(fromHex(c), a).hex; return result; };
    const contrastTextHex = (c: string): string =>
    { const result = contrastText.apply(fromHex(c)).hex; return result; };

    // Math-derived intermediates always work in hex; the math helpers
    // (`fromHex` → core math → `.hex`) cannot accept a P3 functional
    // string. `${color}40` alpha-suffix concatenation likewise requires
    // a 6-digit hex; CSS Color 4 forbids the 8-digit alpha shorthand on
    // `color(display-p3 ...)` (the `/ alpha` slash-suffix form is the
    // only legal P3 alpha syntax, but VS Code's parser predates that).
    // Direct role passthroughs (slot value === a role) use the P3-aware
    // local so wide-gamut roles surface as `color(display-p3 r g b)`.
    const activeSelection = mixHslHex(bg_HEX, accent_HEX, isLight ? 0.28 : 0.35);
    const border = mixHslHex(bg_HEX, fg_HEX, isLight ? 0.14 : 0.12);
    const chromeBackground = isLight ? mixHslHex(bg_HEX, fg_HEX, 0.06) : darkenHex(bg_HEX, 0.2);
    const chromeInactiveBackground = isLight ? mixHslHex(bg_HEX, fg_HEX, 0.04) : darkenHex(bg_HEX, 0.15);
    const hover = mixHslHex(bg_HEX, fg_HEX, isLight ? 0.06 : 0.08);
    const inputBackground = isLight ? mixHslHex(bg_HEX, fg_HEX, 0.04) : darkenHex(bg_HEX, 0.1);
    const selection = mixHslHex(bg_HEX, accent_HEX, isLight ? 0.18 : 0.25);

    const workbenchColors: Record<string, string> = {
      'activityBar.background':                        chromeInactiveBackground,
      'activityBar.border':                            border,
      'activityBar.foreground':                        fg,
      'activityBar.inactiveForeground':                muted,
      'activityBarBadge.background':                   accent,
      'activityBarBadge.foreground':                   contrastTextHex(accent_HEX),
      'badge.background':                              accent,
      'badge.foreground':                              contrastTextHex(accent_HEX),
      'button.background':                             accent,
      'button.foreground':                             contrastTextHex(accent_HEX),
      'button.hoverBackground':                        lightenHex(accent_HEX, 0.1),
      'button.secondaryBackground':                    activeSelection,
      'button.secondaryForeground':                    fg,
      'button.secondaryHoverBackground':               mixHslHex(activeSelection, fg_HEX, 0.1),
      'editor.background':                             bg,
      'editor.findMatchBackground':                    `${accent_HEX}40`,
      'editor.findMatchHighlightBackground':           `${accent_HEX}25`,
      'editor.foreground':                             fg,
      'editor.lineHighlightBackground':                hover,
      'editor.selectionBackground':                    selection,
      'editor.selectionHighlightBackground':           `${selection}80`,
      'editorBracketMatch.background':                 `${selection}60`,
      'editorBracketMatch.border':                     `${accent_HEX}80`,
      'editorCursor.foreground':                       accent,
      'editorGroupHeader.tabsBackground':              surface,
      'editorGroupHeader.tabsBorder':                  border,
      'editorHint.foreground':                         success,
      'editorIndentGuide.activeBackground1':           mixHslHex(bg_HEX, fg_HEX, 0.2),
      'editorIndentGuide.background1':                 border,
      'editorInfo.foreground':                         info,
      'editorLineNumber.activeForeground':             fg,
      'editorLineNumber.foreground':                   muted,
      'editorWhitespace.foreground':                   border,
      'errorForeground':                               error,
      'focusBorder':                                   `${accent_HEX}80`,
      'gitDecoration.addedResourceForeground':         success,
      'gitDecoration.conflictingResourceForeground':   warning,
      'gitDecoration.deletedResourceForeground':       error,
      'gitDecoration.ignoredResourceForeground':       muted,
      'gitDecoration.modifiedResourceForeground':      info,
      'gitDecoration.untrackedResourceForeground':     warning,
      'input.background':                              inputBackground,
      'input.border':                                  border,
      'input.foreground':                              fg,
      'input.placeholderForeground':                   muted,
      'inputOption.activeBackground':                  `${accent_HEX}30`,
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
      'scrollbarSlider.activeBackground':              `${muted_HEX}70`,
      'scrollbarSlider.background':                    `${muted_HEX}30`,
      'scrollbarSlider.hoverBackground':               `${muted_HEX}50`,
      'sideBar.background':                            surface,
      'sideBar.border':                                border,
      'sideBar.foreground':                            mixHslHex(fg_HEX, muted_HEX, 0.3),
      'sideBarSectionHeader.foreground':               fg,
      'statusBar.background':                          chromeBackground,
      'statusBar.border':                              border,
      'statusBar.debuggingBackground':                 accent,
      'statusBar.debuggingForeground':                 contrastTextHex(accent_HEX),
      'statusBar.foreground':                          mixHslHex(fg_HEX, muted_HEX, 0.5),
      'tab.activeBackground':                          bg,
      'tab.activeBorder':                              accent,
      'tab.activeForeground':                          fg,
      'tab.border':                                    border,
      'tab.hoverBackground':                           hover,
      'tab.inactiveBackground':                        surface,
      'tab.inactiveForeground':                        muted,
      'terminal.ansiBlack':                            border,
      'terminal.ansiBlue':                             info,
      'terminal.ansiBrightBlack':                      muted,
      'terminal.ansiBrightBlue':                       lightenHex(info_HEX, 0.15),
      'terminal.ansiBrightCyan':                       lightenHex(functionHex, 0.15),
      'terminal.ansiBrightGreen':                      lightenHex(success_HEX, 0.15),
      'terminal.ansiBrightMagenta':                    lightenHex(type_HEX, 0.15),
      'terminal.ansiBrightRed':                        lightenHex(error_HEX, 0.15),
      'terminal.ansiBrightWhite':                      '#ffffff',
      'terminal.ansiBrightYellow':                     lightenHex(warning_HEX, 0.15),
      'terminal.ansiCyan':                             functionColor,
      'terminal.ansiGreen':                            success,
      'terminal.ansiMagenta':                          type_,
      'terminal.ansiRed':                              error,
      'terminal.ansiWhite':                            fg,
      'terminal.ansiYellow':                           warning,
      'terminal.background':                           bg,
      'terminal.foreground':                           fg,
      'titleBar.activeBackground':                     chromeBackground,
      'titleBar.activeForeground':                     mixHslHex(fg_HEX, muted_HEX, 0.3),
      'titleBar.border':                               border,
      'titleBar.inactiveBackground':                   chromeInactiveBackground,
      'titleBar.inactiveForeground':                   muted,
      'warningForeground':                             warning
    };

    state.outputs['vscode:workbenchColors'] = workbenchColors;
    context.logger.debug(
      LogBody.create()
        .component('EmitVscodeUiPalette')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Derived workbench colors')
        .context({ 'count': Object.keys(workbenchColors).length })
        .build()
    );
  }
}

export const emitVscodeUiPalette = new EmitVscodeUiPalette();
