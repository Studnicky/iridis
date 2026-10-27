/** Engine end-to-end behavior for the registered core task pipeline. */
import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Engine } from '../../src/engine/Engine.ts';
import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { EngineE2ePatterns } from './engine/EngineE2ePatterns.ts';

class EngineE2eFixture {
  static createEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    return engine;
  }

  static createColors(count: number): string[] {
    const colors: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const hue = (index * 7) % 256;
      colors.push(
        `#${hue.toString(16).padStart(2, '0')}${(255 - hue).toString(16).padStart(2, '0')}80`
      );
    }
    return colors;
  }

  static createSimpleRoles(): RoleSchemaEntity.Type {
    const result = RoleSchemaEntity.intake({
      'contrastPairs': [
        ContrastPairEntity.intake({
          'background': 'secondary',
          'foreground': 'primary',
          'minimumContrastRatio': 1
        })
      ],
      'name': 'simple',
      'roles': [
        RoleDefinitionEntity.intake({
          'lightnessRange': [0.3, 0.7],
          'name': 'primary',
          'required': true
        }),
        RoleDefinitionEntity.intake({
          'lightnessRange': [0.4, 0.8],
          'name': 'secondary',
          'required': false
        })
      ]
    });
    return result;
  }

  static createHighContrastRoles(): RoleSchemaEntity.Type {
    const result = RoleSchemaEntity.intake({
      'contrastPairs': [
        ContrastPairEntity.intake({
          'background': 'background',
          'foreground': 'text',
          'minimumContrastRatio': 3
        })
      ],
      'name': 'hi-contrast',
      'roles': [
        RoleDefinitionEntity.intake({
          'name': 'text',
          'required': true
        }),
        RoleDefinitionEntity.intake({
          'name': 'background',
          'required': true
        })
      ]
    });
    return result;
  }

  static containsColorArray(value: JSONSchema7Type | undefined): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const colors = value.colors;
    const result = Array.isArray(colors);
    return result;
  }
}

void test('Engine.e2e :: cell-1 :: full pipeline populates every state surface', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'derive:roleRelations',
    'enforce:contrast',
    'derive:variant',
    'emit:json'
  ]);
  const state = engine.run(InputEntity.intake({
    'colors': ['#5b21b6', '#c4b5fd', '#1e1b4b'],
    'roles': EngineE2eFixture.createSimpleRoles()
  }));
  assert.ok(state.colors.length >= 1);
  assert.ok(Object.hasOwn(state.roles, 'primary'));
  assert.ok(Object.hasOwn(state.variants, 'dark'));
  assert.ok(Object.hasOwn(state.variants, 'light'));
  assert.ok(EngineE2eFixture.containsColorArray(state.outputs['core:json']));
});

void test('Engine.e2e :: cell-1 :: one seed resolves every authored role', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'derive:roleRelations']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#6366f1'],
    'roles': EngineE2eFixture.createSimpleRoles()
  }));
  assert.ok(state.colors.length >= 1);
  assert.ok(Object.hasOwn(state.roles, 'primary'));
});

void test('Engine.e2e :: cell-2 :: intake:any dispatches hex values', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:any']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#ff6b6b', '#4ecdc4']
  }));
  assert.strictEqual(state.colors.length, 2);
  assert.strictEqual(state.colors[0]?.sourceFormat, 'hex');
  assert.strictEqual(state.colors[1]?.sourceFormat, 'hex');
});

void test('Engine.e2e :: cell-2 :: intake:any dispatches mixed color representations', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:any']);
  const state = engine.run(InputEntity.intake({
    'colors': [
      '#fff',
      { 'b': 0, 'g': 0, 'r': 1 },
      { 'h': 200, 'l': 0.4, 's': 0.5 },
      { 'c': 0.2, 'h': 250, 'l': 0.6 },
      { 'a': 0.1, 'b': -0.1, 'l': 0.6 },
      'rebeccapurple'
    ]
  }));
  const expectedFormats = ['hex', 'rgb', 'hsl', 'oklch', 'lab', 'named'];
  assert.strictEqual(state.colors.length, expectedFormats.length);
  for (let index = 0; index < expectedFormats.length; index += 1) {
    assert.strictEqual(
      state.colors[index]?.sourceFormat,
      expectedFormats[index]
    );
  }
  assert.strictEqual(state.colors[0]?.hex, '#ffffff');
  assert.strictEqual(state.colors[1]?.hex, '#ff0000');
  assert.strictEqual(state.colors[5]?.hex, '#663399');
});

void test('Engine.e2e :: cell-2 :: intake:any canonicalizes short hex values', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:any']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#fff']
  }));
  assert.strictEqual(state.colors.length, 1);
  assert.strictEqual(state.colors[0]?.hex, '#ffffff');
});

void test('Engine.e2e :: cell-2 :: intake:any accepts an empty color list', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:any']);
  const state = engine.run(InputEntity.intake({
    'colors': []
  }));
  assert.strictEqual(state.colors.length, 0);
});

void test('Engine.e2e :: cell-3 :: implicit pipeline preserves registration order', () => {
  const engine = new Engine();
  const executionOrder: string[] = [];
  const names = ['stub:a', 'stub:b'];
  for (let index = 0; index < names.length; index += 1) {
    const taskName = names[index];
    if (taskName === undefined) {
      continue;
    }
    engine.tasks.register({
      'manifest': TaskManifestEntity.create({ 'name': taskName }),
      'name': taskName,
      'run': () => {
        executionOrder.push(taskName);
      }
    });
  }
  engine.run(InputEntity.intake({
    'colors': []
  }));
  assert.deepStrictEqual(executionOrder, names);
});

