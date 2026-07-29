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

import type { ColorRecordInterfaceType } from '@studnicky/iridis';
import type { FromSchema } from '@studnicky/types';

import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  hueShift,
  lighten,
  mixOklch,
  saturate
} from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

const APPROX = 1 / 255;

// ---------------------------------------------------------------------------
// Cell 1 — fromHex parses alpha from 6-digit and 8-digit hex strings
//
// 6-digit: alpha defaults to 1.
// 8-digit (#rrggbbaa): last byte encodes alpha in [0..255] → [0..1].
// 7-digit: structurally ambiguous; must throw.
// Canonical `hex` slot always holds the 6-digit form; alpha is a separate field.
// ---------------------------------------------------------------------------

const FromHexInputSchema = {
  'additionalProperties': false,
  'properties': { 'hex': { 'type': 'string' } },
  'required': ['hex'],
  'type': 'object'
} as const;
type FromHexInput = FromSchema<typeof FromHexInputSchema>;

const fromHexScenarios: readonly ScenarioInterface<FromHexInput, ColorRecordInterfaceType>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=1, scenario=6-digit] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=1, scenario=6-digit] alpha is 1');
      assert.strictEqual(output!.hex,   '#7c3aed', '[cell=1, scenario=6-digit] hex field is 6-digit');
    },
    'input': { 'hex': '#7c3aed' },
    'kind': 'happy',
    'name': '6-digit defaults alpha to 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=8-digit] no throw');
      assert.ok(
        Math.abs(output!.alpha - (0x80 / 255)) < APPROX,
        `[cell=1, scenario=8-digit] alpha ≈ 0x80/255, got ${output!.alpha}`
      );
      assert.strictEqual(output!.hex, '#7c3aed', '[cell=1, scenario=8-digit] canonical hex stays 6-digit');
    },
    'input': { 'hex': '#7c3aed80' },
    'kind': 'happy',
    'name': '8-digit parses #rrggbbaa byte as alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=1, scenario=transparent] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=1, scenario=transparent] alpha is 0');
    },
    'input': { 'hex': '#7c3aed00' },
    'kind': 'edge',
    'name': 'fully transparent #rrggbb00 yields alpha 0'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=opaque] no throw');
      assert.ok(
        Math.abs(output!.alpha - (0xff / 255)) < APPROX,
        `[cell=1, scenario=opaque] alpha ≈ 1, got ${output!.alpha}`
      );
    },
    'input': { 'hex': '#7c3aedff' },
    'kind': 'edge',
    'name': 'fully opaque #rrggbbff yields alpha 1'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=7-digit] expected throw for invalid length');
    },
    'input': { 'hex': '#1234567' },
    'kind': 'unhappy',
    'name': '7-digit hex throws'
  }
];

