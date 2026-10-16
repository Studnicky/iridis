import type { ColorRecordInterfaceType, InputInterface, PaletteStateInterface, PipelineContextInterface } from '@studnicky/iridis';

import { emitVscodeUiPalette } from '@studnicky/iridis-vscode';
import { consoleLogger, Engine } from '@studnicky/iridis/engine';
import { colorRecordFactory, mixHsl } from '@studnicky/iridis/math';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveVscodeUiRoles, VSCODE_ROLE_SCHEMAS_64 } from '../../src/index.ts';

const EXTENSION_OWNERSHIP: Readonly<Record<string, readonly string[]>> = {
  'accent':             ['focusBorder', 'activityBarBadge.background', 'badge.background', 'button.background', 'editorCursor.foreground', 'list.highlightForeground', 'progressBar.background', 'peekView.border', 'tab.activeBorder', 'inputOption.activeBorder', 'statusBar.debuggingBackground'],
  'accentHover':        ['button.hoverBackground'],
  'ansiBlack':          ['terminal.ansiBlack'],
  'ansiBlue':           ['terminal.ansiBlue'],
  'ansiBrightBlack':    ['terminal.ansiBrightBlack'],
  'ansiBrightBlue':     ['terminal.ansiBrightBlue'],
  'ansiBrightCyan':     ['terminal.ansiBrightCyan'],
  'ansiBrightGreen':    ['terminal.ansiBrightGreen'],
  'ansiBrightMagenta':  ['terminal.ansiBrightMagenta'],
  'ansiBrightRed':      ['terminal.ansiBrightRed'],
  'ansiBrightWhite':    ['terminal.ansiBrightWhite'],
  'ansiBrightYellow':   ['terminal.ansiBrightYellow'],
  'ansiCyan':           ['terminal.ansiCyan'],
  'ansiGreen':          ['terminal.ansiGreen'],
  'ansiMagenta':        ['terminal.ansiMagenta'],
  'ansiRed':            ['terminal.ansiRed'],
  'ansiWhite':          ['terminal.ansiWhite'],
  'ansiYellow':         ['terminal.ansiYellow'],
  'border':             ['activityBar.border', 'editorGroupHeader.tabsBorder', 'input.border', 'panel.border', 'sideBar.border', 'statusBar.border', 'tab.border', 'titleBar.border'],
  'bracketLevel1':      ['editorBracketHighlight.foreground1'],
  'bracketLevel2':      ['editorBracketHighlight.foreground2'],
  'bracketLevel3':      ['editorBracketHighlight.foreground3'],
  'bracketLevel4':      ['editorBracketHighlight.foreground4'],
  'bracketLevel5':      ['editorBracketHighlight.foreground5'],
  'bracketLevel6':      ['editorBracketHighlight.foreground6'],
  'bracketMatch':       ['editorBracketMatch.background', 'editorBracketMatch.border'],
  'buttonSecondary':    ['button.secondaryBackground', 'button.secondaryHoverBackground'],
  'chrome':             ['statusBar.background', 'titleBar.activeBackground'],
  'chromeForeground':   ['statusBar.foreground', 'titleBar.activeForeground', 'sideBar.foreground'],
  'chromeInactive':     ['activityBar.background', 'titleBar.inactiveBackground'],
  'diffInserted':       ['diffEditor.insertedTextBackground', 'diffEditor.insertedLineBackground'],
  'diffRemoved':        ['diffEditor.removedTextBackground', 'diffEditor.removedLineBackground'],
  'findMatch':          ['editor.findMatchBackground', 'editor.findMatchHighlightBackground', 'inputOption.activeBackground'],
  'gitAdded':           ['gitDecoration.addedResourceForeground', 'editorGutter.addedBackground'],
  'gitConflicting':     ['gitDecoration.conflictingResourceForeground'],
  'gitDeleted':         ['gitDecoration.deletedResourceForeground', 'editorGutter.deletedBackground'],
  'gitModified':        ['gitDecoration.modifiedResourceForeground', 'editorGutter.modifiedBackground'],
  'gitUntracked':       ['gitDecoration.untrackedResourceForeground'],
  'guide':              ['editorIndentGuide.background1', 'editorWhitespace.foreground'],
  'guideActive':        ['editorIndentGuide.activeBackground1'],
  'hover':              ['editor.lineHighlightBackground', 'list.hoverBackground', 'tab.hoverBackground'],
  'inputBackground':    ['input.background'],
  'link':               ['textLink.foreground', 'textLink.activeForeground'],
  'onAccent':           ['activityBarBadge.foreground', 'badge.foreground', 'button.foreground', 'statusBar.debuggingForeground'],
  'selection':          ['editor.selectionBackground', 'editor.selectionHighlightBackground'],
  'selectionList':      ['list.activeSelectionBackground', 'list.focusBackground'],
  'widgetBackground':   ['editorWidget.background', 'editorSuggestWidget.background', 'editorHoverWidget.background', 'quickInput.background', 'menu.background', 'notifications.background'],
  'widgetBorder':       ['editorWidget.border', 'editorSuggestWidget.border', 'editorHoverWidget.border', 'menu.border', 'notifications.border']
};

