/**
 * QuickPalette.e2e — scenario-matrix suite.
 *
 * Subject: `QuickPalette.resolve` one-liner API.
 * One call, one array of seeds, optional framing; back comes a four-key
 * hex palette guaranteed to satisfy the framing-appropriate clamp ranges.
 *
 * Cells:
 *   1. palette-shape     — all four hex roles returned with correct format
 *   2. framing-dark      — background dark, foreground light
 *   3. framing-light     — background light, foreground dark
 *   4. edge-inputs       — single seed, three seeds, min-luminance seed
 */

import { QuickPalette, type QuickPaletteInterfaceType } from '@studnicky/iridis';
import assert                                           from 'node:assert/strict';
import { test }                                         from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

const QUICK_PALETTE_GOLDEN = new URL(
  '../fixtures/quickPalette-violet-dark.json',
  import.meta.url
);

class HexColor {
  /** Sum of RGB byte values of a hex color — approximates perceived brightness. */
  static byteSum(hex: string): number {
    const parsedInteger = parseInt(hex.slice(1), 16);
    return ((parsedInteger >> 16) & 0xff) + ((parsedInteger >> 8) & 0xff) + (parsedInteger & 0xff);
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — palette shape: all four hex roles returned in correct format
//
// QuickPalette.resolve must always return an object with keys: background, foreground,
// accent, muted. Each value must be a 6-digit lowercase hex string.
// ---------------------------------------------------------------------------

type PaletteShapeInput =  { readonly 'framing'?: 'dark' | 'light'; readonly 'seeds': string[]; };

const paletteShapeScenarios: readonly ScenarioInterface<PaletteShapeInput, QuickPaletteInterfaceType>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                       '[cell=1, scenario=three-seeds-dark] no throw');
      assert.match(output!.background, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] background is hex');
      assert.match(output!.foreground, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] foreground is hex');
      assert.match(output!.accent,     /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] accent is hex');
      assert.match(output!.muted,      /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] muted is hex');
    },
    'input': { 'seeds': ['#7c3aed', '#06b6d4', '#10b981'] },
    'kind': 'happy',
    'name': 'three seeds return four hex roles in dark framing'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                        '[cell=1, scenario=three-seeds-light] no throw');
      assert.match(output!.background, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] background is hex');
      assert.match(output!.foreground, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] foreground is hex');
      assert.match(output!.accent,     /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] accent is hex');
      assert.match(output!.muted,      /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] muted is hex');
    },
    'input': { 'framing': 'light', 'seeds': ['#7c3aed', '#06b6d4', '#10b981'] },
    'kind': 'happy',
    'name': 'three seeds return four hex roles in light framing'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=1, scenario=single-seed] no throw');
      assert.ok(output!.background !== '',               '[cell=1, scenario=single-seed] background present');
      assert.ok(output!.foreground !== '',               '[cell=1, scenario=single-seed] foreground present');
      assert.ok(output!.accent !== '',                   '[cell=1, scenario=single-seed] accent present');
      assert.ok(output!.muted !== '',                     '[cell=1, scenario=single-seed] muted present');
    },
    'input': { 'seeds': ['#888888'] },
    'kind': 'edge',
    'name': 'single seed still returns all four roles'
  }
];

new ScenarioRunner<PaletteShapeInput, QuickPaletteInterfaceType>(
  'QuickPalette :: cell-1 :: palette-shape',
  (input) => {
    const result = QuickPalette.resolve(input.seeds, input.framing);
    return result;
  }
).run(paletteShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — dark framing: background dark, foreground light
//
// In dark framing the background must be visually dark (byte sum < 120) and
// the foreground must be visually light (byte sum > 600).
// ---------------------------------------------------------------------------

type FramingInput =  { readonly 'framing'?: 'dark' | 'light'; readonly 'seeds': string[]; };

const darkFramingScenarios: readonly ScenarioInterface<FramingInput, { readonly 'bgSum': number; readonly 'fgSum': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                                           '[cell=2, scenario=violet-dark] no throw');
      assert.ok(output!.bgSum < 120,  `[cell=2, scenario=violet-dark] dark background expected; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum > 600,  `[cell=2, scenario=violet-dark] light foreground expected; fgSum=${output!.fgSum}`);
    },
    'input': { 'seeds': ['#7c3aed'] },
    'kind': 'happy',
    'name': 'violet seed in dark framing: background dark, foreground light'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                                             '[cell=2, scenario=grey-dark] no throw');
      assert.ok(output!.bgSum < 120,  `[cell=2, scenario=grey-dark] dark background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum > 600,  `[cell=2, scenario=grey-dark] light foreground; fgSum=${output!.fgSum}`);
    },
    'input': { 'seeds': ['#888888'] },
    'kind': 'edge',
    'name': 'neutral grey seed in dark framing still produces dark bg / light fg'
  }
];

new ScenarioRunner<FramingInput, { readonly 'bgSum': number; readonly 'fgSum': number }>(
  'QuickPalette :: cell-2 :: framing-dark',
  (input) => {
    const palette = QuickPalette.resolve(input.seeds, input.framing);
    return { 'bgSum': HexColor.byteSum(palette.background), 'fgSum': HexColor.byteSum(palette.foreground) };
  }
).run(darkFramingScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — light framing: background light, foreground dark
//
// In light framing the background must be visually light (byte sum > 700) and
// the foreground must be visually dark (byte sum < 200).
// ---------------------------------------------------------------------------

const lightFramingScenarios: readonly ScenarioInterface<FramingInput, { readonly 'bgSum': number; readonly 'fgSum': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                                            '[cell=3, scenario=violet-light] no throw');
      assert.ok(output!.bgSum > 700,  `[cell=3, scenario=violet-light] light background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum < 200,  `[cell=3, scenario=violet-light] dark foreground; fgSum=${output!.fgSum}`);
    },
    'input': { 'framing': 'light', 'seeds': ['#7c3aed'] },
    'kind': 'happy',
    'name': 'violet seed in light framing: background light, foreground dark'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                                              '[cell=3, scenario=grey-light] no throw');
      assert.ok(output!.bgSum > 700,  `[cell=3, scenario=grey-light] light background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum < 200,  `[cell=3, scenario=grey-light] dark foreground; fgSum=${output!.fgSum}`);
    },
    'input': { 'framing': 'light', 'seeds': ['#888888'] },
    'kind': 'edge',
    'name': 'neutral grey seed in light framing still produces light bg / dark fg'
  }
];

new ScenarioRunner<FramingInput, { readonly 'bgSum': number; readonly 'fgSum': number }>(
  'QuickPalette :: cell-3 :: framing-light',
  (input) => {
    const palette = QuickPalette.resolve(input.seeds, input.framing);
    return { 'bgSum': HexColor.byteSum(palette.background), 'fgSum': HexColor.byteSum(palette.foreground) };
  }
).run(lightFramingScenarios);

// ---------------------------------------------------------------------------
// Golden fixtures
// ---------------------------------------------------------------------------

void test('QuickPalette :: golden :: violet seed under dark framing matches locked fixture', async () => {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const palette = QuickPalette.resolve(['#5b21b6'], 'dark');
  const actual  = `${JSON.stringify(palette, null, 2)}\n`;

  if (process.env.UPDATE_GOLDENS === '1') {
    writeFileSync(QUICK_PALETTE_GOLDEN, actual);
  }

  const expected = readFileSync(QUICK_PALETTE_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'QuickPalette.resolve(["#5b21b6"], "dark") output drifted; regenerate with UPDATE_GOLDENS=1 if intentional'
  );
});