new ScenarioRunner<FromHexInput, ColorRecordInterfaceType>(
  'AlphaChannel :: cell-1 :: fromHex',
  (input) => {
    const record = colorRecordFactory.fromHex(input.hex);
    return { ...record };
  }
).run(fromHexScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — fromOklch alpha argument honored and clamped
//
// fromOklch takes an explicit 4th argument (alpha). Values outside [0..1] are
// clamped; the value is stored verbatim when in range.
// ---------------------------------------------------------------------------

const FromOklchInputSchema = {
  'additionalProperties': false,
  'properties': {
    'alpha': { 'type': 'number' },
    'c':     { 'type': 'number' },
    'h':     { 'type': 'number' },
    'l':     { 'type': 'number' }
  },
  'required': ['alpha', 'c', 'h', 'l'],
  'type': 'object'
} as const;
type FromOklchInput = FromSchema<typeof FromOklchInputSchema>;

const FromOklchOutputSchema = {
  'additionalProperties': false,
  'properties': { 'alpha': { 'type': 'number' } },
  'required': ['alpha'],
  'type': 'object'
} as const;
type FromOklchOutput = FromSchema<typeof FromOklchOutputSchema>;

const fromOklchScenarios: readonly ScenarioInterface<FromOklchInput, FromOklchOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=in-range] no throw');
      assert.strictEqual(output!.alpha, 0.5,       '[cell=2, scenario=in-range] alpha stored as supplied');
    },
    'input': { 'alpha': 0.5, 'c': 0.1, 'h': 200, 'l': 0.5 },
    'kind': 'happy',
    'name': 'in-range alpha stored verbatim'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=clamp-high] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=2, scenario=clamp-high] alpha clamped to 1');
    },
    'input': { 'alpha': 2.5, 'c': 0.1, 'h': 200, 'l': 0.5 },
    'kind': 'edge',
    'name': 'alpha above 1 clamped to 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=clamp-low] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=2, scenario=clamp-low] alpha clamped to 0');
    },
    'input': { 'alpha': -0.5, 'c': 0.1, 'h': 200, 'l': 0.5 },
    'kind': 'edge',
    'name': 'alpha below 0 clamped to 0'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=boundary-0] no throw');
      assert.strictEqual(output!.alpha, 0,         '[cell=2, scenario=boundary-0] alpha is 0');
    },
    'input': { 'alpha': 0, 'c': 0.1, 'h': 200, 'l': 0.5 },
    'kind': 'edge',
    'name': 'alpha exactly 0 boundary accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=boundary-1] no throw');
      assert.strictEqual(output!.alpha, 1,         '[cell=2, scenario=boundary-1] alpha is 1');
    },
    'input': { 'alpha': 1, 'c': 0.1, 'h': 200, 'l': 0.5 },
    'kind': 'edge',
    'name': 'alpha exactly 1 boundary accepted'
  }
];

new ScenarioRunner<FromOklchInput, FromOklchOutput>(
  'AlphaChannel :: cell-2 :: fromOklch',
  (input) => {
    const c = colorRecordFactory.fromOklch(input.l, input.c, input.h, { 'alpha': input.alpha });
    return { 'alpha': (c as { 'alpha': number }).alpha };
  }
).run(fromOklchScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — mixOklch lerps alpha between endpoints
//
// Given two records with alpha values a0 and a1, mixing at t must produce
// alpha = a0 + (a1 - a0) * t. The lerp must be monotonic across t in [0..1].
// ---------------------------------------------------------------------------

const MixOklchInputSchema = {
  'additionalProperties': false,
  'properties': {
    'alphaA': { 'type': 'number' },
    'alphaB': { 'type': 'number' },
    't':      { 'type': 'number' }
  },
  'required': ['alphaA', 'alphaB', 't'],
  'type': 'object'
} as const;
type MixOklchInput = FromSchema<typeof MixOklchInputSchema>;

const MixOklchOutputSchema = {
  'additionalProperties': false,
  'properties': { 'alpha': { 'type': 'number' } },
  'required': ['alpha'],
  'type': 'object'
} as const;
type MixOklchOutput = FromSchema<typeof MixOklchOutputSchema>;

const mixOklchScenarios: readonly ScenarioInterface<MixOklchInput, MixOklchOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=quarter-mix] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.25) < 1e-9,
        `[cell=3, scenario=quarter-mix] alpha ≈ 0.25, got ${output!.alpha}`
      );
    },
    'input': { 'alphaA': 0.0, 'alphaB': 1.0, 't': 0.25 },
    'kind': 'happy',
    'name': 'quarter-mix between fully-transparent and fully-opaque'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=t=0] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.6) < 1e-9,
        `[cell=3, scenario=t=0] alpha should equal source alpha 0.6, got ${output!.alpha}`
      );
    },
    'input': { 'alphaA': 0.6, 'alphaB': 0.9, 't': 0 },
    'kind': 'edge',
    'name': 't=0 returns source alpha unchanged'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=t=1] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.9) < 1e-9,
        `[cell=3, scenario=t=1] alpha should equal target alpha 0.9, got ${output!.alpha}`
      );
    },
    'input': { 'alphaA': 0.6, 'alphaB': 0.9, 't': 1 },
    'kind': 'edge',
    'name': 't=1 returns target alpha unchanged'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=same-alpha] no throw');
      assert.ok(
        Math.abs(output!.alpha - 0.5) < 1e-9,
        `[cell=3, scenario=same-alpha] alpha should remain 0.5, got ${output!.alpha}`
      );
    },
    'input': { 'alphaA': 0.5, 'alphaB': 0.5, 't': 0.5 },
    'kind': 'edge',
    'name': 'same alpha both ends yields same alpha at any t'
  }
];

