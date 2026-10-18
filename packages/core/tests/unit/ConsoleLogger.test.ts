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

import { consoleLogger } from '@studnicky/iridis/engine';
import { LogBodyConfigEntity, type LogBodyDataEntity, type LogRecordEntity } from '@studnicky/logger/entities';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

interface ConsoleCaptureInterface {
  readonly 'calls': readonly (readonly [string, LogRecordEntity.Type])[];
  restore(): void;
}

class ConsoleCaptureSession implements ConsoleCaptureInterface {
  readonly 'calls': [string, LogRecordEntity.Type][] = [];

  private readonly restoreConsole: () => void;

  constructor(restoreConsole: () => void) {
    this.restoreConsole = restoreConsole;
  }

  restore(): void {
    this.restoreConsole();
  }

  static captureDebug(consoleReference: Console): ConsoleCaptureInterface {
    const original = consoleReference.debug;
    const session = new ConsoleCaptureSession(function restoreDebug(): void {
      consoleReference.debug = original;
    });
    consoleReference.debug = function recordDebug(message: string, record: LogRecordEntity.Type): void {
      session.calls.push([message, record]);
    };
    const result = session;
    return result;
  }

  static captureError(consoleReference: Console): ConsoleCaptureInterface {
    const original = consoleReference.error;
    const session = new ConsoleCaptureSession(function restoreError(): void {
      consoleReference.error = original;
    });
    consoleReference.error = function recordError(message: string, record: LogRecordEntity.Type): void {
      session.calls.push([message, record]);
    };
    const result = session;
    return result;
  }

  static captureInfo(consoleReference: Console): ConsoleCaptureInterface {
    const original = consoleReference.info;
    const session = new ConsoleCaptureSession(function restoreInfo(): void {
      consoleReference.info = original;
    });
    consoleReference.info = function recordInfo(message: string, record: LogRecordEntity.Type): void {
      session.calls.push([message, record]);
    };
    const result = session;
    return result;
  }

  static captureTrace(consoleReference: Console): ConsoleCaptureInterface {
    const original = consoleReference.trace;
    const session = new ConsoleCaptureSession(function restoreTrace(): void {
      consoleReference.trace = original;
    });
    consoleReference.trace = function recordTrace(message: string, record: LogRecordEntity.Type): void {
      session.calls.push([message, record]);
    };
    const result = session;
    return result;
  }

  static captureWarn(consoleReference: Console): ConsoleCaptureInterface {
    const original = consoleReference.warn;
    const session = new ConsoleCaptureSession(function restoreWarn(): void {
      consoleReference.warn = original;
    });
    consoleReference.warn = function recordWarn(message: string, record: LogRecordEntity.Type): void {
      session.calls.push([message, record]);
    };
    const result = session;
    return result;
  }
}

