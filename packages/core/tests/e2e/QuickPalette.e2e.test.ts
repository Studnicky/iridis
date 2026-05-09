/**
 * quickPalette one-liner contract.
 *
 * One call, one array of seeds, optional framing — back comes a four-key
 * hex palette guaranteed to satisfy the framing-appropriate clamp ranges.
 */

import { test } from 'node:test';

import { quickPalette } from '@studnicky/iridis';
import { assert }       from './ScenarioRunner.ts';

test('quickPalette :: dark framing :: returns four hex roles', async () => {
  const palette = await quickPalette(['#7c3aed', '#06b6d4', '#10b981']);

  assert.match(palette.background, /^#[0-9a-f]{6}$/);
  assert.match(palette.foreground, /^#[0-9a-f]{6}$/);
  assert.match(palette.accent,     /^#[0-9a-f]{6}$/);
  assert.match(palette.muted,      /^#[0-9a-f]{6}$/);
});

test('quickPalette :: dark framing :: background is dark, foreground is light', async () => {
  const palette = await quickPalette(['#7c3aed']);
  // hex → bytes; sum < 96 means dark, sum > 600 means light
  const sum = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
  };
  assert.ok(sum(palette.background) < 120, `dark background expected; got ${palette.background}`);
  assert.ok(sum(palette.foreground) > 600, `light foreground expected; got ${palette.foreground}`);
});

test('quickPalette :: light framing :: background is light, foreground is dark', async () => {
  const palette = await quickPalette(['#7c3aed'], 'light');
  const sum = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
  };
  assert.ok(sum(palette.background) > 700, `light background expected; got ${palette.background}`);
  assert.ok(sum(palette.foreground) < 200, `dark foreground expected; got ${palette.foreground}`);
});

test('quickPalette :: single seed :: still produces a complete palette', async () => {
  const palette = await quickPalette(['#888888']);
  assert.ok(palette.background);
  assert.ok(palette.foreground);
  assert.ok(palette.accent);
  assert.ok(palette.muted);
});
