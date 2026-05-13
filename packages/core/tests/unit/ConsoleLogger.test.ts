/**
 * ConsoleLogger unit tests — P5.7.
 *
 * Verifies the level-guard contract: `.debug(supplier)` MUST NOT invoke
 * the supplier at the default `'warn'` threshold; raising `level` to
 * `'debug'` MUST cause the supplier to fire. Each test silences the
 * actual `console` method it would emit through so the test output
 * stays clean.
 */
import { test } from 'node:test';
import { ConsoleLogger, consoleLogger } from '@studnicky/iridis/engine';
import { assert } from './ScenarioRunner.ts';

function muteConsole(method: 'debug' | 'info' | 'warn' | 'error'): () => void {
  const original = console[method];
  console[method] = (..._args: unknown[]): void => { /* swallow */ };
  return (): void => { console[method] = original; };
}

test('ConsoleLogger :: P5.7 :: debug supplier is NOT invoked at default warn level', () => {
  const logger = new ConsoleLogger();
  let supplierCalls = 0;

  // The supplier throws — proving the body is never entered.
  logger.debug('Scope', 'op', () => {
    supplierCalls += 1;
    throw new Error('supplier should not run at warn level');
  });

  assert.strictEqual(supplierCalls, 0, 'supplier must not run when level=warn');
});

test('ConsoleLogger :: P5.7 :: debug supplier IS invoked when level raised to debug', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const restore = muteConsole('debug');

  let supplierCalls = 0;
  let observedMessage = '';
  logger.debug('Scope', 'op', () => {
    supplierCalls += 1;
    observedMessage = `expensive ${42}`;
    return observedMessage;
  });

  restore();
  assert.strictEqual(supplierCalls, 1, 'supplier must run exactly once when level=debug');
  assert.strictEqual(observedMessage, 'expensive 42');
});

test('ConsoleLogger :: P5.7 :: info supplier is NOT invoked at default warn level', () => {
  const logger = new ConsoleLogger();
  logger.info('Scope', 'op', () => { throw new Error('info supplier should not run at warn level'); });
});

test('ConsoleLogger :: P5.7 :: warn supplier IS invoked at default warn level', () => {
  const logger = new ConsoleLogger();
  const restore = muteConsole('warn');
  let calls = 0;
  logger.warn('Scope', 'op', () => { calls += 1; return 'msg'; });
  restore();
  assert.strictEqual(calls, 1, 'warn supplier fires at default level');
});

test('ConsoleLogger :: P5.7 :: silent level suppresses all four channels', () => {
  const logger = new ConsoleLogger();
  logger.level = 'silent';
  let calls = 0;
  const supplier = (): string => { calls += 1; return 'unreachable'; };
  logger.debug('S', 'o', supplier);
  logger.info('S', 'o', supplier);
  logger.warn('S', 'o', supplier);
  logger.error('S', 'o', supplier);
  assert.strictEqual(calls, 0, 'no supplier fires at silent level');
});

test('ConsoleLogger :: P5.7 :: eager string message still emits at debug level', () => {
  const logger = new ConsoleLogger();
  logger.level = 'debug';
  const restore = muteConsole('debug');
  // Eager string overload remains supported for existing call sites.
  logger.debug('Scope', 'op', 'plain message');
  logger.debug('Scope', 'op', 'plain with data', { 'extra': 1 });
  restore();
});

test('ConsoleLogger :: P5.7 :: consoleLogger singleton is a single instance', () => {
  // The Engine reuses the module singleton across runs.
  assert.ok(consoleLogger instanceof ConsoleLogger, 'singleton is a ConsoleLogger instance');
  assert.strictEqual(consoleLogger.level, 'warn', 'default level is warn');
});
