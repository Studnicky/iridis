import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';
import type { EdgeInputsOutputEntity } from '../entities/EdgeInputsOutputEntity.ts';
import type { ErrorPathOutputEntity } from '../entities/ErrorPathOutputEntity.ts';
import type { StateFlowOutputEntity } from '../entities/StateFlowOutputEntity.ts';

import { InputEntity } from '../../../src/entities/InputEntity.ts';
import { EdgeInputsInputEntity } from '../entities/EdgeInputsInputEntity.ts';
import { ErrorPathInputEntity } from '../entities/ErrorPathInputEntity.ts';

export namespace PipelineIntegrationScenarios {
  export const stateFlow: readonly ScenarioInterface<InputEntity.Type, StateFlowOutputEntity.Type>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=1, scenario=single-seed] no throw');
        assert.strictEqual(output?.colorsLength, 1, '[cell=1, scenario=single-seed] one color in state');
        assert.strictEqual(output?.firstColorHex, '#8B5CF6', '[cell=1, scenario=single-seed] color hex preserved');
        assert.strictEqual(output?.hasPrimary, true, '[cell=1, scenario=single-seed] primary role derived');
        assert.strictEqual(output?.primaryHex, '#8B5CF6', '[cell=1, scenario=single-seed] primary hex matches seed');
        assert.strictEqual(output?.stubVarValue, '#8B5CF6', '[cell=1, scenario=single-seed] stub output CSS var correct');
      },
      'input': InputEntity.intake({
        'colors': ['#8B5CF6'],
        'metadata': { 'source': 'integration-test' }
      }),
      'kind': 'happy',
      'name': 'single seed flows end-to-end: colors, roles, output, metadata'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=1, scenario=metadata] no throw');
        assert.strictEqual(output?.metaCategory, 'music', '[cell=1, scenario=metadata] category preserved');
        assert.strictEqual(output?.metaVersion, 2, '[cell=1, scenario=metadata] version preserved');
      },
      'input': InputEntity.intake({
        'colors': ['#ffffff'],
        'metadata': { 'category': 'music', 'version': 2 }
      }),
      'kind': 'happy',
      'name': 'metadata flows through unchanged'
    }
  ];

  export const edgeInputs: readonly ScenarioInterface<EdgeInputsInputEntity.Type, EdgeInputsOutputEntity.Type>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=3, scenario=empty] no throw');
        assert.strictEqual(output?.colorsLength, 0, '[cell=3, scenario=empty] no colors');
        assert.strictEqual(output?.rolesCount, 0, '[cell=3, scenario=empty] no roles');
        assert.strictEqual(output?.stubKeyCount, 0, '[cell=3, scenario=empty] empty stub output');
      },
      'input': EdgeInputsInputEntity.create({ 'mode': 'empty' }),
      'kind': 'edge',
      'name': 'empty colors produces zero colors, zero roles, empty stub output'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=3, scenario=multi-index] no throw');
        assert.strictEqual(output?.colorsLength, 3, '[cell=3, scenario=multi-index] three colors');
        assert.strictEqual(output?.rolesCount, 3, '[cell=3, scenario=multi-index] three roles by index');
        assert.strictEqual(output?.stubKeyCount, 3, '[cell=3, scenario=multi-index] three CSS vars in stub output');
      },
      'input': EdgeInputsInputEntity.create({ 'mode': 'multi-index' }),
      'kind': 'happy',
      'name': 'three colors with index-based transform produce three roles'
    }
  ];

  export const errorPaths: readonly ScenarioInterface<ErrorPathInputEntity.Type, ErrorPathOutputEntity.Type>[] = [
    {
      'assert': function(_output, error) {
        assert.ok(error instanceof Error, '[cell=4, scenario=task-throws] expected Error');
        assert.ok(
          error.message.includes('intentional pipeline failure'),
          `[cell=4, scenario=task-throws] original message preserved; got: ${error.message}`
        );
      },
      'input': ErrorPathInputEntity.create({ 'message': 'intentional pipeline failure' }),
      'kind': 'unhappy',
      'name': 'task throw propagates with original message to run() caller'
    },
    {
      'assert': function(_output, error) {
        assert.ok(error instanceof Error, '[cell=4, scenario=special-chars] expected Error');
        assert.ok(
          error.message.includes('failure: [code=404]'),
          `[cell=4, scenario=special-chars] message preserved; got: ${error.message}`
        );
      },
      'input': ErrorPathInputEntity.create({ 'message': 'failure: [code=404] "resource" not found' }),
      'kind': 'unhappy',
      'name': 'task throws with nested message containing special characters'
    }
  ];
}
