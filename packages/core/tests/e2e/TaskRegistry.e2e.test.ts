/**
 * TaskRegistry.e2e — scenario-matrix suite.
 *
 * Subject: `TaskRegistry` public API and hook ordering via `Engine`.
 *
 * Cells:
 *   1. register       — bulk registration, list order, name-addressability
 *   2. hooks          — onRunStart / onRunEnd invocation order and state mutations
 *   3. replace        — re-registering same name replaces the implementation
 *   4. phase-skip     — task with manifest.phase skips main pipeline loop
 *   5. error-paths    — empty name, resolve missing, hook with empty name
 */

import type {
  LifecyclePhaseType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { Engine, TaskRegistry } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TaskFixtures {
  static makeTask(
    name: string,
    options?: { readonly 'calls'?: string[]; readonly 'phase'?: LifecyclePhaseType }
  ): TaskInterface {
    const manifest: TaskManifestInterfaceType = {
      'description': undefined,
      'name':        name,
      'phase':       options?.phase,
      'reads':       undefined,
      'requires':    undefined,
      'writes':      undefined
    };
    return {
      'manifest': manifest,
      'name': name,
      'run': TaskFixtures.makeCallRecorderRun(name, options?.calls)
    };
  }

  static makeCallRecorderRun(
    name: string,
    calls?: string[]
  ): (state: PaletteStateInterface, context: PipelineContextInterface) => void {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => {
      calls?.push(name);
    };
  }

  static makeLogPushRun(log: string[], label: string): () => void {
    return (): void => {
      log.push(label);
    };
  }

  static makeNoOpRun(): (state: PaletteStateInterface, context: PipelineContextInterface) => void {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => {};
  }

  static makeMetadataSnapshotRun(
    log: string[],
    label: string,
    metadataKey: string
  ): (state: PaletteStateInterface) => void {
    return (state: PaletteStateInterface): void => {
      log.push(label);
      state.metadata[metadataKey] = state.colors.length;
    };
  }

  static makeColorPushRun(log: string[], label: string): (state: PaletteStateInterface) => void {
    return (state: PaletteStateInterface): void => {
      log.push(label);
      state.colors.push({
        'alpha':        1,
        'displayP3':    undefined,
        'hex':          '#80cc33',
        'hints':        undefined,
        'oklch':        { 'c': 0.1, 'h': 120, 'l': 0.5 },
        'rgb':          { 'b': 0.2, 'g': 0.8, 'r': 0.5 },
        'sourceFormat': 'hex'
      });
    };
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — register: bulk registration preserves order; list is name-addressable
//
// register() must store tasks in insertion order. list() must return manifests
// in that order. Each registered name must be resolvable via resolve().
// ---------------------------------------------------------------------------

const registerScenarios: readonly ScenarioInterface<
  { readonly 'count': number },
  { readonly 'firstResolvable': boolean; readonly 'manifestCount': number; readonly 'namesInOrder': boolean }
>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,                undefined, '[cell=1, scenario=50-tasks] no throw');
      assert.strictEqual(output!.manifestCount, 50,       '[cell=1, scenario=50-tasks] 50 manifests');
      assert.strictEqual(output!.namesInOrder,  true,     '[cell=1, scenario=50-tasks] manifests in insertion order');
      assert.strictEqual(output!.firstResolvable, true,   '[cell=1, scenario=50-tasks] first task resolvable');
    },
    'input': { 'count': 50 },
    'kind': 'happy',
    'name': 'register 50 tasks; list returns all 50 in insertion order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,               undefined, '[cell=1, scenario=1-task] no throw');
      assert.strictEqual(output!.manifestCount, 1,        '[cell=1, scenario=1-task] 1 manifest');
    },
    'input': { 'count': 1 },
    'kind': 'edge',
    'name': 'register 1 task; list returns exactly 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,               undefined, '[cell=1, scenario=0-tasks] no throw');
      assert.strictEqual(output!.manifestCount, 0,        '[cell=1, scenario=0-tasks] empty list');
    },
    'input': { 'count': 0 },
    'kind': 'edge',
    'name': 'empty registry list returns 0'
  }
];

new ScenarioRunner<
  { readonly 'count': number },
  { readonly 'firstResolvable': boolean; readonly 'manifestCount': number; readonly 'namesInOrder': boolean }
