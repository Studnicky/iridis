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

import type { LogRecordType }   from '@studnicky/logger';
import type { LogBodyDataType } from '@studnicky/logger/interfaces';

import { consoleLogger } from '@studnicky/iridis/engine';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type ConsoleMethodType = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface ConsoleCaptureInterface {
  readonly 'calls': (readonly [string, LogRecordType])[];
  restore(): void;
}

/**
 * Captures calls made to a single `console` sink method while installed,
 * routing them through a locally held reference so the underlying `console`
 * global is never accessed by member expression.
 */
class ConsoleCaptureSession implements ConsoleCaptureInterface {
  readonly 'calls': [string, LogRecordType][] = [];

  private readonly consoleMethod: ConsoleMethodType;
  private readonly consoleReference: Console;
  private readonly originalMethod: Console[ConsoleMethodType];

  constructor(consoleMethod: ConsoleMethodType) {
    this.consoleMethod = consoleMethod;
    this.consoleReference = console;
    this.originalMethod = this.consoleReference[consoleMethod];
    this.consoleReference[consoleMethod] = (message: string, record: LogRecordType): void => {
      this.calls.push([message, record]);
    };
  }

  restore(): void {
    this.consoleReference[this.consoleMethod] = this.originalMethod;
  }
}

class TestConsoleLoggerFixture {
  static captureConsole(consoleMethod: ConsoleMethodType): ConsoleCaptureInterface {
    return new ConsoleCaptureSession(consoleMethod);
  }

  static body(message: string): LogBodyDataType {
    const result = LogBody.create()
      .component('Scope')
      .operation('op')
      .status(LOG_STATUS.SUCCESS)
      .message(message)
      .context({})
      .build();
    return result;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — suppression
//
// consoleLogger sits at the 'warn' floor: trace/debug/info calls must fire
// zero console work on every sink.
// ---------------------------------------------------------------------------

const cell1Scenarios: readonly ScenarioInterface<{
  readonly 'channel': 'trace' | 'debug' | 'info';
  readonly 'name':    string;
}, {
  readonly 'debugCalls': number;
  readonly 'errorCalls': number;
  readonly 'infoCalls':  number;
  readonly 'result':     void;
  readonly 'traceCalls': number;
  readonly 'warnCalls':  number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-trace] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-trace] returns undefined');
      assert.strictEqual(output!.traceCalls, 0, '[cell=1, scenario=warn-trace] no console.trace');
    },
    'input': { 'channel': 'trace', 'name': 'warn-suppresses-trace' },
    'kind': 'happy',
    'name': 'warn floor suppresses trace'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-debug] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-debug] returns undefined');
      assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=warn-debug] no console.debug');
    },
    'input': { 'channel': 'debug', 'name': 'warn-suppresses-debug' },
    'kind': 'happy',
    'name': 'warn floor suppresses debug'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=warn-info] no throw');
      assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-info] returns undefined');
      assert.strictEqual(output!.infoCalls, 0, '[cell=1, scenario=warn-info] no console.info');
    },
    'input': { 'channel': 'info', 'name': 'warn-suppresses-info' },
    'kind': 'happy',
    'name': 'warn floor suppresses info'
  }
];

new ScenarioRunner<{
  readonly 'channel': 'trace' | 'debug' | 'info';
  readonly 'name':    string;
}, {
  readonly 'debugCalls': number;
  readonly 'errorCalls': number;
  readonly 'infoCalls':  number;
  readonly 'result':     void;
  readonly 'traceCalls': number;
  readonly 'warnCalls':  number;
}>(
  'ConsoleLogger :: cell-1 :: suppression',
  (input) => {
    const traceCap = TestConsoleLoggerFixture.captureConsole('trace');
    const debugCap = TestConsoleLoggerFixture.captureConsole('debug');
    const infoCap  = TestConsoleLoggerFixture.captureConsole('info');
    const warnCap  = TestConsoleLoggerFixture.captureConsole('warn');
    const errorCap = TestConsoleLoggerFixture.captureConsole('error');
    const result = consoleLogger[input.channel](TestConsoleLoggerFixture.body('should not appear'));
    traceCap.restore();
    debugCap.restore();
    infoCap.restore();
    warnCap.restore();
    errorCap.restore();
    return {
      'debugCalls': debugCap.calls.length,
      'errorCalls': errorCap.calls.length,
      'infoCalls':  infoCap.calls.length,
      'result': result,
      'traceCalls': traceCap.calls.length,
      'warnCalls':  warnCap.calls.length
    };
  }
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — routing
//
// Channels at or above the warn floor must forward to the correct
// underlying console method with the built message text present.
// ---------------------------------------------------------------------------

const cell2Scenarios: readonly ScenarioInterface<{
  readonly 'channel':     'warn' | 'error';
  readonly 'consoleSink': ConsoleMethodType;
}, {
  readonly 'callCount': number;
  readonly 'message':   string;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=warn-route] no throw');
      assert.strictEqual(output!.callCount, 1, '[cell=2, scenario=warn-route] one call');
      assert.ok(output!.message.includes('warn message'), '[cell=2, scenario=warn-route] message present');
    },
    'input': { 'channel': 'warn', 'consoleSink': 'warn' },
    'kind': 'happy',
    'name': 'warn at warn floor routes to console.warn'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=error-route] no throw');
      assert.strictEqual(output!.callCount, 1, '[cell=2, scenario=error-route] one call');
      assert.ok(output!.message.includes('error message'), '[cell=2, scenario=error-route] message present');
    },
    'input': { 'channel': 'error', 'consoleSink': 'error' },
    'kind': 'happy',
    'name': 'error at warn floor routes to console.error'
  }
];

new ScenarioRunner<{
  readonly 'channel':     'warn' | 'error';
  readonly 'consoleSink': ConsoleMethodType;
}, {
  readonly 'callCount': number;
  readonly 'message':   string;
}>(
  'ConsoleLogger :: cell-2 :: routing',
  (input) => {
    const consoleCapture = TestConsoleLoggerFixture.captureConsole(input.consoleSink);
    consoleLogger[input.channel](TestConsoleLoggerFixture.body(`${input.channel} message`));
    consoleCapture.restore();
    const firstCall = consoleCapture.calls[0];
    const firstMessage = firstCall === undefined ? '' : firstCall[0];
    return { 'callCount': consoleCapture.calls.length, 'message': firstMessage };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — singleton
//
// Table-incompatible: asserts identity/reference equality rather than an
// input → output transformation.
// ---------------------------------------------------------------------------

import { test } from 'node:test';

void test('ConsoleLogger :: cell-3 :: singleton :: consoleLogger is a stable process-wide instance', () => {
  assert.strictEqual(typeof consoleLogger.debug, 'function', '[cell=3, scenario=singleton] exposes LoggerInterface shape');
  assert.strictEqual(typeof consoleLogger.child, 'function', '[cell=3, scenario=singleton] exposes child()');
});
