import type { ClockProviderType } from './ClockProviderType.ts';

const clampUnit = (value: number): number => { const result = Math.min(1, Math.max(0, value)); return result; };

/**
 * Real-time clock provider: elapsed time is measured against `Date.now()`
 * from the moment of construction. `advance` is a no-op target for manual
 * stepping and throws, since real time cannot be driven by hand.
 */
export class RealClockProvider implements ClockProviderType {
  private readonly durationMs: number;
  private readonly startedAtMs: number;

  protected constructor(durationMs: number) {
    this.durationMs = durationMs;
    this.startedAtMs = Date.now();
  }

  static create(durationMs: number): RealClockProvider {
    return new RealClockProvider(durationMs);
  }

  get t(): number {
    if (this.durationMs <= 0) {return 1;}
    return clampUnit((Date.now() - this.startedAtMs) / this.durationMs);
  }

  advance(_deltaMs: number): void {
    throw new Error('RealClockProvider does not support manual advance(); use mode: "virtual" instead.');
  }
}
