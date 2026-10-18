import type { PaletteStateInterface } from '@studnicky/iridis';

import { ContrastReportEntryInterfaceTypeEntity, InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { ContrastTestPort } from '../contrast-plugin/ContrastTestPort.ts';

interface EnforceContrastInputInterface {
  readonly 'input': InputInterfaceTypeEntity.Type;
  readonly 'pipeline': readonly string[];
}

interface EnforceContrastOutputInterface {
  readonly 'state': PaletteStateInterface;
}

/** Frozen behavioral matrix for core contrast enforcement. */
export class EnforceContrastScenarioSuite {
  static readonly scenarios = Object.freeze([
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=6, scenario=ec-adjusted] no throw');
        const state = context.output().state;
        const report = EnforceContrastScenarioSuite.report(state);
        assert.ok(report !== undefined, '[cell=6, scenario=ec-adjusted] report written');
        assert.strictEqual(report.length, 1, '[cell=6, scenario=ec-adjusted] one pair processed');
        const entry = report.at(0);
        assert.ok(entry !== undefined, '[cell=6, scenario=ec-adjusted] entry present');
        assert.strictEqual(entry.foreground, 'text', '[cell=6, scenario=ec-adjusted] foreground');
        assert.strictEqual(entry.background, 'background', '[cell=6, scenario=ec-adjusted] background');
        assert.strictEqual(entry.algorithm, 'wcag21', '[cell=6, scenario=ec-adjusted] algorithm');
        assert.strictEqual(entry.minimumContrastRatio, 4.5, '[cell=6, scenario=ec-adjusted] target');
        assert.strictEqual(entry.adjusted, true, '[cell=6, scenario=ec-adjusted] adjusted');
        assert.strictEqual(entry.passed, true, '[cell=6, scenario=ec-adjusted] passed');
        assert.ok(entry.ratio >= 4.5, '[cell=6, scenario=ec-adjusted] contrast met');
        assert.ok(state.roles.text?.hex !== undefined, '[cell=6, scenario=ec-adjusted] text role present');
        assert.strictEqual(state.roles.background?.hex.toLowerCase(), '#ffffff', '[cell=6, scenario=ec-adjusted] background retained');
      },
      'input': EnforceContrastScenarioSuite.input(['#aaaaaa', '#ffffff'], EnforceContrastScenarioSuite.roles()),
      'kind': 'happy',
      'name': 'failing pair triggers adjusted=true and rewrites the foreground role'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=6, scenario=ec-passing] no throw');
        const entry = EnforceContrastScenarioSuite.report(context.output().state)?.at(0);
        assert.ok(entry !== undefined, '[cell=6, scenario=ec-passing] entry present');
        assert.strictEqual(entry.adjusted, false, '[cell=6, scenario=ec-passing] no adjustment');
        assert.strictEqual(entry.passed, true, '[cell=6, scenario=ec-passing] passed');
        assert.ok(entry.ratio >= 4.5, '[cell=6, scenario=ec-passing] contrast met');
      },
      'input': EnforceContrastScenarioSuite.input(['#494949', '#ffffff'], EnforceContrastScenarioSuite.roles()),
      'kind': 'happy',
      'name': 'passing pair: adjusted=false, ratio preserved'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=6, scenario=ec-no-pairs] no throw');
        const report = EnforceContrastScenarioSuite.report(context.output().state);
        assert.ok(report === undefined || report.length === 0, '[cell=6, scenario=ec-no-pairs] no report entries');
      },
      'input': EnforceContrastScenarioSuite.input(['#000000', '#ffffff'], RoleSchemaInterfaceTypeEntity.intake({ 'name': 'no-pairs', 'roles': [{ 'name': 'primary', 'required': true }] })),
      'kind': 'edge',
      'name': 'no contrastPairs in schema: contrastReport not written'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=6, scenario=ec-boundary] no throw');
        const entry = EnforceContrastScenarioSuite.report(context.output().state)?.at(0);
        assert.ok(entry !== undefined, '[cell=6, scenario=ec-boundary] entry present');
        assert.ok(entry.ratio >= 4.5, '[cell=6, scenario=ec-boundary] contrast met');
        assert.strictEqual(entry.passed, true, '[cell=6, scenario=ec-boundary] passed');
      },
      'input': EnforceContrastScenarioSuite.input(['#767676', '#ffffff'], EnforceContrastScenarioSuite.roles()),
      'kind': 'edge',
      'name': 'dark-gray on white: ratio near 4.5:1 boundary passes'
    }
  ] satisfies readonly ScenarioRunner.ScenarioInterface<EnforceContrastInputInterface, EnforceContrastOutputInterface>[]);

  static async run(): Promise<void> {
    const runner = new ScenarioRunner<EnforceContrastInputInterface, EnforceContrastOutputInterface>(
      'ContrastPlugin :: cell-6 :: enforce:contrast',
      EnforceContrastScenarioSuite.runInput
    );
    await runner.run(EnforceContrastScenarioSuite.scenarios);
  }

  private static input(colors: readonly string[], roles: RoleSchemaInterfaceTypeEntity.Type): EnforceContrastInputInterface {
    const input = InputInterfaceTypeEntity.intake({ 'colors': colors, 'roles': roles });
    const result = { 'input': input, 'pipeline': ['intake:hex', 'resolve:roles', 'enforce:contrast'] };
    return result;
  }

  private static report(state: PaletteStateInterface): readonly ContrastReportEntryInterfaceTypeEntity.Type[] | undefined {
    const value = state.metadata['core:contrastReport'];
    if (!Array.isArray(value)) {
      return undefined;
    }
    const result: ContrastReportEntryInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const entry = value.at(index);
      if (entry !== undefined) {
        result.push(ContrastReportEntryInterfaceTypeEntity.intake(entry));
      }
    }
    return result;
  }

  private static roles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 4.5 }],
      'name': 'enforce-contrast-adj',
      'roles': [
        { 'lightnessRange': [0.40, 0.90], 'name': 'text', 'required': true },
        { 'lightnessRange': [0.90, 1], 'name': 'background', 'required': true }
      ]
    });
    return result;
  }

  private static runInput(input: EnforceContrastInputInterface): EnforceContrastOutputInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline([...input.pipeline]);
    const state = engine.run(input.input);
    const result = { 'state': state };
    return result;
  }
}