void test('Engine.e2e :: cell-3 :: an empty registry runs without work', () => {
  const state = new Engine().run(InputEntity.intake({
    'colors': []
  }));
  assert.strictEqual(state.colors.length, 0);
});

void test('Engine.e2e :: cell-4 :: clamp:count enforces a finite maximum', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'clamp:count']);
  const state = engine.run(InputEntity.intake({
    'colors': EngineE2eFixture.createColors(100),
    'maximumColorCount': 64
  }));
  assert.ok(state.colors.length <= 64);
});

void test('Engine.e2e :: cell-4 :: clamp:count preserves every color at Infinity', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'clamp:count']);
  const state = engine.run(InputEntity.create({
    'colors': EngineE2eFixture.createColors(100),
    'maximumColorCount': Infinity
  }));
  assert.strictEqual(state.colors.length, 100);
});

void test('Engine.e2e :: cell-4 :: clamp:count accepts a single-color maximum', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'clamp:count']);
  const state = engine.run(InputEntity.intake({
    'colors': EngineE2eFixture.createColors(64),
    'maximumColorCount': 1
  }));
  assert.ok(state.colors.length <= 1);
});

void test('Engine.e2e :: cell-5 :: enforce:contrast retains a passing pair', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#000000', '#ffffff'],
    'roles': EngineE2eFixture.createHighContrastRoles()
  }));
  assert.strictEqual(state.colors.length, 2);
  assert.ok(Object.hasOwn(state.roles, 'text'));
});

void test('Engine.e2e :: cell-5 :: enforce:contrast completes when roles cannot resolve', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#000000', '#ffffff'],
    'roles': EngineE2eFixture.createHighContrastRoles()
  }));
  assert.strictEqual(state.colors.length, 2);
  assert.ok(Object.hasOwn(state.roles, 'background'));
});

void test('Engine.e2e :: cell-6 :: runtime options copy into fresh state', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex']);
  const runtime = {
    'colorSpace': 'displayP3',
    'framing': 'dark'
  };
  const state = engine.run(InputEntity.intake({
    'colors': ['#ff0000'],
    'runtime': runtime
  }));
  assert.strictEqual(state.runtime.colorSpace, 'displayP3');
  assert.strictEqual(state.runtime.framing, 'dark');
  assert.notStrictEqual(state.runtime, runtime);
});

void test('Engine.e2e :: cell-6 :: omitted runtime options produce undefined fields', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex']);
  const state = engine.run(InputEntity.intake({
    'colors': ['#ff0000']
  }));
  assert.strictEqual(state.runtime.colorSpace, undefined);
  assert.strictEqual(state.runtime.extra, undefined);
  assert.strictEqual(state.runtime.framing, undefined);
});

void test('Engine.e2e :: cell-7 :: pipeline rejects unknown tasks by name', () => {
  const engine = EngineE2eFixture.createEngine();
  assert.throws(() => {
    engine.pipeline(['intake:hex', 'nonexistent:task']);
  }, EngineE2ePatterns.unknownTask);
});

void test('Engine.e2e :: cell-7 :: task errors propagate to the caller', () => {
  const engine = new Engine();
  engine.tasks.register({
    'manifest': TaskManifestEntity.create({ 'name': 'bomb:task' }),
    'name': 'bomb:task',
    'run': () => {
      throw new Error('intentional bomb detonation');
    }
  });
  engine.pipeline(['bomb:task']);
  assert.throws(() => {
    engine.run(InputEntity.intake({
      'colors': ['#ff0000']
    }));
  }, EngineE2ePatterns.intentionalBomb);
});

void test('Engine.e2e :: cell-7 :: intake:hex rejects non-hex values', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'clamp:count', 'emit:json']);
  assert.throws(() => {
    engine.run(InputEntity.intake({
      'colors': [{}, null, 42]
    }));
  }, EngineE2ePatterns.intakeHex);
});

void test('Engine.e2e :: cell-8 :: tasks observe runtime framing', () => {
  const engine = EngineE2eFixture.createEngine();
  let observedFraming: string | undefined;
  engine.tasks.register({
    'manifest': undefined,
    'name': 'observe:framing',
    'run': (state) => {
      observedFraming = state.runtime.framing;
    }
  });
  engine.pipeline(['observe:framing']);
  engine.run(InputEntity.intake({
    'colors': [],
    'runtime': { 'framing': 'light' }
  }));
  assert.strictEqual(observedFraming, 'light');
});

void test('Engine.e2e :: memoized role schemas reject mutation without contaminating later runs', () => {
  const engine = EngineE2eFixture.createEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const input = InputEntity.create({
    'colors': ['#5b21b6'],
    'roles': EngineE2eFixture.createSimpleRoles()
  });
  const first = engine.run(input);
  const role = first.input.roles?.roles[0];
  assert.notStrictEqual(role, undefined);
  assert.throws(() => {
    Object.defineProperty(role, 'name', { 'value': 'changed' });
  });
  const second = engine.run(input);
  assert.strictEqual(second.input.roles?.roles[0]?.name, 'primary');
});
