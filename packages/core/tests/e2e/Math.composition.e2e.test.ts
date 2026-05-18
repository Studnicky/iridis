/**
 * Math.composition.e2e — scenario-matrix suite.
 *
 * Subject: math primitives — contrastWcag21, clusterMedianCut, lighten,
 * darken, oklchToRgb/rgbToOklch round-trip.
 *
 * Cells:
 *   1. contrastWcag21    — known ratios, same-color identity, achromatic edge
 *   2. clusterMedianCut  — cluster count guarantee, edge counts (k=1, k=n)
 *   3. lighten / darken  — identity at 0, direction check, boundary colors
 *   4. oklch round-trip  — multiple in-gamut values; achromatic hue skipped
 */

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import {
  clusterMedianCut,
  contrastWcag21,
  darken,
  hexToRgb,
  lighten,
  oklchToRgb,
  rgbToOklch,
} from '@studnicky/iridis/math';
import type { ColorRecordInterface } from '@studnicky/iridis/model';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build N ColorRecords spanning L=0..1, chroma=0, hue=0 (grey ramp). */
function greyRamp(n: number): ColorRecordInterface[] {
  const records: ColorRecordInterface[] = [];
  for (let i = 0; i < n; i++) {
    records.push(oklchToRgb.apply(i / Math.max(n - 1, 1), 0, 0));
  }
  return records;
}

// ---------------------------------------------------------------------------
// Cell 1 — contrastWcag21 computes correct WCAG 2.1 ratios
//
// The ratio between fg and bg is (L_lighter + 0.05) / (L_darker + 0.05).
// White-on-black ≈ 21, mid-grey-on-white ≈ 4.48, same-on-same = 1.
// The function is commutative (order of arguments does not change ratio).
// ---------------------------------------------------------------------------

interface ContrastInput {
  readonly fgHex: string;
  readonly bgHex: string;
}
interface ContrastOutput { readonly ratio: number }

