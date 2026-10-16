import { JsonValue } from '@studnicky/types';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordInterfaceType, ContrastPairInterfaceType, PaletteStateInterface, RoleSchemaInterfaceType, TaskInterface, TaskManifestInterfaceType } from '../../src/types/index.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ContrastReportEntryInterfaceTypeEntity } from '../../src/entities/ContrastReportEntryInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { contrastWcag21 } from '../../src/math/ContrastWcag21.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { EngineMetadata } from '../../src/types/metadata.ts';

class ContrastBandSeedTask implements TaskInterface {
  readonly 'background': ColorRecordInterfaceType;
  readonly 'foreground': ColorRecordInterfaceType;
  readonly 'foregroundStated': boolean;
  readonly 'name' = 'seed:contrast-band';
  readonly 'pair': ContrastPairInterfaceType;

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': undefined,
    'name':        'seed:contrast-band',
    'phase':       'onRunStart',
    'reads':       undefined,
    'requires':    undefined,
    'writes':      ['colors']
  };

  constructor(
    pair:             ContrastPairInterfaceType,
    foreground:       ColorRecordInterfaceType,
    background:       ColorRecordInterfaceType,
    foregroundStated: boolean
  ) {
    this.pair = pair;
    this.foreground = foreground;
    this.background = background;
    this.foregroundStated = foregroundStated;
  }

  run(state: PaletteStateInterface): void {
    state.colors.push(this.foreground, this.background);
  }
}

class ContrastBandFixture {
  static run(
    pair:              ContrastPairInterfaceType,
    foreground:        ColorRecordInterfaceType | string,
    background:        ColorRecordInterfaceType | string,
    foregroundStated = false
  ): PaletteStateInterface {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    const seedTask = new ContrastBandSeedTask(
      pair,
      typeof foreground === 'string'
        ? colorRecordFactory.fromHex(foreground, {
          'hints': { 'intent': undefined, 'role': foregroundStated ? pair.foreground : undefined, 'weight': undefined }
        })
        : foreground,
      typeof background === 'string'
        ? colorRecordFactory.fromHex(background, {
          'hints': { 'intent': undefined, 'role': pair.background, 'weight': undefined }
        })
        : background,
      foregroundStated
    );
    engine.tasks.hook('onRunStart', seedTask);
    engine.pipeline(['resolve:roles', 'enforce:contrast']);
    return engine.run({
      'bypass':    undefined,
      'colors':    [],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     ContrastBandFixture.schema(pair),
      'runtime':   undefined
    });
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

  private static schema(pair: ContrastPairInterfaceType): RoleSchemaInterfaceType {
    return {
      'contrastPairs': [pair],
      'description':   undefined,
      'name':          'contrast-band',
      'roles': [
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': pair.foreground, 'required': true },
        { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': pair.background, 'required': true }
      ]
    };
  }

}

void test('enforce:contrast reduces an excessive ratio into the declared upper band and reports it', () => {
  const state = ContrastBandFixture.run({
    'algorithm':  undefined,
    'background': 'background',
    'foreground': 'accent',
    'maxRatio':   4.5,
    'minRatio':   3
  }, '#ffffff', '#10161f');
  const report = ContrastBandFixture.report(state);
  const accent = state.roles.accent;
  const background = state.roles.background;

  assert.ok(accent !== undefined && background !== undefined, 'both contrast roles resolve');
  const ratio = contrastWcag21.apply(accent, background);
  assert.ok(ratio >= 3 && ratio <= 4.5, `accent ratio enters [3, 4.5], got ${ratio}`);
  assert.strictEqual(report.adjusted, true, 'upper-band violation adjusts the foreground');
  assert.strictEqual(report.adjustmentDisposition, 'applied', 'report records the adjustment action');
  assert.strictEqual(report.maxRatio, 4.5, 'report records the declared upper bound');
  assert.strictEqual(report.passed, true, 'report passes only after the final ratio enters the band');
  assert.ok(report.ratio >= 3 && report.ratio <= 4.5, `report records the final banded ratio, got ${report.ratio}`);
});

void test('enforce:contrast retains lower-bound adjustment when no upper bound is declared', () => {
  const state = ContrastBandFixture.run({
    'algorithm':  undefined,
    'background': 'background',
    'foreground': 'text',
    'minRatio':   4.5
  }, '#18222f', '#10161f');
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;
  const background = state.roles.background;

  assert.ok(text !== undefined && background !== undefined, 'both contrast roles resolve');
  const ratio = contrastWcag21.apply(text, background);
  assert.ok(ratio >= 4.5, `text ratio reaches the lower floor, got ${ratio}`);
  assert.strictEqual(report.adjusted, true, 'lower-band violation adjusts the foreground');
  assert.strictEqual(report.adjustmentDisposition, 'applied', 'report records the adjustment action');
  assert.strictEqual('maxRatio' in report, false, 'unbounded reports omit maxRatio');
  assert.strictEqual(report.passed, true, 'lower-bound report passes after adjustment');

  const provenance = EngineMetadata.get(state.metadata, 'core:roleProvenance');
  assert.deepStrictEqual(provenance?.text, {
    'adjustments': [{ 'afterHex': text.hex, 'beforeHex': '#18222f', 'operation': 'contrast' }],
    'origin':      'derived'
  }, 'derived foreground records its exact contrast adjustment');
});

void test('enforce:contrast preserves a stated foreground that fails the declared minimum ratio', () => {
  const foreground = '#18222f';
  const state = ContrastBandFixture.run({
    'algorithm':  undefined,
    'background': 'background',
    'foreground': 'text',
    'minRatio':   4.5
  }, foreground, '#10161f', true);
  const report = ContrastBandFixture.report(state);
  const text = state.roles.text;

  assert.ok(text !== undefined, 'stated foreground resolves');
  assert.strictEqual(text.hex, foreground, 'stated foreground remains byte-identical');
  assert.strictEqual(report.adjusted, false, 'stated foreground is not adjusted');
  assert.strictEqual(report.adjustmentDisposition, 'preserved-stated', 'report explains why adjustment is blocked');
  assert.strictEqual(report.passed, false, 'report retains the failing contrast result');

  const provenance = EngineMetadata.get(state.metadata, 'core:roleProvenance');
  assert.deepStrictEqual(provenance?.text, {
    'adjustments': [],
    'origin':      'stated'
  }, 'stated foreground retains immutable provenance');
});

void test('enforce:contrast installs a gamut-mapped bounded solver result even when its hex is unchanged', () => {
  const foreground = colorRecordFactory.fromOklch(0.94, 0.36, 180);
  const background = colorRecordFactory.fromOklch(0.62, 0.16, 180, {
    'hints': { 'intent': undefined, 'role': 'background', 'weight': undefined }
  });
  const state = ContrastBandFixture.run({
    'algorithm':  undefined,
    'background': 'background',
    'foreground': 'accent',
    'maxRatio':   4.5,
    'minRatio':   3
  }, foreground, background);
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
