/**
 * TaskRegistry — scenario-matrix suite.
 *
 * Subject: `TaskRegistry` (in-memory task store for the Engine).
 * Drives each public method: `register`, `resolve`, `has`, `list`,
 * `hook`, `hooks`.
 *
 * Cells:
 *   1. register-resolve  — register, has, resolve, list
 *   2. hook              — hook phases, phase queues, name-addressability
 *   3. unhappy           — validation errors from register and hook
 */

import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { TaskRegistry } from '@studnicky/iridis/registry';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTask(name: string, phase?: 'onRunStart' | 'onRunEnd'): TaskInterface {
  const manifest: TaskManifestInterface = { 'name': name, ...(phase ? { 'phase': phase } : {}) };
  return {
    'name':     name,
    'manifest': manifest,
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { /* no-op */ },
  };
}

// ---------------------------------------------------------------------------
// Cell 1 — register, has, resolve, list
//
// register() adds a task to the name table:
//   - has() returns true for registered names, false for unknown names
//   - resolve() returns the task by name; throws on unknown names
//   - list() returns manifests for all registered tasks; empty before any register
//   - registering the same name twice is a deliberate override (last wins)
//   - empty registry: list is [], has is false, resolve throws
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly setup:  readonly TaskInterface[];
  readonly query:  'has' | 'resolve' | 'list';
  readonly name?:  string;
}
interface Cell1Output {
  readonly boolResult?: boolean;
  readonly taskResult?: TaskInterface;
  readonly listResult?: readonly TaskManifestInterface[];
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'has returns true after register',
    kind: 'happy',
    input: { setup: [makeTask('task:a')], query: 'has', name: 'task:a' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=has-true] must not throw');
      assert.strictEqual(output!.boolResult, true, '[cell=1, scenario=has-true] has → true');
    },
  },
  {
    name: 'resolve returns the registered task',
    kind: 'happy',
    input: { setup: [makeTask('task:a')], query: 'resolve', name: 'task:a' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=resolve-ok] must not throw');
      assert.ok(output!.taskResult !== undefined, '[cell=1, scenario=resolve-ok] task returned');
      assert.strictEqual(output!.taskResult!.name, 'task:a', '[cell=1, scenario=resolve-ok] correct task');
    },
  },
  {
    name: 'list returns manifest for every registered task',
    kind: 'happy',
    input: { setup: [makeTask('task:a'), makeTask('task:b')], query: 'list' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=list-multi] must not throw');
      assert.strictEqual(output!.listResult!.length, 2, '[cell=1, scenario=list-multi] two manifests');
      const names = output!.listResult!.map((m) => m.name).sort();
      assert.deepStrictEqual(names, ['task:a', 'task:b'], '[cell=1, scenario=list-multi] both names present');
    },
  },
  {
    name: 'second register for same name overrides previous task',
    kind: 'happy',
    input: { setup: [makeTask('task:x'), makeTask('task:x')], query: 'list' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=override] must not throw');
      assert.strictEqual(output!.listResult!.length, 1, '[cell=1, scenario=override] override keeps one entry');
      assert.strictEqual(output!.listResult![0]!.name, 'task:x', '[cell=1, scenario=override] correct name');
    },
  },
  {
    name: 'has returns false for unregistered name',
    kind: 'edge',
    input: { setup: [], query: 'has', name: 'not:registered' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=has-false] must not throw');
      assert.strictEqual(output!.boolResult, false, '[cell=1, scenario=has-false] has → false');
    },
  },
  {
    name: 'list returns empty array when no tasks registered',
    kind: 'edge',
    input: { setup: [], query: 'list' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=list-empty] must not throw');
      assert.strictEqual(output!.listResult!.length, 0, '[cell=1, scenario=list-empty] empty list');
    },
  },
  {
    name: 'resolve throws on unknown name',
    kind: 'unhappy',
    input: { setup: [], query: 'resolve', name: 'ghost:task' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=resolve-unknown] expected throw');
      assert.match((error as Error).message, /no task registered/, '[cell=1, scenario=resolve-unknown] message shape');
      assert.match((error as Error).message, /ghost:task/, '[cell=1, scenario=resolve-unknown] names the task');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'TaskRegistry :: cell-1 :: register-resolve',
  (input) => {
    const registry = new TaskRegistry();
    for (const t of input.setup) registry.register(t);
    switch (input.query) {
      case 'has':     return { boolResult: registry.has(input.name!) };
      case 'resolve': return { taskResult: registry.resolve(input.name!) };
      case 'list':    return { listResult: registry.list() };
    }
  },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — hook phases
//
// hook(phase, task) adds the task to the named phase queue AND into the
// shared name table (so it is also resolve-able by name):
//   - onRunStart tasks appear in hooks('onRunStart') and are resolvable
//   - onRunEnd tasks appear in hooks('onRunEnd') and are resolvable
//   - hooks('onRunStart') returns [] when no hooks registered for that phase
//   - hooks('onRunEnd')   returns [] when no hooks registered for that phase
//   - multiple hooks added to the same phase appear in insertion order
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly hookPhase: 'onRunStart' | 'onRunEnd';
  readonly tasks:     readonly TaskInterface[];
  readonly queryPhase: 'onRunStart' | 'onRunEnd';
}
interface Cell2Output {
  readonly hookNames:     readonly string[];
  readonly resolvableAll: boolean;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'onRunStart task in start queue and resolvable by name',
    kind: 'happy',
    input: { hookPhase: 'onRunStart', tasks: [makeTask('hook:start', 'onRunStart')], queryPhase: 'onRunStart' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=start-queue] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:start'], '[cell=2, scenario=start-queue] in start queue');
      assert.strictEqual(output!.resolvableAll, true, '[cell=2, scenario=start-queue] name-addressable');
    },
  },
  {
    name: 'onRunEnd task in end queue and resolvable by name',
    kind: 'happy',
    input: { hookPhase: 'onRunEnd', tasks: [makeTask('hook:end', 'onRunEnd')], queryPhase: 'onRunEnd' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=end-queue] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:end'], '[cell=2, scenario=end-queue] in end queue');
      assert.strictEqual(output!.resolvableAll, true, '[cell=2, scenario=end-queue] name-addressable');
    },
  },
  {
    name: 'multiple hooks in same phase returned in insertion order',
    kind: 'happy',
    input: {
      hookPhase:  'onRunStart',
      tasks:      [makeTask('hook:a', 'onRunStart'), makeTask('hook:b', 'onRunStart')],
      queryPhase: 'onRunStart',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=multi-hooks] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:a', 'hook:b'], '[cell=2, scenario=multi-hooks] insertion order preserved');
    },
  },
  {
    name: 'hooks returns empty array for unused onRunStart phase',
    kind: 'edge',
    input: { hookPhase: 'onRunEnd', tasks: [makeTask('hook:end', 'onRunEnd')], queryPhase: 'onRunStart' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-start] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=empty-start] start queue empty');
    },
  },
  {
    name: 'hooks returns empty array for unused onRunEnd phase',
    kind: 'edge',
    input: { hookPhase: 'onRunStart', tasks: [makeTask('hook:start', 'onRunStart')], queryPhase: 'onRunEnd' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-end] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=empty-end] end queue empty');
    },
  },
  {
    name: 'fresh registry: both hook queues are empty',
    kind: 'edge',
    input: { hookPhase: 'onRunStart', tasks: [], queryPhase: 'onRunStart' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=fresh-empty] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=fresh-empty] start empty on fresh registry');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'TaskRegistry :: cell-2 :: hook',
  (input) => {
    const registry = new TaskRegistry();
    for (const t of input.tasks) registry.hook(input.hookPhase, t);
    const hookNames = registry.hooks(input.queryPhase).map((t) => t.name);
    const resolvableAll = input.tasks.every((t) => {
      try { registry.resolve(t.name); return true; } catch { return false; }
    });
    return { hookNames, resolvableAll };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — validation errors
//
// Both register() and hook() must throw when the task has no name.
// The error message must name the violated constraint.
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly op:    'register' | 'hook';
  readonly phase?: 'onRunStart' | 'onRunEnd';
}
interface Cell3Output {
  // unhappy cell — output is never populated
  readonly placeholder: true;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'register empty-name task throws with descriptive message',
    kind: 'unhappy',
    input: { op: 'register' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=register-nameless] expected throw');
      assert.match((error as Error).message, /task\.name is required/, '[cell=3, scenario=register-nameless] message shape');
    },
  },
  {
    name: 'hook onRunStart empty-name task throws',
    kind: 'unhappy',
    input: { op: 'hook', phase: 'onRunStart' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hook-nameless-start] expected throw');
      assert.match((error as Error).message, /task\.name is required/, '[cell=3, scenario=hook-nameless-start] message shape');
    },
  },
  {
    name: 'hook onRunEnd empty-name task throws',
    kind: 'unhappy',
    input: { op: 'hook', phase: 'onRunEnd' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hook-nameless-end] expected throw');
      assert.match((error as Error).message, /task\.name is required/, '[cell=3, scenario=hook-nameless-end] message shape');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'TaskRegistry :: cell-3 :: unhappy',
  (input) => {
    const registry = new TaskRegistry();
    const nameless = makeTask('');
    if (input.op === 'register') {
      registry.register(nameless);
    } else {
      registry.hook(input.phase!, nameless);
    }
    return { placeholder: true };
  },
).run(cell3Scenarios);
