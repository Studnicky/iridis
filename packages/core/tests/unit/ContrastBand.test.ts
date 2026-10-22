import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import type { ContrastReportEntryInterfaceTypeEntity } from '../../src/entities/ContrastReportEntryInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import { ContrastOptionsInterfaceTypeEntity } from '../../src/entities/ContrastOptionsInterfaceTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../src/entities/ContrastPairInterfaceTypeEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../../src/entities/RoleProvenanceInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { PaletteRoleState } from '../../src/interfaces/PaletteStateInterface.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { contrastWcag21 } from '../../src/math/ContrastWcag21.ts';
import { ContrastPolicy } from '../../src/tasks/enforce/ContrastPolicy.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { Metadata } from '../../src/types/metadata.ts';

class ContrastBandSeedTask implements TaskInterface {
  readonly #colors: readonly ColorRecordInterfaceTypeEntity.Type[];
  readonly 'name' = 'seed:contrast-band';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type =
    TaskManifestInterfaceTypeEntity.create({
      'name': 'seed:contrast-band',
      'phase': 'onRunStart',
      'writes': ['colors']
    });

  constructor(colors: readonly ColorRecordInterfaceTypeEntity.Type[]) {
    this.#colors = colors;
  }

  run(state: PaletteStateInterface): void {
    state.colors.push(...this.#colors);
  }
}

class ContrastBandRoleSeedTask implements TaskInterface {
  readonly #records: Readonly<
    Record<string, ColorRecordInterfaceTypeEntity.Type>
  >;
  readonly #statedRoleNames: ReadonlySet<string>;
  readonly 'name' = 'seed:contrast-band-roles';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type =
    TaskManifestInterfaceTypeEntity.create({
      'name': 'seed:contrast-band-roles',
      'phase': 'onRunStart',
      'writes': ['metadata', 'roles']
    });

  constructor(
    records: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>,
    statedRoleNames: readonly string[]
  ) {
    this.#records = records;
    this.#statedRoleNames = new Set(statedRoleNames);
  }

