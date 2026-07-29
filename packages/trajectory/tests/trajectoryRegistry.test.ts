import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TrajectoryRegistry } from '../src/index.ts';
import { sunriseTrajectory } from '../src/SunriseTrajectory.ts';

class PaletteAssertions {
  static close(actual: PaletteInterfaceType, expected: PaletteInterfaceType): void {
    for (const role of Object.keys(expected)) {
      const actualColor = actual[role];
      const expectedColor = expected[role];
      assert.ok(actualColor !== undefined, `${role}: actual color exists`);
      assert.ok(expectedColor !== undefined, `${role}: expected color exists`);
      assert.ok(Math.abs(actualColor.l - expectedColor.l) < 1e-6, `${role}.l: ${actualColor.l} ~ ${expectedColor.l}`);
      assert.ok(Math.abs(actualColor.c - expectedColor.c) < 1e-6, `${role}.c: ${actualColor.c} ~ ${expectedColor.c}`);
      assert.ok(Math.abs(actualColor.h - expectedColor.h) < 1e-6, `${role}.h: ${actualColor.h} ~ ${expectedColor.h}`);
    }
  }
}

await test('resolve: built-in "sunrise" at t=0 matches the first stop', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 0);
  const firstStop = sunriseTrajectory.stops[0];
  assert.ok(firstStop !== undefined, 'sunrise has a first stop');
  PaletteAssertions.close(result, firstStop);
});

await test('resolve: built-in "sunrise" at t=1 matches the last stop', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 1);
  const last      = sunriseTrajectory.stops.at(-1);
  assert.ok(last !== undefined, 'sunrise has a last stop');
  PaletteAssertions.close(result, last);
});

await test('resolve: built-in "sunrise" at exact segment boundary (t=1/3) matches stop index 1', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 1 / 3);
  const boundaryStop = sunriseTrajectory.stops[1];
  assert.ok(boundaryStop !== undefined, 'sunrise has a stop at the first segment boundary');
  PaletteAssertions.close(result, boundaryStop);
});

await test('resolve: built-in "sunrise" at t=0.5 lands mid-segment, between stop 1 and stop 2', () => {
  const registry = new TrajectoryRegistry();
  const result    = registry.resolve('sunrise', 0.5);
  const stop1     = sunriseTrajectory.stops[1];
  const stop2     = sunriseTrajectory.stops[2];
  assert.ok(stop1 !== undefined, 'sunrise has a second stop');
  assert.ok(stop2 !== undefined, 'sunrise has a third stop');
  const accent1   = stop1.accent;
  const accent2   = stop2.accent;
  const resAccent = result.accent;
  assert.ok(accent1 !== undefined, 'sunrise second stop has an accent color');
  assert.ok(accent2 !== undefined, 'sunrise third stop has an accent color');
  assert.ok(resAccent !== undefined, 'mid-segment result has an accent color');
  const lo = Math.min(accent1.l, accent2.l);
  const hi = Math.max(accent1.l, accent2.l);
  assert.ok(resAccent.l >= lo && resAccent.l <= hi, `t=0.5 accent.l ${resAccent.l} within [${lo}, ${hi}]`);
});

await test('resolve: unknown trajectory name throws a clear error', () => {
  const registry = new TrajectoryRegistry();
  assert.throws(() => { const result = registry.resolve('nonexistent', 0.5); return result; }, /Unknown trajectory "nonexistent"/);
});

await test('registerTrajectory: custom trajectory can be registered and resolved by name', () => {
  const registry = new TrajectoryRegistry();
  const stops: PaletteInterfaceType[] = [
    { 'accent': { 'c': 0.1, 'h': 0,   'l': 0.5 } },
    { 'accent': { 'c': 0.1, 'h': 100, 'l': 0.5 } }
  ];
  registry.registerTrajectory('custom', { 'opts': undefined, 'stops': stops });
  const result = registry.resolve('custom', 0);
  const firstStop = stops[0];
  assert.ok(firstStop !== undefined, 'custom trajectory has a first stop');
  PaletteAssertions.close(result, firstStop);
  const midResult = registry.resolve('custom', 1);
  const secondStop = stops[1];
  assert.ok(secondStop !== undefined, 'custom trajectory has a second stop');
  PaletteAssertions.close(midResult, secondStop);
});

await test('registerTrajectory: registering under a built-in name overwrites it', () => {
  const registry = new TrajectoryRegistry();
  const overrideStops: PaletteInterfaceType[] = [
    { 'accent': { 'c': 0.3, 'h': 0, 'l': 0.9 } }
  ];
  registry.registerTrajectory('sunrise', { 'opts': undefined, 'stops': overrideStops });
  const result = registry.resolve('sunrise', 0);
  const firstStop = overrideStops[0];
  assert.ok(firstStop !== undefined, 'override trajectory has a first stop');
  PaletteAssertions.close(result, firstStop);
});
