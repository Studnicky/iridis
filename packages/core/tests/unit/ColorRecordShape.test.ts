/**
 * ColorRecordShape — scenario-matrix suite.
 *
 * Subject: canonical schema-shaped color records.
 *
 * Every factory and pipeline path emits a ColorRecord that validates against
 * the canonical entity, includes optional displayP3 and hints fields only
 * when values exist, and preserves the declared property order.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../src/interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { Engine } from '../../src/engine/Engine.ts';
import { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import { HslInputEntity } from '../../src/entities/HslInputEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { LabInputEntity } from '../../src/entities/LabInputEntity.ts';
import { OklchInputEntity } from '../../src/entities/OklchInputEntity.ts';
import { RgbInputEntity } from '../../src/entities/RgbInputEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { coreTasks } from '../../src/tasks/index.ts';

class TestColorRecordFixture {
  static assertShape(
    record: ColorRecordInterfaceTypeEntity.Type,
    expectedKeys: readonly string[],
    message: string
  ): void {
    assert.strictEqual(ColorRecordInterfaceTypeEntity.validate(record), true, `${message} schema validation`);
    assert.deepStrictEqual(Object.keys(record), expectedKeys, `${message} key order`);
  }

  static makeEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    return engine;
  }
}

class TestSeedHintedTask implements TaskInterface {
  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({ 'name': 'seed:hinted', 'phase': 'onRunStart' });
  readonly 'name' = 'seed:hinted';

  readonly #hinted: ColorRecordInterfaceTypeEntity.Type;

  constructor(hinted: ColorRecordInterfaceTypeEntity.Type) {
    this.#hinted = hinted;
  }

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.colors.push(this.#hinted);
  }
}

interface Cell1InputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'label': string;
  readonly 'record': ColorRecordInterfaceTypeEntity.Type;
}

interface Cell1OutputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'label': string;
  readonly 'record': ColorRecordInterfaceTypeEntity.Type;
}

interface Cell2InputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'input': Parameters<typeof InputInterfaceTypeEntity.create>[0];
  readonly 'label': string;
  readonly 'pipeline': readonly string[];
}

interface Cell2OutputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'label': string;
  readonly 'records': readonly ColorRecordInterfaceTypeEntity.Type[];
}

interface Cell3InputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'input': Parameters<typeof InputInterfaceTypeEntity.create>[0];
  readonly 'label': string;
  readonly 'onRunStartTask': TestSeedHintedTask | undefined;
  readonly 'pipeline': readonly string[];
}

interface Cell3OutputInterface {
  readonly 'expectedKeys': readonly string[];
  readonly 'label': string;
  readonly 'record': ColorRecordInterfaceTypeEntity.Type;
}

class ColorRecordShapeScenarios {
  static runFactoryScenarios(): void {
    const scenarios: readonly ScenarioInterface<Cell1InputInterface, Cell1OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromOklch] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'displayP3', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromOklch',
          'record': colorRecordFactory.fromOklch(0.5, 0.1, 200)
        },
        'kind': 'happy',
        'name': 'fromOklch emits the displayP3 field only when gamut mapping requires it'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hints] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromOklch-hints] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'displayP3', 'hex', 'hints', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromOklch+hints',
          'record': colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'accent' }) })
        },
        'kind': 'happy',
        'name': 'fromOklch emits the hints field only when supplied'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromRgb] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromRgb',
          'record': colorRecordFactory.fromRgb(0.3, 0.6, 0.9)
        },
        'kind': 'happy',
        'name': 'fromRgb emits only required fields when no optional values exist'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb-lab] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromRgb-lab] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromRgb+lab',
          'record': colorRecordFactory.fromRgb(0.3, 0.6, 0.9, { 'sourceFormat': 'lab' })
        },
        'kind': 'happy',
        'name': 'fromRgb preserves canonical order with an alternate source format'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-6] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromHex-6] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromHex-6',
          'record': colorRecordFactory.fromHex('#3b82f6')
        },
        'kind': 'happy',
        'name': 'fromHex 6-digit emits only required fields'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-8] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromHex-8] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromHex-8',
          'record': colorRecordFactory.fromHex('#3b82f680')
        },
        'kind': 'happy',
        'name': 'fromHex 8-digit preserves alpha without an undefined optional field'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-alpha] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromHex-alpha] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromHex+alpha',
          'record': colorRecordFactory.fromHex('#3b82f6', { 'alphaOverride': 0.5 })
        },
        'kind': 'happy',
        'name': 'fromHex alpha override preserves the canonical required-field shape'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-named] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromHex-named] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromHex+named',
          'record': colorRecordFactory.fromHex('#ff0000', { 'sourceFormat': 'named' })
        },
        'kind': 'happy',
        'name': 'fromHex named preserves canonical order'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromHsl] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromHsl] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromHsl',
          'record': colorRecordFactory.fromHsl(120, 0.5, 0.5)
        },
        'kind': 'happy',
        'name': 'fromHsl emits only required fields when no optional values exist'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue0] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromOklch-hue0] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromOklch-hue0',
          'record': colorRecordFactory.fromOklch(0.5, 0, 0)
        },
        'kind': 'edge',
        'name': 'fromOklch hue zero preserves the required-field shape'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue360] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=1, scenario=fromOklch-hue360] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'label': 'fromOklch-hue360',
          'record': colorRecordFactory.fromOklch(0.5, 0.1, 360)
        },
        'kind': 'edge',
        'name': 'fromOklch hue 360 preserves the required-field shape'
      }
    ];

    new ScenarioRunner<Cell1InputInterface, Cell1OutputInterface>(
      'ColorRecordShape :: cell-1 :: factory',
      (input) => {return { 'expectedKeys': input.expectedKeys, 'label': input.label, 'record': input.record };}
    ).run(scenarios);
  }

  static runIntakeScenarios(): void {
    const scenarios: readonly ScenarioInterface<Cell2InputInterface, Cell2OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex] must not throw');
          assert.strictEqual(output!.records.length, 1, '[cell=2, scenario=intake-hex] one record');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-hex]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': ['#3b82f6'] },
          'label': 'intake:hex',
          'pipeline': ['intake:hex']
        },
        'kind': 'happy',
        'name': 'intake:hex emits a canonical required-field record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex-alpha] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-hex-alpha]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': ['#3b82f680'] },
          'label': 'intake:hex-alpha',
          'pipeline': ['intake:hex']
        },
        'kind': 'happy',
        'name': 'intake:hex with alpha omits absent optional fields'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-rgb] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-rgb]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': [RgbInputEntity.intake({ 'b': 200, 'g': 150, 'r': 100 })] },
          'label': 'intake:rgb',
          'pipeline': ['intake:rgb']
        },
        'kind': 'happy',
        'name': 'intake:rgb emits a canonical required-field record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hsl] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-hsl]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': [HslInputEntity.intake({ 'h': 200, 'l': 0.5, 's': 0.5 })] },
          'label': 'intake:hsl',
          'pipeline': ['intake:hsl']
        },
        'kind': 'happy',
        'name': 'intake:hsl admits its canonical input entity'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-oklch] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-oklch]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': [OklchInputEntity.intake({ 'c': 0.15, 'h': 250, 'l': 0.6 })] },
          'label': 'intake:oklch',
          'pipeline': ['intake:oklch']
        },
        'kind': 'happy',
        'name': 'intake:oklch emits a canonical required-field record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-lab] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-lab]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': [LabInputEntity.intake({ 'a': 20, 'b': -30, 'l': 50 })] },
          'label': 'intake:lab',
          'pipeline': ['intake:lab']
        },
        'kind': 'happy',
        'name': 'intake:lab admits its canonical input entity'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-named] must not throw');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-named]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': ['rebeccapurple'] },
          'label': 'intake:named',
          'pipeline': ['intake:named']
        },
        'kind': 'happy',
        'name': 'intake:named emits a canonical required-field record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-any] must not throw');
          assert.ok(output!.records.length >= 3, `[cell=2, scenario=intake-any] expected at least three records, got ${output!.records.length}`);
          const recordCount = output!.records.length;
          for (let index = 0; index < recordCount; index += 1) {
            const record = output!.records.at(index);
            if (record === undefined) {
              throw new Error(`[cell=2, scenario=intake-any] missing record ${index}`);
            }
            TestColorRecordFixture.assertShape(record, output!.expectedKeys, `[cell=2, scenario=intake-any] record[${index}]`);
          }
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': ['#3b82f6', OklchInputEntity.intake({ 'c': 0.15, 'h': 250, 'l': 0.6 }), 'rebeccapurple'] },
          'label': 'intake:any',
          'pipeline': ['intake:any']
        },
        'kind': 'happy',
        'name': 'intake:any preserves the canonical shape for every normalized record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=intake-imagePixels] must not throw');
          assert.strictEqual(output!.records.length, 2, '[cell=2, scenario=intake-imagePixels] two records');
          TestColorRecordFixture.assertShape(output!.records.at(0)!, output!.expectedKeys, '[cell=2, scenario=intake-imagePixels] record[0]');
          TestColorRecordFixture.assertShape(output!.records.at(1)!, output!.expectedKeys, '[cell=2, scenario=intake-imagePixels] record[1]');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': { 'colors': [{ 'data': new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255]), 'height': 1, 'width': 2 }] },
          'label': 'intake:imagePixels',
          'pipeline': ['intake:imagePixels']
        },
        'kind': 'edge',
        'name': 'intake:imagePixels keeps both normalized records schema-valid'
      }
    ];

    new ScenarioRunner<Cell2InputInterface, Cell2OutputInterface>(
      'ColorRecordShape :: cell-2 :: intake',
      (input) => {
        const engine = TestColorRecordFixture.makeEngine();
        engine.pipeline(input.pipeline);
        const state = engine.run(InputInterfaceTypeEntity.create(input.input));
        return { 'expectedKeys': input.expectedKeys, 'label': input.label, 'records': state.colors };
      }
    ).run(scenarios);
  }

  static runClampScenarios(): void {
    const scenarios: readonly ScenarioInterface<Cell3InputInterface, Cell3OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hex] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, `[cell=3, scenario=clamp-hex] ${output!.label}`);
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
          'input': {
            'colors': ['#3b82f6'],
            'roles': RoleSchemaInterfaceTypeEntity.intake({
              'name': 'tight-blue',
              'roles': [{ 'chromaRange': [0, 0.02], 'lightnessRange': [0.5, 0.6], 'name': 'background' }]
            })
          },
          'label': 'clamp:oklch-pre-hint',
          'onRunStartTask': undefined,
          'pipeline': ['intake:hex', 'clamp:oklch']
        },
        'kind': 'happy',
        'name': 'clamp:oklch preserves a canonical required-field record'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hinted] must not throw');
          TestColorRecordFixture.assertShape(output!.record, output!.expectedKeys, '[cell=3, scenario=clamp-hinted]');
          assert.ok(output!.record.oklch.c <= 0.02, `[cell=3, scenario=clamp-hinted] clamp fired: C=${output!.record.oklch.c}`);
          assert.strictEqual(output!.record.hints?.role, 'background', '[cell=3, scenario=clamp-hinted] role hint preserved');
          assert.strictEqual(output!.record.sourceFormat, 'hex', '[cell=3, scenario=clamp-hinted] sourceFormat preserved');
        },
        'input': {
          'expectedKeys': ['alpha', 'hex', 'hints', 'oklch', 'rgb', 'sourceFormat'],
          'input': {
            'colors': [],
            'roles': RoleSchemaInterfaceTypeEntity.intake({
              'name': 'tight-blue',
              'roles': [{ 'chromaRange': [0, 0.02], 'lightnessRange': [0.5, 0.6], 'name': 'background', 'required': true }]
            })
          },
          'label': 'clamp:oklch+hint',
          'onRunStartTask': new TestSeedHintedTask(colorRecordFactory.fromHex('#3b82f6', {
            'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'background' }),
            'sourceFormat': 'hex'
          })),
          'pipeline': ['clamp:oklch']
        },
        'kind': 'happy',
        'name': 'clamp:oklch preserves an explicitly present role hint'
      }
    ];

    new ScenarioRunner<Cell3InputInterface, Cell3OutputInterface>(
      'ColorRecordShape :: cell-3 :: clamp',
      (input) => {
        const engine = TestColorRecordFixture.makeEngine();
        if (input.onRunStartTask !== undefined) {
          engine.tasks.hook(input.onRunStartTask);
        }
        engine.pipeline(input.pipeline);
        const state = engine.run(InputInterfaceTypeEntity.create(input.input));
        const record = state.colors.at(0);
        if (record === undefined) {
          throw new Error('[cell=3] expected clamp pipeline to produce one record');
        }
        return { 'expectedKeys': input.expectedKeys, 'label': input.label, 'record': record };
      }
    ).run(scenarios);
  }

  static runStabilityScenario(): void {
    void test('ColorRecordShape :: cell-4 :: stability :: every factory path keeps canonical ordering for its actual shape', () => {
      const records: readonly ColorRecordInterfaceTypeEntity.Type[] = [
        colorRecordFactory.fromOklch(0.5, 0.1, 200),
        colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'r' }) }),
        colorRecordFactory.fromRgb(0.3, 0.6, 0.9),
        colorRecordFactory.fromRgb(0.3, 0.6, 0.9, { 'sourceFormat': 'lab' }),
        colorRecordFactory.fromHex('#abcdef'),
        colorRecordFactory.fromHex('#abcdef80'),
        colorRecordFactory.fromHex('#abcdef', { 'alphaOverride': 0.5 }),
        colorRecordFactory.fromHex('#abcdef', { 'sourceFormat': 'named' }),
        colorRecordFactory.fromHsl(0, 1, 0.5)
      ];
      const expectedKeys: readonly (readonly string[])[] = [
        ['alpha', 'displayP3', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'displayP3', 'hex', 'hints', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
        ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat']
      ];
      const recordCount = records.length;
      for (let index = 0; index < recordCount; index += 1) {
        const record = records.at(index);
        const keys = expectedKeys.at(index);
        if (record === undefined || keys === undefined) {
          throw new Error(`[cell=4, scenario=stability] missing fixture ${index}`);
        }
        TestColorRecordFixture.assertShape(record, keys, `[cell=4, scenario=stability] record[${index}]`);
      }
    });
  }
}

ColorRecordShapeScenarios.runFactoryScenarios();
ColorRecordShapeScenarios.runIntakeScenarios();
ColorRecordShapeScenarios.runClampScenarios();
ColorRecordShapeScenarios.runStabilityScenario();
