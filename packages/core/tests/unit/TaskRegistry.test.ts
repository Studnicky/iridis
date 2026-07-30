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
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { TaskRegistry } from '@studnicky/iridis/registry';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestTaskFixture {
  static noopRun(_state: PaletteStateInterface, _context: PipelineContextInterface): void { /* no-op */ }

  static make(name: string, phase?: 'onRunStart' | 'onRunEnd'): TaskInterface {
    const manifest: TaskManifestInterfaceType = { 'description': undefined, 'name': name, 'phase': phase, 'reads': undefined, 'requires': undefined, 'writes': undefined };
    return {
      'manifest': manifest,
      'name':     name,
      'run': TestTaskFixture.noopRun
    };
  }
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

interface Cell1InputInterface {
  readonly 'name'?:  string;
  readonly 'query':  'has' | 'resolve' | 'list';
  readonly 'setup':  readonly TaskInterface[];
}
interface Cell1OutputInterface {
  readonly 'boolResult'?: boolean;
  readonly 'listResult'?: readonly TaskManifestInterfaceType[];
  readonly 'taskResult'?: TaskInterface;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1InputInterface, Cell1OutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=has-true] must not throw');
      assert.strictEqual(output!.boolResult, true, '[cell=1, scenario=has-true] has → true');
    },
    'input': { 'name': 'task:a', 'query': 'has', 'setup': [TestTaskFixture.make('task:a')] },
    'kind': 'happy',
    'name': 'has returns true after register'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=resolve-ok] must not throw');
      assert.ok(output!.taskResult !== undefined, '[cell=1, scenario=resolve-ok] task returned');
      assert.strictEqual(output!.taskResult.name, 'task:a', '[cell=1, scenario=resolve-ok] correct task');
    },
    'input': { 'name': 'task:a', 'query': 'resolve', 'setup': [TestTaskFixture.make('task:a')] },
    'kind': 'happy',
    'name': 'resolve returns the registered task'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=list-multi] must not throw');
      assert.strictEqual(output!.listResult!.length, 2, '[cell=1, scenario=list-multi] two manifests');
      const names = output!.listResult!.map((m) => { const result = m.name; return result; }).sort();
      assert.deepStrictEqual(names, ['task:a', 'task:b'], '[cell=1, scenario=list-multi] both names present');
    },
    'input': { 'query': 'list', 'setup': [TestTaskFixture.make('task:a'), TestTaskFixture.make('task:b')] },
    'kind': 'happy',
    'name': 'list returns manifest for every registered task'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=override] must not throw');
      assert.strictEqual(output!.listResult!.length, 1, '[cell=1, scenario=override] override keeps one entry');
      assert.strictEqual(output!.listResult!.at(0)!.name, 'task:x', '[cell=1, scenario=override] correct name');
    },
    'input': { 'query': 'list', 'setup': [TestTaskFixture.make('task:x'), TestTaskFixture.make('task:x')] },
    'kind': 'happy',
    'name': 'second register for same name overrides previous task'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=has-false] must not throw');
      assert.strictEqual(output!.boolResult, false, '[cell=1, scenario=has-false] has → false');
    },
    'input': { 'name': 'not:registered', 'query': 'has', 'setup': [] },
    'kind': 'edge',
    'name': 'has returns false for unregistered name'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=list-empty] must not throw');
      assert.strictEqual(output!.listResult!.length, 0, '[cell=1, scenario=list-empty] empty list');
    },
    'input': { 'query': 'list', 'setup': [] },
    'kind': 'edge',
    'name': 'list returns empty array when no tasks registered'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=resolve-unknown] expected throw');
      assert.match((error).message, /no task registered/, '[cell=1, scenario=resolve-unknown] message shape');
      assert.match((error).message, /ghost:task/, '[cell=1, scenario=resolve-unknown] names the task');
    },
    'input': { 'name': 'ghost:task', 'query': 'resolve', 'setup': [] },
    'kind': 'unhappy',
    'name': 'resolve throws on unknown name'
  }
];

