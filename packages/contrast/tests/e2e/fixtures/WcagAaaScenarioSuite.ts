import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { ContrastMetadataAssertionPort } from '../contrast-plugin/ContrastMetadataAssertionPort.ts';
import { ContrastTestPort } from '../contrast-plugin/ContrastTestPort.ts';

interface WcagAaaInputInterface {
  readonly 'input': InputInterfaceTypeEntity.Type;
  readonly 'pipeline': readonly string[];
}

interface WcagAaaOutputInterface {
  readonly 'state': PaletteStateInterface;
}

/** Frozen behavioral matrix for WCAG AAA enforcement. */
export class WcagAaaScenarioSuite {
  static readonly scenarios = Object.freeze([
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=3, scenario=aaa-passing] no throw');
        const pair = ContrastMetadataAssertionPort.aaa(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=3, scenario=aaa-passing] pair present');
        assert.strictEqual(pair.required, 7, '[cell=3, scenario=aaa-passing] required=7');
        assert.ok(pair.after >= 7, '[cell=3, scenario=aaa-passing] after meets 7');
        assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-passing] pass=true');
      },
      'input': {
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#000000', '#ffffff'],
          'roles': WcagAaaScenarioSuite.roles('text', 'background')
        }),
        'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
      },
      'kind': 'happy',
      'name': 'near-black on white already meets 7:1 — pass with no adjustment'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=3, scenario=aaa-adjusted] no throw');
        const state = context.output().state;
        const pair = ContrastMetadataAssertionPort.aaa(state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=3, scenario=aaa-adjusted] pair present');
        assert.ok(pair.before < pair.required, '[cell=3, scenario=aaa-adjusted] before below required');
        assert.ok(pair.after >= pair.required, '[cell=3, scenario=aaa-adjusted] after meets required');
        assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-adjusted] pass=true');
        assert.notStrictEqual(state.roles.text?.hex, state.roles.background?.hex, '[cell=3, scenario=aaa-adjusted] roles differ');
      },
      'input': {
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#777777', '#aaaaaa'],
          'roles': WcagAaaScenarioSuite.roles('text', 'background')
        }),
        'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
      },
      'kind': 'happy',
      'name': 'low-contrast mid-gray pair adjusted to ≥7:1'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=3, scenario=aaa-combined] no throw');
        const state = context.output().state;
        const aa = ContrastMetadataAssertionPort.aa(state)?.pairs.at(0);
        const aaa = ContrastMetadataAssertionPort.aaa(state)?.pairs.at(0);
        assert.ok(aa !== undefined, '[cell=3, scenario=aaa-combined] AA pair present');
        assert.ok(aaa !== undefined, '[cell=3, scenario=aaa-combined] AAA pair present');
        assert.strictEqual(aa.required, 4.5, '[cell=3, scenario=aaa-combined] AA required=4.5');
        assert.strictEqual(aaa.required, 4.5, '[cell=3, scenario=aaa-combined] AAA required=4.5');
        assert.strictEqual(aa.pass, true, '[cell=3, scenario=aaa-combined] AA pass');
        assert.strictEqual(aaa.pass, true, '[cell=3, scenario=aaa-combined] AAA pass');
      },
      'input': {
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#000000', '#ffffff'],
          'roles': {
            'contrastPairs': [
              { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 4.5 }
            ],
            'name': 'combined',
            'roles': [
              { 'name': 'text', 'required': true },
              { 'name': 'background', 'required': true }
            ]
          }
        }),
        'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'enforce:wcagAAA']
      },
      'kind': 'happy',
      'name': 'AA + AAA combined pipeline — both slots written independently'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=3, scenario=aaa-no-pairs] no throw');
        const aaa = ContrastMetadataAssertionPort.aaa(context.output().state);
        assert.strictEqual(aaa, undefined, '[cell=3, scenario=aaa-no-pairs] slot absent');
      },
      'input': {
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#000000', '#ffffff'],
          'roles': { 'name': 'no-pairs', 'roles': [{ 'name': 'primary', 'required': true }] }
        }),
        'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
      },
      'kind': 'edge',
      'name': 'no contrastPairs in schema: wcag.aaa not written'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=3, scenario=aaa-at-boundary] no throw');
        const pair = ContrastMetadataAssertionPort.aaa(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=3, scenario=aaa-at-boundary] pair present');
        assert.ok(pair.before >= pair.required, '[cell=3, scenario=aaa-at-boundary] before meets required');
        assert.ok(pair.after >= pair.required, '[cell=3, scenario=aaa-at-boundary] after meets required');
        assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-at-boundary] pass=true');
      },
      'input': {
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#1a1a1a', '#ffffff'],
          'roles': {
            'contrastPairs': [
              { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 7 }
            ],
            'name': 'wcag-aaa-edge',
            'roles': [
              { 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
              { 'lightnessRange': [0.90, 1], 'name': 'background', 'required': true }
            ]
          }
        }),
        'pipeline': ['intake:hex', 'resolve:roles', 'enforce:wcagAAA']
      },
      'kind': 'edge',
      'name': 'near-black on white: before already exceeds 7:1 — no adjustment needed'
    }
  ] satisfies readonly ScenarioRunner.ScenarioInterface<WcagAaaInputInterface, WcagAaaOutputInterface>[]);

  static async run(): Promise<void> {
    const runner = new ScenarioRunner<WcagAaaInputInterface, WcagAaaOutputInterface>(
      'ContrastPlugin :: cell-3 :: enforce:wcagAAA',
      WcagAaaScenarioSuite.runInput
    );
    await runner.run(WcagAaaScenarioSuite.scenarios);
  }

  private static roles(foreground: string, background: string): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': background, 'foreground': foreground, 'minimumContrastRatio': 7 }
      ],
      'name': 'wcag-aaa',
      'roles': [
        { 'lightnessRange': [0.10, 0.55], 'name': foreground, 'required': true },
        { 'lightnessRange': [0.90, 1], 'name': background, 'required': true }
      ]
    });
    return result;
  }

  private static runInput(input: WcagAaaInputInterface): WcagAaaOutputInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline([...input.pipeline]);
    const state = engine.run(input.input);
    const result = { 'state': state };
    return result;
  }
}
