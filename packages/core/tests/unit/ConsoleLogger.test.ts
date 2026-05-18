/**
 * ConsoleLogger — scenario-matrix suite.
 *
 * Subject: `ConsoleLogger` (structured log channel implementation).
 *
 * Cells:
 *   1. suppression  — suppressed channels do zero console work and touch no context
 *   2. routing      — enabled channels route to the correct console sink
 *   3. formatting   — context rendering: alphabetic sort, primitives, objects, Errors
 *   4. singleton    — consoleLogger singleton identity and default level
 */

import { ConsoleLogger, consoleLogger } from '@studnicky/iridis/engine';
import type { LogLevelType }            from '@studnicky/iridis/engine';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type ConsoleMethodType = 'debug' | 'info' | 'warn' | 'error';

interface ConsoleCaptureInterface {
  readonly calls: string[];
  restore(): void;
}

function captureConsole(method: ConsoleMethodType): ConsoleCaptureInterface {
  const original = console[method];
  const calls: string[] = [];
  console[method] = (...args: unknown[]): void => {
    calls.push(args.map((a) => String(a)).join(' '));
  };
  return {
    'calls':   calls,
    restore(): void { console[method] = original; },
  };
}

/**
 * Throws on ANY property access. Used as the `context` argument at
 * suppressed levels: if the logger touches the object, the test fails.
 */
function trapContext(): Record<string, unknown> {
  return new Proxy({}, {
    get(): never { throw new Error('context accessed at suppressed level'); },
    ownKeys(): never { throw new Error('context keys enumerated at suppressed level'); },
    has(): never { throw new Error('context probed at suppressed level'); },
    getOwnPropertyDescriptor(): never { throw new Error('context descriptor read at suppressed level'); },
  });
}

