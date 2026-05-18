/**
 * AlphaChannel — scenario-matrix suite.
 *
 * Subject: alpha-channel contract across math primitives.
 * Documents and tests:
 *   - colorRecordFactory.fromHex parses #rrggbbaa (8-digit) into alpha
 *   - colorRecordFactory.fromOklch takes an explicit alpha arg and clamps
 *   - mixOklch lerps alpha between two records
 *   - lighten / darken / saturate / desaturate / hueShift PRESERVE alpha
 *   - ensureContrast PRESERVES the foreground's alpha (not the bg's)
 *
 * Cells:
 *   1. fromHex         — 6-digit, 8-digit, fully-transparent, invalid lengths
 *   2. fromOklch       — alpha honored, clamped high, clamped low
 *   3. mixOklch        — alpha lerp between endpoints
 *   4. modifiers       — lighten, darken, saturate, desaturate, hueShift all preserve alpha
 *   5. ensureContrast  — foreground alpha preserved, background alpha not adopted
 */

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import {
  colorRecordFactory,
  mixOklch,
  lighten,
  darken,
  saturate,
  desaturate,
  hueShift,
  ensureContrast,
} from '@studnicky/iridis';

const APPROX = 1 / 255;

// ---------------------------------------------------------------------------
// Cell 1 — fromHex parses alpha from 6-digit and 8-digit hex strings
//
// 6-digit: alpha defaults to 1.
// 8-digit (#rrggbbaa): last byte encodes alpha in [0..255] → [0..1].
// 7-digit: structurally ambiguous; must throw.
// Canonical `hex` slot always holds the 6-digit form; alpha is a separate field.
// ---------------------------------------------------------------------------

interface FromHexInput  { readonly hex: string; }
interface FromHexOutput { readonly alpha: number; readonly hex: string; }

const fromHexScenarios: readonly ScenarioInterface<FromHexInput, FromHexOutput>[] = [
  {
    name: '6-digit defaults alpha to 1',
    kind: 'happy',
    input: { hex: '#7c3aed' },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=1, scenario=6-digit] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=1, scenario=6-digit] alpha is 1');
      assert.strictEqual(output!.hex,   '#7c3aed', '[cell=1, scenario=6-digit] hex field is 6-digit');
    },
  },
  {
    name: '8-digit parses #rrggbbaa byte as alpha',
    kind: 'happy',
    input: { hex: '#7c3aed80' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=8-digit] no throw');
      assert.ok(
        Math.abs(output!.alpha - (0x80 / 255)) < APPROX,
        `[cell=1, scenario=8-digit] alpha ≈ 0x80/255, got ${output!.alpha}`,
      );
      assert.strictEqual(output!.hex, '#7c3aed', '[cell=1, scenario=8-digit] canonical hex stays 6-digit');
    },
  },
  {
    name: 'fully transparent #rrggbb00 yields alpha 0',
    kind: 'edge',
    input: { hex: '#7c3aed00' },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=1, scenario=transparent] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=1, scenario=transparent] alpha is 0');
    },
  },
  {
    name: 'fully opaque #rrggbbff yields alpha 1',
    kind: 'edge',
    input: { hex: '#7c3aedff' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=opaque] no throw');
      assert.ok(
        Math.abs(output!.alpha - (0xff / 255)) < APPROX,
        `[cell=1, scenario=opaque] alpha ≈ 1, got ${output!.alpha}`,
      );
    },
  },
  {
    name: '7-digit hex throws',
    kind: 'unhappy',
    input: { hex: '#1234567' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=7-digit] expected throw for invalid length');
    },
  },
];

new ScenarioRunner<FromHexInput, FromHexOutput>(
  'AlphaChannel :: cell-1 :: fromHex',
  (input) => {
    const c = colorRecordFactory.fromHex(input.hex);
    return { alpha: c.alpha, hex: c.hex };
  },
).run(fromHexScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — fromOklch alpha argument honored and clamped
//
// fromOklch takes an explicit 4th argument (alpha). Values outside [0..1] are
// clamped; the value is stored verbatim when in range.
// ---------------------------------------------------------------------------

interface FromOklchInput  { readonly l: number; readonly c: number; readonly h: number; readonly alpha: number; }
interface FromOklchOutput { readonly alpha: number; }

const fromOklchScenarios: readonly ScenarioInterface<FromOklchInput, FromOklchOutput>[] = [
  {
    name: 'in-range alpha stored verbatim',
    kind: 'happy',
    input: { l: 0.5, c: 0.1, h: 200, alpha: 0.5 },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=in-range] no throw');
      assert.strictEqual(output!.alpha, 0.5,       '[cell=2, scenario=in-range] alpha stored as supplied');
    },
  },
  {
    name: 'alpha above 1 clamped to 1',
    kind: 'edge',
    input: { l: 0.5, c: 0.1, h: 200, alpha: 2.5 },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=clamp-high] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=2, scenario=clamp-high] alpha clamped to 1');
    },
  },
  {
    name: 'alpha below 0 clamped to 0',
    kind: 'edge',
    input: { l: 0.5, c: 0.1, h: 200, alpha: -0.5 },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=clamp-low] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=2, scenario=clamp-low] alpha clamped to 0');
    },
  },
  {
    name: 'alpha exactly 0 boundary accepted',
    kind: 'edge',
    input: { l: 0.5, c: 0.1, h: 200, alpha: 0 },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=boundary-0] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=2, scenario=boundary-0] alpha is 0');
    },
  },
  {
    name: 'alpha exactly 1 boundary accepted',
    kind: 'edge',
    input: { l: 0.5, c: 0.1, h: 200, alpha: 1 },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=boundary-1] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=2, scenario=boundary-1] alpha is 1');
    },
  },
];

