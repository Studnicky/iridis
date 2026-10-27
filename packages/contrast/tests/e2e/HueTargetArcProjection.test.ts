import { RoleGeometry } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HueTargetArcProjection } from '../../src/HueTargetArcProjection.ts';

class HueTargetArcProjectionFixture {
  static readonly clamps = [0, 30, 90, 150, 180];
  static readonly targets = [0, 25, 45, 90, 135, 160, 180, 225, 270, 315, 359];

  static runDenseSamples(target: number, clamp: number): void {
    for (let cellIndex = 0; cellIndex < 8; cellIndex += 1) {
      const cell = HueTargetArcProjectionFixture.cell(cellIndex);
      const arcs = HueTargetArcProjection.arcs(cell, target, clamp);
      for (let source = cell.start; source <= cell.end; source += 0.25) {
        HueTargetArcProjectionFixture.assertContains(target, clamp, source, arcs);
      }
      HueTargetArcProjectionFixture.runBreakpoints(target, clamp, cell, arcs);
    }
  }

  static runRandomSamples(target: number, clamp: number): void {
    let state = (target + 1) * (clamp + 1);
    for (let index = 0; index < 2000; index += 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      const source = (state / 2 ** 32) * 360;
      const cell = HueTargetArcProjectionFixture.cell(Math.min(7, Math.floor(source / 45)));
      const arcs = HueTargetArcProjection.arcs(cell, target, clamp);
      HueTargetArcProjectionFixture.assertContains(target, clamp, source, arcs);
    }
  }

  private static cell(index: number): { readonly 'end': number; readonly 'start': number } {
    const result = { 'end': (index + 1) * 45, 'start': index * 45 };
    return result;
  }

  private static runBreakpoints(
    target: number,
    clamp: number,
    cell: { readonly 'end': number; readonly 'start': number },
    arcs: ReturnType<typeof HueTargetArcProjection.arcs>
  ): void {
    const breakpoints = [target + 180, target - clamp, target + clamp];
    for (let index = 0; index < breakpoints.length; index += 1) {
      const breakpoint = breakpoints[index];
      if (breakpoint === undefined) {
        continue;
      }
      const normalized = ((breakpoint % 360) + 360) % 360;
      if (normalized < cell.start || normalized > cell.end) {
        continue;
      }
      HueTargetArcProjectionFixture.assertContains(target, clamp, normalized, arcs);
      if (normalized < cell.end) {
        HueTargetArcProjectionFixture.assertContains(target, clamp, HueTargetArcProjectionFixture.nextUp(normalized), arcs);
      }
      if (normalized > cell.start) {
        HueTargetArcProjectionFixture.assertContains(target, clamp, HueTargetArcProjectionFixture.nextDown(normalized), arcs);
      }
    }
  }

  private static assertContains(
    target: number,
    clamp: number,
    source: number,
    arcs: ReturnType<typeof HueTargetArcProjection.arcs>
  ): void {
    const output = RoleGeometry.hueTowards(source, target, clamp);
    const evidence = JSON.stringify({ 'arcs': arcs, 'clamp': clamp, 'output': output, 'source': source, 'target': target });
    assert.ok(HueTargetArcProjection.contains(arcs, output), evidence);
  }

  private static nextUp(value: number): number {
    const floatingPoint = new DataView(new ArrayBuffer(8));
    floatingPoint.setFloat64(0, value);
    const bits = floatingPoint.getBigUint64(0);
    floatingPoint.setBigUint64(0, value >= 0 ? bits + 1n : bits - 1n);
    const result = floatingPoint.getFloat64(0);
    return result;
  }

  private static nextDown(value: number): number {
    const floatingPoint = new DataView(new ArrayBuffer(8));
    floatingPoint.setFloat64(0, value);
    const bits = floatingPoint.getBigUint64(0);
    floatingPoint.setBigUint64(0, value >= 0 ? bits - 1n : bits + 1n);
    const result = floatingPoint.getFloat64(0);
    return result;
  }
}

await test('HueTargetArcProjection contains every dense and breakpoint hue-target image', () => {
  for (let targetIndex = 0; targetIndex < HueTargetArcProjectionFixture.targets.length; targetIndex += 1) {
    const target = HueTargetArcProjectionFixture.targets[targetIndex];
    if (target === undefined) {
      continue;
    }
    for (let clampIndex = 0; clampIndex < HueTargetArcProjectionFixture.clamps.length; clampIndex += 1) {
      const clamp = HueTargetArcProjectionFixture.clamps[clampIndex];
      if (clamp === undefined) {
        continue;
      }
      HueTargetArcProjectionFixture.runDenseSamples(target, clamp);
      HueTargetArcProjectionFixture.runRandomSamples(target, clamp);
    }
  }
});

await test('HueTargetArcProjection keeps wrapped and antipode endpoint images disjoint', () => {
  assert.deepStrictEqual(
    HueTargetArcProjection.arcs({ 'end': 270, 'start': 225 }, 25, 90),
    [{ 'end': 0, 'start': 0 }, { 'end': 360, 'start': 315 }]
  );
  assert.deepStrictEqual(
    HueTargetArcProjection.arcs({ 'end': 315, 'start': 270 }, 90, 90),
    [{ 'end': 45, 'start': 0 }, { 'end': 180, 'start': 180 }]
  );
});
