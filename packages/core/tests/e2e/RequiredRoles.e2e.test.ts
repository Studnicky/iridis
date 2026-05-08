/**
 * Required-role enforcement contract.
 *
 * resolve:roles must guarantee that every required role is populated AND that
 * the assigned color satisfies the role's declared lightnessRange,
 * chromaRange, and hueOffset constraints — even when no input color falls
 * inside those constraints. The engine nudges the closest candidate into
 * range; if there are no input colors at all, it synthesizes from the
 * constraints' centers.
 */

import { test } from 'node:test';

import type { RoleSchemaInterface } from '@studnicky/iridis';
import { Engine }                   from '@studnicky/iridis';
import { mathBuiltins }             from '@studnicky/iridis/math';
import { coreTasks }                from '@studnicky/iridis/tasks';
import { assert }                   from './ScenarioRunner.ts';

function freshEngine(): Engine {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  return engine;
}

// ---------------------------------------------------------------------------
// lightnessRange
// ---------------------------------------------------------------------------

test('Required role :: lightnessRange :: dark input is nudged up into [0.92, 1.0]', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'canvas-only',
    'roles': [
      { 'name': 'canvas', 'required': true, 'lightnessRange': [0.92, 1.0] },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': ['#000000'], 'roles': schema });

  const canvas = state.roles['canvas'];
  assert.ok(canvas !== undefined, 'required role canvas must be populated');
  assert.ok(
    canvas.oklch.l >= 0.92 && canvas.oklch.l <= 1.0,
    `canvas.l must be in [0.92, 1.0]; got ${canvas.oklch.l}`,
  );
});

test('Required role :: lightnessRange :: light input is nudged down into [0.05, 0.15]', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'text-only',
    'roles': [
      { 'name': 'text', 'required': true, 'lightnessRange': [0.05, 0.15] },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': ['#ffffff'], 'roles': schema });

  const text = state.roles['text'];
  assert.ok(text !== undefined, 'required role text must be populated');
  assert.ok(
    text.oklch.l >= 0.05 && text.oklch.l <= 0.15,
    `text.l must be in [0.05, 0.15]; got ${text.oklch.l}`,
  );
});

// ---------------------------------------------------------------------------
// chromaRange
// ---------------------------------------------------------------------------

test('Required role :: chromaRange :: vivid input is nudged down into [0, 0.02]', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'neutral-only',
    'roles': [
      { 'name': 'neutral', 'required': true, 'chromaRange': [0, 0.02] },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  // #ff0000 is highly saturated; chroma well above 0.02
  const state = await engine.run({ 'colors': ['#ff0000'], 'roles': schema });

  const neutral = state.roles['neutral'];
  assert.ok(neutral !== undefined);
  assert.ok(
    neutral.oklch.c >= 0 && neutral.oklch.c <= 0.02,
    `neutral.c must be in [0, 0.02]; got ${neutral.oklch.c}`,
  );
});

// ---------------------------------------------------------------------------
// hueOffset (absolute target)
// ---------------------------------------------------------------------------

test('Required role :: hueOffset :: assigned hue equals the declared target', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'green-anchor',
    'roles': [
      { 'name': 'anchor', 'required': true, 'hueOffset': 142 },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  // Pure red — hue is far from 142
  const state = await engine.run({ 'colors': ['#ff0000'], 'roles': schema });

  const anchor = state.roles['anchor'];
  assert.ok(anchor !== undefined);
  // hueOffset is treated as an absolute target hue when nudging.
  assert.ok(
    Math.abs(anchor.oklch.h - 142) < 0.01,
    `anchor.h must equal hueOffset (142); got ${anchor.oklch.h}`,
  );
});

// ---------------------------------------------------------------------------
// Combined constraints
// ---------------------------------------------------------------------------

test('Required role :: combined constraints :: all dimensions clamped', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'tight',
    'roles': [
      {
        'name':           'tight',
        'required':       true,
        'lightnessRange': [0.40, 0.50],
        'chromaRange':    [0.05, 0.10],
      },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({
    'colors': ['#000000', '#ffffff', '#ff00ff', '#00ff00'],
    'roles':  schema,
  });

  const tight = state.roles['tight'];
  assert.ok(tight !== undefined);
  assert.ok(tight.oklch.l >= 0.40 && tight.oklch.l <= 0.50, `l: ${tight.oklch.l}`);
  assert.ok(tight.oklch.c >= 0.05 && tight.oklch.c <= 0.10, `c: ${tight.oklch.c}`);
});

// ---------------------------------------------------------------------------
// Synthesis when no input colors
// ---------------------------------------------------------------------------

test('Required role :: zero input colors :: synthesized from constraint centers', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'synth',
    'roles': [
      {
        'name':           'synth',
        'required':       true,
        'lightnessRange': [0.6, 0.8],
        'chromaRange':    [0.10, 0.15],
        'hueOffset':      200,
      },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': [], 'roles': schema });

  const synth = state.roles['synth'];
  assert.ok(synth !== undefined, 'required role must be synthesized when input is empty');
  assert.ok(synth.oklch.l >= 0.6 && synth.oklch.l <= 0.8);
  assert.ok(synth.oklch.c >= 0.10 && synth.oklch.c <= 0.15);
  assert.ok(Math.abs(synth.oklch.h - 200) < 0.01);

  const synthesized = state.metadata['rolesSynthesized'];
  assert.ok(Array.isArray(synthesized) && (synthesized as string[]).includes('synth'));
});

test('Required role :: zero input :: hex round-trips correctly', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'rt',
    'roles': [
      { 'name': 'rt', 'required': true, 'lightnessRange': [0.5, 0.5], 'chromaRange': [0, 0], 'hueOffset': 0 },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': [], 'roles': schema });

  const rt = state.roles['rt'];
  assert.ok(rt !== undefined);
  assert.match(rt.hex, /^#[0-9a-f]{6}$/, 'hex must be 6-digit lowercase');
  assert.ok(rt.rgb.r >= 0 && rt.rgb.r <= 1);
});

// ---------------------------------------------------------------------------
// Non-required role with constraints :: still nudged when assigned
// ---------------------------------------------------------------------------

test('Optional role :: assigned color is still nudged into range', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'optional-ranged',
    'roles': [
      { 'name': 'maybe', 'required': false, 'lightnessRange': [0.85, 1.0] },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': ['#000000'], 'roles': schema });

  const maybe = state.roles['maybe'];
  // When colors exist, an optional role still gets the closest candidate,
  // and that candidate is now nudged into its declared range.
  assert.ok(maybe !== undefined, 'optional role with input still gets assigned');
  assert.ok(
    maybe.oklch.l >= 0.85 && maybe.oklch.l <= 1.0,
    `assigned color must satisfy declared range; got l=${maybe.oklch.l}`,
  );
});

// ---------------------------------------------------------------------------
// Optional role with no input colors :: not synthesized
// ---------------------------------------------------------------------------

test('Optional role :: zero input :: NOT synthesized', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'optional-empty',
    'roles': [
      { 'name': 'maybe', 'required': false, 'lightnessRange': [0.85, 1.0] },
    ],
  };

  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles']);
  const state = await engine.run({ 'colors': [], 'roles': schema });

  assert.strictEqual(
    state.roles['maybe'],
    undefined,
    'optional role with no input must remain unassigned',
  );
});