  run(state: PaletteStateInterface): void {
    const provenance = new Map<
      string,
      RoleProvenanceInterfaceTypeEntity.Type
    >();
    const entries = Object.entries(this.#records);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];
      if (entry === undefined) {
        continue;
      }
      const [roleName, record] = entry;
      Object.defineProperty(state.roles, roleName, {
        'configurable': true,
        'enumerable': true,
        'value': record,
        'writable': true
      });
      provenance.set(
        roleName,
        RoleProvenanceInterfaceTypeEntity.create({
          'adjustments': [],
          'origin': this.#statedRoleNames.has(roleName) ? 'stated' : 'derived'
        })
      );
    }
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

interface ContrastRunOptionsInterface { readonly 'backgroundRole'?: string; readonly 'foregroundRole'?: string; }
interface ContrastPairsOptionsInterface { readonly 'contrast'?: ContrastOptionsInterfaceTypeEntity.Type; readonly 'statedRoleNames'?: readonly string[]; }

class ContrastBandFixture {
  static run(
    pair: ContrastPairInterfaceTypeEntity.Type,
    foreground: ColorRecordInterfaceTypeEntity.Type | string,
    background: ColorRecordInterfaceTypeEntity.Type | string,
    options: ContrastRunOptionsInterface = {}
  ): PaletteStateInterface {
    const foregroundRole = options.foregroundRole;
    const backgroundRole = options.backgroundRole;
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    let resolvedForeground: ColorRecordInterfaceTypeEntity.Type;
    if (typeof foreground === 'string') {
      resolvedForeground =
        foregroundRole === undefined
          ? colorRecordFactory.fromHex(foreground)
          : colorRecordFactory.fromHex(foreground, {
            'hints': ColorHintsInterfaceTypeEntity.intake({
              'role': foregroundRole
            })
          });
    } else {
      resolvedForeground = foreground;
    }
    let resolvedBackground: ColorRecordInterfaceTypeEntity.Type;
    if (typeof background === 'string') {
      resolvedBackground = backgroundRole === undefined
        ? colorRecordFactory.fromHex(background)
        : colorRecordFactory.fromHex(background, {
          'hints': ColorHintsInterfaceTypeEntity.intake({
            'role': backgroundRole
          })
        });
    } else {
      resolvedBackground = background;
    }
    const seedTask = new ContrastBandSeedTask([
      resolvedForeground,
      resolvedBackground
    ]);
    engine.tasks.hook(seedTask);
    engine.pipeline(['resolve:roles', 'enforce:contrast']);
    const result = engine.run(
      InputInterfaceTypeEntity.intake({
        'colors': [],
        'roles': ContrastBandFixture.schema([pair])
      })
    );
    return result;
  }

  static report(
    state: PaletteStateInterface
  ): ContrastReportEntryInterfaceTypeEntity.Type {
    const report = Metadata.contrastReport(state.metadata);
    const [entry] = report?.pairs ?? [];
    if (entry === undefined) {
      throw new Error('Expected one contrast report entry.');
    }
    return entry;
  }

  static runPairs(
    pairs: readonly ContrastPairInterfaceTypeEntity.Type[],
    roleHexes: Readonly<Record<string, string>>,
    options: ContrastPairsOptionsInterface = {}
  ): PaletteStateInterface {
    const statedRoleNames = options.statedRoleNames ?? [];
    const contrast = options.contrast;
    const records: Record<string, ColorRecordInterfaceTypeEntity.Type> = {};
    const entries = Object.entries(roleHexes);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];
      if (entry === undefined) {
        continue;
      }
      const [roleName, hex] = entry;
      Object.defineProperty(records, roleName, {
        'configurable': true,
        'enumerable': true,
        'value': colorRecordFactory.fromHex(hex),
        'writable': true
      });
    }
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.tasks.hook(new ContrastBandRoleSeedTask(records, statedRoleNames));
    engine.pipeline(['enforce:contrast']);
    const result = engine.run(
      InputInterfaceTypeEntity.intake({
        'colors': [],
        ...(contrast === undefined ? {} : { 'contrast': contrast }),
        'roles': ContrastBandFixture.schema(pairs)
      })
    );
    return result;
  }

  static reports(
    state: PaletteStateInterface
  ): readonly ContrastReportEntryInterfaceTypeEntity.Type[] {
    const report = Metadata.contrastReport(state.metadata);
    if (report === undefined) {
      throw new Error('Expected a contrast report object.');
    }
    const result = report.pairs;
    return result;
  }

  private static schema(
    pairs: readonly ContrastPairInterfaceTypeEntity.Type[]
  ): RoleSchemaInterfaceTypeEntity.Type {
    const roleNames = new Set<string>();
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      roleNames.add(pair.foreground);
      roleNames.add(pair.background);
    }
    const result = RoleSchemaInterfaceTypeEntity.create({
      'contrastPairs': pairs,
      'name': 'contrast-band',
      'roles': [...roleNames].map((name) => {
        const result = RoleDefinitionInterfaceTypeEntity.create({
          'name': name,
          'required': true
        });
        return result;
      })
    });
    return result;
  }
}

void test('enforce:contrast reduces an excessive ratio into the declared upper band and reports it', () => {
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'accent',
      'maximumContrastRatio': 4.5,
      'minimumContrastRatio': 3
    }),
    '#ffffff',
    '#10161f'
  );
  const report = ContrastBandFixture.report(state);
  const accent = state.roles.accent;
  const background = state.roles.background;

  assert.ok(
    accent !== undefined && background !== undefined,
    'both contrast roles resolve'
  );
  const ratio = contrastWcag21.apply(accent, background);
  assert.ok(
    ratio >= 3 && ratio <= 4.5,
    `accent ratio enters [3, 4.5], got ${ratio}`
  );
  assert.strictEqual(
    report.disposition === 'adjusted-foreground' ||
      report.disposition === 'adjusted-background',
    true,
    'upper-band violation adjusts the foreground'
  );
  assert.strictEqual(
    report.disposition,
    'adjusted-foreground',
    'report records the adjustment action'
  );
  assert.strictEqual(
    report.passed,
    true,
    'report passes only after the final ratio enters the band'
  );
  assert.ok(
    report.actual >= 3 && report.actual <= 4.5,
    `report records the final banded ratio, got ${report.actual}`
  );
});

