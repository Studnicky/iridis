/**
 * v0.5.0 engine capabilities:
 *   1. Engine.run is synchronous (returns state, not a Promise).
 *   2. A `hue` target nudges a role's hue toward it — a bounded rotation
 *      (default 90° when `hueClamp` is omitted), never an absolute pin — in
 *      both resolution paths (resolve:roles for a direct role, expand:family
 *      for a derived one).
 *   3. `lightnessTarget` variant config produces an engine-resolved tonal step.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Engine } from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import { rgbToOklch } from '@studnicky/iridis/math';
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

function engineFor(pipeline: readonly string[]): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.pipeline([...pipeline]);
  return engine;
}

const SCHEMA: RoleSchemaInterfaceType = {
  'name': 'test',
  'roles': [
    { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.04] },
    { 'name': 'brand',      'intent': 'accent',     'required': true, 'lightnessRange': [0.55, 0.78], 'chromaRange': [0.12, 0.30] },
    // direct role with an absolute hue
    { 'name': 'error',      'intent': 'critical',                     'lightnessRange': [0.55, 0.70], 'chromaRange': [0.16, 0.28], 'hue': 27 },
    // derived role with an absolute hue (must override the brand-relative path)
    { 'name': 'success',    'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.55, 0.70], 'chromaRange': [0.16, 0.28], 'hue': 150 },
  ],
};

function hueOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgbToOklch.apply(r, g, b).oklch.h;
}

test('Engine.run is synchronous', () => {
  const engine = engineFor(['intake:hex', 'resolve:roles']);
  const result = engine.run({ 'colors': ['#7c3aed'], 'roles': SCHEMA });
  assert.ok(!(result instanceof Promise), 'run() returns a plain state, not a Promise');
  assert.equal(typeof result.roles['brand']?.hex, 'string');
});

test('an unclamped hue nudges a directly-resolved role toward its target, bounded by the default clamp', () => {
  const withHue = engineFor(['intake:hex', 'resolve:roles']).run({ 'colors': ['#06b6d4'], 'roles': SCHEMA });
  // Baseline: the same schema with no hue target on 'error'. Selection is
  // hue-blind (lightness/chroma proximity), so 'error' picks the same candidate;
  // only the nudge toward 27 differs — isolating the nudge's effect.
  const noHue: RoleSchemaInterfaceType = {
    ...SCHEMA,
    'roles': SCHEMA.roles.map((r) => {
      if (r.name !== 'error') { return r; }
      const rest = { ...r };
      delete rest.hue;
      return rest;
    })
  };
  const baseline = engineFor(['intake:hex', 'resolve:roles']).run({ 'colors': ['#06b6d4'], 'roles': noHue });
  const withH = hueOf(withHue.roles['error']!.hex);
  const baseH = hueOf(baseline.roles['error']!.hex);
  const rotated  = Math.abs(((withH - baseH + 540) % 360) - 180);
  const distWith = Math.abs(((withH - 27 + 540) % 360) - 180);
  const distBase = Math.abs(((baseH - 27 + 540) % 360) - 180);
  assert.ok(distWith < distBase, `error nudged toward 27: ${withH.toFixed(0)}° is closer than baseline ${baseH.toFixed(0)}°`);
  assert.ok(rotated <= 92, `error rotated ${rotated.toFixed(0)}°, bounded by the 90° default clamp (RoleGeometry.DEFAULT_HUE_CLAMP)`);
  assert.ok(distWith > 12, `unclamped hue nudges error toward 27, it does NOT hard-pin to it (dist ${distWith.toFixed(0)}°)`);
});

test('an unclamped hue nudges a derived role toward its target, bounded by the default clamp', () => {
  const engine = engineFor(['intake:hex', 'resolve:roles', 'expand:family']);
  const state = engine.run({ 'colors': ['#7c3aed'], 'roles': SCHEMA }); // violet brand (~293°)
  const brandHue = hueOf(state.roles['brand']!.hex);
  const successHue = hueOf(state.roles['success']!.hex);
  // brand is >90° from the target (150), so 'success' rotates the default 90°
  // toward green — a bounded nudge, never snapped absolutely to pure green.
  const rotated = Math.abs(((successHue - brandHue + 540) % 360) - 180);
  assert.ok(Math.abs(rotated - 90) < 4, `success rotated ${rotated.toFixed(0)}° from brand, expected the 90° default clamp`);
  const distToTarget = Math.abs(((successHue - 150 + 540) % 360) - 180);
  const brandDist = Math.abs(((brandHue - 150 + 540) % 360) - 180);
  assert.ok(distToTarget < brandDist, `success (${successHue.toFixed(0)}°) moved toward target 150 from brand (${brandHue.toFixed(0)}°)`);
  assert.ok(distToTarget > 12, `success is nudged toward green, not hard-pinned to 150 (dist ${distToTarget.toFixed(0)}°)`);
});

test('hueClamp bounds the nudge so semantics stay rooted in the palette', () => {
  const clamped: RoleSchemaInterfaceType = {
    'name': 'clamped',
    'roles': [
      { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.04] },
      { 'name': 'brand',      'intent': 'accent',     'required': true, 'lightnessRange': [0.45, 0.65], 'chromaRange': [0.12, 0.30] },
      // target green (150) but clamp the rotation to 40°
      { 'name': 'success',    'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.55, 0.70], 'chromaRange': [0.14, 0.26], 'hue': 150, 'hueClamp': 40 },
    ],
  };
  const engine = engineFor(['intake:hex', 'resolve:roles', 'expand:family']);
  const state = engine.run({ 'colors': ['#b11e12'], 'roles': clamped }); // red brand (~hue 30)
  const brandHue = hueOf(state.roles['brand']!.hex);
  const successHue = hueOf(state.roles['success']!.hex);
  const delta = Math.abs(((successHue - brandHue + 540) % 360) - 180);
  assert.ok(delta <= 45, `success nudged only ${delta.toFixed(0)}° from brand (bounded), not jumped to pure green`);
  assert.ok(successHue < 120, `success hue ${successHue} stays warm/palette-rooted, not pure green`);
});

test('core:hueOffsetOverrides overrides a derived role\'s schema hueOffset', () => {
  const schema: RoleSchemaInterfaceType = {
    'name': 'overridden',
    'roles': [
      { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.04] },
      { 'name': 'brand',      'intent': 'accent',     'required': true, 'lightnessRange': [0.55, 0.78], 'chromaRange': [0.12, 0.30] },
      // schema says +30, override says +120 (triadic) — the override must win
      { 'name': 'accent-two', 'derivedFrom': 'brand', 'hueOffset': 30, 'lightnessRange': [0.55, 0.78], 'chromaRange': [0.12, 0.30] },
    ],
  };
  const engine = engineFor(['intake:hex', 'resolve:roles', 'expand:family']);
  const state = engine.run({
    'colors': ['#7c3aed'],
    'metadata': { 'core:hueOffsetOverrides': { 'accent-two': 120 } },
    'roles': schema,
  });
  const brandHue = hueOf(state.roles['brand']!.hex);
  const derivedHue = hueOf(state.roles['accent-two']!.hex);
  const delta = ((derivedHue - brandHue + 360) % 360);
  assert.ok(Math.abs(delta - 120) < 2, `accent-two is ${delta.toFixed(1)}° from brand, expected ~120° (override), not the schema's 30°`);
});

test('core:hueTargetOverrides overrides a directly-resolved role\'s schema hue', () => {
  const schema: RoleSchemaInterfaceType = {
    'name': 'target-overridden',
    'roles': [
      { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.04] },
      // no hue in schema; override pins it to 300 (magenta), bounded to 20°
      { 'name': 'error', 'intent': 'critical', 'lightnessRange': [0.55, 0.70], 'chromaRange': [0.16, 0.28] },
    ],
  };
  const engine = engineFor(['intake:hex', 'resolve:roles']);
  const state = engine.run({
    'colors': ['#06b6d4'], // cyan, ~hue 220
    'metadata': { 'core:hueTargetOverrides': { 'error': { 'hue': 300, 'hueClamp': 20 } } },
    'roles': schema,
  });
  const h = hueOf(state.roles['error']!.hex);
  const rotatedFromCandidate = Math.abs(((h - 220 + 540) % 360) - 180);
  assert.ok(rotatedFromCandidate <= 25, `error rotated only ${rotatedFromCandidate.toFixed(0)}° from its cyan candidate (bounded by the override's 20° clamp), not jumped straight to 300°`);
});

test('lightnessTarget produces an engine-resolved tonal step', () => {
  const engine = engineFor(['intake:hex', 'resolve:roles', 'derive:variant']);
  const state = engine.run({
    'colors': ['#7c3aed'],
    'roles':  SCHEMA,
    'metadata': { 'core:variantConfig': [
      { 'name': 's100', 'invertLightness': false, 'lightnessTarget': 0.95 },
      { 'name': 's900', 'invertLightness': false, 'lightnessTarget': 0.30 },
    ] },
  });
  const light = state.variants['s100']?.brand;
  const dark = state.variants['s900']?.brand;
  assert.ok(light && dark, 'both tonal steps present');
  assert.ok(rgbToOklch.apply(
    parseInt(light!.hex.slice(1, 3), 16) / 255,
    parseInt(light!.hex.slice(3, 5), 16) / 255,
    parseInt(light!.hex.slice(5, 7), 16) / 255,
  ).oklch.l > rgbToOklch.apply(
    parseInt(dark!.hex.slice(1, 3), 16) / 255,
    parseInt(dark!.hex.slice(3, 5), 16) / 255,
    parseInt(dark!.hex.slice(5, 7), 16) / 255,
  ).oklch.l, 's100 is lighter than s900');
});
