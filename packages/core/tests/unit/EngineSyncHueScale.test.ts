/**
 * v0.5.0 engine capabilities:
 *   1. Engine.run is synchronous (returns state, not a Promise).
 *   2. Absolute `hue` pins a role's hue in both resolution paths
 *      (resolve:roles for a direct role, expand:family for a derived role).
 *   3. `lightnessTarget` variant config produces an engine-resolved tonal step.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Engine } from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import { rgbToOklch } from '@studnicky/iridis/math';
import type { RoleSchemaInterface } from '@studnicky/iridis';

function engineFor(pipeline: readonly string[]): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.pipeline([...pipeline]);
  return engine;
}

const SCHEMA: RoleSchemaInterface = {
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

test('absolute hue pins a directly-resolved role', () => {
  const engine = engineFor(['intake:hex', 'resolve:roles']);
  const state = engine.run({ 'colors': ['#06b6d4'], 'roles': SCHEMA });
  const h = hueOf(state.roles['error']!.hex);
  assert.ok(Math.abs(h - 27) < 12, `error hue ${h} pinned near 27`);
});

test('absolute hue pins a derived role (overrides brand-relative)', () => {
  const engine = engineFor(['intake:hex', 'resolve:roles', 'expand:family']);
  const state = engine.run({ 'colors': ['#7c3aed'], 'roles': SCHEMA }); // violet brand
  const h = hueOf(state.roles['success']!.hex);
  assert.ok(h > 120 && h < 180, `success hue ${h} is green, not brand-derived`);
});

test('hueClamp bounds the nudge so semantics stay rooted in the palette', () => {
  const clamped: RoleSchemaInterface = {
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
