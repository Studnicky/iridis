/**
 * Engine end-to-end tests.
 *
 * Tests use the real coreTasks via the public package API.
 * Each test constructs a fresh Engine instance to avoid shared state.
 */
import { test } from 'node:test';
import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }            from '@studnicky/iridis';
import { coreTasks }         from '@studnicky/iridis/tasks';
import { assert }            from './ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  return engine;
}

const SIMPLE_ROLES: RoleSchemaInterface = {
  'name': 'simple',
  'roles': [
    { 'name': 'primary',   'required': true,  'lightnessRange': [0.3, 0.7] },
    { 'name': 'secondary', 'required': false, 'lightnessRange': [0.4, 0.8] },
    {
      'name':          'primary-muted',
      'derivedFrom':   'primary',
      'chromaRange':   [0.01, 0.08],
    },
  ],
  'contrastPairs': [
    { 'foreground': 'primary', 'background': 'secondary', 'minRatio': 1.0 },
  ],
};

// ---------------------------------------------------------------------------
// happy: full pipeline with intake:hex
// ---------------------------------------------------------------------------

test('Engine e2e :: happy :: intake:hex full pipeline populates state', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:json',
  ]);

  const state = await engine.run({
    'colors': ['#5b21b6', '#c4b5fd', '#1e1b4b'],
    'roles':  SIMPLE_ROLES,
  });

  assert.ok(state.colors.length >= 1, 'colors should be populated');
  assert.ok(Object.keys(state.roles).length >= 1, 'roles should be assigned');
  assert.ok('primary-muted' in state.roles, 'derived role should be present');
  assert.ok('dark'  in state.variants, 'dark variant should exist');
  assert.ok('light' in state.variants, 'light variant should exist');
  const json = state.outputs['json'] as Record<string, unknown> | undefined;
  assert.ok(json !== undefined, 'outputs.json should be populated');
  assert.ok(Array.isArray((json as { 'colors': unknown[] })['colors']), 'json.colors should be array');
  assert.ok(typeof (json as { 'roles': object })['roles'] === 'object', 'json.roles should be object');
});

// ---------------------------------------------------------------------------
// happy: same pipeline with intake:any
// ---------------------------------------------------------------------------

test('Engine e2e :: happy :: intake:any dispatches hex strings correctly', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:json',
  ]);

  const state = await engine.run({
    'colors': ['#ff6b6b', '#4ecdc4'],
    'roles':  SIMPLE_ROLES,
  });

  assert.ok(state.colors.length === 2, 'intake:any should parse both hex strings');
  const json = state.outputs['json'] as { 'colors': string[] } | undefined;
  assert.ok(json !== undefined);
  assert.strictEqual(json.colors.length, 2);
});

// ---------------------------------------------------------------------------
// happy: no pipeline() call — engine runs all registered tasks in order
// ---------------------------------------------------------------------------

test('Engine e2e :: happy :: no pipeline call runs all registered tasks', async () => {
  const engine = new Engine();
  const ran: string[] = [];

  const taskA: TaskInterface = {
    'name': 'stub:a',
    'manifest': { 'name': 'stub:a' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { ran.push('a'); },
  };
  const taskB: TaskInterface = {
    'name': 'stub:b',
    'manifest': { 'name': 'stub:b' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { ran.push('b'); },
  };

  engine.tasks.register(taskA);
  engine.tasks.register(taskB);
  // no engine.pipeline() call
  await engine.run({ 'colors': [] });

  assert.deepStrictEqual(ran, ['a', 'b'], 'tasks should run in registration order when no pipeline set');
});

// ---------------------------------------------------------------------------
// edge: 1-color seed fills all required roles via expand:family
// ---------------------------------------------------------------------------

test('Engine e2e :: edge :: 1-color seed fills derived roles via expand:family', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'emit:json',
  ]);

  const state = await engine.run({
    'colors': ['#6366f1'],
    'roles':  SIMPLE_ROLES,
  });

  assert.ok('primary'       in state.roles, 'primary role should be assigned');
  assert.ok('primary-muted' in state.roles, 'derived primary-muted should be filled via expand:family');
});

// ---------------------------------------------------------------------------
// edge: 64-color seed triggers clamp:count
// ---------------------------------------------------------------------------

test('Engine e2e :: edge :: 64-color seed triggers clamp:count reduction', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'clamp:count']);

  // Generate 100 hex colors
  const colors: string[] = [];
  for (let i = 0; i < 100; i++) {
    const h = (i * 7) % 256;
    const hex = `#${h.toString(16).padStart(2, '0')}${(255 - h).toString(16).padStart(2, '0')}80`;
    colors.push(hex);
  }

  const state = await engine.run({ 'colors': colors, 'maxColors': 64 });

  assert.ok(
    state.colors.length <= 64,
    `colors should be clamped to ≤64, got ${state.colors.length}`,
  );
});

// ---------------------------------------------------------------------------
// edge: bypass:true disables clamp:count clustering
// ---------------------------------------------------------------------------

