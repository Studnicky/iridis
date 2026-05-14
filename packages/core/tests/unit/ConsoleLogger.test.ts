/**
 * ConsoleLogger unit tests — R3.
 *
 * Verifies the structured-args contract: every channel takes
 * `(scope, op, message, context?)` where `message` is a fixed string
 * and `context` is a `Record<string, unknown>` the LOGGER renders.
 * Callers never format. When the level threshold suppresses a channel,
 * the call returns immediately with zero downstream work — proven by
 * passing a context that throws on access.
 */
import { test } from 'node:test';
import { ConsoleLogger, consoleLogger } from '@studnicky/iridis/engine';
import type { LogLevelType } from '@studnicky/iridis/engine';
import { assert } from './ScenarioRunner.ts';

type ConsoleMethodType = 'debug' | 'info' | 'warn' | 'error';

interface ConsoleCaptureInterface {
  readonly 'calls': string[];
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

interface SuppressionScenarioInterface {
  readonly 'name':    string;
  readonly 'level':   LogLevelType;
  readonly 'channel': 'trace' | 'debug' | 'info' | 'warn' | 'error';
}

const SUPPRESSION_SCENARIOS: readonly SuppressionScenarioInterface[] = [
  { 'name': 'default warn suppresses trace', 'level': 'warn',   'channel': 'trace' },
  { 'name': 'default warn suppresses debug', 'level': 'warn',   'channel': 'debug' },
  { 'name': 'default warn suppresses info',  'level': 'warn',   'channel': 'info'  },
  { 'name': 'silent suppresses error',       'level': 'silent', 'channel': 'error' },
  { 'name': 'silent suppresses warn',        'level': 'silent', 'channel': 'warn'  },
  { 'name': 'silent suppresses info',        'level': 'silent', 'channel': 'info'  },
  { 'name': 'silent suppresses debug',       'level': 'silent', 'channel': 'debug' },
  { 'name': 'silent suppresses trace',       'level': 'silent', 'channel': 'trace' },
  { 'name': 'error level suppresses warn',   'level': 'error',  'channel': 'warn'  },
  { 'name': 'info level suppresses debug',   'level': 'info',   'channel': 'debug' },
  { 'name': 'debug level suppresses trace',  'level': 'debug',  'channel': 'trace' },
];

test('ConsoleLogger :: R3 :: suppressed channels do zero work', () => {
  for (const sc of SUPPRESSION_SCENARIOS) {
    const logger = new ConsoleLogger();
    logger.level = sc.level;

    // Capture every console method to assert NONE fire.
    const debugCap = captureConsole('debug');
    const infoCap  = captureConsole('info');
    const warnCap  = captureConsole('warn');
    const errorCap = captureConsole('error');

    const result = logger[sc.channel]('Scope', 'op', 'literal message', trapContext());

    debugCap.restore();
    infoCap.restore();
    warnCap.restore();
    errorCap.restore();

    assert.strictEqual(result, undefined, `[${sc.name}] channel must return undefined`);
    assert.strictEqual(debugCap.calls.length, 0, `[${sc.name}] no console.debug calls`);
    assert.strictEqual(infoCap.calls.length,  0, `[${sc.name}] no console.info calls`);
    assert.strictEqual(warnCap.calls.length,  0, `[${sc.name}] no console.warn calls`);
    assert.strictEqual(errorCap.calls.length, 0, `[${sc.name}] no console.error calls`);
  }
});

interface RoutingScenarioInterface {
  readonly 'name':         string;
  readonly 'level':        LogLevelType;
  readonly 'channel':      'trace' | 'debug' | 'info' | 'warn' | 'error';
  readonly 'consoleSink':  ConsoleMethodType;
}

const ROUTING_SCENARIOS: readonly RoutingScenarioInterface[] = [
  { 'name': 'trace at trace level → console.debug', 'level': 'trace', 'channel': 'trace', 'consoleSink': 'debug' },
  { 'name': 'debug at debug level → console.debug', 'level': 'debug', 'channel': 'debug', 'consoleSink': 'debug' },
  { 'name': 'info at info level → console.info',    'level': 'info',  'channel': 'info',  'consoleSink': 'info'  },
  { 'name': 'warn at warn level → console.warn',    'level': 'warn',  'channel': 'warn',  'consoleSink': 'warn'  },
  { 'name': 'error at error level → console.error', 'level': 'error', 'channel': 'error', 'consoleSink': 'error' },
];

test('ConsoleLogger :: R3 :: enabled channels route to the correct console sink', () => {
  for (const sc of ROUTING_SCENARIOS) {
    const logger = new ConsoleLogger();
    logger.level = sc.level;
    const cap = captureConsole(sc.consoleSink);

    logger[sc.channel]('Scope', 'op', 'message');

    cap.restore();
    assert.strictEqual(cap.calls.length, 1, `[${sc.name}] one call to console.${sc.consoleSink}`);
    assert.strictEqual(cap.calls[0], '[Scope.op] message', `[${sc.name}] formatted output`);
  }
});

test('ConsoleLogger :: R3 :: context renders with keys sorted alphabetically', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const cap = captureConsole('debug');

  // Pass keys in non-alphabetical order; expect sorted output.
  logger.debug('Scope', 'op', 'message', { 'b': 2, 'a': 1, 'c': 3 });

  cap.restore();
  assert.strictEqual(cap.calls.length, 1, 'one console.debug call');
  assert.strictEqual(cap.calls[0], '[Scope.op] message — a=1 b=2 c=3', 'sorted context tail');
});