void test('enforce:contrast retains lower-bound adjustment when no upper bound is declared', () => {
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    }),
    '#18222f',
    '#10161f'
  );
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const background = state.roles.background;

  assert.ok(
    text !== undefined && background !== undefined,
    'both contrast roles resolve'
  );
  const ratio = contrastWcag21.apply(text, background);
  assert.ok(ratio >= 4.5, `text ratio reaches the lower floor, got ${ratio}`);
  assert.strictEqual(
    report.disposition === 'adjusted-foreground' ||
      report.disposition === 'adjusted-background',
    true,
    'lower-band violation adjusts the foreground'
  );
  assert.strictEqual(
    report.disposition,
    'adjusted-foreground',
    'report records the adjustment action'
  );
  assert.strictEqual(
    'maximumContrastRatio' in report,
    false,
    'unbounded reports omit maximumContrastRatio'
  );
  assert.strictEqual(
    report.passed,
    true,
    'lower-bound report passes after adjustment'
  );

  const provenance = Metadata.roleProvenance(state.metadata);
  assert.deepStrictEqual(
    provenance?.get('text'),
    {
      'adjustments': [
        { 'afterHex': text.hex, 'beforeHex': '#18222f', 'operation': 'contrast' }
      ],
      'origin': 'derived'
    },
    'derived foreground records its exact contrast adjustment'
  );
});

void test('enforce:contrast moves the derived background around a stated foreground', () => {
  const foreground = '#18222f';
  const originalBackground = '#10161f';
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    }),
    foreground,
    originalBackground,
    { 'foregroundRole': 'text' }
  );
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const background = state.roles.background;

  assert.ok(
    text !== undefined && background !== undefined,
    'both contrast roles resolve'
  );
  assert.strictEqual(
    text.hex,
    foreground,
    'stated foreground remains byte-identical'
  );
  assert.notStrictEqual(
    background.hex,
    originalBackground,
    'derived background moves around the stated foreground'
  );
  assert.ok(
    contrastWcag21.apply(text, background) >= 4.5,
    'the terminal pair reaches the declared minimum'
  );
  assert.strictEqual(
    report.adjustedRole,
    'background',
    'report names the endpoint that moved'
  );
  assert.strictEqual(
    report.passed,
    true,
    'terminal report passes after moving the derived endpoint'
  );

  const provenance = Metadata.roleProvenance(state.metadata);
  assert.deepStrictEqual(
    provenance?.get('text'),
    { 'adjustments': [], 'origin': 'stated' },
    'stated foreground retains immutable provenance'
  );
});

void test('enforce:contrast moves the derived foreground around a stated background', () => {
  const background = '#10161f';
  const originalForeground = '#18222f';
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    }),
    originalForeground,
    background,
    { 'backgroundRole': 'background' }
  );
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const resolvedBackground = state.roles.background;

  assert.ok(
    text !== undefined && resolvedBackground !== undefined,
    'both contrast roles resolve'
  );
  assert.notStrictEqual(
    text.hex,
    originalForeground,
    'derived foreground moves around the stated background'
  );
  assert.strictEqual(
    resolvedBackground.hex,
    background,
    'stated background remains byte-identical'
  );
  assert.ok(
    contrastWcag21.apply(text, resolvedBackground) >= 4.5,
    'the terminal pair reaches the declared minimum'
  );
  assert.strictEqual(
    report.adjustedRole,
    'text',
    'report names the endpoint that moved'
  );
  assert.strictEqual(
    report.passed,
    true,
    'terminal report passes after moving the derived endpoint'
  );
});