>(
  'TaskRegistry :: cell-1 :: register',
  (input) => {
    const registry = new TaskRegistry();
    const names: string[] = [];
    for (let i = 0; i < input.count; i++) {
      const name = `task:${i.toString().padStart(3, '0')}`;
      names.push(name);
      registry.register(TaskFixtures.makeTask(name));
    }
    const manifests    = registry.list();
    const listedNames  = manifests.map((m) => { const result = m.name; return result; });
    const namesMatch   = JSON.stringify(listedNames) === JSON.stringify(names);
    const firstResolvable = names.length > 0
      ? (() => { try { registry.resolve(names[0]!); return true; } catch { return false; } })()
      : true;
    return { 'firstResolvable': firstResolvable, 'manifestCount': manifests.length, 'namesInOrder': namesMatch };
  }
).run(registerScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — hooks: onRunStart / onRunEnd order and cross-hook state visibility
//
// onRunStart fires before main pipeline; onRunEnd fires after. Mutations made
// by the main task must be visible to the onRunEnd hook.
// ---------------------------------------------------------------------------

type HooksOutput = {
  readonly 'endSaw':         number;
  readonly 'executionOrder': readonly string[];
  readonly 'startSaw':       number;
};

const hooksScenarios: readonly ScenarioInterface<{ readonly 'colorsPreloaded': number }, HooksOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=hook-order] no throw');
      assert.deepStrictEqual(
        output!.executionOrder, ['start', 'main', 'end'],
        '[cell=2, scenario=hook-order] execution order start → main → end'
      );
      assert.strictEqual(output!.startSaw, 0, '[cell=2, scenario=hook-order] start hook sees 0 colors before main');
      assert.strictEqual(output!.endSaw,   1, '[cell=2, scenario=hook-order] end hook sees 1 color after main adds one');
    },
    'input': { 'colorsPreloaded': 0 },
    'kind': 'happy',
    'name': 'start → main → end order; end hook sees mutation from main'
  }
];

new ScenarioRunner<{ readonly 'colorsPreloaded': number }, HooksOutput>(
  'TaskRegistry :: cell-2 :: hooks',
  (_input) => {
    const engine = new Engine();
    const log: string[] = [];

    engine.tasks.hook('onRunStart', {
      'manifest': { 'description': undefined, 'name': 'hook:start', 'phase': 'onRunStart', 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'hook:start',
      'run': TaskFixtures.makeMetadataSnapshotRun(log, 'start', 'startSaw')
    });

    engine.tasks.register({
      'manifest': { 'description': undefined, 'name': 'task:main', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:main',
      'run': TaskFixtures.makeColorPushRun(log, 'main')
    });

    engine.tasks.hook('onRunEnd', {
      'manifest': { 'description': undefined, 'name': 'hook:end', 'phase': 'onRunEnd', 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'hook:end',
      'run': TaskFixtures.makeMetadataSnapshotRun(log, 'end', 'endSaw')
    });

    engine.pipeline(['task:main']);
    const state = engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return {
      'endSaw':         state.metadata.endSaw   as number,
      'executionOrder': log,
      'startSaw':       state.metadata.startSaw as number
    };
  }
).run(hooksScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — replace: re-registering same name replaces the implementation
//
// resolve() must return the most recently registered instance. A run() after
// re-registration must execute the new implementation only (no duplicate call).
// ---------------------------------------------------------------------------

type ReplaceOutput = {
  readonly 'log':           readonly string[];
  readonly 'resolvedIsV2':  boolean;
};

const replaceScenarios: readonly ScenarioInterface<{ readonly 'dummy'?: undefined }, ReplaceOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                             '[cell=3, scenario=replace] no throw');
      assert.deepStrictEqual(output!.log, ['v2'],                     '[cell=3, scenario=replace] only v2 executed');
      assert.strictEqual(output!.resolvedIsV2, true,                  '[cell=3, scenario=replace] resolve returns v2');
    },
    'input': {},
    'kind': 'happy',
    'name': 're-register same name; run executes v2 only; resolve returns v2'
  }
];

