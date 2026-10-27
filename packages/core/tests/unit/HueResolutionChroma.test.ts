import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { hueResolutionChroma } from '../../src/math/index.ts';

void test('hueResolutionChroma excludes every 8-bit grey', () => {
  for (let grey = 0; grey <= 255; grey += 1) {
    const chroma = colorRecordFactory.fromRgb(grey / 255, grey / 255, grey / 255).oklch.c;
    assert.ok(chroma < hueResolutionChroma, `grey ${grey} has chroma ${chroma}`);
  }
});

void test('hueResolutionChroma resolves boundary-near non-grey 8-bit sRGB colours', () => {
  const boundaryNeighbours = [
    [0, 0, 1], [0, 1, 0], [1, 0, 0],
    [254, 255, 255], [255, 254, 255], [255, 255, 254]
  ] as const;
  for (let index = 0; index < boundaryNeighbours.length; index += 1) {
    const neighbour = boundaryNeighbours[index];
    assert.notEqual(neighbour, undefined, `boundary neighbour ${index} exists`);
    if (neighbour === undefined) {
      throw new Error(`boundary neighbour ${index} is absent`);
    }
    const [red, green, blue] = neighbour;
    const chroma = colorRecordFactory.fromRgb(red / 255, green / 255, blue / 255).oklch.c;
    assert.ok(chroma >= hueResolutionChroma * 2, `rgb(${red}, ${green}, ${blue}) has chroma ${chroma}`);
  }
});
