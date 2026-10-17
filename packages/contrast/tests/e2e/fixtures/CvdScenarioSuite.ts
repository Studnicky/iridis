import type { InputInterfaceTypeEntity, PaletteStateInterface } from '@studnicky/iridis';

import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { ContrastMetadataAssertionPort } from '../contrast-plugin/ContrastMetadataAssertionPort.ts';
import { CvdScenarioFixture } from './cvd/CvdScenarioFixture.ts';

interface CvdInputInterface {
  readonly 'input': InputInterfaceTypeEntity.Type;
  readonly 'pipeline': readonly string[];
}

/** Frozen CVD warning and correction-vector scenario matrix. */
export class CvdScenarioSuite {
  private static readonly hexPipeline = Object.freeze(['intake:hex', 'resolve:roles', 'enforce:cvdSimulate']);
  private static readonly oklchPipeline = Object.freeze(['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']);

  static readonly scenarios = Object.freeze([
    CvdScenarioSuite.warning('deuteranopia', ['#d00000', '#008000'], CvdScenarioFixture.redGreenRoles, 'deuteranopia floor signal'),
    CvdScenarioSuite.warning('protanopia', ['#ff0000', '#00cc00'], CvdScenarioFixture.redGreenRoles, 'protanopia drop signal'),
    CvdScenarioSuite.warning('tritanopia', ['#0000ff', '#ffff00'], CvdScenarioFixture.blueYellowRoles, 'tritanopia drop signal'),
    CvdScenarioSuite.warning('achromatopsia', ['#ff0000', '#00d800'], CvdScenarioFixture.isoluminantRoles, 'achromatopsia floor signal'),
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const cvd = ContrastMetadataAssertionPort.cvd(context.output());
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.warnings.length, 0);
      },
      'input': CvdScenarioSuite.hexInput(['#000000', '#ffffff'], CvdScenarioFixture.blackWhiteRoles),
      'kind': 'edge', 'name': 'black on white passes all CVD checks'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        assert.ok(foreground !== undefined);
        assert.notStrictEqual(foreground.hex, '#ffffff');
        assert.notStrictEqual(foreground.hex, '#000000');
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.warnings.length, 0);
        assert.strictEqual(cvd.corrections.length, 1);
      },
      'input': CvdScenarioSuite.oklchInput([
        { 'c': 0.11, 'h': 206.1, 'l': 0.665 },
        { 'c': 0.015276054573075558, 'h': 252.51270656713, 'l': 0.12004924674202846 }
      ], CvdScenarioFixture.darkAccentRoles),
      'kind': 'happy', 'name': 'dark cyan accent corrects without an extreme color'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        assert.ok(foreground !== undefined);
        assert.strictEqual(foreground.hex, '#03060b');
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.corrections.length, 0);
        assert.ok(cvd.warnings.some((warning) => { const matches = warning.cvdType === 'protanopia'; return matches; }));
      },
      'input': CvdScenarioSuite.oklchInput([
        { 'c': 0.015276054573075558, 'h': 252.51270656713, 'l': 0.12004924674202846 },
        { 'c': 0.11, 'h': 206.1, 'l': 0.665 }
      ], CvdScenarioFixture.darkOnAccentRoles),
      'kind': 'edge', 'name': 'baseline boundary retains the original foreground'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        const low = state.roles.backgroundLow;
        const high = state.roles.backgroundHigh;
        assert.ok(foreground !== undefined && low !== undefined && high !== undefined);
        assert.notStrictEqual(foreground.hex, '#d00000');
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.warnings.length, 0);
        assert.strictEqual(cvd.corrections.length, 2);
        const backgrounds = new Set(cvd.corrections.map((correction) => { const background = correction.background; return background; }));
        assert.deepStrictEqual(backgrounds, new Set(['backgroundHigh', 'backgroundLow']));
      },
      'input': CvdScenarioSuite.hexInput(['#d00000', '#008000', '#00a000'], CvdScenarioFixture.sharedForegroundRoles),
      'kind': 'happy', 'name': 'shared foreground satisfies both declared backgrounds'
    },
    CvdScenarioSuite.achromatic('zero chroma finds an interior correction', [
      { 'c': 0, 'h': 0, 'l': 0.5 },
      { 'c': 0, 'h': 0, 'l': 0.65 }
    ], function(chroma) { const result = chroma < 0.0000001; return result; }),
    CvdScenarioSuite.achromatic('near-zero chroma remains searchable', [
      { 'c': 0.00000001, 'h': 123, 'l': 0.5 },
      { 'c': 0.00000001, 'h': 300, 'l': 0.65 }
    ], function(chroma) { const result = chroma > 0 && chroma < 0.000001; return result; }),
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        assert.ok(foreground !== undefined);
        assert.notStrictEqual(foreground.hex, '#000000');
        assert.notStrictEqual(foreground.hex, '#ffffff');
        assert.ok(foreground.oklch.l > 0 && foreground.oklch.l < 1);
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.warnings.length, 0);
        assert.strictEqual(cvd.corrections.length, 1);
      },
      'input': CvdScenarioSuite.hexInput(['#270407', '#565684'], CvdScenarioFixture.extremumRoles),
      'kind': 'edge', 'name': 'extremum repro selects a non-extreme correction'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        assert.ok(foreground !== undefined);
        assert.strictEqual(foreground.hex, '#70adfd');
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        const correction = cvd.corrections.find((entry) => { const matches = entry.foreground === 'text'; return matches; });
        assert.ok(correction !== undefined);
        assert.ok(cvd.warnings.length > 0);
        assert.ok(cvd.warnings.some((warning) => { const matches = warning.cvdType === 'protanopia'; return matches; }));
        assert.deepStrictEqual(new Set(correction.cvdTypesRemaining), new Set(cvd.warnings.map((warning) => { const cvdType = warning.cvdType; return cvdType; })));
        assert.deepStrictEqual(new Set(correction.cvdTypesFixed), new Set(['achromatopsia', 'deuteranopia']));
      },
      'input': CvdScenarioSuite.oklchInput([
        { 'c': 0.1514103825194761, 'h': 255.34034740179777, 'l': 0.6787660075817258 },
        { 'c': 0.2611666344795376, 'h': 45.69293302483857, 'l': 0.441858619148843 }
      ], CvdScenarioFixture.partialCorrectionRoles),
      'kind': 'edge', 'name': 'partial correction reports exactly the unresolved CVD set'
    }
  ] satisfies readonly ScenarioRunner.ScenarioInterface<CvdInputInterface, PaletteStateInterface>[]);

  static async run(): Promise<void> {
    await new ScenarioRunner<CvdInputInterface, PaletteStateInterface>('ContrastPlugin :: cell-5 :: enforce:cvdSimulate', CvdScenarioSuite.runInput).run(CvdScenarioSuite.scenarios);
  }

  private static achromatic(name: string, colors: InputInterfaceTypeEntity.Type['colors'], verifiesChroma: (chroma: number) => boolean): ScenarioRunner.ScenarioInterface<CvdInputInterface, PaletteStateInterface> {
    return {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const state = context.output();
        const foreground = state.roles.text;
        assert.ok(foreground !== undefined);
        assert.ok(verifiesChroma(foreground.oklch.c));
        assert.notStrictEqual(foreground.hex, '#000000');
        assert.notStrictEqual(foreground.hex, '#ffffff');
        const cvd = ContrastMetadataAssertionPort.cvd(state);
        assert.ok(cvd !== undefined);
        assert.strictEqual(cvd.warnings.length, 0);
        assert.strictEqual(cvd.corrections.length, 1);
      },
      'input': CvdScenarioSuite.oklchInput(colors, CvdScenarioFixture.achromaticCorrectionRoles),
      'kind': 'edge', 'name': name
    };
  }

  private static hexInput(colors: InputInterfaceTypeEntity.Type['colors'], roles: Parameters<typeof CvdScenarioFixture.input>[1]): CvdInputInterface {
    const result = { 'input': CvdScenarioFixture.input(colors, roles, true), 'pipeline': CvdScenarioSuite.hexPipeline };
    return result;
  }

  private static oklchInput(colors: InputInterfaceTypeEntity.Type['colors'], roles: Parameters<typeof CvdScenarioFixture.input>[1]): CvdInputInterface {
    const result = { 'input': CvdScenarioFixture.input(colors, roles, true), 'pipeline': CvdScenarioSuite.oklchPipeline };
    return result;
  }

  private static runInput(input: CvdInputInterface): PaletteStateInterface {
    const result = CvdScenarioFixture.run(input.input, input.pipeline);
    return result;
  }

  private static warning(cvdType: string, colors: InputInterfaceTypeEntity.Type['colors'], roles: Parameters<typeof CvdScenarioFixture.input>[1], name: string): ScenarioRunner.ScenarioInterface<CvdInputInterface, PaletteStateInterface> {
    return {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined);
        const cvd = ContrastMetadataAssertionPort.cvd(context.output());
        assert.ok(cvd !== undefined);
        const warning = cvd.warnings.find((entry) => { const matches = entry.cvdType === cvdType; return matches; });
        assert.ok(warning !== undefined);
        assert.strictEqual(warning.foreground, 'text');
        assert.strictEqual(warning.background, 'background');
      },
      'input': { 'input': CvdScenarioFixture.input(colors, roles), 'pipeline': CvdScenarioSuite.hexPipeline },
      'kind': 'happy', 'name': name
    };
  }
}
