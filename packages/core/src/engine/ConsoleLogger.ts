import type { LoggerInterface } from '../types/index.ts';

/**
 * Default `LoggerInterface` implementation that forwards to the global
 * `console` with a `[scope.operation]` prefix. Used by `Engine.run` when
 * no logger is supplied; consumers building their own pipeline context
 * are free to substitute a structured logger that satisfies the same
 * `(scope, operation, message, data?)` contract.
 */
export class ConsoleLogger implements LoggerInterface {
  debug(scope: string, op: string, message: string, data?: unknown): void {
    if (data === undefined) {
      console.debug(`[${scope}.${op}]`, message);

      return;
    }
    console.debug(`[${scope}.${op}]`, message, data);
  }

  info(scope: string, op: string, message: string, data?: unknown): void {
    if (data === undefined) {
      console.info(`[${scope}.${op}]`, message);

      return;
    }
    console.info(`[${scope}.${op}]`, message, data);
  }

  warn(scope: string, op: string, message: string, data?: unknown): void {
    if (data === undefined) {
      console.warn(`[${scope}.${op}]`, message);

      return;
    }
    console.warn(`[${scope}.${op}]`, message, data);
  }

  error(scope: string, op: string, message: string, data?: unknown): void {
    if (data === undefined) {
      console.error(`[${scope}.${op}]`, message);

      return;
    }
    console.error(`[${scope}.${op}]`, message, data);
  }
}
