import type { SignalBindingEntity } from '../entities/SignalBindingEntity.ts';

/**
 * Internal provider contract shared by the real-time and virtual clock
 * implementations backing `ClockBinding`. Not part of the public API surface
 * (not re-exported from `src/index.ts`) — `ClockBinding` is the only public
 * entry point, matching the one-public-symbol-per-file convention.
 */
export interface ClockProviderInterface extends SignalBindingEntity.Type {
  /** Manually advances elapsed time by `deltaMs`. Real providers ignore this. */
  advance(deltaMs: number): void;
}
