import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';

import {
  InputEntity,
  Metadata,
  RoleProvenanceEntity,
  RuntimeOptionsEntity
} from '@studnicky/iridis';
import {
  emitVscodeSemanticRules,
  emitVscodeThemeJson
} from '@studnicky/iridis-vscode';
import { consoleLogger } from '@studnicky/iridis/engine';
import { colorRecordFactory } from '@studnicky/iridis/math';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_FULL_ROLE_SCHEMAS } from '../../src/index.ts';

const EXTENSION_OWNERSHIP: Readonly<Record<string, readonly string[]>> = {
  'accent': [
    'focusBorder',
    'activityBarBadge.background',
    'badge.background',
    'button.background',
    'editorCursor.foreground',
    'list.highlightForeground',
    'progressBar.background',
    'peekView.border',
    'tab.activeBorder',
    'inputOption.activeBorder',
    'statusBar.debuggingBackground'
  ],
  'accentHover': ['button.hoverBackground'],
  'ansiBlack': ['terminal.ansiBlack'],
  'ansiBlue': ['terminal.ansiBlue'],
  'ansiBrightBlack': ['terminal.ansiBrightBlack'],
  'ansiBrightBlue': ['terminal.ansiBrightBlue'],
  'ansiBrightCyan': ['terminal.ansiBrightCyan'],
  'ansiBrightGreen': ['terminal.ansiBrightGreen'],
  'ansiBrightMagenta': ['terminal.ansiBrightMagenta'],
  'ansiBrightRed': ['terminal.ansiBrightRed'],
  'ansiBrightWhite': ['terminal.ansiBrightWhite'],
  'ansiBrightYellow': ['terminal.ansiBrightYellow'],
  'ansiCyan': ['terminal.ansiCyan'],
  'ansiGreen': ['terminal.ansiGreen'],
  'ansiMagenta': ['terminal.ansiMagenta'],
  'ansiRed': ['terminal.ansiRed'],
  'ansiWhite': ['terminal.ansiWhite'],
  'ansiYellow': ['terminal.ansiYellow'],
  'border': [
    'activityBar.border',
    'editorGroupHeader.tabsBorder',
    'input.border',
    'panel.border',
    'sideBar.border',
    'statusBar.border',
    'statusBar.noFolderBorder',
    'tab.border',
    'titleBar.border'
  ],
  'bracketLevel1': ['editorBracketHighlight.foreground1'],
  'bracketLevel2': ['editorBracketHighlight.foreground2'],
  'bracketLevel3': ['editorBracketHighlight.foreground3'],
  'bracketLevel4': ['editorBracketHighlight.foreground4'],
  'bracketLevel5': ['editorBracketHighlight.foreground5'],
  'bracketLevel6': ['editorBracketHighlight.foreground6'],
  'bracketMatch': ['editorBracketMatch.background', 'editorBracketMatch.border'],
  'buttonSecondary': [
    'button.secondaryBackground',
    'button.secondaryHoverBackground'
  ],
  'chrome': [
    'statusBar.background',
    'statusBar.noFolderBackground',
    'titleBar.activeBackground'
  ],
  'chromeForeground': [
    'statusBar.foreground',
    'statusBar.noFolderForeground',
    'titleBar.activeForeground',
    'sideBar.foreground'
  ],
  'chromeInactive': ['activityBar.background', 'titleBar.inactiveBackground'],
  'diffInserted': [
    'diffEditor.insertedTextBackground',
    'diffEditor.insertedLineBackground'
  ],
  'diffRemoved': [
    'diffEditor.removedTextBackground',
    'diffEditor.removedLineBackground'
  ],
  'findMatch': [
    'editor.findMatchBackground',
    'editor.findMatchHighlightBackground',
    'inputOption.activeBackground'
  ],
  'gitAdded': [
    'gitDecoration.addedResourceForeground',
    'editorGutter.addedBackground'
  ],
  'gitConflicting': ['gitDecoration.conflictingResourceForeground'],
  'gitDeleted': [
    'gitDecoration.deletedResourceForeground',
    'editorGutter.deletedBackground'
  ],
  'gitModified': [
    'gitDecoration.modifiedResourceForeground',
    'editorGutter.modifiedBackground'
  ],
  'gitUntracked': ['gitDecoration.untrackedResourceForeground'],
  'guide': ['editorIndentGuide.background1', 'editorWhitespace.foreground'],
  'guideActive': ['editorIndentGuide.activeBackground1'],
  'hover': [
    'editor.lineHighlightBackground',
    'list.hoverBackground',
    'tab.hoverBackground'
  ],
  'inputBackground': ['input.background'],
  'link': ['textLink.foreground', 'textLink.activeForeground'],
  'onAccent': [
    'activityBarBadge.foreground',
    'badge.foreground',
    'button.foreground',
    'statusBar.debuggingForeground'
  ],
  'selection': [
    'editor.selectionBackground',
    'editor.selectionHighlightBackground'
  ],
  'selectionList': ['list.activeSelectionBackground', 'list.focusBackground'],
  'widgetBackground': [
    'editorWidget.background',
    'editorSuggestWidget.background',
    'editorHoverWidget.background',
    'quickInput.background',
    'menu.background',
    'notifications.background'
  ],
  'widgetBorder': [
    'editorWidget.border',
    'editorSuggestWidget.border',
    'editorHoverWidget.border',
    'menu.border',
    'notifications.border'
  ]
};

