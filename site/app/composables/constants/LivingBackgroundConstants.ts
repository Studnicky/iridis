export namespace LIVING_BACKGROUND {
  /** Length of one drift cycle between two palette targets. */
  export const CYCLE_MS = 11000;
  /** Upper bound on steps simulated for one display frame. */
  export const STEP_LIMIT_PER_FRAME = 4;
  /** Fixed simulation step; the colour stream records one sample per step. */
  export const STEP_MS = 50;
}
