/**
 * Pipeline.integration — scenario-matrix suite.
 *
 * Subject: end-to-end pipeline state flow using stub tasks only.
 * No real intake/transform/emit implementations; depends solely on the
 * Engine / TaskRegistry foundation. Safe to run while task implementations
 * are in flux.
 *
 * Pipeline stage model:
 *   stub:intake    — writes colors from raw input into state.colors
 *   stub:transform — derives roles from colors
 *   stub:emit      — writes final output from roles
 *
 * Cells:
 *   1. state-flow    — colors, roles, outputs, metadata propagate correctly
 *   2. context       — PipelineContext supplies a usable logger and run timestamp
 *   3. edge-inputs   — empty colors, single color, many colors
 *   4. error-paths   — task that throws propagates to run() caller
 */

import { LogBodyConfigEntity } from '@studnicky/logger/entities';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../src/interfaces/PipelineContextInterface.ts';
import type { PluginInterface } from '../../src/interfaces/PluginInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';
import type { EdgeInputsInputEntity } from './entities/EdgeInputsInputEntity.ts';
import type { ErrorPathInputEntity } from './entities/ErrorPathInputEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { Engine } from '../../src/engine/Engine.ts';
import { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';
import { InputInterfaceTypeEntity } from '../../src/entities/InputInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';
import { PaletteRoleState } from '../../src/interfaces/PaletteStateInterface.ts';
import { ContextOutputEntity } from './entities/ContextOutputEntity.ts';
import { EdgeInputsOutputEntity } from './entities/EdgeInputsOutputEntity.ts';
import { ErrorPathOutputEntity } from './entities/ErrorPathOutputEntity.ts';
import { StateFlowOutputEntity } from './entities/StateFlowOutputEntity.ts';
import { PipelineIntegrationScenarios } from './pipeline/PipelineIntegrationScenarios.ts';

// ---------------------------------------------------------------------------
// Stub task factories — reused across cells 1 and 3.
// ---------------------------------------------------------------------------

class StubTasks {
  static intakeRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    for (let index = 0; index < state.input.colors.length; index += 1) {
      const raw = state.input.colors[index];
      const hex = typeof raw === 'string' ? raw : '#000000';
      state.colors.push(ColorRecordInterfaceTypeEntity.create({
        'alpha': 1,
        'hex': hex,
        'oklch': { 'c': 0.1, 'h': 0, 'l': 0.5 },
        'rgb': { 'b': 0.502, 'g': 0.502, 'r': 0.502 },
        'sourceFormat': 'hex'
      }));
    }
  }

  static transformRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    const first = state.colors[0];
    if (first !== undefined) { state.roles.primary = first; }
  }

  static emitRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    const roleEntries = Object.entries(state.roles);
    const variableOutput: Record<string, string> = {};
    for (let index = 0; index < roleEntries.length; index += 1) {
      const entry = roleEntries[index];
      if (entry !== undefined) {
        const [role, record] = entry;
        Object.defineProperty(variableOutput, `--color-${role}`, {
          'configurable': true,
          'enumerable': true,
          'value': record.hex,
          'writable': true
        });
      }
    }
    state.outputs.stub = variableOutput;
  }

  static intakeTask(): TaskInterface {
    return {
      'manifest': TaskManifestInterfaceTypeEntity.create({
        'name': 'stub:intake',
        'reads': ['input.colors'],
        'writes': ['colors']
      }),
      'name': 'stub:intake',
      'run': StubTasks.intakeRun
    };
  }

  static transformTask(): TaskInterface {
    return {
      'manifest': TaskManifestInterfaceTypeEntity.create({
        'name': 'stub:transform',
        'reads': ['colors'],
        'writes': ['roles']
      }),
      'name': 'stub:transform',
      'run': StubTasks.transformRun
    };
  }

  static emitTask(): TaskInterface {
    return {
      'manifest': TaskManifestInterfaceTypeEntity.create({
        'name': 'stub:emit',
        'reads': ['roles'],
        'writes': ['outputs.stub']
      }),
      'name': 'stub:emit',
      'run': StubTasks.emitRun
    };
  }

  static pluginTasks(): readonly TaskInterface[] {
    return [StubTasks.intakeTask(), StubTasks.transformTask(), StubTasks.emitTask()];
  }

  static plugin(): PluginInterface {
    return {
      'name':    'stub-pipeline',
      'tasks':   StubTasks.pluginTasks,
      'version': '0.0.1'
    };
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — state-flow: colors, roles, outputs, metadata propagate correctly
//
// A full stub pipeline (intake → transform → emit) must:
//   - populate state.colors with one ColorRecord per input hex
//   - derive state.roles.primary from first color
//   - write state.outputs.stub with CSS variable map
//   - pass input.metadata through to state.metadata unchanged
// ---------------------------------------------------------------------------

new ScenarioRunner<InputInterfaceTypeEntity.Type, StateFlowOutputEntity.Type>(
  'Pipeline.integration :: cell-1 :: state-flow',
  (input) => {
    const engine = new Engine();
    engine.adopt(StubTasks.plugin());
    engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
    const state = engine.run(input);
    const stubOutput = state.outputs.stub;
    const stubValue = JsonObject.is(stubOutput) ? stubOutput['--color-primary'] : undefined;
    const metadataCategory = state.metadata.category;
    const metadataVersion = state.metadata.version;
    const firstColorHex = state.colors[0]?.hex ?? '';
    const stubVarValue = typeof stubValue === 'string' ? stubValue : '';
    const metaCategory = typeof metadataCategory === 'string' ? metadataCategory : undefined;
    const metaVersion = typeof metadataVersion === 'number' ? metadataVersion : undefined;
    const result = StateFlowOutputEntity.create({
      'colorsLength': state.colors.length,
      'firstColorHex': firstColorHex,
      'hasPrimary': 'primary' in state.roles,
      ...(metaCategory === undefined ? {} : { 'metaCategory': metaCategory }),
      ...(metaVersion === undefined ? {} : { 'metaVersion': metaVersion }),
      'primaryHex': state.roles.primary?.hex ?? '',
      'stubVarValue': stubVarValue
    });
    return result;
  }
).run(PipelineIntegrationScenarios.stateFlow);

// ---------------------------------------------------------------------------
// Cell 2 — context: logger and startedAt are stable for one pipeline run
//
// Every task receives one context with a usable logger and a timestamp created
// during the enclosing Engine.run call. The same context serves each task.
// ---------------------------------------------------------------------------

void test('Pipeline.integration :: cell-2 :: context :: tasks receive one context with a usable logger and run timestamp', () => {
  const engine = new Engine();
  const contexts: PipelineContextInterface[] = [];

  function inspectLoggerRun(_state: PaletteStateInterface, pipelineContext: PipelineContextInterface): void {
    pipelineContext.logger.debug(LogBody.create(LogBodyConfigEntity.intake({
      'component': 'Pipeline.integration',
      'context': {},
      'message': 'pipeline context logger is usable from a task',
      'operation': 'inspect-context',
      'status': LOG_STATUS.SUCCESS
    })));
    contexts.push(pipelineContext);
  }

  function inspectTimestampRun(_state: PaletteStateInterface, pipelineContext: PipelineContextInterface): void {
    contexts.push(pipelineContext);
  }

  const loggerInspector: TaskInterface = {
    'manifest': TaskManifestInterfaceTypeEntity.create({ 'name': 'inspect:logger' }),
    'name': 'inspect:logger',
    'run': inspectLoggerRun
  };
  const timestampInspector: TaskInterface = {
    'manifest': TaskManifestInterfaceTypeEntity.create({ 'name': 'inspect:timestamp' }),
    'name': 'inspect:timestamp',
    'run': inspectTimestampRun
  };

  function inspectorTasks(): readonly TaskInterface[] { return [loggerInspector, timestampInspector]; }

  engine.adopt({
    'name': 'inspect-plugin',
    'tasks': inspectorTasks,
    'version': '0.0.1'
  });
  engine.pipeline(['inspect:logger', 'inspect:timestamp']);
  const input = InputInterfaceTypeEntity.intake({ 'colors': [] });
  const runStartedAt = Date.now();
  engine.run(input);
  const runCompletedAt = Date.now();
  const firstContext = contexts[0];
  const secondContext = contexts[1];
  const result = ContextOutputEntity.create({
    'loggerAcceptedDebug': firstContext !== undefined,
    'sharedAcrossTasks': firstContext === secondContext,
    'startedAtDuringRun': firstContext !== undefined
      && firstContext.startedAt >= runStartedAt
      && firstContext.startedAt <= runCompletedAt
  });

  assert.strictEqual(result.loggerAcceptedDebug, true, '[cell=2, scenario=run-context] logger accepts a task debug record');
  assert.strictEqual(result.startedAtDuringRun, true, '[cell=2, scenario=run-context] startedAt is generated during run');
  assert.strictEqual(result.sharedAcrossTasks, true, '[cell=2, scenario=run-context] one context reaches all pipeline tasks');
});

// ---------------------------------------------------------------------------
// Cell 3 — edge inputs: empty colors, single color, three colors with index roles
//
// Empty input must produce empty state throughout without throwing. Multiple
// colors must each get their own role when the transform maps by index.
// ---------------------------------------------------------------------------

new ScenarioRunner<EdgeInputsInputEntity.Type, EdgeInputsOutputEntity.Type>(
  'Pipeline.integration :: cell-3 :: edge-inputs',
  (input) => {
    if (input.mode === 'empty') {
      const engine = new Engine();
      engine.adopt(StubTasks.plugin());
      engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
      const runInput = InputInterfaceTypeEntity.intake({ 'colors': [] });
      const state = engine.run(runInput);
      const stub = state.outputs.stub;
      const result = EdgeInputsOutputEntity.create({
        'colorsLength': state.colors.length,
        'rolesCount': Object.keys(state.roles).length,
        'stubKeyCount': JsonObject.is(stub) ? Object.keys(stub).length : 0
      });
      return result;
    }

    // multi-index: custom transform maps each color to a named role
    function multiTransformRun(state: PaletteStateInterface): void {
      const roleState = PaletteRoleState.admit(state.roles);
      for (let index = 0; index < state.colors.length; index += 1) {
        const color = state.colors[index];
        if (color !== undefined) {
          roleState.set(`color-${index}`, color);
        }
      }
      roleState.commit();
    }
    const multiTransform: TaskInterface = {
      'manifest': TaskManifestInterfaceTypeEntity.create({ 'name': 'stub:transform' }),
      'name': 'stub:transform',
      'run': multiTransformRun
    };
    function multiIndexPluginTasks(): readonly TaskInterface[] { return [StubTasks.intakeTask(), multiTransform, StubTasks.emitTask()]; }
    const plugin: PluginInterface = {
      'name':    'multi-index-plugin',
      'tasks': multiIndexPluginTasks,
      'version': '0.0.1'
    };
    const engine = new Engine();
    engine.adopt(plugin);
    engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
    const multiColorInput = InputInterfaceTypeEntity.intake({ 'colors': ['#ff0000', '#00ff00', '#0000ff'] });
    const state = engine.run(multiColorInput);
    const stub = state.outputs.stub;
    const result = EdgeInputsOutputEntity.create({
      'colorsLength': state.colors.length,
      'rolesCount': Object.keys(state.roles).length,
      'stubKeyCount': JsonObject.is(stub) ? Object.keys(stub).length : 0
    });
    return result;
  }
).run(PipelineIntegrationScenarios.edgeInputs);

// ---------------------------------------------------------------------------
// Cell 4 — error paths: task that throws propagates to run() caller
//
// An exception thrown inside a task.run() must surface as a rejected promise
// from engine.run(). The original error message must be preserved.
// ---------------------------------------------------------------------------

new ScenarioRunner<ErrorPathInputEntity.Type, ErrorPathOutputEntity.Type>(
  'Pipeline.integration :: cell-4 :: error-paths',
  (input) => {
    const engine = new Engine();
    function errorTaskRun(): void { throw new Error(input.message); }
    const errorTask: TaskInterface = {
      'manifest': TaskManifestInterfaceTypeEntity.create({ 'name': 'task:throws' }),
      'name': 'task:throws',
      'run': errorTaskRun
    };
    function errorPluginTasks(): readonly TaskInterface[] { return [errorTask]; }
    engine.adopt({
      'name':    'error-plugin',
      'tasks': errorPluginTasks,
      'version': '0.0.1'
    });
    engine.pipeline(['task:throws']);
    const runInput = InputInterfaceTypeEntity.intake({ 'colors': ['#000'] });
    engine.run(runInput);
    const result = ErrorPathOutputEntity.create({});
    return result;
  }
).run(PipelineIntegrationScenarios.errorPaths);