class VscodeRoleEmissionFixture {
  static context(): PipelineContextInterface {
    return { 'logger': consoleLogger, 'startedAt': Date.now() };
  }

  static statedProvenance(
    roleNames: readonly string[]
  ): Map<string, RoleProvenanceEntity.Type> {
    const provenance = new Map<string, RoleProvenanceEntity.Type>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const name = roleNames.at(index);
      if (name !== undefined) {
        provenance.set(
          name,
          RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'stated' })
        );
      }
    }
    return provenance;
  }

  static state(stated = true): PaletteStateInterface {
    const schema = VSCODE_FULL_ROLE_SCHEMAS.dark;
    const roleNames: string[] = [];
    const roleCount = schema.roles.length;
    const roles: Record<string, ColorRecordEntity.Type> = {};
    for (let index = 0; index < roleCount; index += 1) {
      const name = schema.roles[index]?.name;
      if (name === undefined) {
        throw new TypeError(`Missing role definition at ${index}`);
      }
      roleNames.push(name);
      const color = colorRecordFactory.fromOklch(
        0.35 + (index % 6) * 0.08,
        0.08 + (index % 3) * 0.03,
        (index * 37) % 360,
        {
          'hints': { 'role': name },
          'sourceFormat': 'oklch'
        }
      );
      Object.defineProperty(roles, name, {
        'configurable': true,
        'enumerable': true,
        'value': color,
        'writable': true
      });
    }
    const metadata = {};
    if (stated) {
      Metadata.writeRoleProvenance(
        metadata,
        VscodeRoleEmissionFixture.statedProvenance(roleNames)
      );
    }
    return {
      'colors': [],
      'input': InputEntity.create({ 'colors': [], 'roles': schema }),
      'metadata': metadata,
      'outputs': {},
      'roles': roles,
      'runtime': RuntimeOptionsEntity.create({}),
      'variants': {}
    };
  }

  static run(stated = true): PaletteStateInterface {
    const state = VscodeRoleEmissionFixture.state(stated);
    const context = VscodeRoleEmissionFixture.context();
    emitVscodeSemanticRules.run(state, context);
    emitVscodeThemeJson.run(state, context);
    return state;
  }

  static colors(state: PaletteStateInterface): Record<string, string> {
    const output = state.outputs['vscode:workbenchColors'];
    if (
      output === null ||
      typeof output !== 'object' ||
      Array.isArray(output)
    ) {
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
      Object.defineProperty(colors, key, {
        'configurable': true,
        'enumerable': true,
        'value': value,
        'writable': true
      });
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
    left: readonly [string, RoleProvenanceEntity.Type],
    right: readonly [string, RoleProvenanceEntity.Type]
  ): number {
    const result = VscodeRoleEmissionFixture.compareNames(left[0], right[0]);
    return result;
  }

  static hasPortableSrgbHex(value: string): boolean {
    const hexadecimal = Number.parseInt(value.slice(1), 16);
    const result =
      value.startsWith('#') &&
      (value.length === 7 || value.length === 9) &&
      Number.isFinite(hexadecimal);
    return result;
  }

  static hasChangedOwnedColor(
    changed: Record<string, string>,
    baseline: Record<string, string>,
    keys: readonly string[]
  ): boolean {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys.at(index);
      if (
        key !== undefined &&
        VscodeRoleEmissionFixture.colorOf(changed, key) !==
          VscodeRoleEmissionFixture.colorOf(baseline, key)
      ) {
        return true;
      }
    }
    return false;
  }
}

