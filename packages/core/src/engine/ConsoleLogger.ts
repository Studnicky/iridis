import type { LoggerInterface } from '../types/index.ts';

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
