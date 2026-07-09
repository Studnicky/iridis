import { ConsoleTransport, Logger } from '@studnicky/logger';

/**
 * Process-wide default `LoggerInterface` implementation, used by
 * `Engine.run` when no logger is supplied. Forwards to the console via
 * `@studnicky/logger`'s `ConsoleTransport`, filtered at the `warn` floor.
 * Consumers building their own pipeline context are free to substitute
 * any other `@studnicky/logger` `LoggerInterface` implementation.
 */
export const consoleLogger = Logger.create({
  'level':      'warn',
  'transports': [ConsoleTransport.create()]
});
