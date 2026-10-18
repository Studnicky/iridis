import type { InputInterfaceTypeEntity } from '@studnicky/iridis';

import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginScenarioFixture } from './RdfPluginScenarioFixture.ts';
import { RdfPluginSerializeScenarioEntity } from './RdfPluginSerializeScenarioEntity.ts';

/** E2E cell 4: serializer format negotiation and fallback behavior. */
export class RdfPluginSerializeScenarioSuite {
  static async run(): Promise<void> {
    const roles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'serialize',
      'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'background', 'required': true }]
    });
    const scenarios: readonly ScenarioInterface<InputInterfaceTypeEntity.Type, RdfPluginSerializeScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'default serialization does not throw');
          assert.ok(output !== undefined, 'default serialization returns output');
          assert.ok(output.serialized.includes('<https://studnicky.dev/iridis#Role>'), 'default serialization is Turtle-shaped');
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles),
        'name': 'omitted format defaults to Turtle'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'N-Quads serialization does not throw');
          assert.ok(output !== undefined, 'N-Quads serialization returns output');
          const lines = output.serialized.split('\n').filter((line) => {
            const result = line.length > 0;
            return result;
          });
          const lineCount = lines.length;
          assert.ok(lineCount > 0, 'N-Quads serialization produces lines');
          for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const line = lines[lineIndex];
            assert.ok(line !== undefined, 'N-Quads contains a line at every indexed position');
            assert.ok(line.endsWith('.'), 'each N-Quads line terminates with a period');
          }
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles, { 'rdf:format': 'N-Quads' }),
        'name': 'canonical N-Quads format emits terminated quad lines'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'N-Quads alias serialization does not throw');
          assert.ok(output !== undefined, 'N-Quads alias serialization returns output');
          const allLinesTerminate = output.serialized.split('\n').every((line) => {
            const result = line.length === 0 || line.endsWith('.');
            return result;
          });
          assert.ok(allLinesTerminate, 'lowercase alias resolves to N-Quads');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles, { 'rdf:format': 'application/n-quads' }),
        'name': 'application N-Quads alias resolves to canonical quad serialization'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'unknown format fallback does not throw');
          assert.ok(output !== undefined, 'unknown format fallback returns output');
          assert.ok(output.serialized.includes('<https://studnicky.dev/iridis#Role>'), 'unknown format falls back to Turtle');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles, { 'rdf:format': 'INVALID_FORMAT_XYZ' }),
        'name': 'unknown format safely falls back to Turtle'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'non-string format fallback does not throw');
          assert.ok(output !== undefined, 'non-string format fallback returns output');
          assert.ok(output.serialized.includes('<https://studnicky.dev/iridis#Role>'), 'non-string format falls back to Turtle');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles, { 'rdf:format': 42 }),
        'name': 'non-string format safely falls back to Turtle'
      }
    ];
    const runner = new ScenarioRunner<InputInterfaceTypeEntity.Type, RdfPluginSerializeScenarioEntity.Type>(
      'RdfPlugin :: cell-4 :: reason-serialize',
      (input): RdfPluginSerializeScenarioEntity.Type => {
        const engine = RdfPluginScenarioFixture.createEngine();
        engine.pipeline(['intake:hex', 'resolve:roles', 'reason:annotate', 'reason:serialize']);
        const state = engine.run(input);
        const graph = RdfPluginScenarioFixture.graphFrom(state);
        const serialized = RdfPluginScenarioFixture.serializedFrom(state);
        if (graph === undefined || serialized === undefined) {
          throw new Error('RDF serialization pipeline did not emit graph and serialized output');
        }
        const result = RdfPluginSerializeScenarioEntity.intake({ 'graph': graph, 'serialized': serialized });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
