import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../src/entities/ContrastPairInterfaceTypeEntity.ts';
import { ContrastReportEntryInterfaceTypeEntity } from '../../src/entities/ContrastReportEntryInterfaceTypeEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { contrastWcag21 } from '../../src/math/ContrastWcag21.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { Metadata } from '../../src/types/metadata.ts';

class ContrastBandSeedTask implements TaskInterface {
  readonly #colors: readonly ColorRecordInterfaceTypeEntity.Type[];
  readonly 'name' = 'seed:contrast-band';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'name':   'seed:contrast-band',
    'phase':  'onRunStart',
    'writes': ['colors']
  });

  constructor(
    colors: readonly ColorRecordInterfaceTypeEntity.Type[]
  ) {
    this.#colors = colors;
  }

  run(state: PaletteStateInterface): void {
    state.colors.push(...this.#colors);
  }
}

class ContrastBandFixture {
  static run(
    pair:              ContrastPairInterfaceTypeEntity.Type,
    foreground:        ColorRecordInterfaceTypeEntity.Type | string,
    background:        ColorRecordInterfaceTypeEntity.Type | string,
    foregroundRole: string | undefined = undefined
  ): PaletteStateInterface {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    let resolvedForeground: ColorRecordInterfaceTypeEntity.Type;
    if (typeof foreground === 'string') {
      resolvedForeground = foregroundRole === undefined
        ? colorRecordFactory.fromHex(foreground)
        : colorRecordFactory.fromHex(foreground, {
          'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': foregroundRole })
        });
    } else {
      resolvedForeground = foreground;
    }
    const resolvedBackground = typeof background === 'string'
      ? colorRecordFactory.fromHex(background, {
        'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': pair.background })
      })
      : background;
    const seedTask = new ContrastBandSeedTask([resolvedForeground, resolvedBackground]);
    engine.tasks.hook(seedTask);
    engine.pipeline(['resolve:roles', 'enforce:contrast']);
    const result = engine.run(InputInterfaceTypeEntity.intake({
      'colors': [],
      'roles':  ContrastBandFixture.schema(pair)
    }));
    return result;
  }

  static report(state: PaletteStateInterface): ContrastReportEntryInterfaceTypeEntity.Type {
    const report = JsonValue.from(state.metadata['core:contrastReport']);
    if (!Array.isArray(report) || report.length !== 1) {
      throw new Error('Expected one contrast report entry.');
    }
    const [entry] = report;
    if (entry === undefined || !ContrastReportEntryInterfaceTypeEntity.validate(entry)) {
      throw new Error('Expected a valid contrast report entry.');
    }
    return entry;
  }

  private static schema(pair: ContrastPairInterfaceTypeEntity.Type): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.create({
      'contrastPairs': [pair],
      'name':          'contrast-band',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.create({ 'name': pair.foreground, 'required': true }),
        RoleDefinitionInterfaceTypeEntity.create({ 'name': pair.background, 'required': true })
      ]
    });
    return result;
  }
}

void test('enforce:contrast reduces an excessive ratio into the declared upper band and reports it', () => {
  const state = ContrastBandFixture.run(ContrastPairInterfaceTypeEntity.intake({
    'background': 'background',
    'foreground': 'accent',
    'maximumContrastRatio': 4.5,
    'minimumContrastRatio': 3
  }), '#ffffff', '#10161f');
  const report = ContrastBandFixture.report(state);
  const accent = state.roles.accent;
  const background = state.roles.background;

  assert.ok(accent !== undefined && background !== undefined, 'both contrast roles resolve');
  const ratio = contrastWcag21.apply(accent, background);
  assert.ok(ratio >= 3 && ratio <= 4.5, `accent ratio enters [3, 4.5], got ${ratio}`);
  assert.strictEqual(report.adjusted, true, 'upper-band violation adjusts the foreground');
  assert.strictEqual(report.adjustmentDisposition, 'applied', 'report records the adjustment action');
  assert.strictEqual(report.maximumContrastRatio, 4.5, 'report records the declared upper bound');
  assert.strictEqual(report.passed, true, 'report passes only after the final ratio enters the band');
  assert.ok(report.ratio >= 3 && report.ratio <= 4.5, `report records the final banded ratio, got ${report.ratio}`);
});