new ScenarioRunner<Cell1InputInterface, Cell1OutputInterface>(
  'TaskRegistry :: cell-1 :: register-resolve',
  (input) => {
    const registry = new TaskRegistry();
    for (const t of input.setup) {registry.register(t);}
    switch (input.query) {
      case 'has':     return { 'boolResult': registry.has(input.name!) };
      case 'list':    return { 'listResult': registry.list() };
      case 'resolve': return { 'taskResult': registry.resolve(input.name!) };
      default:        throw new Error(`unknown query: ${input.query}`);
    }
  }
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

interface Cell2InputInterface {
  readonly 'hookPhase': 'onRunStart' | 'onRunEnd';
  readonly 'queryPhase': 'onRunStart' | 'onRunEnd';
  readonly 'tasks':     readonly TaskInterface[];
}

const cell2Scenarios: readonly ScenarioInterface<Cell2InputInterface, { readonly 'hookNames': readonly string[]; readonly 'resolvableAll': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=start-queue] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:start'], '[cell=2, scenario=start-queue] in start queue');
      assert.strictEqual(output!.resolvableAll, true, '[cell=2, scenario=start-queue] name-addressable');
    },
    'input': { 'hookPhase': 'onRunStart', 'queryPhase': 'onRunStart', 'tasks': [TestTaskFixture.make('hook:start', 'onRunStart')] },
    'kind': 'happy',
    'name': 'onRunStart task in start queue and resolvable by name'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=end-queue] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:end'], '[cell=2, scenario=end-queue] in end queue');
      assert.strictEqual(output!.resolvableAll, true, '[cell=2, scenario=end-queue] name-addressable');
    },
    'input': { 'hookPhase': 'onRunEnd', 'queryPhase': 'onRunEnd', 'tasks': [TestTaskFixture.make('hook:end', 'onRunEnd')] },
    'kind': 'happy',
    'name': 'onRunEnd task in end queue and resolvable by name'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=multi-hooks] must not throw');
      assert.deepStrictEqual(output!.hookNames, ['hook:a', 'hook:b'], '[cell=2, scenario=multi-hooks] insertion order preserved');
    },
    'input': {
      'hookPhase':  'onRunStart',
      'queryPhase': 'onRunStart',
      'tasks':      [TestTaskFixture.make('hook:a', 'onRunStart'), TestTaskFixture.make('hook:b', 'onRunStart')]
    },
    'kind': 'happy',
    'name': 'multiple hooks in same phase returned in insertion order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-start] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=empty-start] start queue empty');
    },
    'input': { 'hookPhase': 'onRunEnd', 'queryPhase': 'onRunStart', 'tasks': [TestTaskFixture.make('hook:end', 'onRunEnd')] },
    'kind': 'edge',
    'name': 'hooks returns empty array for unused onRunStart phase'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-end] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=empty-end] end queue empty');
    },
    'input': { 'hookPhase': 'onRunStart', 'queryPhase': 'onRunEnd', 'tasks': [TestTaskFixture.make('hook:start', 'onRunStart')] },
    'kind': 'edge',
    'name': 'hooks returns empty array for unused onRunEnd phase'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=fresh-empty] must not throw');
      assert.strictEqual(output!.hookNames.length, 0, '[cell=2, scenario=fresh-empty] start empty on fresh registry');
    },
    'input': { 'hookPhase': 'onRunStart', 'queryPhase': 'onRunStart', 'tasks': [] },
    'kind': 'edge',
    'name': 'fresh registry: both hook queues are empty'
  }
];

new ScenarioRunner<Cell2InputInterface, { readonly 'hookNames': readonly string[]; readonly 'resolvableAll': boolean }>(
  'TaskRegistry :: cell-2 :: hook',
  (input) => {
    const registry = new TaskRegistry();
    for (const t of input.tasks) {registry.hook(input.hookPhase, t);}
    const hookNames = registry.hooks(input.queryPhase).map((t) => { const result = t.name; return result; });
    const resolvableAll = input.tasks.every((t) => {
      try { registry.resolve(t.name); return true; } catch { return false; }
    });
    return { 'hookNames': hookNames, 'resolvableAll': resolvableAll };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — validation errors
//
// Both register() and hook() must throw when the task has no name.
// The error message must name the violated constraint.
// ---------------------------------------------------------------------------

const cell3Scenarios: readonly ScenarioInterface<{ readonly 'op': 'register' | 'hook'; readonly 'phase'?: 'onRunStart' | 'onRunEnd' }, { readonly 'placeholder': true }>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=register-nameless] expected throw');
      assert.match((error).message, /task\.name is required/, '[cell=3, scenario=register-nameless] message shape');
    },
    'input': { 'op': 'register' },
    'kind': 'unhappy',
    'name': 'register empty-name task throws with descriptive message'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hook-nameless-start] expected throw');
      assert.match((error).message, /task\.name is required/, '[cell=3, scenario=hook-nameless-start] message shape');
    },
    'input': { 'op': 'hook', 'phase': 'onRunStart' },
    'kind': 'unhappy',
    'name': 'hook onRunStart empty-name task throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hook-nameless-end] expected throw');
      assert.match((error).message, /task\.name is required/, '[cell=3, scenario=hook-nameless-end] message shape');
    },
    'input': { 'op': 'hook', 'phase': 'onRunEnd' },
    'kind': 'unhappy',
    'name': 'hook onRunEnd empty-name task throws'
  }
];

new ScenarioRunner<{ readonly 'op': 'register' | 'hook'; readonly 'phase'?: 'onRunStart' | 'onRunEnd' }, { readonly 'placeholder': true }>(
  'TaskRegistry :: cell-3 :: unhappy',
  (input) => {
    const registry = new TaskRegistry();
    const nameless = TestTaskFixture.make('');
    if (input.op === 'register') {
      registry.register(nameless);
    } else {
      registry.hook(input.phase!, nameless);
    }
    return { 'placeholder': true };
  }
).run(cell3Scenarios);
