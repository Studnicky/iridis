import type { ClockProviderType } from './ClockProviderType.ts';

const clampUnit = (value: number): number => { const result = Math.min(1, Math.max(0, value)); return result; };

/**
 * Deterministic clock provider: no real timers. Elapsed time only moves
 * forward when `advance(deltaMs)` is called, making tests fast and
 * reproducible.
 */
export class VirtualClockProvider implements ClockProviderType {
  private readonly durationMs: number;
  private elapsedMs = 0;

  protected constructor(durationMs: number) {
    this.durationMs = durationMs;
  }

  static create(durationMs: number): VirtualClockProvider {
    return new VirtualClockProvider(durationMs);
  }

  get t(): number {
    if (this.durationMs <= 0) {return 1;}
    return clampUnit(this.elapsedMs / this.durationMs);
  }

  advance(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }
}
