import type { QuickPaletteEntity } from '@studnicky/iridis';
import type { InferType } from '@studnicky/json-tology/types';

import { QuickPalette } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

export namespace QuickPaletteScenarios {
  const QuickPaletteInputSchema = {
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'seeds':   { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['seeds'],
    'type': 'object'
  } as const;

  const QuickPaletteBrightnessSchema = {
    'additionalProperties': false,
    'properties': {
      'bgSum': { 'type': 'number' },
      'fgSum': { 'type': 'number' }
    },
    'required': ['bgSum', 'fgSum'],
    'type': 'object'
  } as const;

  class HexColor {
    static byteSum(hex: string): number {
      const parsedInteger = parseInt(hex.slice(1), 16);
      const byteSum = ((parsedInteger >> 16) & 0xff) + ((parsedInteger >> 8) & 0xff) + (parsedInteger & 0xff);
      return byteSum;
    }

    static isSixDigitLowercaseHex(value: string): boolean {
      const candidate = value.slice(1);
      const parsedInteger = Number.parseInt(candidate, 16);
      const isCanonicalHex = Number.isSafeInteger(parsedInteger) && parsedInteger.toString(16).padStart(6, '0') === candidate;
      const matchesShape = value.length === 7 && value.startsWith('#');
      const isSixDigitLowercaseHex = matchesShape && isCanonicalHex;
      return isSixDigitLowercaseHex;
    }
  }

  export const darkFraming = {
    'scenarios': [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=violet-dark] no throw');
          assert.ok(output!.bgSum < 120, ['[cell=2, scenario=violet-dark] dark background expected; bgSum=', output!.bgSum].join(''));
          assert.ok(output!.fgSum > 600, ['[cell=2, scenario=violet-dark] light foreground expected; fgSum=', output!.fgSum].join(''));
        },
        'input': { 'seeds': ['#7c3aed'] },
        'kind': 'happy',
        'name': 'violet seed in dark framing: background dark, foreground light'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=grey-dark] no throw');
          assert.ok(output!.bgSum < 120, ['[cell=2, scenario=grey-dark] dark background; bgSum=', output!.bgSum].join(''));
          assert.ok(output!.fgSum > 600, ['[cell=2, scenario=grey-dark] light foreground; fgSum=', output!.fgSum].join(''));
        },
        'input': { 'seeds': ['#888888'] },
        'kind': 'edge',
        'name': 'neutral grey seed in dark framing still produces dark bg / light fg'
      }
    ] satisfies readonly ScenarioInterface<InferType<typeof QuickPaletteInputSchema>, InferType<typeof QuickPaletteBrightnessSchema>>[],
    'subject': function(input: InferType<typeof QuickPaletteInputSchema>): InferType<typeof QuickPaletteBrightnessSchema> {
      const palette = QuickPalette.resolve(input.seeds, input.framing);
      const brightness = { 'bgSum': HexColor.byteSum(palette.background), 'fgSum': HexColor.byteSum(palette.foreground) };
      return brightness;
    }
  };

  export const lightFraming = {
    'scenarios': [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=violet-light] no throw');
          assert.ok(output!.bgSum > 700, ['[cell=3, scenario=violet-light] light background; bgSum=', output!.bgSum].join(''));
          assert.ok(output!.fgSum < 200, ['[cell=3, scenario=violet-light] dark foreground; fgSum=', output!.fgSum].join(''));
        },
        'input': { 'framing': 'light', 'seeds': ['#7c3aed'] },
        'kind': 'happy',
        'name': 'violet seed in light framing: background light, foreground dark'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=grey-light] no throw');
          assert.ok(output!.bgSum > 700, ['[cell=3, scenario=grey-light] light background; bgSum=', output!.bgSum].join(''));
          assert.ok(output!.fgSum < 200, ['[cell=3, scenario=grey-light] dark foreground; fgSum=', output!.fgSum].join(''));
        },
        'input': { 'framing': 'light', 'seeds': ['#888888'] },
        'kind': 'edge',
        'name': 'neutral grey seed in light framing still produces light bg / dark fg'
      }
    ] satisfies readonly ScenarioInterface<InferType<typeof QuickPaletteInputSchema>, InferType<typeof QuickPaletteBrightnessSchema>>[],
    'subject': function(input: InferType<typeof QuickPaletteInputSchema>): InferType<typeof QuickPaletteBrightnessSchema> {
      const palette = QuickPalette.resolve(input.seeds, input.framing);
      const brightness = { 'bgSum': HexColor.byteSum(palette.background), 'fgSum': HexColor.byteSum(palette.foreground) };
      return brightness;
    }
  };

  export const paletteShape = {
    'scenarios': [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=three-seeds-dark] no throw');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.background), '[cell=1, scenario=three-seeds-dark] background is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.foreground), '[cell=1, scenario=three-seeds-dark] foreground is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.accent), '[cell=1, scenario=three-seeds-dark] accent is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.muted), '[cell=1, scenario=three-seeds-dark] muted is hex');
        },
        'input': { 'seeds': ['#7c3aed', '#06b6d4', '#10b981'] },
        'kind': 'happy',
        'name': 'three seeds return four hex roles in dark framing'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=three-seeds-light] no throw');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.background), '[cell=1, scenario=three-seeds-light] background is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.foreground), '[cell=1, scenario=three-seeds-light] foreground is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.accent), '[cell=1, scenario=three-seeds-light] accent is hex');
          assert.ok(HexColor.isSixDigitLowercaseHex(output!.muted), '[cell=1, scenario=three-seeds-light] muted is hex');
        },
        'input': { 'framing': 'light', 'seeds': ['#7c3aed', '#06b6d4', '#10b981'] },
        'kind': 'happy',
        'name': 'three seeds return four hex roles in light framing'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=single-seed] no throw');
          assert.ok(output!.background !== '', '[cell=1, scenario=single-seed] background present');
          assert.ok(output!.foreground !== '', '[cell=1, scenario=single-seed] foreground present');
          assert.ok(output!.accent !== '', '[cell=1, scenario=single-seed] accent present');
          assert.ok(output!.muted !== '', '[cell=1, scenario=single-seed] muted present');
        },
        'input': { 'seeds': ['#888888'] },
        'kind': 'edge',
        'name': 'single seed still returns all four roles'
      }
    ] satisfies readonly ScenarioInterface<InferType<typeof QuickPaletteInputSchema>, QuickPaletteEntity.Type>[],
    'subject': function(input: InferType<typeof QuickPaletteInputSchema>): QuickPaletteEntity.Type {
      const palette = QuickPalette.resolve(input.seeds, input.framing);
      return palette;
    }
  };
}
