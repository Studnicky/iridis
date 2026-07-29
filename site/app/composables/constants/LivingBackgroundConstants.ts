export namespace LIVING_BACKGROUND {
  export const CYCLE_MS = 11000;
  export const LIVE_FPS = 20;
  export const FRAME_BUDGET_MS = Math.max(1, Math.round(1000 / LIVE_FPS));
}
