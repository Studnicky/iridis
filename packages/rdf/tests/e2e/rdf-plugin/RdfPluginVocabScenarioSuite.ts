import { iridisVocab } from '@studnicky/iridis-rdf';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginVocabScenarioEntity } from './RdfPluginVocabScenarioEntity.ts';

/** E2E cell 2: RDF vocabulary predicate identity and namespace contract. */
export class RdfPluginVocabScenarioSuite {
  static async run(): Promise<void> {
    const scenarios: readonly ScenarioInterface<undefined, RdfPluginVocabScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'vocabulary inspection does not throw');
          assert.ok(output !== undefined, 'vocabulary inspection returns output');
          const values = Object.values(output);
          const valueCount = values.length;
          for (let valueIndex = 0; valueIndex < valueCount; valueIndex += 1) {
            const value = values[valueIndex];
            assert.ok(value !== undefined, 'vocabulary contains a value at every indexed position');
            assert.ok(value.startsWith('https://studnicky.dev/iridis'), 'every predicate is inside the iridis namespace');
          }
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': undefined,
        'name': 'every published predicate is an iridis namespace IRI'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'predicate distinctness inspection does not throw');
          assert.ok(output !== undefined, 'predicate distinctness inspection returns output');
          const channels = new Set([output.displayP3B, output.displayP3G, output.displayP3R]);
          assert.strictEqual(channels.size, 3, 'display-P3 channels use three distinct predicates');
          assert.notStrictEqual(output.role, output.hasColor, 'role type differs from hasColor predicate');
          assert.notStrictEqual(output.role, output.hasRole, 'role type differs from hasRole predicate');
          assert.notStrictEqual(output.role, output.wcag21Ratio, 'role type differs from contrast predicate');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': undefined,
        'name': 'role and display-P3 vocabulary predicates retain distinct semantics'
      }
    ];
    const runner = new ScenarioRunner<undefined, RdfPluginVocabScenarioEntity.Type>(
      'RdfPlugin :: cell-2 :: vocabulary',
      (): RdfPluginVocabScenarioEntity.Type => {
        const result = RdfPluginVocabScenarioEntity.intake({
          'displayP3B': iridisVocab.displayP3B,
          'displayP3G': iridisVocab.displayP3G,
          'displayP3R': iridisVocab.displayP3R,
          'hasColor': iridisVocab.hasColor,
          'hasRole': iridisVocab.hasRole,
          'hex': iridisVocab.hex,
          'oklchC': iridisVocab.oklchC,
          'oklchH': iridisVocab.oklchH,
          'oklchL': iridisVocab.oklchL,
          'rgbB': iridisVocab.rgbB,
          'rgbG': iridisVocab.rgbG,
          'rgbR': iridisVocab.rgbR,
          'role': iridisVocab.Role,
          'wcag21Ratio': iridisVocab.wcag21Ratio
        });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
