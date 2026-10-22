import type { PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';

import {
  colorRecordFactory,
  contrastWcag21,
  darken,
  Engine,
  InputEntity,
  Metadata,
  mixHsl,
  RoleProvenanceEntity,
  RoleSchemaEntity,
  TaskManifestEntity
} from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_ROLE_SCHEMAS_16, VSCODE_ROLE_SCHEMAS_64, vscodePlugin } from '../../src/index.ts';

class StatedSelectionTask implements TaskInterface {
  readonly 'name' = 'test:statedSelection';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Seeds a caller-stated UI role for DeriveVscodeUiRoles coverage.',
    'name': 'test:statedSelection',
    'reads': ['metadata.core:roleProvenance', 'roles'],
    'requires': ['expand:family'],
    'writes': ['metadata.core:roleProvenance', 'roles']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const provenance = Metadata.roleProvenance(state.metadata);
    const selection = colorRecordFactory.fromHex('#123456', { 'hints': { 'role': 'selection' }, 'sourceFormat': 'hex' });
    Object.defineProperty(state.roles, 'selection', { 'configurable': true, 'enumerable': true, 'value': selection, 'writable': true });
    provenance.set('selection', RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'stated' }));
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

class DeriveVscodeUiRolesFixture {
  static readonly #extensionRoles = [
    'accent', 'onAccent', 'accentHover', 'link', 'selection', 'selectionList',
    'buttonSecondary', 'findMatch', 'bracketMatch', 'hover', 'border', 'guide',
    'guideActive', 'chrome', 'chromeInactive', 'chromeForeground', 'inputBackground',
    'ansiBlack', 'ansiRed', 'ansiGreen', 'ansiYellow', 'ansiBlue', 'ansiMagenta',
    'ansiCyan', 'ansiWhite', 'ansiBrightBlack', 'ansiBrightRed', 'ansiBrightGreen',
    'ansiBrightYellow', 'ansiBrightBlue', 'ansiBrightMagenta', 'ansiBrightCyan',
    'ansiBrightWhite', 'gitAdded', 'gitModified', 'gitDeleted', 'gitUntracked',
    'gitConflicting', 'diffInserted', 'diffRemoved', 'bracketLevel1', 'bracketLevel2',
    'bracketLevel3', 'bracketLevel4', 'bracketLevel5', 'bracketLevel6', 'widgetBackground',
    'widgetBorder'
  ] as const;
  static readonly #seeds = [
    '#0d1117', '#e6edf3', '#161b22', '#7d8590', '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
    '#fb7185', '#fbbf24', '#f59e0b', '#737373', '#ef4444', '#facc15', '#3b82f6', '#10b981'
  ] as const;

  static readonly extensionRoles = DeriveVscodeUiRolesFixture.#extensionRoles;

  static notAccentRole(role: RoleSchemaEntity.Type['roles'][number]): boolean {
    const result = role.name !== 'accent';
    return result;
  }

  static notAccentContrastPair(pair: NonNullable<RoleSchemaEntity.Type['contrastPairs']>[number]): boolean {
    const result = pair.foreground !== 'accent';
    return result;
  }

  static engine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(vscodePlugin);
    return engine;
  }

  static engineWithStatedSelection(): Engine {
    const engine = DeriveVscodeUiRolesFixture.engine();
    engine.tasks.register(new StatedSelectionTask());
    return engine;
  }

  static input(roles: RoleSchemaEntity.Type): InputEntity.Type {
    const result = InputEntity.create({ 'colors': [...DeriveVscodeUiRolesFixture.#seeds], 'roles': roles });
    return result;
  }

  static run(roles: RoleSchemaEntity.Type): PaletteStateInterface {
    const engine = DeriveVscodeUiRolesFixture.engine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'vscode:deriveUiRoles']);
    const result = engine.run(DeriveVscodeUiRolesFixture.input(roles));
    return result;
  }

  static runWithStatedSelection(roles: RoleSchemaEntity.Type): PaletteStateInterface {
    const engine = DeriveVscodeUiRolesFixture.engineWithStatedSelection();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'test:statedSelection', 'vscode:deriveUiRoles']);
    const result = engine.run(DeriveVscodeUiRolesFixture.input(roles));
    return result;
  }
}

