import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import {
  colorRecordFactory,
  contrastWcag21,
  darken,
  Engine,
  EngineMetadata,
  mixHsl
} from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  VSCODE_ROLE_SCHEMAS_16,
  VSCODE_ROLE_SCHEMAS_64,
  vscodePlugin
} from '../../src/index.ts';

const SEEDS: readonly string[] = [
  '#0d1117', '#e6edf3', '#161b22', '#7d8590',
  '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
  '#fb7185', '#fbbf24', '#f59e0b', '#737373',
  '#ef4444', '#facc15', '#3b82f6', '#10b981'
];

const EXTENSION_ROLES: readonly string[] = [
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
];

class StatedSelectionTask implements TaskInterface {
  readonly 'name' = 'test:statedSelection';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Seeds a caller-stated UI role for DeriveVscodeUiRoles coverage.',
    'name':        'test:statedSelection',
    'phase':       undefined,
    'reads':       ['metadata.core:roleProvenance', 'roles'],
    'requires':    ['expand:family'],
    'writes':      ['metadata.core:roleProvenance', 'roles']
  };

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const provenance = EngineMetadata.get(state.metadata, 'core:roleProvenance') ?? {};
    state.roles.selection = colorRecordFactory.fromHex('#123456');
    state.metadata['core:roleProvenance'] = {
      ...provenance,
      'selection': { 'adjustments': [], 'origin': 'stated' }
    };
  }
}

class DeriveVscodeUiRolesFixture {
  static engine(statedSelection: boolean): Engine {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    if (statedSelection) { engine.tasks.register(new StatedSelectionTask()); }
    engine.adopt(vscodePlugin);
    return engine;
  }

  static run(
    roles: RoleSchemaInterfaceType,
    options: {
      'metadata'?: InputInterface['metadata'];
      'statedSelection'?: boolean;
    } = {}
  ): PaletteStateInterface {
    const { metadata, statedSelection = false } = options;
    const engine = DeriveVscodeUiRolesFixture.engine(statedSelection);
    const pipeline = [
      'intake:hex',
      'resolve:roles',
      'expand:family',
      ...(statedSelection ? ['test:statedSelection'] : []),
      'vscode:deriveUiRoles'
    ];
    engine.pipeline(pipeline);
    return engine.run({
      'bypass':    undefined,
      'colors':    SEEDS,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  metadata,
      'roles':     roles,
      'runtime':   undefined
    });
  }
}

await test('DeriveVscodeUiRoles :: derives all 48 extension roles from resolved base roles', () => {
  const state = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.dark);

  assert.strictEqual(EXTENSION_ROLES.length, 48);
  for (const role of EXTENSION_ROLES) {
    assert.notStrictEqual(state.roles[role], undefined, `derived ${role}`);
  }
});

await test('DeriveVscodeUiRoles :: applies framing-specific dark and light formulas', () => {
  const dark = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.dark);
  const light = DeriveVscodeUiRolesFixture.run(VSCODE_ROLE_SCHEMAS_64.light);
  const darkBackground = dark.roles.background;
  if (darkBackground === undefined) { throw new Error('Missing dark background'); }
  const darkAccent = dark.roles.accent;
  const lightBackground = light.roles.background;
  const lightAccent = light.roles.accent;
  const darkForeground = dark.roles.foreground;
  const lightForeground = light.roles.foreground;
  if (
    darkAccent === undefined || darkForeground === undefined ||
    lightBackground === undefined || lightAccent === undefined || lightForeground === undefined
  ) {
    throw new Error('Missing role required by framing formula');
  }

  assert.strictEqual(
    dark.roles.selection?.hex,
    mixHsl.apply(darkBackground, darkAccent, 0.25).hex
  );
  assert.strictEqual(
    light.roles.selection?.hex,
    mixHsl.apply(lightBackground, lightAccent, 0.18).hex
  );
  assert.strictEqual(
    dark.roles.chrome?.hex,
    darken.apply(darkBackground, 0.2).hex
  );
  assert.notStrictEqual(dark.roles.selection?.hex, light.roles.selection?.hex);
  assert.strictEqual(
    light.roles.chrome?.hex,
    mixHsl.apply(lightBackground, lightForeground, 0.06).hex
  );
  assert.strictEqual(dark.roles.chrome?.hex, darken.apply(darkBackground, 0.2).hex);
});

await test('DeriveVscodeUiRoles :: preserves a caller-stated extension role exactly', () => {
  const state = DeriveVscodeUiRolesFixture.run(
    VSCODE_ROLE_SCHEMAS_64.dark,
    { 'statedSelection': true }
  );

  assert.strictEqual(state.roles.selection?.hex, '#123456');
});

await test('DeriveVscodeUiRoles :: synthesizes a bounded-contrast accent for the legacy 16-role schema', () => {
  const legacyRoles = VSCODE_ROLE_SCHEMAS_16.dark.roles.filter((role) => { return role.name !== 'accent'; });
  const configuredPairs = VSCODE_ROLE_SCHEMAS_16.dark.contrastPairs;
  if (configuredPairs === undefined) { throw new Error('The 16-role schema requires contrast pairs'); }
  const legacyPairs = configuredPairs.filter((pair) => { return pair.foreground !== 'accent'; });
  const legacy: RoleSchemaInterfaceType = {
    ...VSCODE_ROLE_SCHEMAS_16.dark,
    'contrastPairs': legacyPairs,
    'name':          'vscode-legacy-16-dark',
    'roles':         legacyRoles
  };
  const state = DeriveVscodeUiRolesFixture.run(legacy);
  const accent = state.roles.accent;
  const background = state.roles.background;

  assert.notStrictEqual(accent, undefined);
  assert.notStrictEqual(background, undefined);
  if (accent === undefined || background === undefined) { return; }
  const contrast = contrastWcag21.apply(accent, background);
  assert.ok(contrast >= 3 && contrast <= 4.5, `accent contrast ${contrast} stays inside 3.0–4.5`);
});
