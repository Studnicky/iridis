/**
 * Pipeline composition end-to-end tests.
 *
 * Verifies multi-stage pipeline correctness including hint-driven role
 * assignment, variant derivation, contrast reporting, and idempotency.
 */
import { test } from 'node:test';
import type {
  ColorRecordInterface,
  InputInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis';
import { Engine }       from '@studnicky/iridis';
import { coreTasks }    from '@studnicky/iridis/tasks';
import { assert }       from './ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  return engine;
}

type JsonOutput = {
  'colors':   string[];
  'roles':    Record<string, string>;
  'variants': Record<string, Record<string, string>>;
};

// ---------------------------------------------------------------------------
// happy: 3-color seed with hints → hint-driven role assignment
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: happy :: hint-driven role assignment', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'emit:json']);

  const schema: RoleSchemaInterface = {
    'name': 'hint-test',
    'roles': [
      { 'name': 'accent',  'required': true  },
      { 'name': 'surface', 'required': true  },
      { 'name': 'text',    'required': false },
    ],
  };

  // Hex inputs don't carry hints — so role assignment falls back to OKLCH distance.
  // We supply 3 colors with distinct lightness so each role can be resolved.
  const state = await engine.run({
    'colors': ['#6d28d9', '#f5f3ff', '#1c1917'],
    'roles':  schema,
  });

  // All three non-derived roles should be assigned via distance matching
  assert.ok('accent'  in state.roles, 'accent role should be assigned');
  assert.ok('surface' in state.roles, 'surface role should be assigned');
  assert.ok('text'    in state.roles, 'text role should be assigned');
});

// ---------------------------------------------------------------------------
// happy: hint-driven via ColorRecord hints (simulated via intake task bypass)
//
// Since hex strings can't carry hints, we verify the hint path by constructing
// a color with hints directly and feeding it to resolve:roles via metadata.
// We do this by registering a custom pre-intake task that seeds state.colors.
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: happy :: hint.role causes exact role assignment', async () => {
  const engine = freshEngine();

  // Seed state with pre-parsed color records including hints
  // by hooking into onRunStart
  const hintedColor: ColorRecordInterface = {
    'oklch':        { 'l': 0.6, 'c': 0.15, 'h': 250 },
    'rgb':          { 'r': 0.3, 'g': 0.2, 'b': 0.8 },
    'hex':          '#4d33cc',
    'alpha':        1,
    'sourceFormat': 'hex',
    'hints':        { 'role': 'accent' },
  };
  const bgColor: ColorRecordInterface = {
    'oklch':        { 'l': 0.95, 'c': 0.01, 'h': 0 },
    'rgb':          { 'r': 0.95, 'g': 0.95, 'b': 0.95 },
    'hex':          '#f2f2f2',
    'alpha':        1,
    'sourceFormat': 'hex',
    'hints':        { 'role': 'surface' },
  };

  engine.tasks.hook('onRunStart', {
    'name': 'seed:hinted',
    'manifest': { 'name': 'seed:hinted', 'phase': 'onRunStart' },
    run(state): void {
      state.colors.push(hintedColor, bgColor);
    },
  });

  engine.pipeline(['resolve:roles', 'expand:family', 'emit:json']);

  const schema: RoleSchemaInterface = {
    'name': 'hint-schema',
    'roles': [
      { 'name': 'accent',  'required': true },
      { 'name': 'surface', 'required': true },
    ],
  };

  const state = await engine.run({ 'colors': [], 'roles': schema });

  assert.strictEqual(
    state.roles['accent'],
    hintedColor,
    'accent role should be the exact hinted color (not a clone)',
  );
  assert.strictEqual(
    state.roles['surface'],
    bgColor,
    'surface role should be the exact hinted color',
  );
});

// ---------------------------------------------------------------------------
// happy: derive:variant produces dark and light maps over all roles
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: happy :: derive:variant produces dark and light maps', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'derive:variant',
    'emit:json',
  ]);

  const schema: RoleSchemaInterface = {
    'name':  'variant-test',
    'roles': [
      { 'name': 'primary', 'required': true },
      { 'name': 'muted',   'required': true },
    ],
  };

  const state = await engine.run({
    'colors': ['#6366f1', '#a5b4fc'],
    'roles':  schema,
  });

  assert.ok('dark'  in state.variants, 'variants.dark should exist');
  assert.ok('light' in state.variants, 'variants.light should exist');

  const dark  = state.variants['dark']  as Record<string, ColorRecordInterface>;
  const light = state.variants['light'] as Record<string, ColorRecordInterface>;

  const roleCount = Object.keys(state.roles).length;
  assert.strictEqual(
    Object.keys(dark).length,
    roleCount,
    'dark variant should have same number of roles as state.roles',
  );
  assert.strictEqual(
    Object.keys(light).length,
    roleCount,
    'light variant should have same number of roles as state.roles',
  );

  // Dark variant: lightness should be inverted relative to primary
  const primaryL = state.roles['primary']?.oklch.l ?? 0;
  const darkPrimaryL = dark['primary']?.oklch.l ?? -1;
  const eps = 0.05;
  assert.ok(
    Math.abs(darkPrimaryL - (1 - primaryL)) < eps,
    `dark.primary.L should be ≈${1 - primaryL}, got ${darkPrimaryL}`,
  );

  // emit:json should capture variants
  const json = state.outputs['json'] as JsonOutput | undefined;
  assert.ok(json !== undefined);
  assert.ok('dark'  in json.variants, 'json.variants.dark should be present');
  assert.ok('light' in json.variants, 'json.variants.light should be present');
});

