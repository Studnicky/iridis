import type { LoggerInterface } from '../types/index.ts';

/**
 * The five log levels the `ConsoleLogger` supports, ordered from most
 * to least restrictive. `silent` suppresses every message; `debug`
 * emits everything. The default threshold is `'warn'` — debug and info
 * are dropped at the source, so callers passing template literals
 * never pay the interpolation cost in production.
 */
export type LogLevelType = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_PRIORITY: Record<LogLevelType, number> = {
  'silent': 0,
  'error':  1,
  'warn':   2,
  'info':   3,
  'debug':  4,
};

/**
 * Default `LoggerInterface` implementation that forwards to the global
 * `console` with a `[scope.operation]` prefix. Used by `Engine.run` when
 * no logger is supplied; consumers building their own pipeline context
 * are free to substitute a structured logger that satisfies the same
 * `(scope, operation, message, data?)` contract.
 *
 * Each instance carries a mutable `level` threshold (default `'warn'`)
 * — messages below the current threshold short-circuit before any
 * argument evaluation in the logger body. Call sites that interpolate
 * expensive values can pass a `() => string` supplier instead of a
 * template literal; the supplier is only invoked if the level allows.
 */
export class ConsoleLogger implements LoggerInterface {
  level: LogLevelType = 'warn';

  private enabled(target: LogLevelType): boolean {
    return LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY[target];
  }

  debug(scope: string, op: string, message: string | (() => string), data?: unknown): void {
    if (!this.enabled('debug')) return;
    const msg = typeof message === 'function' ? message() : message;
    if (data === undefined) {
      console.debug(`[${scope}.${op}]`, msg);

      return;
    }
    console.debug(`[${scope}.${op}]`, msg, data);
  }

  info(scope: string, op: string, message: string | (() => string), data?: unknown): void {
    if (!this.enabled('info')) return;
    const msg = typeof message === 'function' ? message() : message;
    if (data === undefined) {
      console.info(`[${scope}.${op}]`, msg);

      return;
    }
    console.info(`[${scope}.${op}]`, msg, data);
  }

  warn(scope: string, op: string, message: string | (() => string), data?: unknown): void {
    if (!this.enabled('warn')) return;
    const msg = typeof message === 'function' ? message() : message;
    if (data === undefined) {
      console.warn(`[${scope}.${op}]`, msg);

      return;
    }
    console.warn(`[${scope}.${op}]`, msg, data);
  }

  error(scope: string, op: string, message: string | (() => string), data?: unknown): void {
    if (!this.enabled('error')) return;
    const msg = typeof message === 'function' ? message() : message;
    if (data === undefined) {
      console.error(`[${scope}.${op}]`, msg);

      return;
    }
    console.error(`[${scope}.${op}]`, msg, data);
  }
}

/**
 * Process-wide singleton `ConsoleLogger`. Stateless aside from the
 * configurable level threshold (see {@link ConsoleLogger} above); shared
 * by every `Engine.run` invocation that does not supply its own logger,
 * so the engine does not allocate a fresh instance per call.
 */
export const consoleLogger = new ConsoleLogger();