new ScenarioRunner<FromOklchInput, FromOklchOutput>(
  'AlphaChannel :: cell-2 :: fromOklch',
  (input) => {
    const c = colorRecordFactory.fromOklch(input.l, input.c, input.h, input.alpha);
    return { alpha: (c as { alpha: number }).alpha };
  },
).run(fromOklchScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — mixOklch lerps alpha between endpoints
//
// Given two records with alpha values a0 and a1, mixing at t must produce
// alpha = a0 + (a1 - a0) * t. The lerp must be monotonic across t in [0..1].
// ---------------------------------------------------------------------------

interface MixOklchInput  { readonly alphaA: number; readonly alphaB: number; readonly t: number; }
interface MixOklchOutput { readonly alpha: number; }

const mixOklchScenarios: readonly ScenarioInterface<MixOklchInput, MixOklchOutput>[] = [
  {
    name: 'quarter-mix between fully-transparent and fully-opaque',
    kind: 'happy',
    input: { alphaA: 0.0, alphaB: 1.0, t: 0.25 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=quarter-mix] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.25) < 1e-9,
        `[cell=3, scenario=quarter-mix] alpha ≈ 0.25, got ${output!.alpha}`,
      );
    },
  },
  {
    name: 't=0 returns source alpha unchanged',
    kind: 'edge',
    input: { alphaA: 0.6, alphaB: 0.9, t: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=t=0] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.6) < 1e-9,
        `[cell=3, scenario=t=0] alpha should equal source alpha 0.6, got ${output!.alpha}`,
      );
    },
  },
  {
    name: 't=1 returns target alpha unchanged',
    kind: 'edge',
    input: { alphaA: 0.6, alphaB: 0.9, t: 1 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=t=1] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.9) < 1e-9,
        `[cell=3, scenario=t=1] alpha should equal target alpha 0.9, got ${output!.alpha}`,
      );
    },
  },
  {
    name: 'same alpha both ends yields same alpha at any t',
    kind: 'edge',
    input: { alphaA: 0.5, alphaB: 0.5, t: 0.5 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=same-alpha] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.5) < 1e-9,
        `[cell=3, scenario=same-alpha] alpha should remain 0.5, got ${output!.alpha}`,
      );
    },
  },
];

