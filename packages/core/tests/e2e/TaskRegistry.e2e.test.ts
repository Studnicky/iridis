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
  TaskManifestInterfaceType,
} from '@studnicky/iridis';
import { Engine, TaskRegistry } from '@studnicky/iridis';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTask(
  name:   string,
  calls?: string[],
  phase?: LifecyclePhaseType,
): TaskInterface {
  const manifest: TaskManifestInterfaceType = {
    'description': undefined,
    'name':        name,
    'phase':       phase,
    'reads':       undefined,
    'requires':    undefined,
    'writes':      undefined
  };
  return {
    'name': name,
    'manifest': manifest,
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      calls?.push(name);
    },
  };
}

// ---------------------------------------------------------------------------
// Cell 1 — register: bulk registration preserves order; list is name-addressable
//
// register() must store tasks in insertion order. list() must return manifests
// in that order. Each registered name must be resolvable via resolve().
// ---------------------------------------------------------------------------

interface RegisterInput  { readonly count: number }
interface RegisterOutput {
  readonly manifestCount: number;
  readonly namesInOrder:  boolean;
  readonly firstResolvable: boolean;
}

const registerScenarios: readonly ScenarioInterface<RegisterInput, RegisterOutput>[] = [
  {
    name: 'register 50 tasks; list returns all 50 in insertion order',
    kind: 'happy',
    input: { count: 50 },
    assert(output, error) {
      assert.strictEqual(error,                undefined, '[cell=1, scenario=50-tasks] no throw');
      assert.strictEqual(output!.manifestCount, 50,       '[cell=1, scenario=50-tasks] 50 manifests');
      assert.strictEqual(output!.namesInOrder,  true,     '[cell=1, scenario=50-tasks] manifests in insertion order');
      assert.strictEqual(output!.firstResolvable, true,   '[cell=1, scenario=50-tasks] first task resolvable');
    },
  },
  {
    name: 'register 1 task; list returns exactly 1',
    kind: 'edge',
    input: { count: 1 },
    assert(output, error) {
      assert.strictEqual(error,               undefined, '[cell=1, scenario=1-task] no throw');
      assert.strictEqual(output!.manifestCount, 1,        '[cell=1, scenario=1-task] 1 manifest');
    },
  },
  {
    name: 'empty registry list returns 0',
    kind: 'edge',
    input: { count: 0 },
    assert(output, error) {
      assert.strictEqual(error,               undefined, '[cell=1, scenario=0-tasks] no throw');
      assert.strictEqual(output!.manifestCount, 0,        '[cell=1, scenario=0-tasks] empty list');
    },
  },
];

new ScenarioRunner<RegisterInput, RegisterOutput>(
  'TaskRegistry :: cell-1 :: register',
  (input) => {
    const registry = new TaskRegistry();
    const names: string[] = [];
    for (let i = 0; i < input.count; i++) {
      const name = `task:${i.toString().padStart(3, '0')}`;
      names.push(name);
      registry.register(makeTask(name));
    }
    const manifests    = registry.list();
    const listedNames  = manifests.map((m) => m.name);
    const namesMatch   = JSON.stringify(listedNames) === JSON.stringify(names);
    const firstResolvable = names.length > 0
      ? (() => { try { registry.resolve(names[0]!); return true; } catch { return false; } })()
      : true;
    return { manifestCount: manifests.length, namesInOrder: namesMatch, firstResolvable };
  },
).run(registerScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — hooks: onRunStart / onRunEnd order and cross-hook state visibility
//
// onRunStart fires before main pipeline; onRunEnd fires after. Mutations made
// by the main task must be visible to the onRunEnd hook.
// ---------------------------------------------------------------------------

interface HooksInput  { readonly colorsPreloaded: number }
interface HooksOutput {
  readonly executionOrder: readonly string[];
  readonly startSaw:       number;
  readonly endSaw:         number;
}

const hooksScenarios: readonly ScenarioInterface<HooksInput, HooksOutput>[] = [
  {
    name: 'start → main → end order; end hook sees mutation from main',
    kind: 'happy',
    input: { colorsPreloaded: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=hook-order] no throw');
      assert.deepStrictEqual(
        output!.executionOrder, ['start', 'main', 'end'],
        '[cell=2, scenario=hook-order] execution order start → main → end',
      );
      assert.strictEqual(output!.startSaw, 0, '[cell=2, scenario=hook-order] start hook sees 0 colors before main');
      assert.strictEqual(output!.endSaw,   1, '[cell=2, scenario=hook-order] end hook sees 1 color after main adds one');
    },
  },
];

