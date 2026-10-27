import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RoleGeometry } from '../../src/tasks/RoleGeometry.ts';

void test('RoleGeometry applies one coordinate mode to both OKLCH channels', () => {
  const mode = RoleGeometry.coordinateMode({
    'lightnessOffset': 0.1,
    'operation': 'oklch-delta'
  });
  const coordinates = RoleGeometry.relationshipCoordinates(0.8, 0.1, {
    'chromaRange': [0.01, 0.05],
    'lightnessRange': [0.7, 0.9]
  }, { 'chroma': mode, 'lightness': mode });

  assert.deepStrictEqual(coordinates, { 'chroma': 0.05, 'lightness': 0.8 });
});

void test('RoleGeometry uses target-range midpoints for preserved coordinates', () => {
  const mode = RoleGeometry.coordinateMode({ 'operation': 'oklch-delta' });
  const coordinates = RoleGeometry.relationshipCoordinates(0.8, 0.1, {
    'chromaRange': [0.01, 0.05],
    'lightnessRange': [0.7, 0.9]
  }, { 'chroma': mode, 'lightness': mode });

  assert.equal(coordinates.chroma, RoleGeometry.rangeCenter([0.01, 0.05]));
  assert.equal(coordinates.lightness, 0.8);
});
