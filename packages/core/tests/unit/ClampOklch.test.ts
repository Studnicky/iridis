/**
 * Behavioral coverage for the `clamp:oklch` pipeline task.
 *
 * The task selects the applicable role envelope, preserves an in-range
 * record by identity, and rebuilds a record when lightness or chroma
 * falls outside that envelope.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../src/interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { RoleSchemaInterfaceTypeEntity } from '../../src/entities/RoleSchemaInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { coreTasks } from '../../src/tasks/index.ts';

class SeedColorTask implements TaskInterface {
  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'name': 'seed:onRunStart',
    'phase': 'onRunStart'
  });

  readonly 'name' = 'seed:onRunStart';

  readonly #color: ColorRecordInterfaceTypeEntity.Type;

  constructor(color: ColorRecordInterfaceTypeEntity.Type) {
    this.#color = color;
  }

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.colors.push(this.#color);
  }
}

class ClampOklchFixture {
  static engine(seed: ColorRecordInterfaceTypeEntity.Type): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.tasks.hook(new SeedColorTask(seed));
    engine.pipeline(['clamp:oklch']);
    return engine;
  }

  static input(roles?: RoleSchemaInterfaceTypeEntity.Type): InputInterfaceTypeEntity.Type {
    const candidate = {
      'colors': [],
      ...(roles === undefined ? {} : { 'roles': roles })
    };
    assert.strictEqual(InputInterfaceTypeEntity.validate(candidate), true, 'fixture input conforms to the public input entity');
    const result = InputInterfaceTypeEntity.intake(candidate);
    return result;
  }

  static run(
    seed: ColorRecordInterfaceTypeEntity.Type,
    roles?: RoleSchemaInterfaceTypeEntity.Type
  ): ColorRecordInterfaceTypeEntity.Type {
    const engine = ClampOklchFixture.engine(seed);
    const state = engine.run(ClampOklchFixture.input(roles));
    const result = state.colors.at(0);
    if (result === undefined) {
      throw new Error('clamp:oklch drops the seeded record');
    }
    return result;
  }
}

await test('ClampOklch uses the default envelope without a role schema', () => {
  const seed = colorRecordFactory.fromOklch(0.5, 0.1, 200);
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color, seed);
  assert.ok(Math.abs(color.oklch.l - 0.5) < Number.EPSILON);
  assert.ok(Math.abs(color.oklch.c - 0.1) < Number.EPSILON);
});

await test('ClampOklch uses a declared role envelope for a hinted record', () => {
  const roles = RoleSchemaInterfaceTypeEntity.intake({
    'name': 'tight-accent',
    'roles': [{ 'chromaRange': [0.05, 0.15], 'lightnessRange': [0.40, 0.60], 'name': 'accent' }]
  });
  const seed = colorRecordFactory.fromOklch(
    0.5,
    0.1,
    200,
    { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'accent' }) }
  );
  const color = ClampOklchFixture.run(seed, roles);

  assert.strictEqual(color, seed);
  assert.strictEqual(color.hints?.role, 'accent');
});

await test('ClampOklch falls back to the default envelope when a declared role has no ranges', () => {
  const roles = RoleSchemaInterfaceTypeEntity.intake({
    'name': 'mystery-only',
    'roles': [{ 'name': 'mystery' }]
  });
  const seed = colorRecordFactory.fromOklch(
    0.5,
    0.1,
    200,
    { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'mystery' }) }
  );
  const color = ClampOklchFixture.run(seed, roles);

  assert.strictEqual(color, seed);
  assert.strictEqual(color.hints?.role, 'mystery');
});

await test('ClampOklch falls back to the default envelope when the hinted role is undeclared', () => {
  const roles = RoleSchemaInterfaceTypeEntity.intake({
    'name': 'no-match',
    'roles': [{ 'lightnessRange': [0.40, 0.60], 'name': 'accent' }]
  });
  const seed = colorRecordFactory.fromOklch(
    0.5,
    0.1,
    200,
    { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'unknown-role' }) }
  );
  const color = ClampOklchFixture.run(seed, roles);

  assert.strictEqual(color, seed);
});

await test('ClampOklch clamps lightness above the default envelope', () => {
  const seed = colorRecordFactory.fromOklch(0.999, 0.1, 200);
  const color = ClampOklchFixture.run(seed);

  assert.notStrictEqual(color, seed);
  assert.ok(color.oklch.l <= 0.95 + 1e-9);
  assert.ok(color.oklch.l >= 0.05 - 1e-9);
  assert.ok(Math.abs(color.oklch.h - 200) < 1e-6);
});

await test('ClampOklch clamps lightness below the default envelope', () => {
  const seed = colorRecordFactory.fromOklch(0.001, 0.1, 200);
  const color = ClampOklchFixture.run(seed);

  assert.notStrictEqual(color, seed);
  assert.ok(color.oklch.l >= 0.05 - 1e-9);
});

await test('ClampOklch clamps chroma above a role envelope', () => {
  const roles = RoleSchemaInterfaceTypeEntity.intake({
    'name': 'tight-accent',
    'roles': [{ 'chromaRange': [0, 0.1], 'name': 'accent' }]
  });
  const seed = colorRecordFactory.fromOklch(
    0.5,
    0.3,
    200,
    { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'accent' }) }
  );
  const color = ClampOklchFixture.run(seed, roles);

  assert.notStrictEqual(color, seed);
  assert.ok(color.oklch.c <= 0.1 + 1e-9);
  assert.strictEqual(color.hints?.role, 'accent');
  assert.ok(Math.abs(color.oklch.l - 0.5) < Number.EPSILON);
});

await test('ClampOklch preserves source format when rebuilding a record', () => {
  const seed = colorRecordFactory.fromOklch(0.999, 0.1, 200, { 'sourceFormat': 'hex' });
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color.sourceFormat, 'hex');
});

await test('ClampOklch preserves supplied hints when rebuilding a record', () => {
  const seed = colorRecordFactory.fromOklch(
    0.999,
    0.1,
    200,
    { 'hints': ColorHintsInterfaceTypeEntity.intake({ 'role': 'bg', 'weight': 5 }) }
  );
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color.hints?.role, 'bg');
  assert.strictEqual(color.hints?.weight, 5);
});

await test('ClampOklch clamps chroma above the default envelope', () => {
  const seed = colorRecordFactory.fromOklch(0.5, 0.5, 200);
  const color = ClampOklchFixture.run(seed);

  assert.notStrictEqual(color, seed);
  assert.ok(color.oklch.c <= 0.4 + 1e-9);
});

await test('ClampOklch preserves the lower lightness boundary by identity', () => {
  const seed = colorRecordFactory.fromOklch(0.05, 0.1, 200);
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color, seed);
});

await test('ClampOklch preserves the upper lightness boundary by identity', () => {
  const seed = colorRecordFactory.fromOklch(0.95, 0.1, 200);
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color, seed);
});

await test('ClampOklch preserves zero chroma by identity', () => {
  const seed = colorRecordFactory.fromOklch(0.5, 0, 200);
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color, seed);
});

await test('ClampOklch preserves the upper chroma boundary by identity', () => {
  const seed = colorRecordFactory.fromOklch(0.5, 0.4, 200);
  const color = ClampOklchFixture.run(seed);

  assert.strictEqual(color, seed);
});
