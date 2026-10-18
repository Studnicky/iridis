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

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import type { ClusterInputEntity } from '../../entities/ClusterInputEntity.ts';
import type { ClusterOutputEntity } from '../../entities/ClusterOutputEntity.ts';
import type { ContrastInputEntity } from '../../entities/ContrastInputEntity.ts';
import type { ContrastOutputEntity } from '../../entities/ContrastOutputEntity.ts';
import type { LightenDarkenInputEntity } from '../../entities/LightenDarkenInputEntity.ts';
import type { LightenDarkenOutputEntity } from '../../entities/LightenDarkenOutputEntity.ts';
import type { RoundTripOutputEntity } from '../../entities/RoundTripOutputEntity.ts';

import { OklchInterfaceTypeEntity } from '../../../../src/entities/OklchInterfaceTypeEntity.ts';

class GreyRamp {
  static build(count: number): ColorRecordInterfaceTypeEntity.Type[] {
    const records: ColorRecordInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < count; index += 1) {
      records.push(oklchToRgb.apply(index / Math.max(count - 1, 1), 0, 0));
    }
    return records;
  }
}

export const MathCompositionScenarios = Object.freeze({
  'cluster': {
    'scenarios': [
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=2, scenario=100-to-8] no throw'); assert.strictEqual(output!.resultLength, 8, '[cell=2, scenario=100-to-8] exactly 8 clusters'); }, 'input': { 'count': 100, 'k': 8 }, 'kind': 'happy', 'name': 'cluster 100 records into 8 returns exactly 8' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=2, scenario=16-to-4] no throw'); assert.strictEqual(output!.resultLength, 4, '[cell=2, scenario=16-to-4] exactly 4 clusters'); }, 'input': { 'count': 16, 'k': 4 }, 'kind': 'happy', 'name': 'cluster 16 records into 4 returns exactly 4' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=2, scenario=k=1] no throw'); assert.strictEqual(output!.resultLength, 1, '[cell=2, scenario=k=1] single cluster'); }, 'input': { 'count': 20, 'k': 1 }, 'kind': 'edge', 'name': 'k=1 returns exactly 1 representative' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=2, scenario=k=n] no throw'); assert.strictEqual(output!.resultLength, 5, '[cell=2, scenario=k=n] k=n returns all'); }, 'input': { 'count': 5, 'k': 5 }, 'kind': 'edge', 'name': 'k equal to record count returns same count' }
    ] satisfies readonly ScenarioInterface<ClusterInputEntity.Type, ClusterOutputEntity.Type>[],
    'subject': function(input: ClusterInputEntity.Type): ClusterOutputEntity.Type { const records = GreyRamp.build(input.count); const result = clusterMedianCut.apply(records, input.k); return { 'resultLength': result.length }; }
  },
  'contrast': {
    'scenarios': [
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-white] no throw'); assert.ok(Math.abs(output!.ratio - 21) < 0.5, '[cell=1, scenario=black-on-white] ratio is approximately 21'); }, 'input': { 'bgHex': '#ffffff', 'fgHex': '#000000' }, 'kind': 'happy', 'name': 'white on black ≈ 21' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=1, scenario=grey-on-white] no throw'); assert.ok(Math.abs(output!.ratio - 4.48) < 0.1, '[cell=1, scenario=grey-on-white] ratio is approximately 4.48'); }, 'input': { 'bgHex': '#ffffff', 'fgHex': '#777777' }, 'kind': 'happy', 'name': '#777777 on white ≈ 4.48' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=1, scenario=same-color] no throw'); assert.ok(Math.abs(output!.ratio - 1) < 0.01, '[cell=1, scenario=same-color] ratio equals 1'); }, 'input': { 'bgHex': '#808080', 'fgHex': '#808080' }, 'kind': 'edge', 'name': 'same color on itself produces ratio = 1' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=1, scenario=white-on-white] no throw'); assert.ok(Math.abs(output!.ratio - 1) < 0.01, '[cell=1, scenario=white-on-white] ratio equals 1'); }, 'input': { 'bgHex': '#ffffff', 'fgHex': '#ffffff' }, 'kind': 'edge', 'name': 'pure white on pure white = 1' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=1, scenario=black-on-black] no throw'); assert.ok(Math.abs(output!.ratio - 1) < 0.01, '[cell=1, scenario=black-on-black] ratio equals 1'); }, 'input': { 'bgHex': '#000000', 'fgHex': '#000000' }, 'kind': 'edge', 'name': 'pure black on pure black = 1' }
    ] satisfies readonly ScenarioInterface<ContrastInputEntity.Type, ContrastOutputEntity.Type>[],
    'subject': function(input: ContrastInputEntity.Type): ContrastOutputEntity.Type { const foreground = hexToRgb.apply(input.fgHex); const background = hexToRgb.apply(input.bgHex); return { 'ratio': contrastWcag21.apply(foreground, background) }; }
  },
  'lightenDarken': {
    'scenarios': [
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=lighten-0] no throw'); assert.strictEqual(output!.outputHex, output!.inputHex, '[cell=3, scenario=lighten-0] hex unchanged'); }, 'input': { 'amount': 0, 'hex': '#5b21b6', 'op': 'lighten' }, 'kind': 'happy', 'name': 'lighten(color, 0) is identity' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=darken-0] no throw'); assert.strictEqual(output!.outputHex, output!.inputHex, '[cell=3, scenario=darken-0] hex unchanged'); }, 'input': { 'amount': 0, 'hex': '#5b21b6', 'op': 'darken' }, 'kind': 'happy', 'name': 'darken(color, 0) is identity' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=lighten-0.2] no throw'); assert.ok(output!.outputL > output!.inputL, '[cell=3, scenario=lighten-0.2] L increases'); }, 'input': { 'amount': 0.2, 'hex': '#5b21b6', 'op': 'lighten' }, 'kind': 'happy', 'name': 'lighten(color, 0.2) increases L' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=darken-0.2] no throw'); assert.ok(output!.outputL < output!.inputL, '[cell=3, scenario=darken-0.2] L decreases'); }, 'input': { 'amount': 0.2, 'hex': '#c4b5fd', 'op': 'darken' }, 'kind': 'happy', 'name': 'darken(color, 0.2) decreases L' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=lighten-black] no throw'); assert.ok(output!.outputL > 0, '[cell=3, scenario=lighten-black] L increases'); }, 'input': { 'amount': 0.2, 'hex': '#000000', 'op': 'lighten' }, 'kind': 'edge', 'name': 'lighten pure black (L≈0) produces brighter color' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=3, scenario=darken-white] no throw'); assert.ok(output!.outputL < 1, '[cell=3, scenario=darken-white] L decreases'); }, 'input': { 'amount': 0.2, 'hex': '#ffffff', 'op': 'darken' }, 'kind': 'edge', 'name': 'darken pure white (L≈1) produces darker color' }
    ] satisfies readonly ScenarioInterface<LightenDarkenInputEntity.Type, LightenDarkenOutputEntity.Type>[],
    'subject': function(input: LightenDarkenInputEntity.Type): LightenDarkenOutputEntity.Type { const base = hexToRgb.apply(input.hex); const output = input.op === 'lighten' ? lighten.apply(base, input.amount) : darken.apply(base, input.amount); return { 'inputHex': base.hex, 'inputL': base.oklch.l, 'outputHex': output.hex, 'outputL': output.oklch.l }; }
  },
  'roundTrip': {
    'scenarios': [
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=4, scenario=mid-range] no throw'); assert.ok(Math.abs(output!.backL - 0.5) < 0.001, '[cell=4, scenario=mid-range] L round-trip'); assert.ok(Math.abs(output!.backC - 0.1) < 0.001, '[cell=4, scenario=mid-range] C round-trip'); const hueDistance = Math.abs(((output!.backH - 30) + 360) % 360); assert.ok(Math.min(hueDistance, 360 - hueDistance) < 2, '[cell=4, scenario=mid-range] H round-trip'); }, 'input': OklchInterfaceTypeEntity.intake({ 'c': 0.1, 'h': 30, 'l': 0.5 }), 'kind': 'happy', 'name': 'mid-range in-gamut (L=0.5, C=0.1, H=30)' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=4, scenario=cyan] no throw'); assert.ok(Math.abs(output!.backL - 0.7) < 0.001, '[cell=4, scenario=cyan] L round-trip'); assert.ok(Math.abs(output!.backC - 0.12) < 0.001, '[cell=4, scenario=cyan] C round-trip'); const hueDistance = Math.abs(((output!.backH - 180) + 360) % 360); assert.ok(Math.min(hueDistance, 360 - hueDistance) < 2, '[cell=4, scenario=cyan] H round-trip'); }, 'input': OklchInterfaceTypeEntity.intake({ 'c': 0.12, 'h': 180, 'l': 0.7 }), 'kind': 'happy', 'name': 'high-L cyan (L=0.7, C=0.12, H=180)' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=4, scenario=white] no throw'); assert.ok(Math.abs(output!.backL - 1) < 0.001, '[cell=4, scenario=white] L round-trip'); assert.ok(Math.abs(output!.backC) < 0.001, '[cell=4, scenario=white] C round-trip'); }, 'input': OklchInterfaceTypeEntity.intake({ 'c': 0, 'h': 0, 'l': 1 }), 'kind': 'edge', 'name': 'pure white (L=1, C=0) — achromatic, hue check skipped' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=4, scenario=black] no throw'); assert.ok(Math.abs(output!.backL) < 0.001, '[cell=4, scenario=black] L round-trip'); assert.ok(Math.abs(output!.backC) < 0.001, '[cell=4, scenario=black] C round-trip'); }, 'input': OklchInterfaceTypeEntity.intake({ 'c': 0, 'h': 0, 'l': 0 }), 'kind': 'edge', 'name': 'pure black (L=0, C=0) — achromatic, hue check skipped' },
      { 'assert': function(output, error) { assert.strictEqual(error, undefined, '[cell=4, scenario=purple] no throw'); assert.ok(Math.abs(output!.backL - 0.2) < 0.001, '[cell=4, scenario=purple] L round-trip'); assert.ok(Math.abs(output!.backC - 0.05) < 0.001, '[cell=4, scenario=purple] C round-trip'); const hueDistance = Math.abs(((output!.backH - 320) + 360) % 360); assert.ok(Math.min(hueDistance, 360 - hueDistance) < 2, '[cell=4, scenario=purple] H round-trip'); }, 'input': OklchInterfaceTypeEntity.intake({ 'c': 0.05, 'h': 320, 'l': 0.2 }), 'kind': 'happy', 'name': 'purple-quadrant (L=0.2, C=0.05, H=320)' }
    ] satisfies readonly ScenarioInterface<OklchInterfaceTypeEntity.Type, RoundTripOutputEntity.Type>[],
    'subject': function(input: OklchInterfaceTypeEntity.Type): RoundTripOutputEntity.Type { const asRecord = oklchToRgb.apply(input.l, input.c, input.h); const back = rgbToOklch.apply(asRecord.rgb.r, asRecord.rgb.g, asRecord.rgb.b); return { 'backC': back.oklch.c, 'backH': back.oklch.h, 'backL': back.oklch.l }; }
  }
});
