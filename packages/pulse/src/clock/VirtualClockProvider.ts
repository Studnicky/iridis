import type { ClockProviderInterface } from './ClockProviderInterface.ts';

import { UnitInterval } from './UnitInterval.ts';

/**
 * Deterministic clock provider: no real timers. Elapsed time only moves
 * forward when `advance(deltaMs)` is called, making tests fast and
 * reproducible.
 */
export class VirtualClockProvider implements ClockProviderInterface {
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
    return UnitInterval.clamp(this.elapsedMs / this.durationMs);
  }

  advance(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }
}