void test('enforce:contrast reports an infeasible pair when both roles are stated', () => {
  const foreground = '#18222f';
  const background = '#10161f';
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    }),
    foreground,
    background,
    { 'backgroundRole': 'background', 'foregroundRole': 'text' }
  );
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const resolvedBackground = state.roles.background;

  assert.ok(
    text !== undefined && resolvedBackground !== undefined,
    'both contrast roles resolve'
  );
  assert.strictEqual(
    text.hex,
    foreground,
    'stated foreground remains byte-identical'
  );
  assert.strictEqual(
    resolvedBackground.hex,
    background,
    'stated background remains byte-identical'
  );
  assert.strictEqual(
    report.disposition === 'adjusted-foreground' ||
      report.disposition === 'adjusted-background',
    false,
    'an infeasible pair does not mutate either stated role'
  );
  assert.strictEqual(
    report.disposition,
    'blocked-stated',
    'report identifies the stated-only block'
  );
  assert.strictEqual(
    report.passed,
    false,
    'report exposes terminal noncompliance'
  );
  const provenance = Metadata.roleProvenance(state.metadata);
  assert.deepStrictEqual(
    provenance?.get('text'),
    { 'adjustments': [], 'origin': 'stated' },
    'stated foreground retains immutable provenance'
  );
  assert.deepStrictEqual(
    provenance?.get('background'),
    { 'adjustments': [], 'origin': 'stated' },
    'stated background retains immutable provenance'
  );
});

void test('enforce:contrast remeasures every connected pair after adjusting a shared derived role', () => {
  const pairs = [
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'surface',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    }),
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'text',
      'minimumContrastRatio': 4.5
    })
  ];
  const state = ContrastBandFixture.runPairs(pairs, {
    'background': '#414141',
    'surface': '#10161f',
    'text': '#18222f'
  });
  const reports = ContrastBandFixture.reports(state);
  const text = state.roles.text;
  const surface = state.roles.surface;
  const background = state.roles.background;

  assert.ok(
    text !== undefined && surface !== undefined && background !== undefined,
    'every connected role resolves'
  );
  assert.strictEqual(reports.length, 2, 'each connected pair is reported');
  for (let reportIndex = 0; reportIndex < reports.length; reportIndex += 1) {
    const report = reports[reportIndex];
    if (report === undefined) {
      continue;
    }
    assert.strictEqual(
      report.passed,
      true,
      'terminal report passes after remeasurement'
    );
    assert.ok(
      report.actual >= 4.5,
      'terminal ratio reaches the selected floor'
    );
  }
  assert.ok(
    contrastWcag21.apply(text, surface) >= 4.5 &&
      contrastWcag21.apply(text, background) >= 4.5,
    'the shared role satisfies every connected pair after the final adjustment'
  );
  const provenance = Metadata.roleProvenance(state.metadata);
  assert.ok(
    (provenance?.get('text')?.adjustments.length ?? 0) >= 2,
    'the shared derived role records each connected-pair adjustment'
  );
});