new ScenarioRunner<MixOklchInput, MixOklchOutput>(
  'AlphaChannel :: cell-3 :: mixOklch',
  (input) => {
    const a = colorRecordFactory.fromOklch(0.5, 0.1, 0, { 'alpha': input.alphaA });
    const b = colorRecordFactory.fromOklch(0.5, 0.1, 0, { 'alpha': input.alphaB });
    const mixed = mixOklch.apply(a, b, input.t);
    return { 'alpha': (mixed as { 'alpha': number }).alpha };
  }
).run(mixOklchScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — color modifiers preserve alpha
//
// lighten, darken, saturate, desaturate, hueShift must pass the alpha field
// through unchanged. The modifier acts only on the color dimensions (L, C, H).
// ---------------------------------------------------------------------------

const ModifierInputSchema = {
  'additionalProperties': false,
  'properties': {
    'amount':      { 'type': 'number' },
    'modifier':    { 'enum': ['lighten', 'darken', 'saturate', 'desaturate', 'hueShift'] },
    'sourceAlpha': { 'type': 'number' }
  },
  'required': ['amount', 'modifier', 'sourceAlpha'],
  'type': 'object'
} as const;
type ModifierInput = FromSchema<typeof ModifierInputSchema>;

const ModifierOutputSchema = {
  'additionalProperties': false,
  'properties': { 'resultAlpha': { 'type': 'number' } },
  'required': ['resultAlpha'],
  'type': 'object'
} as const;
type ModifierOutput = FromSchema<typeof ModifierOutputSchema>;

const modifierScenarios: readonly ScenarioInterface<ModifierInput, ModifierOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=lighten] no throw');
      assert.strictEqual(output!.resultAlpha, 0.42,    '[cell=4, scenario=lighten] alpha unchanged');
    },
    'input': { 'amount': 0.1, 'modifier': 'lighten', 'sourceAlpha': 0.42 },
    'kind': 'happy',
    'name': 'lighten preserves source alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=darken] no throw');
      assert.strictEqual(output!.resultAlpha, 0.33,    '[cell=4, scenario=darken] alpha unchanged');
    },
    'input': { 'amount': 0.15, 'modifier': 'darken', 'sourceAlpha': 0.33 },
    'kind': 'happy',
    'name': 'darken preserves source alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=saturate] no throw');
      assert.strictEqual(output!.resultAlpha, 0.7,     '[cell=4, scenario=saturate] alpha unchanged');
    },
    'input': { 'amount': 0.05, 'modifier': 'saturate', 'sourceAlpha': 0.7 },
    'kind': 'happy',
    'name': 'saturate preserves source alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=desaturate] no throw');
      assert.strictEqual(output!.resultAlpha, 0.7,     '[cell=4, scenario=desaturate] alpha unchanged');
    },
    'input': { 'amount': 0.05, 'modifier': 'desaturate', 'sourceAlpha': 0.7 },
    'kind': 'happy',
    'name': 'desaturate preserves source alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=hueShift] no throw');
      assert.strictEqual(output!.resultAlpha, 0.6,     '[cell=4, scenario=hueShift] alpha unchanged');
    },
    'input': { 'amount': 90, 'modifier': 'hueShift', 'sourceAlpha': 0.6 },
    'kind': 'happy',
    'name': 'hueShift preserves source alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=lighten-zero-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 0,        '[cell=4, scenario=lighten-zero-alpha] zero alpha preserved');
    },
    'input': { 'amount': 0.2, 'modifier': 'lighten', 'sourceAlpha': 0 },
    'kind': 'edge',
    'name': 'lighten with alpha=0 (fully transparent) preserves zero alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=4, scenario=darken-full-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 1,        '[cell=4, scenario=darken-full-alpha] full alpha preserved');
    },
    'input': { 'amount': 0.2, 'modifier': 'darken', 'sourceAlpha': 1 },
    'kind': 'edge',
    'name': 'darken with alpha=1 (fully opaque) preserves full alpha'
  }
];

