import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { WcagPairResultSetInterfaceTypeEntity } from '../../../src/entities/WcagPairResultSetInterfaceTypeEntity.ts';
import { ContrastTestPort } from '../contrast-plugin/ContrastTestPort.ts';

/** Typed WCAG AA scenario matrix for the contrast-plugin engine task. */
export class WcagAaScenarioSuite {
  private static readonly pipeline = Object.freeze(['intake:hex', 'resolve:roles', 'enforce:wcagAA']);

  private static createRoles(
    foregroundName: string,
    backgroundName: string,
    minimumContrastRatio = 4.5
  ): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [
        { 'algorithm': 'wcag21', 'background': backgroundName, 'foreground': foregroundName, 'minimumContrastRatio': minimumContrastRatio }
      ],
      'name': 'wcag-aa',
      'roles': [
        { 'lightnessRange': [0.30, 0.60], 'name': foregroundName, 'required': true },
        { 'lightnessRange': [0.90, 1.00], 'name': backgroundName, 'required': true }
      ]
    });
    return result;
  }

  private static runInput(input: InputInterfaceTypeEntity.Type): PaletteStateInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline([...WcagAaScenarioSuite.pipeline]);
    const result = engine.run(input);
    return result;
  }

  private static aaMetadata(state: PaletteStateInterface): WcagPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:aa'];
    const result = value === undefined
      ? undefined
      : WcagPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static async run(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<InputInterfaceTypeEntity.Type, PaletteStateInterface>[] = Object.freeze([
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=aa-passing] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=aa-passing] state returned');
          const aa = WcagAaScenarioSuite.aaMetadata(output);
          assert.ok(aa !== undefined, '[cell=2, scenario=aa-passing] metadata[contrast:aa] written');
          assert.strictEqual(aa.pairs.length, 1, '[cell=2, scenario=aa-passing] one pair processed');
          const pair = aa.pairs.at(0);
          assert.ok(pair !== undefined, '[cell=2, scenario=aa-passing] pair present');
          assert.strictEqual(pair.foreground, 'text', '[cell=2, scenario=aa-passing] foreground name');
          assert.strictEqual(pair.background, 'background', '[cell=2, scenario=aa-passing] background name');
          assert.strictEqual(pair.algorithm, 'wcag21', '[cell=2, scenario=aa-passing] algorithm field');
          assert.strictEqual(pair.required, 4.5, '[cell=2, scenario=aa-passing] required ratio');
          assert.ok(pair.before >= pair.required, '[cell=2, scenario=aa-passing] before meets required');
          assert.ok(pair.after >= pair.required, '[cell=2, scenario=aa-passing] after meets required');
          assert.strictEqual(pair.pass, true, '[cell=2, scenario=aa-passing] pass=true');
        },
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#494949', '#ffffff'],
          'roles': WcagAaScenarioSuite.createRoles('text', 'background')
        }),
        'kind': 'happy',
        'name': 'dark gray on white already meets 4.5:1 — no adjustment'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=aa-adjusted] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=aa-adjusted] state returned');
          const aa = WcagAaScenarioSuite.aaMetadata(output);
          const pair = aa?.pairs.at(0);
          assert.ok(pair !== undefined, '[cell=2, scenario=aa-adjusted] pair present');
          assert.ok(pair.before < pair.required, '[cell=2, scenario=aa-adjusted] before below required');
          assert.ok(pair.after >= pair.required, '[cell=2, scenario=aa-adjusted] after meets required');
          assert.strictEqual(pair.pass, true, '[cell=2, scenario=aa-adjusted] pass=true');
          const textHex = output.roles.text?.hex;
          assert.ok(textHex !== undefined, '[cell=2, scenario=aa-adjusted] text role assigned');
          assert.notStrictEqual(textHex.toLowerCase(), '#aaaaaa', '[cell=2, scenario=aa-adjusted] text role adjusted');
        },
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#aaaaaa', '#ffffff'],
          'roles': WcagAaScenarioSuite.createRoles('text', 'background')
        }),
        'kind': 'happy',
        'name': 'failing pair: low-contrast gray adjusted to meet 4.5:1'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=aa-boundary] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=aa-boundary] state returned');
          const aa = WcagAaScenarioSuite.aaMetadata(output);
          const pair = aa?.pairs.at(0);
          assert.ok(pair !== undefined, '[cell=2, scenario=aa-boundary] pair present');
          assert.ok(pair.after >= pair.required, '[cell=2, scenario=aa-boundary] after meets required');
          assert.strictEqual(pair.pass, true, '[cell=2, scenario=aa-boundary] pass=true');
        },
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#767676', '#ffffff'],
          'roles': WcagAaScenarioSuite.createRoles('text', 'background', 4.5)
        }),
        'kind': 'edge',
        'name': 'boundary: minimumContrastRatio 3.0 large-text pair — just-passing accepted'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=aa-no-pairs] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=aa-no-pairs] state returned');
          const aa = WcagAaScenarioSuite.aaMetadata(output);
          assert.strictEqual(aa, undefined, '[cell=2, scenario=aa-no-pairs] contrast:aa slot absent');
        },
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#000000', '#ffffff'],
          'roles': {
            'name': 'no-pairs',
            'roles': [{ 'name': 'primary', 'required': true }]
          }
        }),
        'kind': 'edge',
        'name': 'no contrastPairs in schema: wcag.aa not written'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=aa-skip-apca] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=aa-skip-apca] state returned');
          const aa = WcagAaScenarioSuite.aaMetadata(output);
          if (aa !== undefined) {
            assert.strictEqual(aa.pairs.length, 0, '[cell=2, scenario=aa-skip-apca] no wcag entries');
          }
        },
        'input': InputInterfaceTypeEntity.intake({
          'colors': ['#000000', '#ffffff'],
          'roles': {
            'contrastPairs': [
              { 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }
            ],
            'name': 'apca-only',
            'roles': [
              { 'name': 'text', 'required': true },
              { 'name': 'background', 'required': true }
            ]
          }
        }),
        'kind': 'edge',
        'name': 'apca-algorithm pair is skipped: wcag.aa pairs array is empty'
      }
    ]);
    await new ScenarioRunner<InputInterfaceTypeEntity.Type, PaletteStateInterface>(
      'ContrastPlugin :: cell-2 :: enforce:wcagAA',
      WcagAaScenarioSuite.runInput
    ).run(scenarios);
  }
}
