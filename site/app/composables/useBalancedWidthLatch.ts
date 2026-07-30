import { BALANCED_WRAP_CONSTANTS } from '~/composables/constants/BalancedWrapConstants.ts';

/**
 * Schmitt-trigger width latch for `BalancedWrap.vue`'s row packing.
 *
 * A `ResizeObserver`-reported container width can jitter by a few pixels
 * frame-to-frame even when the container hasn't meaningfully changed size
 * (sub-pixel layout rounding, an unrelated sibling reflow). Packing directly
 * against that raw width is unstable whenever the true width sits near a
 * row-count boundary: one reading fits N items per row, the next reading
 * fits N+1, each with a different total height, which moves scroll, which
 * nudges layout again — a self-sustaining oscillation.
 *
 * The returned function only accepts a new width once the raw reading has
 * moved at least `thresholdPx` away from the width last accepted; anything
 * smaller is treated as noise and the previously accepted width is returned
 * unchanged, so packing never flips from noise alone. A genuine resize
 * (window resize, orientation change) moves the raw width by far more than
 * the threshold and is accepted on the very next reading.
 */
class UseBalancedWidthLatchOperation {
  static run(thresholdPx: number = BALANCED_WRAP_CONSTANTS.WIDTH_HYSTERESIS_PX): (rawWidth: number) => number {
    let acceptedWidth: number | undefined;

    function accept(rawWidth: number): number {
      if (acceptedWidth === undefined || Math.abs(rawWidth - acceptedWidth) >= thresholdPx) {
        acceptedWidth = rawWidth;
      }
      return acceptedWidth;
    }

    return accept;
  }
}

export const useBalancedWidthLatch = UseBalancedWidthLatchOperation.run;