test('ConsoleLogger :: R3 :: missing context renders without trailing separator', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const cap = captureConsole('debug');

  logger.debug('Scope', 'op', 'no context here');

  cap.restore();
  assert.strictEqual(cap.calls[0], '[Scope.op] no context here', 'no — separator when context missing');
});

test('ConsoleLogger :: R3 :: empty context renders without trailing separator', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const cap = captureConsole('debug');

  logger.debug('Scope', 'op', 'empty context', {});

  cap.restore();
  assert.strictEqual(cap.calls[0], '[Scope.op] empty context', 'no — separator for {} context');
});

test('ConsoleLogger :: R3 :: primitive values render via their native string form', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const cap = captureConsole('debug');

  logger.debug('Scope', 'op', 'primitives', {
    'str':    'hello',
    'num':    42,
    'bool':   true,
    'nullV':  null,
    'undefV': undefined,
  });

  cap.restore();
  // Keys sorted: bool, nullV, num, str, undefV
  assert.strictEqual(
    cap.calls[0],
    '[Scope.op] primitives — bool=true nullV=null num=42 str=hello undefV=undefined',
    'primitive value rendering',
  );
});

test('ConsoleLogger :: R3 :: objects and arrays render via JSON.stringify', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const cap = captureConsole('debug');

  logger.debug('Scope', 'op', 'composite', {
    'arr': [1, 2, 3],
    'obj': { 'k': 'v' },
  });

  cap.restore();
  assert.strictEqual(
    cap.calls[0],
    '[Scope.op] composite — arr=[1,2,3] obj={"k":"v"}',
    'object/array rendering',
  );
});

test('ConsoleLogger :: R3 :: Error values render with name and message', () => {
  const logger = new ConsoleLogger();
  logger.level = 'error';
  const cap = captureConsole('error');

  const err = new TypeError('bad input');
  logger.error('Scope', 'op', 'failure', { 'error': err });

  cap.restore();
  assert.strictEqual(
    cap.calls[0],
    '[Scope.op] failure — error=TypeError: bad input',
    'Error rendering',
  );
});

test('ConsoleLogger :: R3 :: trace channel routes to console.debug', () => {
  // Verify trace is the most-verbose level — silently dropped at debug level
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const debugCap = captureConsole('debug');

  logger.trace('Scope', 'op', 'should not appear', trapContext());

  debugCap.restore();
  assert.strictEqual(debugCap.calls.length, 0, 'trace suppressed at debug level');

  // Now enable trace level and verify it fires.
  logger.level = 'trace';
  const cap = captureConsole('debug');
  logger.trace('Scope', 'op', 'visible');
  cap.restore();
  assert.strictEqual(cap.calls.length, 1, 'trace fires at trace level');
  assert.strictEqual(cap.calls[0], '[Scope.op] visible', 'trace formatted output');
});

test('ConsoleLogger :: R3 :: consoleLogger singleton is a single instance at default warn', () => {
  assert.ok(consoleLogger instanceof ConsoleLogger, 'singleton is a ConsoleLogger instance');
  assert.strictEqual(consoleLogger.level, 'warn', 'default level is warn');
});