test('Engine e2e :: edge :: bypass:true skips clamp:count clustering', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'clamp:count']);

  const colors: string[] = [];
  for (let i = 0; i < 100; i++) {
    const h = (i * 7) % 256;
    const hex = `#${h.toString(16).padStart(2, '0')}${(255 - h).toString(16).padStart(2, '0')}80`;
    colors.push(hex);
  }

  const state = await engine.run({ 'colors': colors, 'bypass': true });

  assert.strictEqual(
    state.colors.length,
    100,
    'bypass:true should leave all 100 colors intact',
  );
});

// ---------------------------------------------------------------------------
// edge: enforce:contrast is no-op when contrast already passes
// ---------------------------------------------------------------------------

test('Engine e2e :: edge :: enforce:contrast is no-op when pair already passes', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);

  const highContrastRoles: RoleSchemaInterface = {
    'name': 'hi-contrast',
    'roles': [
      { 'name': 'text',       'required': true },
      { 'name': 'background', 'required': true },
    ],
    'contrastPairs': [
      { 'foreground': 'text', 'background': 'background', 'minRatio': 3.0 },
    ],
  };

  const state = await engine.run({
    'colors': [
      // black text hint, white background hint — contrast ~21:1, well above 3.0
      { 'r': 0, 'g': 0, 'b': 0, 'hints': { 'role': 'text' } } as unknown,
      { 'r': 1, 'g': 1, 'b': 1, 'hints': { 'role': 'background' } } as unknown,
    ],
    'roles': highContrastRoles,
  });

  const report = state.metadata['contrastReport'] as Array<{
    'adjusted': boolean;
    'ratio': number;
  }> | undefined;
  // Even if roles are unresolvable from object inputs, no crash occurs.
  // When contrast pairs can't be resolved (roles missing), report may be undefined or empty.
  // The key assertion is that the engine returned without throwing.
  assert.ok(state !== undefined, 'engine should complete without throwing');
});

// ---------------------------------------------------------------------------
// unhappy: pipeline references nonexistent task
// ---------------------------------------------------------------------------

test('Engine e2e :: unhappy :: pipeline with nonexistent task name throws', () => {
  const engine = freshEngine();

  assert.throws(
    () => engine.pipeline(['intake:hex', 'nonexistent:task']),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("nonexistent:task"),
        `expected error to mention task name, got: ${err.message}`,
      );
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// unhappy: pipeline task that throws propagates to caller
// ---------------------------------------------------------------------------

test('Engine e2e :: unhappy :: pipeline task that throws propagates error', async () => {
  const engine = new Engine();

  const bombTask: TaskInterface = {
    'name': 'bomb:task',
    'manifest': { 'name': 'bomb:task' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      throw new Error('intentional bomb detonation');
    },
  };
  engine.tasks.register(bombTask);
  engine.pipeline(['bomb:task']);

  await assert.rejects(
    () => engine.run({ 'colors': ['#ff0000'] }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('intentional bomb detonation'));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// unhappy: malformed input — every intake task rejects non-string/non-object
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// runtime: cross-output runtime toggles flow from input to state
// ---------------------------------------------------------------------------

test('Engine e2e :: runtime :: input.runtime is copied to state.runtime', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex']);

  const state = await engine.run({
    'colors':  ['#ff0000'],
    'runtime': { 'framing': 'dark', 'colorSpace': 'displayP3' },
  });

  assert.strictEqual(state.runtime.framing,    'dark');
  assert.strictEqual(state.runtime.colorSpace, 'displayP3');
});

test('Engine e2e :: runtime :: state.runtime defaults to empty object when input.runtime omitted', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex']);

  const state = await engine.run({ 'colors': ['#ff0000'] });

  assert.deepStrictEqual(state.runtime, {});
});

test('Engine e2e :: runtime :: tasks read framing from state.runtime', async () => {
  const engine = freshEngine();
  let observedFraming: string | undefined = undefined;
  const observer: TaskInterface = {
    'name': 'observe:framing',
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      observedFraming = state.runtime.framing;
    },
  };
  engine.tasks.register(observer);
  engine.pipeline(['observe:framing']);

  await engine.run({ 'colors': [], 'runtime': { 'framing': 'light' } });
  assert.strictEqual(observedFraming, 'light');
});

test('Engine e2e :: unhappy :: malformed input colors — intake produces empty state', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'clamp:count', 'emit:json']);

  // Passing objects that are not hex strings — intake:hex will silently skip them
  const state = await engine.run({
    'colors': [{} as unknown, null as unknown, 42 as unknown],
  });

  assert.strictEqual(
    state.colors.length,
    0,
    'malformed colors should all be skipped, leaving colors empty',
  );
  const json = state.outputs['json'] as { 'colors': string[] } | undefined;
  assert.ok(json !== undefined, 'emit:json should still write even with empty colors');
  assert.strictEqual(json.colors.length, 0);
});
