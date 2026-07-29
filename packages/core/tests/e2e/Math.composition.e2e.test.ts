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

import type { ColorRecordInterfaceType, OklchInterfaceType } from '@studnicky/iridis/model';

import {
  clusterMedianCut,
  contrastWcag21,
  darken,
  hexToRgb,
  lighten,
  oklchToRgb,
  rgbToOklch
} from '@studnicky/iridis/math';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { ClusterInputEntity }         from './entities/ClusterInputEntity.ts';
import type { ClusterOutputEntity }        from './entities/ClusterOutputEntity.ts';
import type { ContrastInputEntity }        from './entities/ContrastInputEntity.ts';
import type { ContrastOutputEntity }       from './entities/ContrastOutputEntity.ts';
import type { LightenDarkenInputEntity }   from './entities/LightenDarkenInputEntity.ts';
import type { LightenDarkenOutputEntity }  from './entities/LightenDarkenOutputEntity.ts';
import type { RoundTripOutputEntity }      from './entities/RoundTripOutputEntity.ts';

import { ScenarioRunner }         from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Grey-ramp record generation. */
class GreyRamp {
  /** Build N ColorRecords spanning L=0..1, chroma=0, hue=0 (grey ramp). */
  static build(count: number): ColorRecordInterfaceType[] {
    const records: ColorRecordInterfaceType[] = [];
    for (let i = 0; i < count; i++) {
      records.push(oklchToRgb.apply(i / Math.max(count - 1, 1), 0, 0));
    }
    return records;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — contrastWcag21 computes correct WCAG 2.1 ratios
//
// The ratio between fg and bg is (L_lighter + 0.05) / (L_darker + 0.05).
// White-on-black ≈ 21, mid-grey-on-white ≈ 4.48, same-on-same = 1.
// The function is commutative (order of arguments does not change ratio).
// ---------------------------------------------------------------------------

type ContrastInput = ContrastInputEntity.Type;
type ContrastOutput = ContrastOutputEntity.Type;

const contrastScenarios: readonly ScenarioInterface<ContrastInput, ContrastOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 21) < 0.5,
        `[cell=1, scenario=black-on-white] ratio ≈ 21, got ${output!.ratio}`
      );
    },
    'input': { 'bgHex': '#ffffff', 'fgHex': '#000000' },
    'kind': 'happy',
    'name': 'white on black ≈ 21'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=grey-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 4.48) < 0.1,
        `[cell=1, scenario=grey-on-white] ratio ≈ 4.48, got ${output!.ratio}`
      );
    },
    'input': { 'bgHex': '#ffffff', 'fgHex': '#777777' },
    'kind': 'happy',
    'name': '#777777 on white ≈ 4.48'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=same-color] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=same-color] ratio = 1, got ${output!.ratio}`
      );
    },
    'input': { 'bgHex': '#808080', 'fgHex': '#808080' },
    'kind': 'edge',
    'name': 'same color on itself produces ratio = 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=white-on-white] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=white-on-white] ratio = 1, got ${output!.ratio}`
      );
    },
    'input': { 'bgHex': '#ffffff', 'fgHex': '#ffffff' },
    'kind': 'edge',
    'name': 'pure white on pure white = 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-black] no throw');
      assert.ok(
        Math.abs(output!.ratio - 1) < 0.01,
        `[cell=1, scenario=black-on-black] ratio = 1, got ${output!.ratio}`
      );
    },
    'input': { 'bgHex': '#000000', 'fgHex': '#000000' },
    'kind': 'edge',
    'name': 'pure black on pure black = 1'
  }
];