new ScenarioRunner<{ readonly 'dummy'?: undefined }, ReplaceOutput>(
  'TaskRegistry :: cell-3 :: replace',
  (_input) => {
    const engine = new Engine();
    const log: string[] = [];

    const v2: TaskInterface = {
      'manifest': { 'description': undefined, 'name': 'task:replaceable', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:replaceable',
      'run': TaskFixtures.makeLogPushRun(log, 'v2')
    };

    engine.tasks.register({
      'manifest': { 'description': undefined, 'name': 'task:replaceable', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:replaceable',
      'run': TaskFixtures.makeLogPushRun(log, 'v1')
    });
    engine.tasks.register(v2);
    engine.pipeline(['task:replaceable']);
    engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });

    return { 'log': log, 'resolvedIsV2': engine.tasks.resolve('task:replaceable') === v2 };
  }
).run(replaceScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — phase-skip: task with manifest.phase skips main pipeline loop
//
// A task registered with manifest.phase = 'onRunStart' must not be invoked
// when that task name appears in pipeline(). Phase-marked tasks fire only
// through their hook channel.
// ---------------------------------------------------------------------------

type PhaseSkipOutput = { readonly 'ran': readonly string[] };

const phaseSkipScenarios: readonly ScenarioInterface<{ readonly 'dummy'?: undefined }, PhaseSkipOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=4, scenario=phase-skip] no throw');
      assert.strictEqual(output!.ran.length, 0,       '[cell=4, scenario=phase-skip] phase-marked task not run in main loop');
    },
    'input': {},
    'kind': 'edge',
    'name': 'lifecycle task in pipeline skips main-loop execution (fires 0 times)'
  }
];

new ScenarioRunner<{ readonly 'dummy'?: undefined }, PhaseSkipOutput>(
  'TaskRegistry :: cell-4 :: phase-skip',
  (_input) => {
    const engine = new Engine();
    const ran: string[] = [];
    engine.tasks.register({
      'manifest': { 'description': undefined, 'name': 'task:lifecycle', 'phase': 'onRunStart', 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:lifecycle',
      'run': TaskFixtures.makeLogPushRun(ran, 'lifecycle')
    });
    engine.pipeline(['task:lifecycle']);
    engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return { 'ran': ran };
  }
).run(phaseSkipScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — error paths: empty name, resolve missing, hook with empty name
//
// register() with empty name must throw with a message containing "name".
// hook() with empty name must throw with a message containing "name".
// resolve() for an unregistered name must throw with the name in the message.
// ---------------------------------------------------------------------------

const errorPathScenarios: readonly ScenarioInterface<
  { readonly 'scenario': 'register-empty' | 'hook-empty' | 'resolve-missing' },
  { readonly 'dummy': undefined }
>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                                       '[cell=5, scenario=register-empty] expected throw');
      assert.ok(
        (error).message.toLowerCase().includes('name'),
        `[cell=5, scenario=register-empty] message mentions "name"; got: ${(error).message}`
      );
    },
    'input': { 'scenario': 'register-empty' },
    'kind': 'unhappy',
    'name': 'register with empty name throws with "name" in message'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                                       '[cell=5, scenario=hook-empty] expected throw');
      assert.ok(
        (error).message.toLowerCase().includes('name'),
        `[cell=5, scenario=hook-empty] message mentions "name"; got: ${(error).message}`
      );
    },
    'input': { 'scenario': 'hook-empty' },
    'kind': 'unhappy',
    'name': 'hook with empty name throws with "name" in message'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                                          '[cell=5, scenario=resolve-missing] expected throw');
      assert.ok(
        (error).message.includes('does:not:exist'),
        `[cell=5, scenario=resolve-missing] task name in error; got: ${(error).message}`
      );
    },
    'input': { 'scenario': 'resolve-missing' },
    'kind': 'unhappy',
    'name': 'resolve missing name throws with name in message'
  }
];

new ScenarioRunner<
  { readonly 'scenario': 'register-empty' | 'hook-empty' | 'resolve-missing' },
  { readonly 'dummy': undefined }
>(
  'TaskRegistry :: cell-5 :: error-paths',
  (_input) => {
    const registry = new TaskRegistry();
    if (_input.scenario === 'register-empty') {
      registry.register({
        'manifest': undefined,
        'name': '', 'run': TaskFixtures.makeNoOpRun()
      });
    } else if (_input.scenario === 'hook-empty') {
      registry.hook('onRunStart', {
        'manifest': undefined,
        'name': '', 'run': TaskFixtures.makeNoOpRun()
      });
    } else {
      registry.resolve('does:not:exist');
    }
    return { 'dummy': undefined };
  }
).run(errorPathScenarios);