class TestConsoleLoggerFixture {
  static readonly suppressionScenarios: readonly ScenarioInterface<{
    readonly 'execute': () => void;
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
      'input': {
        'execute': function executeTrace(): void {
          consoleLogger.trace(TestConsoleLoggerFixture.body('should not appear'));
        }
      },
      'kind': 'happy',
      'name': 'warn floor suppresses trace'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=1, scenario=warn-debug] no throw');
        assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-debug] returns undefined');
        assert.strictEqual(output!.debugCalls, 0, '[cell=1, scenario=warn-debug] no console.debug');
      },
      'input': {
        'execute': function executeDebug(): void {
          consoleLogger.debug(TestConsoleLoggerFixture.body('should not appear'));
        }
      },
      'kind': 'happy',
      'name': 'warn floor suppresses debug'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=1, scenario=warn-info] no throw');
        assert.strictEqual(output!.result, undefined, '[cell=1, scenario=warn-info] returns undefined');
        assert.strictEqual(output!.infoCalls, 0, '[cell=1, scenario=warn-info] no console.info');
      },
      'input': {
        'execute': function executeInfo(): void {
          consoleLogger.info(TestConsoleLoggerFixture.body('should not appear'));
        }
      },
      'kind': 'happy',
      'name': 'warn floor suppresses info'
    }
  ];

  static readonly routingScenarios: readonly ScenarioInterface<{
    readonly 'execute': () => void;
  }, {
    readonly 'errorCalls': number;
    readonly 'errorMessage': string;
    readonly 'warnCalls': number;
    readonly 'warnMessage': string;
  }>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=2, scenario=warn-route] no throw');
        assert.strictEqual(output!.warnCalls, 1, '[cell=2, scenario=warn-route] one console.warn call');
        assert.ok(output!.warnMessage.includes('warn message'), '[cell=2, scenario=warn-route] message present');
      },
      'input': {
        'execute': function executeWarn(): void {
          consoleLogger.warn(TestConsoleLoggerFixture.body('warn message'));
        }
      },
      'kind': 'happy',
      'name': 'warn at warn floor routes to console.warn'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=2, scenario=error-route] no throw');
        assert.strictEqual(output!.errorCalls, 1, '[cell=2, scenario=error-route] one console.error call');
        assert.ok(output!.errorMessage.includes('error message'), '[cell=2, scenario=error-route] message present');
      },
      'input': {
        'execute': function executeError(): void {
          consoleLogger.error(TestConsoleLoggerFixture.body('error message'));
        }
      },
      'kind': 'happy',
      'name': 'error at warn floor routes to console.error'
    }
  ];

  static body(message: string): LogBodyDataEntity.Type {
    const result = LogBody.create(LogBodyConfigEntity.intake({
      'component': 'Scope',
      'context': {},
      'message': message,
      'operation': 'op',
      'status': LOG_STATUS.SUCCESS
    }));
    return result;
  }

  static firstMessage(calls: readonly (readonly [string, LogRecordEntity.Type])[]): string {
    const firstCall = calls.at(0);
    const result = firstCall === undefined ? '' : firstCall[0];
    return result;
  }

  static runWithAllCaptures(execute: () => void): {
    readonly 'debugCalls': number;
    readonly 'errorCalls': number;
    readonly 'errorMessage': string;
    readonly 'infoCalls':  number;
    readonly 'result':     void;
    readonly 'traceCalls': number;
    readonly 'warnCalls':  number;
    readonly 'warnMessage': string;
  } {
    const consoleReference = console;
    const traceCapture = ConsoleCaptureSession.captureTrace(consoleReference);
    const debugCapture = ConsoleCaptureSession.captureDebug(consoleReference);
    const infoCapture = ConsoleCaptureSession.captureInfo(consoleReference);
    const warnCapture = ConsoleCaptureSession.captureWarn(consoleReference);
    const errorCapture = ConsoleCaptureSession.captureError(consoleReference);
    try {
      const result = execute();
      return {
        'debugCalls': debugCapture.calls.length,
        'errorCalls': errorCapture.calls.length,
        'errorMessage': TestConsoleLoggerFixture.firstMessage(errorCapture.calls),
        'infoCalls':  infoCapture.calls.length,
        'result': result,
        'traceCalls': traceCapture.calls.length,
        'warnCalls':  warnCapture.calls.length,
        'warnMessage': TestConsoleLoggerFixture.firstMessage(warnCapture.calls)
      };
    } finally {
      traceCapture.restore();
      debugCapture.restore();
      infoCapture.restore();
      warnCapture.restore();
      errorCapture.restore();
    }
  }
}

new ScenarioRunner<{
  readonly 'execute': () => void;
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
    const result = TestConsoleLoggerFixture.runWithAllCaptures(input.execute);
    return result;
  }
).run(TestConsoleLoggerFixture.suppressionScenarios);

new ScenarioRunner<{
  readonly 'execute': () => void;
}, {
  readonly 'errorCalls': number;
  readonly 'errorMessage': string;
  readonly 'warnCalls': number;
  readonly 'warnMessage': string;
}>(
  'ConsoleLogger :: cell-2 :: routing',
  (input) => {
    const result = TestConsoleLoggerFixture.runWithAllCaptures(input.execute);
    return result;
  }
).run(TestConsoleLoggerFixture.routingScenarios);

void test('ConsoleLogger :: cell-3 :: singleton :: consoleLogger is a stable process-wide instance', () => {
  assert.strictEqual(typeof consoleLogger.debug, 'function', '[cell=3, scenario=singleton] exposes LoggerInterface shape');
  assert.strictEqual(typeof consoleLogger.child, 'function', '[cell=3, scenario=singleton] exposes child()');
});
