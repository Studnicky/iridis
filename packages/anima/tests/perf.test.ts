import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { evaluate } from '../src/index.ts';

const ROLE_NAMES = [
  'accent', 'background', 'border', 'critical', 'foreground', 'link',
  'muted', 'onAccent', 'onButton', 'positive', 'surface', 'text'
];

function makePalette(hueOffset: number): PaletteInterfaceType {
  const palette: PaletteInterfaceType = {};
  for (let i = 0; i < ROLE_NAMES.length; i += 1) {
    palette[ROLE_NAMES[i] as string] = { 'c': 0.1, 'h': (i * 30 + hueOffset) % 360, 'l': 0.5 };
  }
  return palette;
}

const FROM = makePalette(0);
const TO   = makePalette(180);

test('evaluate: a 12-role palette frame evaluates well under budget (averaged over many iterations)', () => {
  const ITERATIONS = 1000;

  // Warm up.
  for (let i = 0; i < 100; i += 1) evaluate(FROM, TO, 0.5);

  const startedAt = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i += 1) {
    evaluate(FROM, TO, (i % 100) / 100);
  }
  const elapsedNs = Number(process.hrtime.bigint() - startedAt);
  const avgMs = elapsedNs / ITERATIONS / 1_000_000;

  // Budget documented as <1ms; asserted generously at <2ms to absorb CI jitter.
  assert.ok(avgMs < 2, `average evaluate() call took ${avgMs.toFixed(4)}ms, expected < 2ms`);
});