await test('VscodeRoleEmission :: caller-stated roles emit the canonical workbench registry surface', () => {
  const state = VscodeRoleEmissionFixture.run();
  const expectedRoles = Object.keys(
    VscodeRoleEmissionFixture.state().roles
  ).sort(VscodeRoleEmissionFixture.compareNames);
  const actualRoles = Object.keys(state.roles).sort(
    VscodeRoleEmissionFixture.compareNames
  );
  const colors = VscodeRoleEmissionFixture.colors(state);
  const expectedMetadata = {};
  Metadata.writeRoleProvenance(
    expectedMetadata,
    VscodeRoleEmissionFixture.statedProvenance(expectedRoles)
  );

  assert.deepStrictEqual(
    actualRoles,
    expectedRoles,
    'all supplied role names remain present'
  );
  const actualProvenance = Array.from(
    Metadata.roleProvenance(state.metadata).entries()
  ).sort(VscodeRoleEmissionFixture.compareProvenance);
  const expectedProvenance = Array.from(
    Metadata.roleProvenance(expectedMetadata).entries()
  ).sort(VscodeRoleEmissionFixture.compareProvenance);
  assert.deepStrictEqual(
    actualProvenance,
    expectedProvenance,
    'all supplied role names record caller-stated provenance'
  );
  for (let index = 0; index < expectedRoles.length; index += 1) {
    const role = expectedRoles.at(index);
    if (role !== undefined) {
      assert.strictEqual(
        Reflect.get(state.roles, role).hints?.role,
        role,
        `${role} remains caller-stated through derivation`
      );
    }
  }
  assert.strictEqual(
    Object.keys(colors).length,
    132,
    'all and only the canonical registry-backed workbench keys emit'
  );
  assert.ok(
    !Object.hasOwn(colors, 'warningForeground'),
    'inert warningForeground is absent'
  );
  const colorEntries = Object.entries(colors);
  for (let index = 0; index < colorEntries.length; index += 1) {
    const entry = colorEntries.at(index);
    if (entry !== undefined) {
      const [key, value] = entry;
      assert.ok(
        VscodeRoleEmissionFixture.hasPortableSrgbHex(value),
        `${key} emits portable sRGB hex`
      );
    }
  }
});

await test('VscodeRoleEmission :: each extended role controls an owned workbench group', () => {
  const baseline = VscodeRoleEmissionFixture.colors(
    VscodeRoleEmissionFixture.run()
  );
  const ownershipEntries = Object.entries(EXTENSION_OWNERSHIP);

  for (let index = 0; index < ownershipEntries.length; index += 1) {
    const entry = ownershipEntries.at(index);
    if (entry === undefined) {
      continue;
    }
    const [role, keys] = entry;
    const state = VscodeRoleEmissionFixture.run();
    const color = colorRecordFactory.fromHex('#ff00ff', {
      'hints': { 'role': role },
      'sourceFormat': 'hex'
    });
    Object.defineProperty(state.roles, role, {
      'configurable': true,
      'enumerable': true,
      'value': color,
      'writable': true
    });
    emitVscodeThemeJson.run(state, VscodeRoleEmissionFixture.context());
    const changed = VscodeRoleEmissionFixture.colors(state);
    if (role === 'bracketMatch') {
      assert.notStrictEqual(
        changed['editorBracketMatch.background'],
        baseline['editorBracketMatch.background'],
        'bracketMatch changes the bracket background'
      );
      assert.notStrictEqual(
        changed['editorBracketMatch.border'],
        baseline['editorBracketMatch.border'],
        'bracketMatch changes the bracket border'
      );
      continue;
    }
    assert.ok(
      VscodeRoleEmissionFixture.hasChangedOwnedColor(changed, baseline, keys),
      `${role} changes an owned output key`
    );
  }
});

await test('VscodeRoleEmission :: bracketMatch uses fallback values until caller-stated and then owns both bracket colors', () => {
  const defaults = VscodeRoleEmissionFixture.run(false);
  const defaultColors = VscodeRoleEmissionFixture.colors(defaults);
  const selection = defaults.roles.selection;
  const accent = defaults.roles.accent;
  if (selection === undefined || accent === undefined) {
    throw new TypeError(
      'Expected selection and accent roles for bracket defaults'
    );
  }
  assert.strictEqual(
    defaultColors['editorBracketMatch.background'],
    `${selection.hex}60`
  );
  assert.strictEqual(
    defaultColors['editorBracketMatch.border'],
    `${accent.hex}80`
  );

  const stated = VscodeRoleEmissionFixture.run();
  const statedColors = VscodeRoleEmissionFixture.colors(stated);
  const bracketMatch = stated.roles.bracketMatch;
  if (bracketMatch === undefined) {
    throw new TypeError('Expected caller-stated bracketMatch role');
  }
  assert.strictEqual(
    statedColors['editorBracketMatch.background'],
    `${bracketMatch.hex}60`
  );
  assert.strictEqual(
    statedColors['editorBracketMatch.border'],
    `${bracketMatch.hex}80`
  );
});

await test('VscodeRoleEmission :: buttonSecondary hover uses the graph-authored role', () => {
  const state = VscodeRoleEmissionFixture.run(false);
  const colors = VscodeRoleEmissionFixture.colors(state);
  const buttonSecondary = state.roles.buttonSecondary;
  const buttonSecondaryHover = state.roles.buttonSecondaryHover;
  if (buttonSecondary === undefined || buttonSecondaryHover === undefined) {
    throw new TypeError('Expected graph-authored secondary button roles');
  }
  assert.strictEqual(colors['button.secondaryBackground'], buttonSecondary.hex);
  assert.strictEqual(
    colors['button.secondaryHoverBackground'],
    buttonSecondaryHover.hex
  );
});
