/**
 * ResolveRoles unit tests — chromaRange enforcement.
 *
 * The resolve:roles task must clamp a candidate color's chroma into the
 * role's declared chromaRange, in addition to lightnessRange. A near-neutral
 * background role (e.g. chromaRange [0, 0.03]) must NOT be assigned a hex
 * whose OKLCH chroma exceeds the declared maximum, even when the closest
 * input candidate is highly saturated.
 *
 * Regression: the docs site declared background.chromaRange = [0, 0.03] but
 * the engine produced faintly tinted backgrounds because chroma clamping
 * was not enforced. These tests pin the contract in unit scope.
 */

import { test } from 'node:test';

import type { RoleSchemaInterface } from '@studnicky/iridis';
import { Engine }                   from '@studnicky/iridis';
import { mathBuiltins }             from '@studnicky/iridis/math';
import { coreTasks }                from '@studnicky/iridis/tasks';
import { colorRecordFactory }       from '../../src/math/ColorRecordFactory.ts';
import { assert }                   from './ScenarioRunner.ts';

function freshEngine(): Engine {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.pipeline(['intake:hex', 'resolve:roles']);
  return engine;
}

test('ResolveRoles :: chromaRange :: high-chroma seed clamped into [0, 0.03]', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'background-only',
    'roles': [
      {
        'name':           'background',
        'required':       true,
        'lightnessRange': [0.94, 0.99],
        'chromaRange':    [0.00, 0.03],
      },
    ],
  };

  const engine = freshEngine();
  // #3b82f6 is a vivid blue with OKLCH chroma well above 0.03.
  const state = await engine.run({ 'colors': ['#3b82f6'], 'roles': schema });

  const bg = state.roles['background'];
  assert.ok(bg !== undefined, 'required background role must be populated');

  // Stored OKLCH chroma must be within the declared range.
  assert.ok(
    bg.oklch.c >= 0.00 && bg.oklch.c <= 0.03,
    `stored bg.oklch.c must be in [0.00, 0.03]; got ${bg.oklch.c}`,
  );

  // Lightness preserved within its own range.
  assert.ok(
    bg.oklch.l >= 0.94 && bg.oklch.l <= 0.99,
    `stored bg.oklch.l must be in [0.94, 0.99]; got ${bg.oklch.l}`,
  );
});

test('ResolveRoles :: chromaRange :: rendered hex round-trips inside declared range', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'background-only',
    'roles': [
      {
        'name':           'background',
        'required':       true,
        'lightnessRange': [0.94, 0.99],
        'chromaRange':    [0.00, 0.03],
      },
    ],
  };

  const engine = freshEngine();
  const state = await engine.run({ 'colors': ['#3b82f6'], 'roles': schema });

  const bg = state.roles['background'];
  assert.ok(bg !== undefined);

  // Re-parse the emitted hex and confirm the actual rendered chroma is also
  // within range. RGB quantization can push the round-tripped chroma slightly
  // off the stored value; the engine's contract is that the EMITTED color
  // (what the user actually sees) satisfies chromaRange, not just the
  // intermediate OKLCH triple.
  const reparsed = colorRecordFactory.fromHex(bg.hex);
  assert.ok(
    reparsed.oklch.c >= 0.00 && reparsed.oklch.c <= 0.03,
    `rendered hex ${bg.hex} chroma must be in [0.00, 0.03]; got ${reparsed.oklch.c}`,
  );
});

test('ResolveRoles :: chromaRange :: low-chroma input below range is lifted to range min', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'accent-only',
    'roles': [
      {
        'name':           'accent',
        'required':       true,
        'lightnessRange': [0.50, 0.60],
        'chromaRange':    [0.15, 0.25],
      },
    ],
  };

  const engine = freshEngine();
  // Pure gray — chroma 0, well below the role's [0.15, 0.25] floor.
  const state = await engine.run({ 'colors': ['#808080'], 'roles': schema });

  const accent = state.roles['accent'];
  assert.ok(accent !== undefined);
  assert.ok(
    accent.oklch.c >= 0.15 && accent.oklch.c <= 0.25,
    `accent.oklch.c must be in [0.15, 0.25]; got ${accent.oklch.c}`,
  );
});

test('ResolveRoles :: chromaRange :: hue is preserved when only chroma needs nudging', async () => {
  const schema: RoleSchemaInterface = {
    'name':  'soft-blue',
    'roles': [
      {
        'name':           'soft',
        'required':       true,
        'lightnessRange': [0.94, 0.99],
        'chromaRange':    [0.00, 0.03],
      },
    ],
  };

  const engine = freshEngine();
  // Vivid blue — hue ~264 in OKLCH. After chroma clamp the hue should still
  // be in the blue family, not rotated.
  const state = await engine.run({ 'colors': ['#3b82f6'], 'roles': schema });

  const soft = state.roles['soft'];
  assert.ok(soft !== undefined);
  // Source hue is ~264 (blue). Allow a small tolerance for low-chroma hue
  // instability after RGB roundtrip; the assertion is that hue is preserved
  // approximately, not rotated to a different family.
  const sourceHue = colorRecordFactory.fromHex('#3b82f6').oklch.h;
  const hueDiff = Math.abs(((soft.oklch.h - sourceHue + 540) % 360) - 180);
  assert.ok(
    hueDiff < 10,
    `hue should be preserved (source ~${sourceHue.toFixed(1)}, got ${soft.oklch.h.toFixed(1)}, diff ${hueDiff.toFixed(2)})`,
  );
});