// ---------------------------------------------------------------------------
// Cell 1 — suppression
//
// When the configured level is above a given channel, the call must:
//   - return undefined
//   - fire no console.debug/info/warn/error calls
//   - not touch the context object (proven by trapContext proxy)
//
// Covers: warn suppresses trace/debug/info; silent suppresses all;
//         error suppresses warn; info suppresses debug; debug suppresses trace.
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly name:    string;
  readonly level:   LogLevelType;
  readonly channel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
}
interface Cell1Output {
  readonly result:       unknown;
  readonly debugCalls:   number;
  readonly infoCalls:    number;
  readonly warnCalls:    number;
  readonly errorCalls:   number;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'warn level suppresses trace',
    kind: 'happy',
    input: { name: 'warn-suppresses-trace', level: 'warn', channel: 'trace' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-trace] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-trace] returns undefined');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=warn-trace] no console.debug');
      assert.strictEqual(output!.infoCalls, 0,  '[cell=1, scenario=warn-trace] no console.info');
      assert.strictEqual(output!.warnCalls, 0,  '[cell=1, scenario=warn-trace] no console.warn');
      assert.strictEqual(output!.errorCalls, 0, '[cell=1, scenario=warn-trace] no console.error');
    },
  },
  {
    name: 'warn level suppresses debug',
    kind: 'happy',
    input: { name: 'warn-suppresses-debug', level: 'warn', channel: 'debug' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-debug] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-debug] returns undefined');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=warn-debug] no console.debug');
    },
  },
  {
    name: 'warn level suppresses info',
    kind: 'happy',
    input: { name: 'warn-suppresses-info', level: 'warn', channel: 'info' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-info] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-info] returns undefined');
      assert.strictEqual(output!.infoCalls, 0, '[cell=1, scenario=warn-info] no console.info');
    },
  },
  {
    name: 'error level suppresses warn',
    kind: 'happy',
    input: { name: 'error-suppresses-warn', level: 'error', channel: 'warn' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=error-warn] no throw');
      assert.strictEqual(output!.warnCalls, 0, '[cell=1, scenario=error-warn] no console.warn');
    },
  },
  {
    name: 'info level suppresses debug',
    kind: 'happy',
    input: { name: 'info-suppresses-debug', level: 'info', channel: 'debug' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=info-debug] no throw');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=info-debug] no console.debug');
    },
  },
  {
    name: 'debug level suppresses trace',
    kind: 'happy',
    input: { name: 'debug-suppresses-trace', level: 'debug', channel: 'trace' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=debug-trace] no throw');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=debug-trace] no console.debug');
    },
  },
  {
    name: 'silent level suppresses error',
    kind: 'edge',
    input: { name: 'silent-suppresses-error', level: 'silent', channel: 'error' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=silent-error] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=silent-error] returns undefined');
      assert.strictEqual(output!.errorCalls, 0, '[cell=1, scenario=silent-error] no console.error');
    },
  },
  {
    name: 'silent level suppresses warn',
    kind: 'edge',
    input: { name: 'silent-suppresses-warn', level: 'silent', channel: 'warn' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=silent-warn] no throw');
      assert.strictEqual(output!.warnCalls, 0, '[cell=1, scenario=silent-warn] no console.warn');
    },
  },
  {
    name: 'silent level suppresses all channels: zero work on every sink',
    kind: 'edge',
    input: { name: 'silent-suppresses-trace', level: 'silent', channel: 'trace' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=silent-all] no throw');
      assert.strictEqual(output!.debugCalls,  0, '[cell=1, scenario=silent-all] no debug');
      assert.strictEqual(output!.infoCalls,   0, '[cell=1, scenario=silent-all] no info');
      assert.strictEqual(output!.warnCalls,   0, '[cell=1, scenario=silent-all] no warn');
      assert.strictEqual(output!.errorCalls,  0, '[cell=1, scenario=silent-all] no error');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ConsoleLogger :: cell-1 :: suppression',
  (input) => {
    const logger      = new ConsoleLogger();
    logger.level      = input.level;
    const debugCap    = captureConsole('debug');
    const infoCap     = captureConsole('info');
    const warnCap     = captureConsole('warn');
    const errorCap    = captureConsole('error');
    const result: unknown = logger[input.channel]('Scope', 'op', 'literal message', trapContext());
    debugCap.restore();
    infoCap.restore();
    warnCap.restore();
    errorCap.restore();
    return {
      result,
      debugCalls:  debugCap.calls.length,
      infoCalls:   infoCap.calls.length,
      warnCalls:   warnCap.calls.length,
      errorCalls:  errorCap.calls.length,
    };
  },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — routing
//
// Each enabled channel must forward to the correct underlying console method:
//   trace  → console.debug
//   debug  → console.debug
//   info   → console.info
//   warn   → console.warn
//   error  → console.error
//
// Formatted output is `[scope.op] message`.
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly level:       LogLevelType;
  readonly channel:     'trace' | 'debug' | 'info' | 'warn' | 'error';
  readonly consoleSink: ConsoleMethodType;
}
interface Cell2Output {
  readonly callCount: number;
  readonly formatted: string;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'trace at trace level routes to console.debug',
    kind: 'happy',
    input: { level: 'trace', channel: 'trace', consoleSink: 'debug' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=trace-route] no throw');
      assert.strictEqual(output!.callCount, 1,                  '[cell=2, scenario=trace-route] one call');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=2, scenario=trace-route] formatted output');
    },
  },
  {
    name: 'debug at debug level routes to console.debug',
    kind: 'happy',
    input: { level: 'debug', channel: 'debug', consoleSink: 'debug' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=debug-route] no throw');
      assert.strictEqual(output!.callCount, 1,                  '[cell=2, scenario=debug-route] one call');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=2, scenario=debug-route] formatted output');
    },
  },
  {
    name: 'info at info level routes to console.info',
    kind: 'happy',
    input: { level: 'info', channel: 'info', consoleSink: 'info' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=info-route] no throw');
      assert.strictEqual(output!.callCount, 1,                  '[cell=2, scenario=info-route] one call');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=2, scenario=info-route] formatted output');
    },
  },
  {
    name: 'warn at warn level routes to console.warn',
    kind: 'happy',
    input: { level: 'warn', channel: 'warn', consoleSink: 'warn' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=warn-route] no throw');
      assert.strictEqual(output!.callCount, 1,                  '[cell=2, scenario=warn-route] one call');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=2, scenario=warn-route] formatted output');
    },
  },
  {
    name: 'error at error level routes to console.error',
    kind: 'happy',
    input: { level: 'error', channel: 'error', consoleSink: 'error' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=error-route] no throw');
      assert.strictEqual(output!.callCount, 1,                  '[cell=2, scenario=error-route] one call');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=2, scenario=error-route] formatted output');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ConsoleLogger :: cell-2 :: routing',
  (input) => {
    const logger = new ConsoleLogger();
    logger.level = input.level;
    const cap    = captureConsole(input.consoleSink);
    logger[input.channel]('Scope', 'op', 'message');
    cap.restore();
    return { callCount: cap.calls.length, formatted: cap.calls[0] ?? '' };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — context formatting
//
// renderContext/format contracts:
//   - keys sorted alphabetically in the output tail
//   - missing context → no trailing separator
//   - empty context ({}) → no trailing separator
//   - primitive values (string, number, boolean, null, undefined) via native string
//   - objects and arrays via JSON.stringify
//   - Error values via `name: message`
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly context?:  Record<string, unknown>;
  readonly expected:  string;
  readonly label:     string;
}
interface Cell3Output {
  readonly formatted: string;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'context keys sorted alphabetically',
    kind: 'happy',
    input: {
      context:  { 'b': 2, 'a': 1, 'c': 3 },
      expected: '[Scope.op] message | a=1 b=2 c=3',
      label:    'alpha-sort',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=alpha-sort] no throw');
      assert.strictEqual(output!.formatted, '[Scope.op] message | a=1 b=2 c=3', '[cell=3, scenario=alpha-sort] sorted tail');
    },
  },
  {
    name: 'primitive values render via native string form',
    kind: 'happy',
    input: {
      context: { 'str': 'hello', 'num': 42, 'bool': true, 'nullV': null, 'undefV': undefined },
      expected: '[Scope.op] message | bool=true nullV=null num=42 str=hello undefV=undefined',
      label: 'primitives',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=primitives] no throw');
      assert.strictEqual(
        output!.formatted,
        '[Scope.op] message | bool=true nullV=null num=42 str=hello undefV=undefined',
        '[cell=3, scenario=primitives] all primitives rendered',
      );
    },
  },
  {
    name: 'objects and arrays render via JSON.stringify',
    kind: 'happy',
    input: {
      context: { 'arr': [1, 2, 3], 'obj': { 'k': 'v' } },
      expected: '[Scope.op] message | arr=[1,2,3] obj={"k":"v"}',
      label: 'composite',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=composite] no throw');
      assert.strictEqual(
        output!.formatted,
        '[Scope.op] message | arr=[1,2,3] obj={"k":"v"}',
        '[cell=3, scenario=composite] object/array rendering',
      );
    },
  },
  {
    name: 'Error renders as name: message',
    kind: 'happy',
    input: {
      context: { 'error': new TypeError('bad input') },
      expected: '[Scope.op] message | error=TypeError: bad input',
      label: 'error',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=error-render] no throw');
      assert.strictEqual(
        output!.formatted,
        '[Scope.op] message | error=TypeError: bad input',
        '[cell=3, scenario=error-render] Error rendered as name: message',
      );
    },
  },
  {
    name: 'missing context renders without trailing separator',
    kind: 'edge',
    input: {
      expected: '[Scope.op] message',
      label:    'no-context',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-context] no throw');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=3, scenario=no-context] no separator');
    },
  },
  {
    name: 'empty context {} renders without trailing separator',
    kind: 'edge',
    input: {
      context:  {},
      expected: '[Scope.op] message',
      label:    'empty-context',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty-context] no throw');
      assert.strictEqual(output!.formatted, '[Scope.op] message', '[cell=3, scenario=empty-context] no separator for {}');
    },
  },
  {
    name: 'single key context renders correctly',
    kind: 'edge',
    input: {
      context:  { 'x': 99 },
      expected: '[Scope.op] message | x=99',
      label:    'single-key',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=single-key] no throw');
      assert.strictEqual(output!.formatted, '[Scope.op] message | x=99', '[cell=3, scenario=single-key] single key rendered');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'ConsoleLogger :: cell-3 :: formatting',
  (input) => {
    const logger = new ConsoleLogger();
    logger.level = 'debug';
    const cap    = captureConsole('debug');
    logger.debug('Scope', 'op', 'message', input.context);
    cap.restore();
    return { formatted: cap.calls[0] ?? '' };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — singleton and trace-level boundary
//
// These are table-incompatible because they assert cross-call state changes
// (level mutation mid-test) that ScenarioRunner cannot express as a single
// input → output transformation.
//
// consoleLogger: process-wide singleton at default 'warn'
// trace channel: suppressed at 'debug'; fires at 'trace'
// ---------------------------------------------------------------------------

import { test } from 'node:test';

test('ConsoleLogger :: cell-4 :: singleton :: is a ConsoleLogger at default warn level', () => {
  assert.ok(consoleLogger instanceof ConsoleLogger, '[cell=4, scenario=singleton] is ConsoleLogger instance');
  assert.strictEqual(consoleLogger.level, 'warn',   '[cell=4, scenario=singleton] default level is warn');
});

test('ConsoleLogger :: cell-4 :: trace-boundary :: suppressed at debug level, fires at trace level', () => {
  const logger = new ConsoleLogger();

  // trace suppressed at debug level
  logger.level = 'debug';
  const debugCap = captureConsole('debug');
  logger.trace('Scope', 'op', 'should not appear', trapContext());
  debugCap.restore();
  assert.strictEqual(debugCap.calls.length, 0, '[cell=4, scenario=trace-boundary] trace suppressed at debug level');

  // trace fires at trace level
  logger.level = 'trace';
  const traceCap = captureConsole('debug');
  logger.trace('Scope', 'op', 'visible');
  traceCap.restore();
  assert.strictEqual(traceCap.calls.length, 1,                   '[cell=4, scenario=trace-boundary] trace fires at trace level');
  assert.strictEqual(traceCap.calls[0], '[Scope.op] visible',    '[cell=4, scenario=trace-boundary] formatted output');
});