new ScenarioRunner<ContrastInput, ContrastOutput>(
  'Math.composition :: cell-1 :: contrastWcag21',
  (input) => {
    const fg    = hexToRgb.apply(input.fgHex);
    const bg    = hexToRgb.apply(input.bgHex);
    const ratio = contrastWcag21.apply(fg, bg);
    return { 'ratio': ratio };
  }
).run(contrastScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — clusterMedianCut produces the correct number of clusters
//
// clusterMedianCut(records, k) must return exactly k ColorRecords when
// records.length >= k. When k = records.length (no reduction needed) the
// result length must still equal k.
// ---------------------------------------------------------------------------

type ClusterInput = ClusterInputEntity.Type;
type ClusterOutput = ClusterOutputEntity.Type;

const clusterScenarios: readonly ScenarioInterface<ClusterInput, ClusterOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,             undefined, '[cell=2, scenario=100-to-8] no throw');
      assert.strictEqual(output!.resultLength, 8,      '[cell=2, scenario=100-to-8] exactly 8 clusters');
    },
    'input': { 'count': 100, 'k': 8 },
    'kind': 'happy',
    'name': 'cluster 100 records into 8 returns exactly 8'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=16-to-4] no throw');
      assert.strictEqual(output!.resultLength, 4,       '[cell=2, scenario=16-to-4] exactly 4 clusters');
    },
    'input': { 'count': 16, 'k': 4 },
    'kind': 'happy',
    'name': 'cluster 16 records into 4 returns exactly 4'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=k=1] no throw');
      assert.strictEqual(output!.resultLength, 1,       '[cell=2, scenario=k=1] single cluster');
    },
    'input': { 'count': 20, 'k': 1 },
    'kind': 'edge',
    'name': 'k=1 returns exactly 1 representative'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=2, scenario=k=n] no throw');
      assert.strictEqual(output!.resultLength, 5,       '[cell=2, scenario=k=n] k=n returns all');
    },
    'input': { 'count': 5, 'k': 5 },
    'kind': 'edge',
    'name': 'k equal to record count returns same count'
  }
];

new ScenarioRunner<ClusterInput, ClusterOutput>(
  'Math.composition :: cell-2 :: clusterMedianCut',
  (input) => {
    const records = GreyRamp.build(input.count);
    const result  = clusterMedianCut.apply(records, input.k);
    return { 'resultLength': result.length };
  }
).run(clusterScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — lighten / darken identity and direction
//
// lighten(c, 0) and darken(c, 0) are identity operations (same hex output).
// lighten(c, δ) must produce a higher L than the source (unless already at max).
// darken(c, δ) must produce a lower L than the source (unless already at min).
// ---------------------------------------------------------------------------

type LightenDarkenInput = LightenDarkenInputEntity.Type;
type LightenDarkenOutput = LightenDarkenOutputEntity.Type;

const lightenDarkenScenarios: readonly ScenarioInterface<LightenDarkenInput, LightenDarkenOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=3, scenario=lighten-0] no throw');
      assert.strictEqual(output!.outputHex, output!.inputHex,      '[cell=3, scenario=lighten-0] hex unchanged');
    },
    'input': { 'amount': 0, 'hex': '#5b21b6', 'op': 'lighten' },
    'kind': 'happy',
    'name': 'lighten(color, 0) is identity'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=3, scenario=darken-0] no throw');
      assert.strictEqual(output!.outputHex, output!.inputHex,      '[cell=3, scenario=darken-0] hex unchanged');
    },
    'input': { 'amount': 0, 'hex': '#5b21b6', 'op': 'darken' },
    'kind': 'happy',
    'name': 'darken(color, 0) is identity'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=lighten-0.2] no throw');
      assert.ok(
        output!.outputL > output!.inputL,
        `[cell=3, scenario=lighten-0.2] L should increase: inputL=${output!.inputL}, outputL=${output!.outputL}`
      );
    },
    'input': { 'amount': 0.2, 'hex': '#5b21b6', 'op': 'lighten' },
    'kind': 'happy',
    'name': 'lighten(color, 0.2) increases L'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=darken-0.2] no throw');
      assert.ok(
        output!.outputL < output!.inputL,
        `[cell=3, scenario=darken-0.2] L should decrease: inputL=${output!.inputL}, outputL=${output!.outputL}`
      );
    },
    'input': { 'amount': 0.2, 'hex': '#c4b5fd', 'op': 'darken' },
    'kind': 'happy',
    'name': 'darken(color, 0.2) decreases L'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=3, scenario=lighten-black] no throw');
      assert.ok(output!.outputL > 0,                    '[cell=3, scenario=lighten-black] L increased from black');
    },
    'input': { 'amount': 0.2, 'hex': '#000000', 'op': 'lighten' },
    'kind': 'edge',
    'name': 'lighten pure black (L≈0) produces brighter color'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=3, scenario=darken-white] no throw');
      assert.ok(output!.outputL < 1,                    '[cell=3, scenario=darken-white] L decreased from white');
    },
    'input': { 'amount': 0.2, 'hex': '#ffffff', 'op': 'darken' },
    'kind': 'edge',
    'name': 'darken pure white (L≈1) produces darker color'
  }
];