const contrastScenarios: readonly ScenarioInterface<ContrastInput, ContrastOutput>[] = [
  {
    name: 'white on black ≈ 21',
    kind: 'happy',
    input: { fgHex: '#000000', bgHex: '#ffffff' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 21) < 0.5,
        `[cell=1, scenario=black-on-white] ratio ≈ 21, got ${output!.ratio}`,
      );
    },
  },
  {
    name: '#777777 on white ≈ 4.48',
    kind: 'happy',
    input: { fgHex: '#777777', bgHex: '#ffffff' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=grey-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 4.48) < 0.1,
        `[cell=1, scenario=grey-on-white] ratio ≈ 4.48, got ${output!.ratio}`,
      );
    },
  },
  {
    name: 'same color on itself produces ratio = 1',
    kind: 'edge',
    input: { fgHex: '#808080', bgHex: '#808080' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=same-color] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=same-color] ratio = 1, got ${output!.ratio}`,
      );
    },
  },
  {
    name: 'pure white on pure white = 1',
    kind: 'edge',
    input: { fgHex: '#ffffff', bgHex: '#ffffff' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=white-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=white-on-white] ratio = 1, got ${output!.ratio}`,
      );
    },
  },
  {
    name: 'pure black on pure black = 1',
    kind: 'edge',
    input: { fgHex: '#000000', bgHex: '#000000' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-black] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=black-on-black] ratio = 1, got ${output!.ratio}`,
      );
    },
  },
];

new ScenarioRunner<ContrastInput, ContrastOutput>(
  'Math.composition :: cell-1 :: contrastWcag21',
  (input) => {
    const fg    = hexToRgb.apply(input.fgHex);
    const bg    = hexToRgb.apply(input.bgHex);
    const ratio = contrastWcag21.apply(fg, bg);
    return { ratio };
  },
).run(contrastScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — clusterMedianCut produces the correct number of clusters
//
// clusterMedianCut(records, k) must return exactly k ColorRecords when
// records.length >= k. When k = records.length (no reduction needed) the
// result length must still equal k.
// ---------------------------------------------------------------------------

interface ClusterInput  { readonly count: number; readonly k: number }
interface ClusterOutput { readonly resultLength: number }

const clusterScenarios: readonly ScenarioInterface<ClusterInput, ClusterOutput>[] = [
  {
    name: 'cluster 100 records into 8 returns exactly 8',
    kind: 'happy',
    input: { count: 100, k: 8 },
    assert(output, error) {
      assert.strictEqual(error,             undefined, '[cell=2, scenario=100-to-8] no throw');
      assert.strictEqual(output!.resultLength, 8,      '[cell=2, scenario=100-to-8] exactly 8 clusters');
    },
  },
  {
    name: 'cluster 16 records into 4 returns exactly 4',
    kind: 'happy',
    input: { count: 16, k: 4 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=16-to-4] no throw');
      assert.strictEqual(output!.resultLength, 4,       '[cell=2, scenario=16-to-4] exactly 4 clusters');
    },
  },
  {
    name: 'k=1 returns exactly 1 representative',
    kind: 'edge',
    input: { count: 20, k: 1 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=k=1] no throw');
      assert.strictEqual(output!.resultLength, 1,       '[cell=2, scenario=k=1] single cluster');
    },
  },
  {
    name: 'k equal to record count returns same count',
    kind: 'edge',
    input: { count: 5, k: 5 },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=k=n] no throw');
      assert.strictEqual(output!.resultLength, 5,       '[cell=2, scenario=k=n] k=n returns all');
    },
  },
];

new ScenarioRunner<ClusterInput, ClusterOutput>(
  'Math.composition :: cell-2 :: clusterMedianCut',
  (input) => {
    const records = greyRamp(input.count);
    const result  = clusterMedianCut.apply(records, input.k);
    return { resultLength: result.length };
  },
).run(clusterScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — lighten / darken identity and direction
//
// lighten(c, 0) and darken(c, 0) are identity operations (same hex output).
// lighten(c, δ) must produce a higher L than the source (unless already at max).
// darken(c, δ) must produce a lower L than the source (unless already at min).
// ---------------------------------------------------------------------------

interface LightenDarkenInput {
  readonly hex:    string;
  readonly amount: number;
  readonly op:     'lighten' | 'darken';
}
interface LightenDarkenOutput {
  readonly inputHex:  string;
  readonly outputHex: string;
  readonly inputL:    number;
  readonly outputL:   number;
}

const lightenDarkenScenarios: readonly ScenarioInterface<LightenDarkenInput, LightenDarkenOutput>[] = [
  {
    name: 'lighten(color, 0) is identity',
    kind: 'happy',
    input: { hex: '#5b21b6', amount: 0, op: 'lighten' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=3, scenario=lighten-0] no throw');
      assert.strictEqual(output!.outputHex, output!.inputHex,      '[cell=3, scenario=lighten-0] hex unchanged');
    },
  },
  {
    name: 'darken(color, 0) is identity',
    kind: 'happy',
    input: { hex: '#5b21b6', amount: 0, op: 'darken' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=3, scenario=darken-0] no throw');
      assert.strictEqual(output!.outputHex, output!.inputHex,      '[cell=3, scenario=darken-0] hex unchanged');
    },
  },
  {
    name: 'lighten(color, 0.2) increases L',
    kind: 'happy',
    input: { hex: '#5b21b6', amount: 0.2, op: 'lighten' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=lighten-0.2] no throw');
      assert.ok(
        output!.outputL > output!.inputL,
        `[cell=3, scenario=lighten-0.2] L should increase: inputL=${output!.inputL}, outputL=${output!.outputL}`,
      );
    },
  },
  {
    name: 'darken(color, 0.2) decreases L',
    kind: 'happy',
    input: { hex: '#c4b5fd', amount: 0.2, op: 'darken' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=darken-0.2] no throw');
      assert.ok(
        output!.outputL < output!.inputL,
        `[cell=3, scenario=darken-0.2] L should decrease: inputL=${output!.inputL}, outputL=${output!.outputL}`,
      );
    },
  },
  {
    name: 'lighten pure black (L≈0) produces brighter color',
    kind: 'edge',
    input: { hex: '#000000', amount: 0.2, op: 'lighten' },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=3, scenario=lighten-black] no throw');
      assert.ok(output!.outputL > 0,                    '[cell=3, scenario=lighten-black] L increased from black');
    },
  },
  {
    name: 'darken pure white (L≈1) produces darker color',
    kind: 'edge',
    input: { hex: '#ffffff', amount: 0.2, op: 'darken' },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=3, scenario=darken-white] no throw');
      assert.ok(output!.outputL < 1,                    '[cell=3, scenario=darken-white] L decreased from white');
    },
  },
];

new ScenarioRunner<LightenDarkenInput, LightenDarkenOutput>(
  'Math.composition :: cell-3 :: lighten-darken',
  (input) => {
    const base = hexToRgb.apply(input.hex);
    const out  = input.op === 'lighten'
      ? lighten.apply(base, input.amount)
      : darken.apply(base, input.amount);
    return {
      inputHex:  base.hex,
      outputHex: out.hex,
      inputL:    base.oklch.l,
      outputL:   out.oklch.l,
    };
  },
).run(lightenDarkenScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — oklchToRgb / rgbToOklch round-trip within tolerance
//
// For in-gamut values the round-trip must satisfy:
//   |L_out - L_in| < 0.001
//   |C_out - C_in| < 0.001
//   |H_out - H_in| < 2° (normalized; skipped when C ≈ 0, hue is undefined)
// ---------------------------------------------------------------------------

interface RoundTripInput  { readonly l: number; readonly c: number; readonly h: number }
interface RoundTripOutput {
  readonly backL: number;
  readonly backC: number;
  readonly backH: number;
}

const roundTripScenarios: readonly ScenarioInterface<RoundTripInput, RoundTripOutput>[] = [
  {
    name: 'mid-range in-gamut (L=0.5, C=0.1, H=30)',
    kind: 'happy',
    input: { l: 0.5, c: 0.1, h: 30 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=mid-range] no throw');
      assert.ok(Math.abs(output!.backL - 0.5)  < 0.001, `[cell=4, scenario=mid-range] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.1)  < 0.001, `[cell=4, scenario=mid-range] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 30) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=mid-range] H round-trip, got ${output!.backH}`);
    },
  },
  {
    name: 'high-L cyan (L=0.7, C=0.12, H=180)',
    kind: 'happy',
    input: { l: 0.7, c: 0.12, h: 180 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=cyan] no throw');
      assert.ok(Math.abs(output!.backL - 0.7)  < 0.001, `[cell=4, scenario=cyan] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.12) < 0.001, `[cell=4, scenario=cyan] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 180) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=cyan] H round-trip, got ${output!.backH}`);
    },
  },
  {
    name: 'pure white (L=1, C=0) — achromatic, hue check skipped',
    kind: 'edge',
    input: { l: 1.0, c: 0.0, h: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=white] no throw');
      assert.ok(Math.abs(output!.backL - 1.0) < 0.001, `[cell=4, scenario=white] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.0) < 0.001, `[cell=4, scenario=white] C round-trip, got ${output!.backC}`);
      // hue is undefined for achromatic — skip H check
    },
  },
  {
    name: 'pure black (L=0, C=0) — achromatic, hue check skipped',
    kind: 'edge',
    input: { l: 0.0, c: 0.0, h: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=black] no throw');
      assert.ok(Math.abs(output!.backL - 0.0) < 0.001, `[cell=4, scenario=black] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.0) < 0.001, `[cell=4, scenario=black] C round-trip, got ${output!.backC}`);
      // hue is undefined for achromatic — skip H check
    },
  },
  {
    name: 'purple-quadrant (L=0.2, C=0.05, H=320)',
    kind: 'happy',
    input: { l: 0.2, c: 0.05, h: 320 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=purple] no throw');
      assert.ok(Math.abs(output!.backL - 0.2)  < 0.001, `[cell=4, scenario=purple] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.05) < 0.001, `[cell=4, scenario=purple] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 320) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=purple] H round-trip, got ${output!.backH}`);
    },
  },
];

new ScenarioRunner<RoundTripInput, RoundTripOutput>(
  'Math.composition :: cell-4 :: oklch-round-trip',
  (input) => {
    const asRecord = oklchToRgb.apply(input.l, input.c, input.h);
    const back     = rgbToOklch.apply(asRecord.rgb.r, asRecord.rgb.g, asRecord.rgb.b);
    return { backL: back.oklch.l, backC: back.oklch.c, backH: back.oklch.h };
  },
).run(roundTripScenarios);
