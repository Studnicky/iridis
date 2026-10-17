import type { LogDataEntity } from '@studnicky/logger/entities';
import type { LoggerInterface } from '@studnicky/logger/interfaces';

/** Captures CVD diagnostic messages in direct task probes. */
export class RecordingLogger implements LoggerInterface {
  readonly warnings: string[] = [];

  child(): LoggerInterface { return this; }
  debug(): void {}
  error(): void {}
  info(): void {}
  trace(): void {}
  warn(data: LogDataEntity.Type): void { this.warnings.push(data.message); }
}
