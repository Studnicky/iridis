/** Multi-stage core pipeline behavior. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../src/entities/ContrastPairInterfaceTypeEntity.ts';
import { ContrastReportEntryInterfaceTypeEntity } from '../../src/entities/ContrastReportEntryInterfaceTypeEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { JsonOutputEntity } from '../../src/entities/JsonOutputEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { Metadata } from '../../src/types/metadata.ts';

class PipelineCompositionFixtures {
  static createEngine(): Engine {
    const engine = new Engine();
    coreTasks.forEach((task) => {
      engine.tasks.register(task);
    });
    return engine;
  }

  static createHintedColor(
    lightness: number,
    chroma: number,
    hue: number,
    red: number,
    green: number,
    blue: number,
    hexadecimal: string,
    roleName: string
  ): ColorRecordInterfaceTypeEntity.Type {
    const record = ColorRecordInterfaceTypeEntity.intake({
      'alpha': 1,
      'hex': hexadecimal,
      'hints': { 'role': roleName },
      'oklch': { 'c': chroma, 'h': hue, 'l': lightness },
      'rgb': { 'b': blue, 'g': green, 'r': red },
      'sourceFormat': 'hex'
    });
    return record;
  }
}

await test('Pipeline composition assigns distance and hinted roles', () => {
  const distanceEngine = PipelineCompositionFixtures.createEngine();
  distanceEngine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'emit:json']);
  const distanceState = distanceEngine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#6d28d9', '#f5f3ff', '#1c1917'],
    'roles': RoleSchemaInterfaceTypeEntity.intake({
      'name': 'distance-role-schema',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'accent', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'surface', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'text', 'required': false })
      ]
    })
  }));
  assert.ok('accent' in distanceState.roles);
  assert.ok('surface' in distanceState.roles);
  assert.ok('text' in distanceState.roles);

  const hintedAccent = PipelineCompositionFixtures.createHintedColor(0.6, 0.15, 250, 0.3, 0.2, 0.8, '#4d33cc', 'accent');
  const hintedSurface = PipelineCompositionFixtures.createHintedColor(0.95, 0.01, 0, 0.95, 0.95, 0.95, '#f2f2f2', 'surface');
  const hintedEngine = PipelineCompositionFixtures.createEngine();
  hintedEngine.tasks.hook({
    'manifest': TaskManifestInterfaceTypeEntity.create({ 'name': 'seed:hinted', 'phase': 'onRunStart' }),
    'name': 'seed:hinted',
    'run': (state: PaletteStateInterface): void => {
      state.colors.push(hintedAccent, hintedSurface);
    }
  });
  hintedEngine.pipeline(['resolve:roles', 'expand:family', 'emit:json']);
  const hintedState = hintedEngine.run(InputInterfaceTypeEntity.intake({
    'colors': [],
    'roles': RoleSchemaInterfaceTypeEntity.intake({
      'name': 'hinted-role-schema',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'accent', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'surface', 'required': true })
      ]
    })
  }));
  assert.strictEqual(hintedState.roles.accent, hintedAccent);
  assert.strictEqual(hintedState.roles.surface, hintedSurface);
});

await test('Pipeline composition emits dark and light variants', () => {
  const engine = PipelineCompositionFixtures.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'derive:variant', 'emit:json']);
  const state = engine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#6366f1', '#a5b4fc'],
    'roles': RoleSchemaInterfaceTypeEntity.intake({
      'name': 'variant-schema',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'primary', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'muted', 'required': true })
      ]
    })
  }));
  const darkVariant = state.variants.dark;
  const lightVariant = state.variants.light;
  const jsonOutput = state.outputs['core:json'];
  const json = jsonOutput === undefined ? undefined : JsonOutputEntity.intake(jsonOutput);
  assert.ok(darkVariant !== undefined);
  assert.ok(lightVariant !== undefined);
  assert.strictEqual(Object.keys(darkVariant).length, Object.keys(state.roles).length);
  assert.strictEqual(Object.keys(lightVariant).length, Object.keys(state.roles).length);
  const darkPrimary = darkVariant.primary;
  const primaryRole = state.roles.primary;
  assert.ok(darkPrimary !== undefined);
  assert.ok(primaryRole !== undefined);
  assert.ok(Math.abs(darkPrimary.oklch.l - (1 - primaryRole.oklch.l)) < 0.05);
  assert.ok(json !== undefined);
  assert.ok('dark' in json.variants);
  assert.ok('light' in json.variants);
});

await test('Pipeline composition records enforced contrast', () => {
  const engine = PipelineCompositionFixtures.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
  const state = engine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#1a1a2e', '#eeeeff'],
    'roles': RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [
        ContrastPairInterfaceTypeEntity.intake({
          'background': 'surface',
          'foreground': 'text',
          'minimumContrastRatio': 3
        })
      ],
      'name': 'contrast-schema',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'text', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'surface', 'required': true })
      ]
    })
  }));
  const rawReport = state.metadata['core:contrastReport'];
  assert.ok(rawReport !== undefined);
  const report = Metadata.contrastReport(state.metadata);
  assert.ok(report !== undefined);
  assert.strictEqual(report.pairs.length, 1);
  const firstEntry = report.pairs.at(0);
  assert.ok(firstEntry !== undefined);
  const entry = ContrastReportEntryInterfaceTypeEntity.intake(firstEntry);
  assert.strictEqual(entry.foreground, 'text');
  assert.strictEqual(entry.background, 'surface');
  assert.strictEqual(typeof entry.actual, 'number');
  assert.strictEqual(typeof entry.required, 'number');
  assert.strictEqual(typeof entry.passed, 'boolean');
});

await test('Pipeline composition makes a second contrast enforcement a no-op', () => {
  const engine = PipelineCompositionFixtures.createEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'enforce:contrast',
    'expand:family',
    'enforce:contrast',
    'emit:json'
  ]);
  const state = engine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#111111', '#f0f0f0'],
    'roles': RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [
        ContrastPairInterfaceTypeEntity.intake({
          'background': 'surface',
          'foreground': 'text',
          'minimumContrastRatio': 4.5
        })
      ],
      'name': 'idempotent-schema',
      'roles': [
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'text', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({ 'name': 'surface', 'required': true }),
        RoleDefinitionInterfaceTypeEntity.intake({
          'chromaRange': [0.01, 0.05],
          'derivedFrom': 'text',
          'name': 'text-muted'
        })
      ]
    })
  }));
  const report = Metadata.contrastReport(state.metadata);
  assert.ok(report !== undefined);
  const lastEntry = report.pairs.at(-1);
  assert.ok(lastEntry !== undefined);
  const entry = ContrastReportEntryInterfaceTypeEntity.intake(lastEntry);
  assert.strictEqual(entry.disposition, 'not-needed');
});

await test('Pipeline composition handles empty and absent role schemas', () => {
  const emptySchemaInput = InputInterfaceTypeEntity.intake({
    'colors': ['#ff0000', '#00ff00'],
    'roles': RoleSchemaInterfaceTypeEntity.intake({ 'name': 'empty-role-schema', 'roles': [] })
  });
  const absentSchemaInput = InputInterfaceTypeEntity.intake({
    'colors': ['#ff6b6b', '#4ecdc4']
  });
  [emptySchemaInput, absentSchemaInput].forEach((input) => {
    const engine = PipelineCompositionFixtures.createEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'emit:json']);
    const state = engine.run(input);
    const output = state.outputs['core:json'];
    assert.ok(output !== undefined);
    const json = JsonOutputEntity.intake(output);
    assert.strictEqual(json.colors.length, state.colors.length);
    assert.strictEqual(Object.keys(state.roles).length, 0);
    assert.strictEqual(Object.keys(state.variants).length, 0);
    assert.strictEqual(state.colors.length, 2);
  });

  const emptyInputEngine = PipelineCompositionFixtures.createEngine();
  emptyInputEngine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'emit:json']);
  const emptyInputState = emptyInputEngine.run(InputInterfaceTypeEntity.intake({
    'colors': [],
    'roles': RoleSchemaInterfaceTypeEntity.intake({ 'name': 'empty-input-role-schema', 'roles': [] })
  }));
  assert.strictEqual(emptyInputState.colors.length, 0);
  assert.strictEqual(Object.keys(emptyInputState.roles).length, 0);
  assert.strictEqual(Object.keys(emptyInputState.variants).length, 0);
});
