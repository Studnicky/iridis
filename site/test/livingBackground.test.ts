/**
 * Pure-logic coverage for useLivingBackground — palette restriction, drift
 * targeting, and OKLCH->hex conversion — none of which need a real DOM.
 */

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RoleViewType } from '../app/composables/types/roleView.ts';

import { buildDecorativePalette } from '../app/composables/buildDecorativePalette.ts';
import { createRingBuffer } from '../app/composables/createRingBuffer.ts';
import { driftTarget } from '../app/composables/driftTarget.ts';
import { resolveFromPalette } from '../app/composables/resolveFromPalette.ts';
import { tokensForFrame } from '../app/composables/tokensForFrame.ts';
import { useColorStreamHistory } from '../app/composables/useColorStreamHistory.ts';
import { oklchToHex } from '../app/utils/oklchToHex.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

const views: RoleViewType[] = [
  { 'c': 0.01, 'displayP3': undefined, 'h': 260, 'hex': '#0a0618', 'l': 0.1, 'name': 'background' },
  { 'c': 0.01, 'displayP3': undefined, 'h': 260, 'hex': '#e8e6f0', 'l': 0.95, 'name': 'text' },
  { 'c': 0.02, 'displayP3': undefined, 'h': 260, 'hex': '#8a86a0', 'l': 0.6, 'name': 'muted' },
  { 'c': 0.2, 'displayP3': undefined, 'h': 290, 'hex': '#7c3aed', 'l': 0.55, 'name': 'brand' },
  { 'c': 0.15, 'displayP3': undefined, 'h': 200, 'hex': '#06b6d4', 'l': 0.6, 'name': 'accent-alt' },
  { 'c': 0.18, 'displayP3': undefined, 'h': 150, 'hex': '#00c35a', 'l': 0.6, 'name': 'success' },
  { 'c': 0.15, 'displayP3': undefined, 'h': 80, 'hex': '#dda818', 'l': 0.7, 'name': 'warning' },
  { 'c': 0.2, 'displayP3': undefined, 'h': 25, 'hex': '#fb7367', 'l': 0.6, 'name': 'error' },
  { 'c': 0.15, 'displayP3': undefined, 'h': 230, 'hex': '#048df1', 'l': 0.55, 'name': 'info' }
];

await test('buildDecorativePalette restricts to the six decorative roles, skipping background/text/muted', () => {
  const palette = buildDecorativePalette(views);
  assert.deepEqual(new Set(Object.keys(palette)), new Set(['accent-alt', 'brand', 'error', 'info', 'success', 'warning']));
});

await test('buildDecorativePalette skips roles absent from roleViews', () => {
  const palette = buildDecorativePalette(views.filter((v) => {return v.name !== 'info';}));
  assert.equal(palette.info, undefined);
  assert.ok(palette.brand !== undefined);
});

await test('driftTarget keeps l and h fixed per role, nudges c within the subtle bound, and never repeats the same target for varying randomness', () => {
  const from = buildDecorativePalette(views);
  const toLow = driftTarget(from, () => { const result = 0; return result; });
  const toHigh = driftTarget(from, () => { const result = 1; return result; });
  for (const role of Object.keys(from)) {
    const before = from[role]!;
    const afterLow = toLow[role]!;
    const afterHigh = toHigh[role]!;
    assert.equal(afterLow.l, before.l);
    assert.equal(afterLow.h, before.h);
    assert.equal(afterHigh.l, before.l);
    assert.equal(afterHigh.h, before.h);
    assert.notEqual(afterLow.c, afterHigh.c);
    assert.ok(Math.abs(afterHigh.c - before.c) <= 0.035 + 1e-9);
  }
});

await test('resolveFromPalette retries the build when the initial roleViews read was empty, instead of staying stuck', () => {
  const stillEmpty = resolveFromPalette({}, []);
  assert.deepEqual(stillEmpty, {});

  const nowPopulated = resolveFromPalette({}, views);
  assert.deepEqual(new Set(Object.keys(nowPopulated)), new Set(['accent-alt', 'brand', 'error', 'info', 'success', 'warning']));
});

await test('resolveFromPalette leaves an already-populated palette untouched', () => {
  const from = buildDecorativePalette(views);
  const resolved = resolveFromPalette(from, []);
  assert.equal(resolved, from);
});

await test('oklchToHex composes oklchToRgb + rgbToHex into a valid hex string', () => {
  const hex = oklchToHex(0.55, 0.2, 290);
  assert.match(hex, TestPatterns.HEX);
});

await test('tokensForFrame emits one --ui-color-{alias}-500 token per decorative alias, each a valid hex', () => {
  const palette: PaletteInterfaceType = buildDecorativePalette(views);
  const tokens = tokensForFrame(palette);
  assert.deepEqual(new Set(Object.keys(tokens)), new Set([
    '--ui-color-error-500', '--ui-color-info-500', '--ui-color-primary-500',
    '--ui-color-secondary-500', '--ui-color-success-500', '--ui-color-warning-500'
  ]));
  for (const hex of Object.values(tokens)) {assert.match(hex, TestPatterns.HEX);}
});

await test('createRingBuffer returns exactly N items, oldest-to-newest, when pushed fewer than capacity', () => {
  const buffer = createRingBuffer<number>(5);
  buffer.push(1);
  buffer.push(2);
  buffer.push(3);
  assert.deepEqual(buffer.toArray(), [1, 2, 3]);
});

await test('createRingBuffer evicts the oldest entries once past capacity, maintaining oldest-to-newest order', () => {
  const buffer = createRingBuffer<number>(3);
  for (let i = 1; i <= 5; i++) { buffer.push(i); }
  assert.deepEqual(buffer.toArray(), [3, 4, 5]);
});

await test('useColorStreamHistory returns empty arrays for every decorative alias before any ticks have run', () => {
  const history = useColorStreamHistory();
  assert.deepEqual(new Set(Object.keys(history)), new Set(['error', 'info', 'primary', 'secondary', 'success', 'warning']));
  for (const samples of Object.values(history)) { assert.deepEqual(samples, []); }
});