new ScenarioRunner<MixOklchInput, MixOklchOutput>(
  'AlphaChannel :: cell-3 :: mixOklch',
  (input) => {
    const a = colorRecordFactory.fromOklch(0.5, 0.1, 0, input.alphaA);
    const b = colorRecordFactory.fromOklch(0.5, 0.1, 0, input.alphaB);
    const mixed = mixOklch.apply(a, b, input.t);
    return { alpha: (mixed as { alpha: number }).alpha };
  },
).run(mixOklchScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — color modifiers preserve alpha
//
// lighten, darken, saturate, desaturate, hueShift must pass the alpha field
// through unchanged. The modifier acts only on the color dimensions (L, C, H).
// ---------------------------------------------------------------------------

type ModifierName = 'lighten' | 'darken' | 'saturate' | 'desaturate' | 'hueShift';

interface ModifierInput  {
  readonly modifier: ModifierName;
  readonly sourceAlpha: number;
  readonly amount: number;
}
interface ModifierOutput { readonly resultAlpha: number; }

const modifierScenarios: readonly ScenarioInterface<ModifierInput, ModifierOutput>[] = [
  {
    name: 'lighten preserves source alpha',
    kind: 'happy',
    input: { modifier: 'lighten', sourceAlpha: 0.42, amount: 0.1 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=lighten] no throw');
      assert.strictEqual(output!.resultAlpha, 0.42,    '[cell=4, scenario=lighten] alpha unchanged');
    },
  },
  {
    name: 'darken preserves source alpha',
    kind: 'happy',
    input: { modifier: 'darken', sourceAlpha: 0.33, amount: 0.15 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=darken] no throw');
      assert.strictEqual(output!.resultAlpha, 0.33,    '[cell=4, scenario=darken] alpha unchanged');
    },
  },
  {
    name: 'saturate preserves source alpha',
    kind: 'happy',
    input: { modifier: 'saturate', sourceAlpha: 0.7, amount: 0.05 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=saturate] no throw');
      assert.strictEqual(output!.resultAlpha, 0.7,     '[cell=4, scenario=saturate] alpha unchanged');
    },
  },
  {
    name: 'desaturate preserves source alpha',
    kind: 'happy',
    input: { modifier: 'desaturate', sourceAlpha: 0.7, amount: 0.05 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=desaturate] no throw');
      assert.strictEqual(output!.resultAlpha, 0.7,     '[cell=4, scenario=desaturate] alpha unchanged');
    },
  },
  {
    name: 'hueShift preserves source alpha',
    kind: 'happy',
    input: { modifier: 'hueShift', sourceAlpha: 0.6, amount: 90 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=hueShift] no throw');
      assert.strictEqual(output!.resultAlpha, 0.6,     '[cell=4, scenario=hueShift] alpha unchanged');
    },
  },
  {
    name: 'lighten with alpha=0 (fully transparent) preserves zero alpha',
    kind: 'edge',
    input: { modifier: 'lighten', sourceAlpha: 0, amount: 0.2 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=lighten-zero-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 0,        '[cell=4, scenario=lighten-zero-alpha] zero alpha preserved');
    },
  },
  {
    name: 'darken with alpha=1 (fully opaque) preserves full alpha',
    kind: 'edge',
    input: { modifier: 'darken', sourceAlpha: 1, amount: 0.2 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=darken-full-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 1,        '[cell=4, scenario=darken-full-alpha] full alpha preserved');
    },
  },
];

new ScenarioRunner<ModifierInput, ModifierOutput>(
  'AlphaChannel :: cell-4 :: modifiers',
  (input) => {
    const base = colorRecordFactory.fromOklch(0.5, 0.1, 200, input.sourceAlpha);
    let result: { alpha: number };
    switch (input.modifier) {
      case 'lighten':     result = lighten.apply(base,     input.amount) as { alpha: number }; break;
      case 'darken':      result = darken.apply(base,      input.amount) as { alpha: number }; break;
      case 'saturate':    result = saturate.apply(base,    input.amount) as { alpha: number }; break;
      case 'desaturate':  result = desaturate.apply(base,  input.amount) as { alpha: number }; break;
      case 'hueShift':    result = hueShift.apply(base,    input.amount) as { alpha: number }; break;
    }
    return { resultAlpha: result.alpha };
  },
).run(modifierScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — ensureContrast preserves the foreground alpha, not the background's
//
// ensureContrast adjusts luminance to meet a target ratio. The alpha of the
// foreground record must pass through; the background's alpha must not bleed
// into the returned record.
// ---------------------------------------------------------------------------

interface EnsureContrastInput {
  readonly fgAlpha: number;
  readonly bgAlpha: number;
  readonly minRatio: number;
}
interface EnsureContrastOutput { readonly resultAlpha: number; }

const ensureContrastScenarios: readonly ScenarioInterface<EnsureContrastInput, EnsureContrastOutput>[] = [
  {
    name: 'foreground alpha preserved; background alpha not adopted',
    kind: 'happy',
    input: { fgAlpha: 0.85, bgAlpha: 1.0, minRatio: 4.5 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=fg-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 0.85,    '[cell=5, scenario=fg-alpha] fg alpha passes through');
    },
  },
  {
    name: 'foreground alpha=0 still produces transparent result',
    kind: 'edge',
    input: { fgAlpha: 0, bgAlpha: 1.0, minRatio: 3.0 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=fg-alpha=0] no throw');
      assert.strictEqual(output!.resultAlpha, 0,        '[cell=5, scenario=fg-alpha=0] transparent fg preserved');
    },
  },
  {
    name: 'background alpha=0 does not corrupt foreground alpha',
    kind: 'edge',
    input: { fgAlpha: 0.5, bgAlpha: 0, minRatio: 3.0 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=bg-alpha=0] no throw');
      assert.strictEqual(output!.resultAlpha, 0.5,     '[cell=5, scenario=bg-alpha=0] fg alpha unchanged despite transparent bg');
    },
  },
];

new ScenarioRunner<EnsureContrastInput, EnsureContrastOutput>(
  'AlphaChannel :: cell-5 :: ensureContrast',
  (input) => {
    const fg  = colorRecordFactory.fromOklch(0.50, 0.05, 200, input.fgAlpha);
    const bg  = colorRecordFactory.fromOklch(0.55, 0.05, 200, input.bgAlpha);
    const out = ensureContrast.apply(fg, bg, input.minRatio, 'wcag21') as { alpha: number };
    return { resultAlpha: out.alpha };
  },
).run(ensureContrastScenarios);