new ScenarioRunner<HooksInput, HooksOutput>(
  'TaskRegistry :: cell-2 :: hooks',
  async (_input) => {
    const engine = new Engine();
    const log: string[] = [];

    engine.tasks.hook('onRunStart', {
      'name': 'hook:start',
      'manifest': { 'name': 'hook:start', 'phase': 'onRunStart', 'description': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(state: PaletteStateInterface): void {
        log.push('start');
        (state.metadata as Record<string, unknown>)['startSaw'] = state.colors.length;
      },
    });

    engine.tasks.register({
      'name': 'task:main',
      'manifest': { 'name': 'task:main', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(state: PaletteStateInterface): void {
        log.push('main');
        state.colors.push({
          'oklch':        { 'l': 0.5, 'c': 0.1, 'h': 120 },
          'rgb':          { 'r': 0.5, 'g': 0.8, 'b': 0.2 },
          'hex':          '#80cc33',
          'alpha':        1,
          'sourceFormat': 'hex',
          'displayP3':    undefined,
          'hints':        undefined,
        });
      },
    });

    engine.tasks.hook('onRunEnd', {
      'name': 'hook:end',
      'manifest': { 'name': 'hook:end', 'phase': 'onRunEnd', 'description': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(state: PaletteStateInterface): void {
        log.push('end');
        (state.metadata as Record<string, unknown>)['endSaw'] = state.colors.length;
      },
    });

    engine.pipeline(['task:main']);
    const state = await engine.run({ 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return {
      executionOrder: log,
      startSaw:       state.metadata['startSaw'] as number,
      endSaw:         state.metadata['endSaw']   as number,
    };
  },
).run(hooksScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — replace: re-registering same name replaces the implementation
//
// resolve() must return the most recently registered instance. A run() after
// re-registration must execute the new implementation only (no duplicate call).
// ---------------------------------------------------------------------------

interface ReplaceInput  { readonly dummy?: undefined }
interface ReplaceOutput {
  readonly log:           readonly string[];
  readonly resolvedIsV2:  boolean;
}

const replaceScenarios: readonly ScenarioInterface<ReplaceInput, ReplaceOutput>[] = [
  {
    name: 're-register same name; run executes v2 only; resolve returns v2',
    kind: 'happy',
    input: {},
    assert(output, error) {
      assert.strictEqual(error, undefined,                             '[cell=3, scenario=replace] no throw');
      assert.deepStrictEqual(output!.log, ['v2'],                     '[cell=3, scenario=replace] only v2 executed');
      assert.strictEqual(output!.resolvedIsV2, true,                  '[cell=3, scenario=replace] resolve returns v2');
    },
  },
];

new ScenarioRunner<ReplaceInput, ReplaceOutput>(
  'TaskRegistry :: cell-3 :: replace',
  async (_input) => {
    const engine = new Engine();
    const log: string[] = [];

    const v2: TaskInterface = {
      'name': 'task:replaceable',
      'manifest': { 'name': 'task:replaceable', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(): void { log.push('v2'); },
    };

    engine.tasks.register({
      'name': 'task:replaceable',
      'manifest': { 'name': 'task:replaceable', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(): void { log.push('v1'); },
    });
    engine.tasks.register(v2);
    engine.pipeline(['task:replaceable']);
    await engine.run({ 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });

    return { log, resolvedIsV2: engine.tasks.resolve('task:replaceable') === v2 };
  },
).run(replaceScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — phase-skip: task with manifest.phase skips main pipeline loop
//
// A task registered with manifest.phase = 'onRunStart' must not be invoked
// when that task name appears in pipeline(). Phase-marked tasks fire only
// through their hook channel.
// ---------------------------------------------------------------------------

interface PhaseSkipInput  { readonly dummy?: undefined }
interface PhaseSkipOutput { readonly ran: readonly string[] }

const phaseSkipScenarios: readonly ScenarioInterface<PhaseSkipInput, PhaseSkipOutput>[] = [
  {
    name: 'lifecycle task in pipeline skips main-loop execution (fires 0 times)',
    kind: 'edge',
    input: {},
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=4, scenario=phase-skip] no throw');
      assert.strictEqual(output!.ran.length, 0,       '[cell=4, scenario=phase-skip] phase-marked task not run in main loop');
    },
  },
];

new ScenarioRunner<PhaseSkipInput, PhaseSkipOutput>(
  'TaskRegistry :: cell-4 :: phase-skip',
  async (_input) => {
    const engine = new Engine();
    const ran: string[] = [];
    engine.tasks.register({
      'name': 'task:lifecycle',
      'manifest': { 'name': 'task:lifecycle', 'phase': 'onRunStart', 'description': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(): void { ran.push('lifecycle'); },
    });
    engine.pipeline(['task:lifecycle']);
    await engine.run({ 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return { ran };
  },
).run(phaseSkipScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — error paths: empty name, resolve missing, hook with empty name
//
// register() with empty name must throw with a message containing "name".
// hook() with empty name must throw with a message containing "name".
// resolve() for an unregistered name must throw with the name in the message.
// ---------------------------------------------------------------------------

interface ErrorPathInput {
  readonly scenario: 'register-empty' | 'hook-empty' | 'resolve-missing';
}
interface ErrorPathOutput { readonly dummy: undefined }

const errorPathScenarios: readonly ScenarioInterface<ErrorPathInput, ErrorPathOutput>[] = [
  {
    name: 'register with empty name throws with "name" in message',
    kind: 'unhappy',
    input: { scenario: 'register-empty' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                                       '[cell=5, scenario=register-empty] expected throw');
      assert.ok(
        (error as Error).message.toLowerCase().includes('name'),
        `[cell=5, scenario=register-empty] message mentions "name"; got: ${(error as Error).message}`,
      );
    },
  },
  {
    name: 'hook with empty name throws with "name" in message',
    kind: 'unhappy',
    input: { scenario: 'hook-empty' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                                       '[cell=5, scenario=hook-empty] expected throw');
      assert.ok(
        (error as Error).message.toLowerCase().includes('name'),
        `[cell=5, scenario=hook-empty] message mentions "name"; got: ${(error as Error).message}`,
      );
    },
  },
  {
    name: 'resolve missing name throws with name in message',
    kind: 'unhappy',
    input: { scenario: 'resolve-missing' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                                          '[cell=5, scenario=resolve-missing] expected throw');
      assert.ok(
        (error as Error).message.includes('does:not:exist'),
        `[cell=5, scenario=resolve-missing] task name in error; got: ${(error as Error).message}`,
      );
    },
  },
];

new ScenarioRunner<ErrorPathInput, ErrorPathOutput>(
  'TaskRegistry :: cell-5 :: error-paths',
  (_input) => {
    const registry = new TaskRegistry();
    if (_input.scenario === 'register-empty') {
      registry.register({
        'name': '',
        run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {}, 'manifest': undefined,
      });
    } else if (_input.scenario === 'hook-empty') {
      registry.hook('onRunStart', {
        'name': '',
        run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {}, 'manifest': undefined,
      });
    } else {
      registry.resolve('does:not:exist');
    }
    return { dummy: undefined };
  },
).run(errorPathScenarios);
