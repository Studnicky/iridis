import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { TrajectoryRegistry } from '../src/index.ts';
import { sunriseTrajectory } from '../src/SunriseTrajectory.ts';

const assertPaletteClose = (actual: PaletteInterfaceType, expected: PaletteInterfaceType): void => {
  for (const role of Object.keys(expected)) {
    const a = actual[role] as { 'c': number; 'h': number; 'l': number };
    const e = expected[role] as { 'c': number; 'h': number; 'l': number };
    assert.ok(Math.abs(a.l - e.l) < 1e-6, `${role}.l: ${a.l} ~ ${e.l}`);
    assert.ok(Math.abs(a.c - e.c) < 1e-6, `${role}.c: ${a.c} ~ ${e.c}`);
    assert.ok(Math.abs(a.h - e.h) < 1e-6, `${role}.h: ${a.h} ~ ${e.h}`);
  }
};

test('resolve: built-in "sunrise" at t=0 matches the first stop', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 0);
  assertPaletteClose(result, sunriseTrajectory.stops[0] as PaletteInterfaceType);
});

test('resolve: built-in "sunrise" at t=1 matches the last stop', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 1);
  const last      = sunriseTrajectory.stops[sunriseTrajectory.stops.length - 1] as PaletteInterfaceType;
  assertPaletteClose(result, last);
});

test('resolve: built-in "sunrise" at exact segment boundary (t=1/3) matches stop index 1', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 1 / 3);
  assertPaletteClose(result, sunriseTrajectory.stops[1] as PaletteInterfaceType);
});

test('resolve: built-in "sunrise" at t=0.5 lands mid-segment, between stop 1 and stop 2', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 0.5);
  const stop1     = sunriseTrajectory.stops[1] as PaletteInterfaceType;
  const stop2     = sunriseTrajectory.stops[2] as PaletteInterfaceType;
  const accent1   = stop1['accent'] as { 'l': number };
  const accent2   = stop2['accent'] as { 'l': number };
  const resAccent = result['accent'] as { 'l': number };
  const lo = Math.min(accent1.l, accent2.l);
  const hi = Math.max(accent1.l, accent2.l);
  assert.ok(resAccent.l >= lo && resAccent.l <= hi, `t=0.5 accent.l ${resAccent.l} within [${lo}, ${hi}]`);
});

test('resolve: unknown trajectory name throws a clear error', () => {
  const registry = new TrajectoryRegistry();
  assert.throws(() => registry.resolve('nonexistent', 0.5), /Unknown trajectory "nonexistent"/);
});

test('registerTrajectory: custom trajectory can be registered and resolved by name', () => {
  const registry = new TrajectoryRegistry();
  const stops: PaletteInterfaceType[] = [
    { 'accent': { 'c': 0.1, 'h': 0,   'l': 0.5 } },
    { 'accent': { 'c': 0.1, 'h': 100, 'l': 0.5 } }
  ];
  registry.registerTrajectory('custom', { stops });
  const result = registry.resolve('custom', 0);
  assertPaletteClose(result, stops[0] as PaletteInterfaceType);
  const midResult = registry.resolve('custom', 1);
  assertPaletteClose(midResult, stops[1] as PaletteInterfaceType);
});

test('registerTrajectory: registering under a built-in name overwrites it', () => {
  const registry = new TrajectoryRegistry();
  const overrideStops: PaletteInterfaceType[] = [
    { 'accent': { 'c': 0.3, 'h': 0, 'l': 0.9 } }
  ];
  registry.registerTrajectory('sunrise', { 'stops': overrideStops });
  const result = registry.resolve('sunrise', 0);
  assertPaletteClose(result, overrideStops[0] as PaletteInterfaceType);
});
