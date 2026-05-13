/**
 * quickPalette one-liner contract.
 *
 * One call, one array of seeds, optional framing — back comes a four-key
 * hex palette guaranteed to satisfy the framing-appropriate clamp ranges.
 */

import { test }                            from 'node:test';
import { readFileSync, writeFileSync }     from 'node:fs';

import { quickPalette } from '@studnicky/iridis';
import { assert }       from './ScenarioRunner.ts';

const QUICK_PALETTE_GOLDEN = new URL(
  '../fixtures/quickPalette-violet-dark.json',
  import.meta.url,
);

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

// ---------------------------------------------------------------------------
// Golden fixture — locks the output of quickPalette(['#5b21b6'], 'dark') so any
// drift in intake / resolve / role-range math surfaces as a test failure. Set
// UPDATE_GOLDENS=1 to regenerate the fixture after an intentional behaviour
// change.
// ---------------------------------------------------------------------------

test('quickPalette :: golden :: violet seed under dark framing matches locked fixture', async () => {
  const palette = await quickPalette(['#5b21b6'], 'dark');
  const actual  = `${JSON.stringify(palette, null, 2)}\n`;

  if (process.env['UPDATE_GOLDENS'] === '1') {
    writeFileSync(QUICK_PALETTE_GOLDEN, actual);
  }

  const expected = readFileSync(QUICK_PALETTE_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'quickPalette(["#5b21b6"], "dark") output drifted; regenerate with UPDATE_GOLDENS=1 if intentional',
  );
});