await test('DeriveVscodeUiRoles :: derives all 48 extension roles from resolved base roles', () => {
  const state = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.dark);
  const extensionRoles = DeriveVscodeUiRolesFixture.extensionRoles;

  assert.strictEqual(extensionRoles.length, 48);
  for (let index = 0; index < extensionRoles.length; index += 1) {
    const role = extensionRoles.at(index);
    if (role !== undefined) {
      assert.notStrictEqual(Reflect.get(state.roles, role), undefined, `derived ${role}`);
    }
  }
});

await test('DeriveVscodeUiRoles :: applies framing-specific dark and light formulas', () => {
  const dark = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.dark);
  const light = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.light);
  const darkBackground = dark.roles.background;
  const darkAccent = dark.roles.accent;
  const lightBackground = light.roles.background;
  const lightAccent = light.roles.accent;
  const darkForeground = dark.roles.foreground;
  const lightForeground = light.roles.foreground;
  if (darkBackground === undefined || darkAccent === undefined || darkForeground === undefined || lightBackground === undefined || lightAccent === undefined || lightForeground === undefined) {
    throw new Error('Missing role required by framing formula');
  }

  assert.strictEqual(dark.roles.selection?.hex, mixHsl.apply(darkBackground, darkAccent, 0.25).hex);
  assert.strictEqual(light.roles.selection?.hex, mixHsl.apply(lightBackground, lightAccent, 0.18).hex);
  assert.strictEqual(dark.roles.chrome?.hex, darken.apply(darkBackground, 0.2).hex);
  assert.notStrictEqual(dark.roles.selection?.hex, light.roles.selection?.hex);
  assert.strictEqual(light.roles.chrome?.hex, mixHsl.apply(lightBackground, lightForeground, 0.06).hex);
  assert.strictEqual(dark.roles.chrome?.hex, darken.apply(darkBackground, 0.2).hex);
});

await test('DeriveVscodeUiRoles :: preserves a caller-stated extension role exactly', () => {
  const state = DeriveVscodeUiRolesFixture.runWithStatedSelection(VSCODE_ROLE_SCHEMAS_64.dark);

  assert.strictEqual(state.roles.selection?.hex, '#123456');
});

await test('DeriveVscodeUiRoles :: synthesizes a bounded-contrast accent for the legacy 16-role schema', () => {
  const legacyRoles = VSCODE_ROLE_SCHEMAS_16.dark.roles.filter(DeriveVscodeUiRolesFixture.notAccentRole);
  const configuredPairs = VSCODE_ROLE_SCHEMAS_16.dark.contrastPairs;
  if (configuredPairs === undefined) {
    throw new Error('The 16-role schema requires contrast pairs');
  }
  const legacyPairs = configuredPairs.filter(DeriveVscodeUiRolesFixture.notAccentContrastPair);
  const legacy = RoleSchemaEntity.create({
    ...VSCODE_ROLE_SCHEMAS_16.dark,
    'contrastPairs': legacyPairs,
    'name': 'vscode-legacy-16-dark',
    'roles': legacyRoles
  });
  const state = DeriveVscodeUiRolesFixture.run(legacy);
  const accent = state.roles.accent;
  const background = state.roles.background;

  assert.notStrictEqual(accent, undefined);
  assert.notStrictEqual(background, undefined);
  if (accent === undefined || background === undefined) {
    return;
  }
  const contrast = contrastWcag21.apply(accent, background);
  assert.ok(contrast >= 3 && contrast <= 4.5, `accent contrast ${contrast} stays inside 3.0–4.5`);
});
