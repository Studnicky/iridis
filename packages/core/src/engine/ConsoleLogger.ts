import type { LoggerInterface } from '../types/index.ts';

/**
 * The six log levels the `ConsoleLogger` supports, ordered from most
 * to least restrictive. `silent` suppresses every message; `trace`
 * emits everything. The default threshold is `'warn'` — debug, info,
 * and trace are dropped at the source before any context object is
 * touched, so callers pay zero formatting cost in production.
 */
export type LogLevelType = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LEVEL_PRIORITY: Record<LogLevelType, number> = {
  'silent': 0,
  'error':  1,
  'warn':   2,
  'info':   3,
  'debug':  4,
  'trace':  5,
};

/**
 * Render a single context value into the log line. Primitives use their
 * native string representation; objects and arrays go through
 * `JSON.stringify` so the formatter, not the caller, owns the shape.
 * Errors surface their `name` and `message` rather than the empty
 * `{}` that `JSON.stringify(err)` produces.
 */
function renderValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'string') return value as string;
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try { return JSON.stringify(value); }
  catch { return String(value); }
}

/**
 * Render the structured `context` object into a space-separated
 * `key=value` tail, with keys sorted alphabetically for stable output.
 * Returns the empty string when the context is missing or has no
 * own-enumerable keys; the caller decides whether to append the
 * ` — ` separator.
 */
function renderContext(context: Record<string, unknown> | undefined): string {
  if (!context) return '';
  const keys = Object.keys(context).sort();
  if (keys.length === 0) return '';
  const parts: string[] = [];
  for (const key of keys) parts.push(`${key}=${renderValue(context[key])}`);
  return parts.join(' ');
}

/**
 * Format the full log line — `[scope.op] message` when the context is
 * empty, `[scope.op] message — k=v k=v` otherwise. The formatter lives
 * here so every call site shares the exact same output shape.
 */
function format(scope: string, op: string, message: string, context: Record<string, unknown> | undefined): string {
  const tail = renderContext(context);
  if (tail === '') return `[${scope}.${op}] ${message}`;
  return `[${scope}.${op}] ${message} — ${tail}`;
}

/**
 * Default `LoggerInterface` implementation that forwards to the global
 * `console` with a `[scope.op]` prefix. Used by `Engine.run` when no
 * logger is supplied; consumers building their own pipeline context
 * are free to substitute a structured logger that satisfies the same
 * `(scope, op, message, context?)` contract.
 *
 * Each instance carries a mutable `level` threshold (default `'warn'`).
 * Messages below the threshold short-circuit BEFORE the `context`
 * argument is touched — no key enumeration, no stringification, no
 * concatenation. Callers pass a fixed `message` literal and a
 * `Record<string, unknown>` of named values; the logger owns the
 * rendering. Templates and pre-formatting at the call site are
 * forbidden by contract — the point is one canonical output shape.
 */
export class ConsoleLogger implements LoggerInterface {
  level: LogLevelType = 'warn';

  private enabled(target: LogLevelType): boolean {
    return LEVEL_PRIORITY[this.level] >= LEVEL_PRIORITY[target];
  }

  trace(scope: string, op: string, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled('trace')) return;
    console.debug(format(scope, op, message, context));
  }

  debug(scope: string, op: string, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled('debug')) return;
    console.debug(format(scope, op, message, context));
  }

  info(scope: string, op: string, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled('info')) return;
    console.info(format(scope, op, message, context));
  }

  warn(scope: string, op: string, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled('warn')) return;
    console.warn(format(scope, op, message, context));
  }

  error(scope: string, op: string, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled('error')) return;
    console.error(format(scope, op, message, context));
  }
}

/**
 * Process-wide singleton `ConsoleLogger`. Stateless aside from the
 * configurable level threshold (see {@link ConsoleLogger} above); shared
 * by every `Engine.run` invocation that does not supply its own logger,
 * so the engine does not allocate a fresh instance per call.
 */
export const consoleLogger = new ConsoleLogger();