class Vscode64Fixture {
  static context(): PipelineContextInterface {
    const engine = new Engine();
    return { 'engine': engine, 'logger': consoleLogger, 'startedAt': Date.now(), 'tasks': engine.tasks };
  }


  static state(stated = true): PaletteStateInterface {
    const schema = VSCODE_ROLE_SCHEMAS_64.dark;
    const roleNames: string[] = [];
    const roleCount = schema.roles.length;
    const roles: Record<string, ColorRecordInterfaceType> = {};
    for (let index = 0; index < roleCount; index += 1) {
      const name = schema.roles[index]?.name;
      if (name === undefined) {
        throw new TypeError(`Missing role definition at ${index}`);
      }
      roleNames.push(name);
      roles[name] = colorRecordFactory.fromOklch(0.35 + ((index % 6) * 0.08), 0.08 + ((index % 3) * 0.03), (index * 37) % 360, {
        'hints': { 'intent': undefined, 'role': name, 'weight': undefined },
        'sourceFormat': 'oklch'
      });
    }
    const roleProvenance = Object.fromEntries(roleNames.map((name) => {
      return [name, { 'adjustments': [], 'origin': 'stated' }];
    }));
    const input: InputInterface = {
      'bypass':    undefined,
      'colors':    [],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     schema,
      'runtime':   undefined
    };
    return {
      'colors':   [],
      'input':    input,
      'metadata': { 'core:roleProvenance': stated ? roleProvenance : {} },
      'outputs':  {},
      'roles':    roles,
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
  }

  static run(stated = true): PaletteStateInterface {
    const state = Vscode64Fixture.state(stated);
    const context = Vscode64Fixture.context();
    deriveVscodeUiRoles.run(state, context);
    emitVscodeUiPalette.run(state, context);
    return state;
  }

  static colors(state: PaletteStateInterface): Record<string, string> {
    const output = state.outputs['vscode:workbenchColors'];
    if (output === null || typeof output !== 'object' || Array.isArray(output)) {
      throw new TypeError('Expected vscode:workbenchColors object output');
    }
    const colors: Record<string, string> = {};
    for (const [key, value] of Object.entries(output)) {
      if (typeof value !== 'string') {
        throw new TypeError(`Expected string workbench color for ${key}`);
      }
      colors[key] = value;
    }
    return colors;
  }
}

await test('Vscode64RoleEmission :: all 64 caller-stated roles emit the canonical 129-key sRGB registry surface', () => {
  const state = Vscode64Fixture.run();
  const expectedRoles = Object.keys(Vscode64Fixture.state().roles).sort();
  const actualRoles = Object.keys(state.roles).sort();
  const colors = Vscode64Fixture.colors(state);

  assert.deepStrictEqual(actualRoles, expectedRoles, 'all 64 supplied role names remain present');
  assert.deepStrictEqual(
    state.metadata['core:roleProvenance'],
    Object.fromEntries(expectedRoles.map((role) => { return [role, { 'adjustments': [], 'origin': 'stated' }]; })),
    'all 64 supplied role names record caller-stated provenance'
  );
  for (const role of expectedRoles) {
    assert.strictEqual(state.roles[role]?.hints?.role, role, `${role} remains caller-stated through derivation`);
  }
  assert.strictEqual(Object.keys(colors).length, 129, 'all and only the canonical registry-backed workbench keys emit');
  assert.ok(!Object.hasOwn(colors, 'warningForeground'), 'inert warningForeground is absent');
  for (const [key, value] of Object.entries(colors)) {
    assert.match(value, /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/, `${key} emits portable sRGB hex`);
  }
});

await test('Vscode64RoleEmission :: each extension role controls an owned workbench group', () => {
  const baseline = Vscode64Fixture.colors(Vscode64Fixture.run());

  for (const [role, keys] of Object.entries(EXTENSION_OWNERSHIP)) {
    const state = Vscode64Fixture.run();
    state.roles[role] = colorRecordFactory.fromHex('#ff00ff', {
      'hints': { 'intent': undefined, 'role': role, 'weight': undefined },
      'sourceFormat': 'hex'
    });
    emitVscodeUiPalette.run(state, Vscode64Fixture.context());
    const changed = Vscode64Fixture.colors(state);
    if (role === 'bracketMatch') {
      assert.notStrictEqual(changed['editorBracketMatch.background'], baseline['editorBracketMatch.background'], 'bracketMatch changes the bracket background');
      assert.notStrictEqual(changed['editorBracketMatch.border'], baseline['editorBracketMatch.border'], 'bracketMatch changes the bracket border');
      continue;
    }
    assert.ok(keys.some((key) => { return changed[key] !== baseline[key]; }), `${role} changes an owned output key`);
  }
});

await test('Vscode64RoleEmission :: bracketMatch retains legacy defaults until caller-stated and then owns both bracket colors', () => {
  const defaults = Vscode64Fixture.run(false);
  const defaultColors = Vscode64Fixture.colors(defaults);
  const selection = defaults.roles.selection;
  const accent = defaults.roles.accent;
  if (selection === undefined || accent === undefined) {
    throw new TypeError('Expected selection and accent roles for bracket defaults');
  }
  assert.strictEqual(defaultColors['editorBracketMatch.background'], `${selection.hex}60`);
  assert.strictEqual(defaultColors['editorBracketMatch.border'], `${accent.hex}80`);

  const stated = Vscode64Fixture.run();
  const statedColors = Vscode64Fixture.colors(stated);
  const bracketMatch = stated.roles.bracketMatch;
  if (bracketMatch === undefined) {
    throw new TypeError('Expected caller-stated bracketMatch role');
  }
  assert.strictEqual(statedColors['editorBracketMatch.background'], `${bracketMatch.hex}60`);
  assert.strictEqual(statedColors['editorBracketMatch.border'], `${bracketMatch.hex}80`);
});

await test('Vscode64RoleEmission :: buttonSecondary hover preserves its foreground blend formula', () => {
  const state = Vscode64Fixture.run(false);
  const colors = Vscode64Fixture.colors(state);
  const buttonSecondary = state.roles.buttonSecondary;
  const foreground = state.roles.foreground;
  if (buttonSecondary === undefined || foreground === undefined) {
    throw new TypeError('Expected buttonSecondary and foreground roles');
  }
  assert.strictEqual(colors['button.secondaryBackground'], buttonSecondary.hex);
  assert.strictEqual(colors['button.secondaryHoverBackground'], mixHsl.apply(buttonSecondary, foreground, 0.1).hex);
});