void test('enforce:contrast keeps a stated middle role exact while moving both derived neighbours', () => {
  const middle = '#333333';
  const pairs = [
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'middle',
      'foreground': 'left',
      'minimumContrastRatio': 4.5
    }),
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'right',
      'foreground': 'middle',
      'minimumContrastRatio': 4.5
    })
  ];
  const state = ContrastBandFixture.runPairs(
    pairs,
    { 'left': '#383838', 'middle': middle, 'right': '#444444' },
    { 'statedRoleNames': ['middle'] }
  );
  const reports = ContrastBandFixture.reports(state);
  const left = state.roles.left;
  const resolvedMiddle = state.roles.middle;
  const right = state.roles.right;

  assert.ok(
    left !== undefined && resolvedMiddle !== undefined && right !== undefined,
    'every chain role resolves'
  );
  assert.strictEqual(
    resolvedMiddle.hex,
    middle,
    'the stated middle role stays exact'
  );
  assert.notStrictEqual(
    left.hex,
    '#383838',
    'the derived left neighbour moves'
  );
  assert.notStrictEqual(
    right.hex,
    '#444444',
    'the derived right neighbour moves'
  );
  assert.ok(
    contrastWcag21.apply(left, resolvedMiddle) >= 4.5 &&
      contrastWcag21.apply(resolvedMiddle, right) >= 4.5,
    'both pair directions reach the selected floor around the stated middle role'
  );
  assert.deepStrictEqual(
    reports.map((report) => {return report.adjustedRole;}),
    ['left', 'right'],
    'each pair identifies its independently movable endpoint'
  );
});

void test('enforce:contrast installs a gamut-mapped bounded solver result even when its hex is unchanged', () => {
  const foreground = colorRecordFactory.fromOklch(0.94, 0.36, 180);
  const background = colorRecordFactory.fromOklch(0.62, 0.16, 180, {
    'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'background' })
  });
  const state = ContrastBandFixture.run(
    ContrastPairInterfaceTypeEntity.intake({
      'background': 'background',
      'foreground': 'accent',
      'maximumContrastRatio': 4.5,
      'minimumContrastRatio': 3
    }),
    foreground,
    background
  );
  const report = ContrastBandFixture.report(state);
  const accent = state.roles.accent;
  const resolvedBackground = state.roles.background;

  assert.ok(
    accent !== undefined && resolvedBackground !== undefined,
    'both contrast roles resolve'
  );
  assert.strictEqual(
    accent.hex,
    foreground.hex,
    'the canonical solver result retains its sRGB hex'
  );
  assert.notDeepStrictEqual(
    accent.rgb,
    foreground.rgb,
    'the canonical solver result changes the observable RGB record'
  );
  assert.ok(
    contrastWcag21.apply(accent, resolvedBackground) >= 3,
    'the installed solver result reaches the lower bound'
  );
  assert.strictEqual(
    report.disposition === 'adjusted-foreground' ||
      report.disposition === 'adjusted-background',
    true,
    'the observable solver result is installed'
  );
  assert.strictEqual(
    report.disposition,
    'adjusted-foreground',
    'the report records the installed solver result'
  );
  assert.strictEqual(
    report.passed,
    true,
    'the report measures the installed solver result'
  );
});

void test('enforce:contrast reports an incompatible selected AAA band as terminal noncompliance', () => {
  const pair = ContrastPairInterfaceTypeEntity.intake({
    'background': 'background',
    'foreground': 'text',
    'maximumContrastRatio': 4.5,
    'minimumContrastRatio': 4.5
  });
  const state = ContrastBandFixture.runPairs(
    [pair],
    { 'background': '#10161f', 'text': '#eeeeff' },
    {
      'contrast': ContrastOptionsInterfaceTypeEntity.create({
        'algorithm': 'wcag21',
        'level': 'AAA'
      })
    }
  );
  const report = ContrastBandFixture.reports(state);
  const [entry] = report;

  assert.ok(entry !== undefined, 'the bounded pair produces a terminal report');
  assert.strictEqual(
    entry.required,
    7,
    'the selected AAA target remains authoritative'
  );
  assert.strictEqual(
    entry.passed,
    false,
    'a contradictory band remains terminally noncompliant'
  );
  assert.strictEqual(
    entry.disposition,
    'unresolved',
    'the terminal report identifies the unsatisfiable derived adjustment'
  );
});

