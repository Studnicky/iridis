/**
 * QuickPalette.e2e — scenario-matrix suite.
 *
 * Subject: `quickPalette` one-liner API.
 * One call, one array of seeds, optional framing; back comes a four-key
 * hex palette guaranteed to satisfy the framing-appropriate clamp ranges.
 *
 * Cells:
 *   1. palette-shape     — all four hex roles returned with correct format
 *   2. framing-dark      — background dark, foreground light
 *   3. framing-light     — background light, foreground dark
 *   4. edge-inputs       — single seed, three seeds, min-luminance seed
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { test }                        from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { quickPalette } from '@studnicky/iridis';

const QUICK_PALETTE_GOLDEN = new URL(
  '../fixtures/quickPalette-violet-dark.json',
  import.meta.url,
);

/** Sum of RGB byte values of a hex color — approximates perceived brightness. */
function byteSum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
}

// ---------------------------------------------------------------------------
// Cell 1 — palette shape: all four hex roles returned in correct format
//
// quickPalette must always return an object with keys: background, foreground,
// accent, muted. Each value must be a 6-digit lowercase hex string.
// ---------------------------------------------------------------------------

interface PaletteShapeInput  { readonly seeds: string[]; readonly framing?: 'dark' | 'light' }
interface PaletteShapeOutput {
  readonly background: string;
  readonly foreground: string;
  readonly accent:     string;
  readonly muted:      string;
}

const paletteShapeScenarios: readonly ScenarioInterface<PaletteShapeInput, PaletteShapeOutput>[] = [
  {
    name: 'three seeds return four hex roles in dark framing',
    kind: 'happy',
    input: { seeds: ['#7c3aed', '#06b6d4', '#10b981'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                       '[cell=1, scenario=three-seeds-dark] no throw');
      assert.match(output!.background, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] background is hex');
      assert.match(output!.foreground, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] foreground is hex');
      assert.match(output!.accent,     /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] accent is hex');
      assert.match(output!.muted,      /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-dark] muted is hex');
    },
  },
  {
    name: 'three seeds return four hex roles in light framing',
    kind: 'happy',
    input: { seeds: ['#7c3aed', '#06b6d4', '#10b981'], framing: 'light' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                        '[cell=1, scenario=three-seeds-light] no throw');
      assert.match(output!.background, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] background is hex');
      assert.match(output!.foreground, /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] foreground is hex');
      assert.match(output!.accent,     /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] accent is hex');
      assert.match(output!.muted,      /^#[0-9a-f]{6}$/, '[cell=1, scenario=three-seeds-light] muted is hex');
    },
  },
  {
    name: 'single seed still returns all four roles',
    kind: 'edge',
    input: { seeds: ['#888888'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,    '[cell=1, scenario=single-seed] no throw');
      assert.ok(output!.background,           '[cell=1, scenario=single-seed] background present');
      assert.ok(output!.foreground,           '[cell=1, scenario=single-seed] foreground present');
      assert.ok(output!.accent,               '[cell=1, scenario=single-seed] accent present');
      assert.ok(output!.muted,               '[cell=1, scenario=single-seed] muted present');
    },
  },
];

new ScenarioRunner<PaletteShapeInput, PaletteShapeOutput>(
  'QuickPalette :: cell-1 :: palette-shape',
  async (input) => {
    return await quickPalette(input.seeds, input.framing);
  },
).run(paletteShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — dark framing: background dark, foreground light
//
// In dark framing the background must be visually dark (byte sum < 120) and
// the foreground must be visually light (byte sum > 600).
// ---------------------------------------------------------------------------

interface FramingInput  { readonly seeds: string[]; readonly framing?: 'dark' | 'light' }
interface FramingOutput { readonly bgSum: number; readonly fgSum: number }

const darkFramingScenarios: readonly ScenarioInterface<FramingInput, FramingOutput>[] = [
  {
    name: 'violet seed in dark framing: background dark, foreground light',
    kind: 'happy',
    input: { seeds: ['#7c3aed'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                                           '[cell=2, scenario=violet-dark] no throw');
      assert.ok(output!.bgSum < 120,  `[cell=2, scenario=violet-dark] dark background expected; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum > 600,  `[cell=2, scenario=violet-dark] light foreground expected; fgSum=${output!.fgSum}`);
    },
  },
  {
    name: 'neutral grey seed in dark framing still produces dark bg / light fg',
    kind: 'edge',
    input: { seeds: ['#888888'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                                             '[cell=2, scenario=grey-dark] no throw');
      assert.ok(output!.bgSum < 120,  `[cell=2, scenario=grey-dark] dark background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum > 600,  `[cell=2, scenario=grey-dark] light foreground; fgSum=${output!.fgSum}`);
    },
  },
];

new ScenarioRunner<FramingInput, FramingOutput>(
  'QuickPalette :: cell-2 :: framing-dark',
  async (input) => {
    const p = await quickPalette(input.seeds, input.framing);
    return { bgSum: byteSum(p.background), fgSum: byteSum(p.foreground) };
  },
).run(darkFramingScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — light framing: background light, foreground dark
//
// In light framing the background must be visually light (byte sum > 700) and
// the foreground must be visually dark (byte sum < 200).
// ---------------------------------------------------------------------------

const lightFramingScenarios: readonly ScenarioInterface<FramingInput, FramingOutput>[] = [
  {
    name: 'violet seed in light framing: background light, foreground dark',
    kind: 'happy',
    input: { seeds: ['#7c3aed'], framing: 'light' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                                            '[cell=3, scenario=violet-light] no throw');
      assert.ok(output!.bgSum > 700,  `[cell=3, scenario=violet-light] light background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum < 200,  `[cell=3, scenario=violet-light] dark foreground; fgSum=${output!.fgSum}`);
    },
  },
  {
    name: 'neutral grey seed in light framing still produces light bg / dark fg',
    kind: 'edge',
    input: { seeds: ['#888888'], framing: 'light' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                                              '[cell=3, scenario=grey-light] no throw');
      assert.ok(output!.bgSum > 700,  `[cell=3, scenario=grey-light] light background; bgSum=${output!.bgSum}`);
      assert.ok(output!.fgSum < 200,  `[cell=3, scenario=grey-light] dark foreground; fgSum=${output!.fgSum}`);
    },
  },
];

new ScenarioRunner<FramingInput, FramingOutput>(
  'QuickPalette :: cell-3 :: framing-light',
  async (input) => {
    const p = await quickPalette(input.seeds, input.framing);
    return { bgSum: byteSum(p.background), fgSum: byteSum(p.foreground) };
  },
).run(lightFramingScenarios);

// ---------------------------------------------------------------------------
// Golden fixtures
// ---------------------------------------------------------------------------

test('QuickPalette :: golden :: violet seed under dark framing matches locked fixture', async () => {
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