// ---------------------------------------------------------------------------
// happy: contrast metadata report populated with before/after ratios
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: happy :: contrastReport populated in metadata', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'enforce:contrast',
  ]);

  const schema: RoleSchemaInterface = {
    'name': 'contrast-report-test',
    'roles': [
      { 'name': 'text',    'required': true },
      { 'name': 'surface', 'required': true },
    ],
    'contrastPairs': [
      { 'foreground': 'text', 'background': 'surface', 'minRatio': 3.0 },
    ],
  };

  // Very dark text color and very light surface → guaranteed high contrast
  const state = await engine.run({
    'colors': ['#1a1a2e', '#eeeeff'],
    'roles':  schema,
  });

  const report = state.metadata['contrastReport'] as Array<{
    'foreground': string;
    'background': string;
    'ratio':      number;
    'minRatio':   number;
    'passed':     boolean;
    'adjusted':   boolean;
  }> | undefined;

  assert.ok(Array.isArray(report), 'contrastReport should be an array in metadata');
  assert.strictEqual(report.length, 1, 'should have one entry for the one contrast pair');
  const entry = report[0];
  assert.ok(entry !== undefined);
  assert.strictEqual(entry.foreground, 'text',    'foreground should be "text"');
  assert.strictEqual(entry.background, 'surface', 'background should be "surface"');
  assert.ok(typeof entry.ratio    === 'number', 'ratio should be a number');
  assert.ok(typeof entry.minRatio === 'number', 'minRatio should be a number');
  assert.ok(typeof entry.passed   === 'boolean', 'passed should be boolean');
  assert.ok(typeof entry.adjusted === 'boolean', 'adjusted should be boolean');
});

// ---------------------------------------------------------------------------
// edge: enforce:contrast then expand:family then re-enforce is idempotent
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: edge :: double enforce:contrast is idempotent', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'enforce:contrast',
    'expand:family',
    'enforce:contrast',
    'emit:json',
  ]);

  const schema: RoleSchemaInterface = {
    'name': 'idempotent-test',
    'roles': [
      { 'name': 'text',    'required': true },
      { 'name': 'surface', 'required': true },
      { 'name': 'text-muted', 'derivedFrom': 'text', 'chromaRange': [0.01, 0.05] },
    ],
    'contrastPairs': [
      { 'foreground': 'text', 'background': 'surface', 'minRatio': 4.5 },
    ],
  };

  // Use colors with known good contrast so enforce is a no-op both times
  const state = await engine.run({
    'colors': ['#111111', '#f0f0f0'],
    'roles':  schema,
  });

  const report = state.metadata['contrastReport'] as Array<{
    'adjusted': boolean;
    'ratio':    number;
  }> | undefined;

  // The second contrastReport overwrites the first; the second run should show no adjustment
  // because the first run already met the criteria
  assert.ok(Array.isArray(report), 'contrastReport should exist');
  if (report.length > 0) {
    const entry = report[report.length - 1];
    assert.ok(entry !== undefined);
    // After first enforce, pair passes. Second enforce should be a no-op (adjusted=false)
    assert.strictEqual(entry.adjusted, false, 'second enforce:contrast should not adjust (already passing)');
  }
});

// ---------------------------------------------------------------------------
// edge: empty roles schema — resolve:roles and expand:family return cleanly
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: edge :: empty roles list produces empty state.roles', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'emit:json',
  ]);

  const emptySchema: RoleSchemaInterface = {
    'name':  'empty-schema',
    'roles': [],
  };

  const state = await engine.run({
    'colors': ['#ff0000', '#00ff00'],
    'roles':  emptySchema,
  });

  assert.deepStrictEqual(state.roles, {}, 'state.roles should be empty for empty schema');
  assert.deepStrictEqual(state.variants, {}, 'state.variants should be empty (no roles to derive)');

  const json = state.outputs['json'] as JsonOutput | undefined;
  assert.ok(json !== undefined, 'emit:json should succeed with empty roles');
  assert.deepStrictEqual(json.roles,    {}, 'json.roles should be empty');
  assert.deepStrictEqual(json.variants, {}, 'json.variants should be empty');
  assert.strictEqual(json.colors.length, 2, 'json.colors should still have the 2 parsed hex colors');
});

// ---------------------------------------------------------------------------
// edge: no roles schema at all — resolve:roles and expand:family skip cleanly
// ---------------------------------------------------------------------------

test('Pipeline composition e2e :: edge :: no roles input — resolve and expand skip cleanly', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'emit:json',
  ]);

  const input: InputInterface = { 'colors': ['#ff6b6b', '#4ecdc4'] };
  const state = await engine.run(input);

  // No crash — roles and variants are empty
  assert.deepStrictEqual(state.roles, {}, 'state.roles should be empty without role schema');
  assert.deepStrictEqual(state.variants, {}, 'state.variants should be empty');
  const json = state.outputs['json'] as JsonOutput | undefined;
  assert.ok(json !== undefined, 'emit:json should succeed');
  assert.strictEqual(json.colors.length, 2, 'colors should be parsed normally');
});