new ScenarioRunner<LightenDarkenInput, LightenDarkenOutput>(
  'Math.composition :: cell-3 :: lighten-darken',
  (input) => {
    const base = hexToRgb.apply(input.hex);
    const out  = input.op === 'lighten'
      ? lighten.apply(base, input.amount)
      : darken.apply(base, input.amount);
    return {
      'inputHex':  base.hex,
      'inputL':    base.oklch.l,
      'outputHex': out.hex,
      'outputL':   out.oklch.l
    };
  }
).run(lightenDarkenScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — oklchToRgb / rgbToOklch round-trip within tolerance
//
// For in-gamut values the round-trip must satisfy:
//   |L_out - L_in| < 0.001
//   |C_out - C_in| < 0.001
//   |H_out - H_in| < 2° (normalized; skipped when C ≈ 0, hue is undefined)
// ---------------------------------------------------------------------------

type RoundTripOutput = RoundTripOutputEntity.Type;

const roundTripScenarios: readonly ScenarioInterface<OklchInterfaceType, RoundTripOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=mid-range] no throw');
      assert.ok(Math.abs(output!.backL - 0.5)  < 0.001, `[cell=4, scenario=mid-range] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.1)  < 0.001, `[cell=4, scenario=mid-range] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 30) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=mid-range] H round-trip, got ${output!.backH}`);
    },
    'input': { 'c': 0.1, 'h': 30, 'l': 0.5 },
    'kind': 'happy',
    'name': 'mid-range in-gamut (L=0.5, C=0.1, H=30)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=cyan] no throw');
      assert.ok(Math.abs(output!.backL - 0.7)  < 0.001, `[cell=4, scenario=cyan] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.12) < 0.001, `[cell=4, scenario=cyan] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 180) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=cyan] H round-trip, got ${output!.backH}`);
    },
    'input': { 'c': 0.12, 'h': 180, 'l': 0.7 },
    'kind': 'happy',
    'name': 'high-L cyan (L=0.7, C=0.12, H=180)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=white] no throw');
      assert.ok(Math.abs(output!.backL - 1.0) < 0.001, `[cell=4, scenario=white] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC) < 0.001, `[cell=4, scenario=white] C round-trip, got ${output!.backC}`);
      // hue is undefined for achromatic — skip H check
    },
    'input': { 'c': 0.0, 'h': 0, 'l': 1.0 },
    'kind': 'edge',
    'name': 'pure white (L=1, C=0) — achromatic, hue check skipped'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=black] no throw');
      assert.ok(Math.abs(output!.backL) < 0.001, `[cell=4, scenario=black] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC) < 0.001, `[cell=4, scenario=black] C round-trip, got ${output!.backC}`);
      // hue is undefined for achromatic — skip H check
    },
    'input': { 'c': 0.0, 'h': 0, 'l': 0.0 },
    'kind': 'edge',
    'name': 'pure black (L=0, C=0) — achromatic, hue check skipped'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=purple] no throw');
      assert.ok(Math.abs(output!.backL - 0.2)  < 0.001, `[cell=4, scenario=purple] L round-trip, got ${output!.backL}`);
      assert.ok(Math.abs(output!.backC - 0.05) < 0.001, `[cell=4, scenario=purple] C round-trip, got ${output!.backC}`);
      const hd = Math.abs(((output!.backH - 320) + 360) % 360);
      assert.ok(Math.min(hd, 360 - hd) < 2,             `[cell=4, scenario=purple] H round-trip, got ${output!.backH}`);
    },
    'input': { 'c': 0.05, 'h': 320, 'l': 0.2 },
    'kind': 'happy',
    'name': 'purple-quadrant (L=0.2, C=0.05, H=320)'
  }
];

new ScenarioRunner<OklchInterfaceType, RoundTripOutput>(
  'Math.composition :: cell-4 :: oklch-round-trip',
  (input) => {
    const asRecord = oklchToRgb.apply(input.l, input.c, input.h);
    const back     = rgbToOklch.apply(asRecord.rgb.r, asRecord.rgb.g, asRecord.rgb.b);
    return { 'backC': back.oklch.c, 'backH': back.oklch.h, 'backL': back.oklch.l };
  }
).run(roundTripScenarios);