void test('contrast policy normalizes schema and extra pairs to the selected standard', () => {
  const roles = PaletteRoleState.admit({
    'background': colorRecordFactory.fromHex('#10161f', {
      'hints': ColorHintsInterfaceTypeEntity.intake({ 'intent': 'background' })
    }),
    'control': colorRecordFactory.fromHex('#6d28d9', {
      'hints': ColorHintsInterfaceTypeEntity.intake({ 'intent': 'accent' })
    }),
    'divider': colorRecordFactory.fromHex('#64748b'),
    'text': colorRecordFactory.fromHex('#eeeeff', {
      'hints': ColorHintsInterfaceTypeEntity.intake({ 'intent': 'text' })
    })
  });
  const base = {
    'colors': [],
    'roles': {
      'contrastPairs': [
        {
          'background': 'background',
          'foreground': 'divider',
          'minimumContrastRatio': 3
        }
      ],
      'name': 'normalized-policy',
      'roles': []
    }
  };
  const aa = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      ...base,
      'contrast': {
        'algorithm': 'wcag21',
        'extra': [
          {
            'background': 'background',
            'foreground': 'control',
            'minimumContrastRatio': 3
          }
        ],
        'level': 'AA'
      }
    }),
    roles
  );
  const aaa = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      ...base,
      'contrast': { 'algorithm': 'wcag21', 'level': 'AAA' }
    }),
    roles
  );
  const aaaText = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': { 'algorithm': 'wcag21', 'level': 'AAA' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'aaa-text-policy',
        'roles': []
      }
    }),
    roles
  );
  const aaaBounded = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': { 'algorithm': 'wcag21', 'level': 'AAA' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'maximumContrastRatio': 4.5,
            'minimumContrastRatio': 3
          }
        ],
        'name': 'bounded-normalized-policy',
        'roles': []
      }
    }),
    roles
  );
  const apca = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      ...base,
      'contrast': {
        'algorithm': 'apca',
        'extra': [{ 'background': 'background', 'foreground': 'control' }],
        'level': 'Lc'
      }
    }),
    roles
  );

  assert.deepStrictEqual(
    aa.map((requirement) => {return [
      requirement.algorithm,
      requirement.foreground,
      requirement.minimumContrastRatio
    ];}),
    [
      ['wcag21', 'divider', 3],
      ['wcag21', 'control', 3]
    ],
    'AA retains each declared pair minimum, including a divider band'
  );
  assert.deepStrictEqual(
    aaa.map((requirement) => {return [
      requirement.algorithm,
      requirement.minimumContrastRatio
    ];}),
    [['wcag21', 4.5]],
    'AAA maps a declared divider ratio of 3 to 4.5'
  );
  assert.deepStrictEqual(
    aaaText.map((requirement) => {return requirement.minimumContrastRatio;}),
    [7],
    'AAA maps a declared text ratio of 4.5 to 7'
  );
  assert.deepStrictEqual(
    aaaBounded.map((requirement) => {return [
      requirement.minimumContrastRatio,
      requirement.maximumContrastRatio
    ];}),
    [[4.5, 4.5]],
    'AAA retains an authored maximum while mapping a divider ratio to 4.5'
  );
  assert.deepStrictEqual(
    apca.map((requirement) => {return [
      requirement.algorithm,
      requirement.foreground,
      requirement.minimumContrastRatio
    ];}),
    [
      ['apca', 'divider', 60],
      ['apca', 'control', 60]
    ],
    'APCA applies its Lc targets independently of WCAG pair minima'
  );
  const apcaIgnoringWcagMinimum = ContrastPolicy.normalize(
    InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': { 'algorithm': 'apca', 'level': 'Lc' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 108
          }
        ],
        'name': 'apca-selected-standard-policy',
        'roles': []
      }
    }),
    roles
  );
  assert.deepStrictEqual(
    apcaIgnoringWcagMinimum.map((requirement) => {
      return requirement.minimumContrastRatio;
    }),
    [75],
    'APCA ignores an inherited WCAG ratio in favor of its selected Lc target'
  );
});
