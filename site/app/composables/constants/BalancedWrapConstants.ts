export namespace BALANCED_WRAP_CONSTANTS {
  /**
   * Width hysteresis band (px) for `useBalancedWidthLatch.ts`. A container
   * width reading is only accepted as a new row-packing width once it has
   * moved at least this far from the width last packed against. Sized well
   * above the sub-pixel/rounding jitter a debounced `ResizeObserver` can
   * report on an otherwise-static container — the self-sustaining
   * oscillation this constant guards `BalancedWrap.vue` against — and well
   * below the width delta of an actual window resize or orientation
   * change, so real resizes still repack promptly.
   */
  export const WIDTH_HYSTERESIS_PX = 24;
}
