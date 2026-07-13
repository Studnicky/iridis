/**
 * Pure-logic coverage for useLivingBackground — palette restriction, drift
 * targeting, and OKLCH->hex conversion — none of which need a real DOM.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { RoleViewType } from '../app/composables/types/roleView.ts';
import { buildDecorativePalette, createRingBuffer, driftTarget, oklchToHex, resolveFromPalette, tokensForFrame, useColorStreamHistory } from '../app/composables/useLivingBackground.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;

const views: RoleViewType[] = [
  { 'name': 'background', 'l': 0.1, 'c': 0.01, 'h': 260, 'hex': '#0a0618' },
  { 'name': 'text', 'l': 0.95, 'c': 0.01, 'h': 260, 'hex': '#e8e6f0' },
  { 'name': 'muted', 'l': 0.6, 'c': 0.02, 'h': 260, 'hex': '#8a86a0' },
  { 'name': 'brand', 'l': 0.55, 'c': 0.2, 'h': 290, 'hex': '#7c3aed' },
  { 'name': 'accent-alt', 'l': 0.6, 'c': 0.15, 'h': 200, 'hex': '#06b6d4' },
  { 'name': 'success', 'l': 0.6, 'c': 0.18, 'h': 150, 'hex': '#00c35a' },
  { 'name': 'warning', 'l': 0.7, 'c': 0.15, 'h': 80, 'hex': '#dda818' },
  { 'name': 'error', 'l': 0.6, 'c': 0.2, 'h': 25, 'hex': '#fb7367' },
  { 'name': 'info', 'l': 0.55, 'c': 0.15, 'h': 230, 'hex': '#048df1' }
];

test('buildDecorativePalette restricts to the six decorative roles, skipping background/text/muted', () => {
  const palette = buildDecorativePalette(views);
  assert.deepEqual(new Set(Object.keys(palette)), new Set(['brand', 'accent-alt', 'success', 'warning', 'error', 'info']));
});

test('buildDecorativePalette skips roles absent from roleViews', () => {
  const palette = buildDecorativePalette(views.filter((v) => v.name !== 'info'));
  assert.equal(palette['info'], undefined);
  assert.ok(palette['brand'] !== undefined);
});

test('driftTarget keeps l and h fixed per role, nudges c within the subtle bound, and never repeats the same target for varying randomness', () => {
  const from = buildDecorativePalette(views);
  const toLow = driftTarget(from, () => 0);
  const toHigh = driftTarget(from, () => 1);
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

test('resolveFromPalette retries the build when the initial roleViews read was empty, instead of staying stuck', () => {
  const stillEmpty = resolveFromPalette({}, []);
  assert.deepEqual(stillEmpty, {});

  const nowPopulated = resolveFromPalette({}, views);
  assert.deepEqual(new Set(Object.keys(nowPopulated)), new Set(['brand', 'accent-alt', 'success', 'warning', 'error', 'info']));
});

test('resolveFromPalette leaves an already-populated palette untouched', () => {
  const from = buildDecorativePalette(views);
  const resolved = resolveFromPalette(from, []);
  assert.equal(resolved, from);
});

test('oklchToHex composes oklchToRgb + rgbToHex into a valid hex string', () => {
  const hex = oklchToHex(0.55, 0.2, 290);
  assert.match(hex, HEX);
});

test('tokensForFrame emits one --ui-color-{alias}-500 token per decorative alias, each a valid hex', () => {
  const palette: PaletteInterfaceType = buildDecorativePalette(views);
  const tokens = tokensForFrame(palette);
  assert.deepEqual(new Set(Object.keys(tokens)), new Set([
    '--ui-color-primary-500', '--ui-color-secondary-500', '--ui-color-success-500',
    '--ui-color-warning-500', '--ui-color-error-500', '--ui-color-info-500'
  ]));
  for (const hex of Object.values(tokens)) {assert.match(hex, HEX);}
});

test('createRingBuffer returns exactly N items, oldest-to-newest, when pushed fewer than capacity', () => {
  const buf = createRingBuffer<number>(5);
  buf.push(1);
  buf.push(2);
  buf.push(3);
  assert.deepEqual(buf.toArray(), [1, 2, 3]);
});

test('createRingBuffer evicts the oldest entries once past capacity, maintaining oldest-to-newest order', () => {
  const buf = createRingBuffer<number>(3);
  for (let i = 1; i <= 5; i++) { buf.push(i); }
  assert.deepEqual(buf.toArray(), [3, 4, 5]);
});

test('useColorStreamHistory returns empty arrays for every decorative alias before any ticks have run', () => {
  const history = useColorStreamHistory();
  assert.deepEqual(new Set(Object.keys(history)), new Set(['primary', 'secondary', 'success', 'warning', 'error', 'info']));
  for (const samples of Object.values(history)) { assert.deepEqual(samples, []); }
});
