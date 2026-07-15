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

/** Construction options for {@link ClockBinding.create}. */
export type ClockBindingOptionsInterfaceType = {
  /** Duration in milliseconds mapping to `t === 1`. */
  'durationMs': number;
  /** 'real' drives `t` from `Date.now()`; 'virtual' requires manual `advance()`. */
  'mode': 'real' | 'virtual';
};

/** Construction options for {@link ValueBinding.create}. */
export type ValueBindingOptionsInterfaceType = {
  /**
   * Whether out-of-range input clamps to [0, 1]. Defaults to `true`. When
   * `false`, `mapToT` extrapolates linearly and the result can fall outside
   * [0, 1].
   */
  'clamp': boolean | undefined;
  /** Input value mapping to `t === 1`. */
  'max': number;
  /** Input value mapping to `t === 0`. */
  'min': number;
};
