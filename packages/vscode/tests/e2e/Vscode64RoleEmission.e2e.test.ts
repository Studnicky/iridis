import type { ColorRecordInterfaceTypeEntity, PaletteStateInterface, PipelineContextInterface } from '@studnicky/iridis';

import { InputInterfaceTypeEntity, Metadata, RoleProvenanceInterfaceTypeEntity, RuntimeOptionsInterfaceTypeEntity } from '@studnicky/iridis';
import { emitVscodeUiPalette } from '@studnicky/iridis-vscode';
import { consoleLogger } from '@studnicky/iridis/engine';
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
    return { 'logger': consoleLogger, 'startedAt': Date.now() };
  }

  static statedProvenance(roleNames: readonly string[]): Map<string, RoleProvenanceInterfaceTypeEntity.Type> {
    const provenance = new Map<string, RoleProvenanceInterfaceTypeEntity.Type>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const name = roleNames.at(index);
      if (name !== undefined) {
        provenance.set(name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'stated' }));
      }
    }
    return provenance;
  }

  static state(stated = true): PaletteStateInterface {
    const schema = VSCODE_ROLE_SCHEMAS_64.dark;
    const roleNames: string[] = [];
    const roleCount = schema.roles.length;
    const roles: Record<string, ColorRecordInterfaceTypeEntity.Type> = {};
    for (let index = 0; index < roleCount; index += 1) {
      const name = schema.roles[index]?.name;
      if (name === undefined) {
        throw new TypeError(`Missing role definition at ${index}`);
      }
      roleNames.push(name);
      const color = colorRecordFactory.fromOklch(0.35 + ((index % 6) * 0.08), 0.08 + ((index % 3) * 0.03), (index * 37) % 360, {
        'hints': { 'role': name },
        'sourceFormat': 'oklch'
      });
      Object.defineProperty(roles, name, { 'configurable': true, 'enumerable': true, 'value': color, 'writable': true });
    }
    const metadata = {};
    if (stated) {
      Metadata.writeRoleProvenance(metadata, Vscode64Fixture.statedProvenance(roleNames));
    }
    return {
      'colors': [],
      'input': InputInterfaceTypeEntity.create({ 'colors': [], 'roles': schema }),
      'metadata': metadata,
      'outputs': {},
      'roles': roles,
      'runtime': RuntimeOptionsInterfaceTypeEntity.create({}),
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
    const entries = Object.entries(output);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry === undefined) {
        continue;
      }
      const [key, value] = entry;
      if (typeof value !== 'string') {
        throw new TypeError(`Expected string workbench color for ${key}`);
      }
      Object.defineProperty(colors, key, { 'configurable': true, 'enumerable': true, 'value': value, 'writable': true });
    }
    return colors;
  }

  static colorOf(colors: Record<string, string>, key: string): string {
    const value = Reflect.get(colors, key);
    if (typeof value !== 'string') {
      throw new TypeError(`Missing workbench color for ${key}`);
    }
    return value;
  }


  static compareNames(left: string, right: string): number {
    const result = left.localeCompare(right);
    return result;
  }

  static compareProvenance(
    left: readonly [string, RoleProvenanceInterfaceTypeEntity.Type],
    right: readonly [string, RoleProvenanceInterfaceTypeEntity.Type]
  ): number {
    const result = Vscode64Fixture.compareNames(left[0], right[0]);
    return result;
  }

  static hasPortableSrgbHex(value: string): boolean {
    const hexadecimal = Number.parseInt(value.slice(1), 16);
    const result = value.startsWith('#') && (value.length === 7 || value.length === 9) && Number.isFinite(hexadecimal);
    return result;
  }

  static hasChangedOwnedColor(changed: Record<string, string>, baseline: Record<string, string>, keys: readonly string[]): boolean {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys.at(index);
      if (key !== undefined && Vscode64Fixture.colorOf(changed, key) !== Vscode64Fixture.colorOf(baseline, key)) {
        return true;
      }
    }
    return false;
  }
}

await test('Vscode64RoleEmission :: all 64 caller-stated roles emit the canonical 129-key sRGB registry surface', () => {
  const state = Vscode64Fixture.run();
  const expectedRoles = Object.keys(Vscode64Fixture.state().roles).sort(Vscode64Fixture.compareNames);
  const actualRoles = Object.keys(state.roles).sort(Vscode64Fixture.compareNames);
  const colors = Vscode64Fixture.colors(state);
  const expectedMetadata = {};
  Metadata.writeRoleProvenance(expectedMetadata, Vscode64Fixture.statedProvenance(expectedRoles));

  assert.deepStrictEqual(actualRoles, expectedRoles, 'all 64 supplied role names remain present');
  const actualProvenance = Array.from(Metadata.roleProvenance(state.metadata).entries()).sort(Vscode64Fixture.compareProvenance);
  const expectedProvenance = Array.from(Metadata.roleProvenance(expectedMetadata).entries()).sort(Vscode64Fixture.compareProvenance);
  assert.deepStrictEqual(actualProvenance, expectedProvenance, 'all 64 supplied role names record caller-stated provenance');
  for (let index = 0; index < expectedRoles.length; index += 1) {
    const role = expectedRoles.at(index);
    if (role !== undefined) {
      assert.strictEqual(Reflect.get(state.roles, role).hints?.role, role, `${role} remains caller-stated through derivation`);
    }
  }
  assert.strictEqual(Object.keys(colors).length, 129, 'all and only the canonical registry-backed workbench keys emit');
  assert.ok(!Object.hasOwn(colors, 'warningForeground'), 'inert warningForeground is absent');
  const colorEntries = Object.entries(colors);
  for (let index = 0; index < colorEntries.length; index += 1) {
    const entry = colorEntries.at(index);
    if (entry !== undefined) {
      const [key, value] = entry;
      assert.ok(Vscode64Fixture.hasPortableSrgbHex(value), `${key} emits portable sRGB hex`);
    }
  }
});

await test('Vscode64RoleEmission :: each extension role controls an owned workbench group', () => {
  const baseline = Vscode64Fixture.colors(Vscode64Fixture.run());
  const ownershipEntries = Object.entries(EXTENSION_OWNERSHIP);

  for (let index = 0; index < ownershipEntries.length; index += 1) {
    const entry = ownershipEntries.at(index);
    if (entry === undefined) {
      continue;
    }
    const [role, keys] = entry;
    const state = Vscode64Fixture.run();
    const color = colorRecordFactory.fromHex('#ff00ff', { 'hints': { 'role': role }, 'sourceFormat': 'hex' });
    Object.defineProperty(state.roles, role, { 'configurable': true, 'enumerable': true, 'value': color, 'writable': true });
    emitVscodeUiPalette.run(state, Vscode64Fixture.context());
    const changed = Vscode64Fixture.colors(state);
    if (role === 'bracketMatch') {
      assert.notStrictEqual(changed['editorBracketMatch.background'], baseline['editorBracketMatch.background'], 'bracketMatch changes the bracket background');
      assert.notStrictEqual(changed['editorBracketMatch.border'], baseline['editorBracketMatch.border'], 'bracketMatch changes the bracket border');
      continue;
    }
    assert.ok(Vscode64Fixture.hasChangedOwnedColor(changed, baseline, keys), `${role} changes an owned output key`);
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
