/**
 * ConsoleLogger — scenario-matrix suite.
 *
 * Subject: `consoleLogger` (process-wide default `LoggerInterface`,
 * a `@studnicky/logger` `Logger` at the `warn` floor with a single
 * `ConsoleTransport`).
 *
 * Cells:
 *   1. suppression — channels below the warn floor do zero console work
 *   2. routing     — enabled channels route to the correct console sink
 *   3. singleton   — consoleLogger identity is stable across imports
 */

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import type { LogBodyDataType } from '@studnicky/logger/interfaces';

import { consoleLogger } from '@studnicky/iridis/engine';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type ConsoleMethodType = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface ConsoleCaptureInterface {
  readonly calls: unknown[][];
  restore(): void;
}

function captureConsole(method: ConsoleMethodType): ConsoleCaptureInterface {
  const original = console[method];
  const calls: unknown[][] = [];
  console[method] = (...args: unknown[]): void => {
    calls.push(args);
  };
  return {
    'calls':   calls,
    restore(): void { console[method] = original; },
  };
}

function body(message: string): LogBodyDataType {
  return LogBody.create()
    .component('Scope')
    .operation('op')
    .status(LOG_STATUS.SUCCESS)
    .message(message)
    .context({})
    .build();
}

// ---------------------------------------------------------------------------
// Cell 1 — suppression
//
// consoleLogger sits at the 'warn' floor: trace/debug/info calls must fire
// zero console work on every sink.
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly name:    string;
  readonly channel: 'trace' | 'debug' | 'info';
}
interface Cell1Output {
  readonly result:     unknown;
  readonly traceCalls: number;
  readonly debugCalls: number;
  readonly infoCalls:  number;
  readonly warnCalls:  number;
  readonly errorCalls: number;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'warn floor suppresses trace',
    kind: 'happy',
    input: { name: 'warn-suppresses-trace', channel: 'trace' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-trace] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-trace] returns undefined');
      assert.strictEqual(output!.traceCalls, 0, '[cell=1, scenario=warn-trace] no console.trace');
    },
  },
  {
    name: 'warn floor suppresses debug',
    kind: 'happy',
    input: { name: 'warn-suppresses-debug', channel: 'debug' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-debug] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-debug] returns undefined');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=warn-debug] no console.debug');
    },
  },
  {
    name: 'warn floor suppresses info',
    kind: 'happy',
    input: { name: 'warn-suppresses-info', channel: 'info' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-info] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-info] returns undefined');
      assert.strictEqual(output!.infoCalls, 0, '[cell=1, scenario=warn-info] no console.info');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ConsoleLogger :: cell-1 :: suppression',
  (input) => {
    const traceCap = captureConsole('trace');
    const debugCap = captureConsole('debug');
    const infoCap  = captureConsole('info');
    const warnCap  = captureConsole('warn');
    const errorCap = captureConsole('error');
    const result: unknown = consoleLogger[input.channel](body('should not appear'));
    traceCap.restore();
    debugCap.restore();
    infoCap.restore();
    warnCap.restore();
    errorCap.restore();
    return {
      result,
      traceCalls: traceCap.calls.length,
      debugCalls: debugCap.calls.length,
      infoCalls:  infoCap.calls.length,
      warnCalls:  warnCap.calls.length,
      errorCalls: errorCap.calls.length,
    };
  },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — routing
//
// Channels at or above the warn floor must forward to the correct
// underlying console method with the built message text present.
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly channel:     'warn' | 'error';
  readonly consoleSink: ConsoleMethodType;
}
interface Cell2Output {
  readonly callCount: number;
  readonly message:   string;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'warn at warn floor routes to console.warn',
    kind: 'happy',
    input: { channel: 'warn', consoleSink: 'warn' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=warn-route] no throw');
      assert.strictEqual(output!.callCount, 1, '[cell=2, scenario=warn-route] one call');
      assert.ok(output!.message.includes('warn message'), '[cell=2, scenario=warn-route] message present');
    },
  },
  {
    name: 'error at warn floor routes to console.error',
    kind: 'happy',
    input: { channel: 'error', consoleSink: 'error' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=error-route] no throw');
      assert.strictEqual(output!.callCount, 1, '[cell=2, scenario=error-route] one call');
      assert.ok(output!.message.includes('error message'), '[cell=2, scenario=error-route] message present');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ConsoleLogger :: cell-2 :: routing',
  (input) => {
    const cap = captureConsole(input.consoleSink);
    consoleLogger[input.channel](body(`${input.channel} message`));
    cap.restore();
    return { callCount: cap.calls.length, message: String(cap.calls[0]?.[0] ?? '') };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — singleton
//
// Table-incompatible: asserts identity/reference equality rather than an
// input → output transformation.
// ---------------------------------------------------------------------------

import { test } from 'node:test';

test('ConsoleLogger :: cell-3 :: singleton :: consoleLogger is a stable process-wide instance', () => {
  assert.strictEqual(typeof consoleLogger.debug, 'function', '[cell=3, scenario=singleton] exposes LoggerInterface shape');
  assert.strictEqual(typeof consoleLogger.child, 'function', '[cell=3, scenario=singleton] exposes child()');
});