new ScenarioRunner<ModifierInput, ModifierOutput>(
  'AlphaChannel :: cell-4 :: modifiers',
  (input) => {
    const base = colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'alpha': input.sourceAlpha });
    let result: { 'alpha': number };
    switch (input.modifier) {
      case 'darken':      result = darken.apply(base,      input.amount); break;
      case 'desaturate':  result = desaturate.apply(base,  input.amount); break;
      case 'hueShift':    result = hueShift.apply(base,    input.amount); break;
      case 'lighten':     result = lighten.apply(base,     input.amount); break;
      case 'saturate':    result = saturate.apply(base,    input.amount); break;
    }
    return { 'resultAlpha': result.alpha };
  }
).run(modifierScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — ensureContrast preserves the foreground alpha, not the background's
//
// ensureContrast adjusts luminance to meet a target ratio. The alpha of the
// foreground record must pass through; the background's alpha must not bleed
// into the returned record.
// ---------------------------------------------------------------------------

const EnsureContrastInputSchema = {
  'additionalProperties': false,
  'properties': {
    'bgAlpha':  { 'type': 'number' },
    'fgAlpha':  { 'type': 'number' },
    'minRatio': { 'type': 'number' }
  },
  'required': ['bgAlpha', 'fgAlpha', 'minRatio'],
  'type': 'object'
} as const;
type EnsureContrastInput = FromSchema<typeof EnsureContrastInputSchema>;

const EnsureContrastOutputSchema = {
  'additionalProperties': false,
  'properties': { 'resultAlpha': { 'type': 'number' } },
  'required': ['resultAlpha'],
  'type': 'object'
} as const;
type EnsureContrastOutput = FromSchema<typeof EnsureContrastOutputSchema>;

const ensureContrastScenarios: readonly ScenarioInterface<EnsureContrastInput, EnsureContrastOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=fg-alpha] no throw');
      assert.strictEqual(output!.resultAlpha, 0.85,    '[cell=5, scenario=fg-alpha] fg alpha passes through');
    },
    'input': { 'bgAlpha': 1.0, 'fgAlpha': 0.85, 'minRatio': 4.5 },
    'kind': 'happy',
    'name': 'foreground alpha preserved; background alpha not adopted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=fg-alpha=0] no throw');
      assert.strictEqual(output!.resultAlpha, 0,        '[cell=5, scenario=fg-alpha=0] transparent fg preserved');
    },
    'input': { 'bgAlpha': 1.0, 'fgAlpha': 0, 'minRatio': 3.0 },
    'kind': 'edge',
    'name': 'foreground alpha=0 still produces transparent result'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=5, scenario=bg-alpha=0] no throw');
      assert.strictEqual(output!.resultAlpha, 0.5,     '[cell=5, scenario=bg-alpha=0] fg alpha unchanged despite transparent bg');
    },
    'input': { 'bgAlpha': 0, 'fgAlpha': 0.5, 'minRatio': 3.0 },
    'kind': 'edge',
    'name': 'background alpha=0 does not corrupt foreground alpha'
  }
];

new ScenarioRunner<EnsureContrastInput, EnsureContrastOutput>(
  'AlphaChannel :: cell-5 :: ensureContrast',
  (input) => {
    const fg  = colorRecordFactory.fromOklch(0.50, 0.05, 200, { 'alpha': input.fgAlpha });
    const bg  = colorRecordFactory.fromOklch(0.55, 0.05, 200, { 'alpha': input.bgAlpha });
    const out = ensureContrast.apply(fg, bg, input.minRatio, 'wcag21') as { 'alpha': number };
    return { 'resultAlpha': out.alpha };
  }
).run(ensureContrastScenarios);
