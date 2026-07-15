/**
 * The minimal shared abstraction for anything that exposes a live, readable
 * progress value `t` in [0, 1] — the normalized position consumed by
 * iridis-anima's `evaluate`/`evaluateStops`. `ClockBinding` (real and
 * virtual variants) implements this. `ValueBinding` does not: it maps an
 * arbitrary external scalar to `t` on demand via `mapToT`, rather than
 * owning a live-updating `t` of its own.
 */
export type SignalBindingInterfaceType = {
  /** Current progress, clamped to [0, 1]. */
  't': number;
};
