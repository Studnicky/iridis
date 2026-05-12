/**
 * End-to-end pipeline integration test.
 *
 * Uses only stub tasks (no real intake/transform/emit implementations) so that
 * this test depends solely on foundation files and can run while other agents
 * are still building task implementations.
 *
 * Pipeline stage model:
 *   intake   — writes colors from raw input into state.colors
 *   transform — derives roles from colors
 *   emit     — writes final output from roles
 */
import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { assert } from './ScenarioRunner.ts';
import { test } from 'node:test';

// ---------------------------------------------------------------------------
// Stub task factories
// ---------------------------------------------------------------------------

function makeIntakeTask(): TaskInterface {
  return {
    'name': 'stub:intake',
    'manifest': {
      'name':    'stub:intake',
      'reads':   ['input.colors'],
      'writes':  ['colors'],
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      // Push a synthetic stub color record for each raw entry
      for (const raw of state.input.colors) {
        const hex = typeof raw === 'string' ? raw : '#000000';
        state.colors.push({
          'oklch':        { 'l': 0.5, 'c': 0.1, 'h': 0 },
          'rgb':          { 'r': 128, 'g': 128, 'b': 128 },
          'hex':          hex,
          'alpha':        1,
          'sourceFormat': 'hex',
        });
      }
    },
  };
}

function makeTransformTask(): TaskInterface {
  return {
    'name': 'stub:transform',
    'manifest': {
      'name':   'stub:transform',
      'reads':  ['colors'],
      'writes': ['roles'],
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      // Derive a single 'primary' role from the first color
      const first = state.colors[0];
      if (first) {
        state.roles['primary'] = first;
      }
    },
  };
}

function makeEmitTask(): TaskInterface {
  return {
    'name': 'stub:emit',
    'manifest': {
      'name':   'stub:emit',
      'reads':  ['roles'],
      'writes': ['outputs.stub'],
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      const varMap: Record<string, string> = {};
      for (const [role, record] of Object.entries(state.roles)) {
        varMap[`--color-${role}`] = record.hex;
      }
      (state.outputs as Record<string, unknown>)['stub'] = varMap;
    },
  };
}

function makeStubPlugin(): PluginInterface {
  return {
    'name':    'stub-pipeline',
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] {
      return [makeIntakeTask(), makeTransformTask(), makeEmitTask()];
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('Pipeline :: integration :: happy :: full stub pipeline state flows end-to-end', async () => {
  const engine = new Engine();
  engine.adopt(makeStubPlugin());
  engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);

  const input: InputInterface = {
    'colors': ['#8B5CF6'],
    'metadata': { 'source': 'integration-test' },
  };

  const state = await engine.run(input);

  // Intake: colors populated
  assert.strictEqual(state.colors.length, 1);
  assert.strictEqual(state.colors[0]?.hex, '#8B5CF6');

  // Transform: roles derived
  assert.ok('primary' in state.roles);
  assert.strictEqual(state.roles['primary']?.hex, '#8B5CF6');

  // Emit: output written
  const stub = state.outputs['stub'] as Record<string, string> | undefined;
  assert.ok(stub !== undefined);
  assert.strictEqual(stub['--color-primary'], '#8B5CF6');
});

test('Pipeline :: integration :: happy :: metadata flows through unchanged', async () => {
  const engine = new Engine();
  engine.adopt(makeStubPlugin());
  engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);

  const state = await engine.run({
    'colors': ['#ffffff'],
    'metadata': { 'category': 'music', 'version': 2 },
  });

  assert.strictEqual(state.metadata['category'], 'music');
  assert.strictEqual(state.metadata['version'], 2);
});

test('Pipeline :: integration :: happy :: multiple seed colors produce multiple roles', async () => {
  const engine = new Engine();

  // Custom transform that maps each color to a role by index
  const multiTransform: TaskInterface = {
    'name': 'stub:transform',
    'manifest': { 'name': 'stub:transform' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      state.colors.forEach((record, i) => {
        state.roles[`color-${i}`] = record;
      });
    },
  };

  const plugin: PluginInterface = {
    'name':    'multi-color-plugin',
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return [makeIntakeTask(), multiTransform, makeEmitTask()]; },
  };

  engine.adopt(plugin);
  engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);

  const state = await engine.run({ 'colors': ['#ff0000', '#00ff00', '#0000ff'] });

  assert.strictEqual(state.colors.length, 3);
  assert.ok('color-0' in state.roles);
  assert.ok('color-1' in state.roles);
  assert.ok('color-2' in state.roles);
  assert.strictEqual(state.roles['color-0']?.hex, '#ff0000');
  assert.strictEqual(state.roles['color-1']?.hex, '#00ff00');
  assert.strictEqual(state.roles['color-2']?.hex, '#0000ff');
});

test('Pipeline :: integration :: edge :: empty colors input produces empty outputs', async () => {
  const engine = new Engine();
  engine.adopt(makeStubPlugin());
  engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);

  const state = await engine.run({ 'colors': [] });

  assert.strictEqual(state.colors.length, 0);
  assert.deepStrictEqual(Object.keys(state.roles).length, 0);
  const stub = state.outputs['stub'] as Record<string, string> | undefined;
  assert.ok(stub !== undefined);
  assert.strictEqual(Object.keys(stub).length, 0);
});

test('Pipeline :: integration :: happy :: context engine reference is the same engine', async () => {
  const engine = new Engine();
  let capturedEngine: unknown;

  const inspectTask: TaskInterface = {
    'name': 'inspect:ctx',
    'manifest': { 'name': 'inspect:ctx' },
    run(_state: PaletteStateInterface, ctx: PipelineContextInterface): void {
      capturedEngine = ctx.engine;
    },
  };

  const plugin: PluginInterface = {
    'name':    'inspect-plugin',
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return [inspectTask]; },
  };

  engine.adopt(plugin);
  engine.pipeline(['inspect:ctx']);
  await engine.run({ 'colors': [] });

  assert.strictEqual(capturedEngine, engine);
});

test('Pipeline :: integration :: unhappy :: task that throws propagates error to caller', async () => {
  const engine = new Engine();

  const errorTask: TaskInterface = {
    'name': 'task:throws',
    'manifest': { 'name': 'task:throws' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      throw new Error('intentional pipeline failure');
    },
  };

  const plugin: PluginInterface = {
    'name':    'error-plugin',
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return [errorTask]; },
  };

  engine.adopt(plugin);
  engine.pipeline(['task:throws']);

  await assert.rejects(
    () => engine.run({ 'colors': ['#000'] }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('intentional pipeline failure'));
      return true;
    },
  );
});