void test('enforce:contrast retains lower-bound adjustment when no upper bound is declared', () => {
  const state = ContrastBandFixture.run(ContrastPairInterfaceTypeEntity.intake({
    'background': 'background',
    'foreground': 'text',
    'minimumContrastRatio': 4.5
  }), '#18222f', '#10161f');
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const background = state.roles.background;

  assert.ok(text !== undefined && background !== undefined, 'both contrast roles resolve');
  const ratio = contrastWcag21.apply(text, background);
  assert.ok(ratio >= 4.5, `text ratio reaches the lower floor, got ${ratio}`);
  assert.strictEqual(report.adjusted, true, 'lower-band violation adjusts the foreground');
  assert.strictEqual(report.adjustmentDisposition, 'applied', 'report records the adjustment action');
  assert.strictEqual('maximumContrastRatio' in report, false, 'unbounded reports omit maximumContrastRatio');
  assert.strictEqual(report.passed, true, 'lower-bound report passes after adjustment');

  const provenance = Metadata.roleProvenance(state.metadata);
  assert.deepStrictEqual(provenance?.get('text'), {
    'adjustments': [{ 'afterHex': text.hex, 'beforeHex': '#18222f', 'operation': 'contrast' }],
    'origin':      'derived'
  }, 'derived foreground records its exact contrast adjustment');
});

void test('enforce:contrast preserves a stated foreground that fails the declared minimum ratio', () => {
  const foreground = '#18222f';
  const state = ContrastBandFixture.run(ContrastPairInterfaceTypeEntity.intake({
    'background': 'background',
    'foreground': 'text',
    'minimumContrastRatio': 4.5
  }), foreground, '#10161f', 'text');
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;

  assert.ok(text !== undefined, 'stated foreground resolves');
  assert.strictEqual(text.hex, foreground, 'stated foreground remains byte-identical');
  assert.strictEqual(report.adjusted, false, 'stated foreground is not adjusted');
  assert.strictEqual(report.adjustmentDisposition, 'preserved-stated', 'report explains why adjustment is blocked');
  assert.strictEqual(report.passed, false, 'report retains the failing contrast result');

  const provenance = Metadata.roleProvenance(state.metadata);
  assert.deepStrictEqual(provenance?.get('text'), {
    'adjustments': [],
    'origin':      'stated'
  }, 'stated foreground retains immutable provenance');
});

void test('enforce:contrast installs a gamut-mapped bounded solver result even when its hex is unchanged', () => {
  const foreground = colorRecordFactory.fromOklch(0.94, 0.36, 180);
  const background = colorRecordFactory.fromOklch(0.62, 0.16, 180, {
    'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'background' })
  });
  const state = ContrastBandFixture.run(ContrastPairInterfaceTypeEntity.intake({
    'background': 'background',
    'foreground': 'accent',
    'maximumContrastRatio': 4.5,
    'minimumContrastRatio': 3
  }), foreground, background);
  const report = ContrastBandFixture.report(state);
  const accent = state.roles.accent;
  const resolvedBackground = state.roles.background;

  assert.ok(accent !== undefined && resolvedBackground !== undefined, 'both contrast roles resolve');
  assert.strictEqual(accent.hex, foreground.hex, 'the canonical solver result retains its sRGB hex');
  assert.notDeepStrictEqual(accent.rgb, foreground.rgb, 'the canonical solver result changes the observable RGB record');
  assert.ok(contrastWcag21.apply(accent, resolvedBackground) >= 3, 'the installed solver result reaches the lower bound');
  assert.strictEqual(report.adjusted, true, 'the observable solver result is installed');
  assert.strictEqual(report.adjustmentDisposition, 'applied', 'the report records the installed solver result');
  assert.strictEqual(report.passed, true, 'the report measures the installed solver result');
});
