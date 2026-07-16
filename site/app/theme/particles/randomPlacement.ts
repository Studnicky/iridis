/** Shared placement helper every renderer uses — a viewport-relative (vw/vh) position so the field scales with the window instead of clipping on a fixed px canvas. */

/** A region, in the same vw/vh scale as the returned placement, no roll is allowed to land inside — re-rolled instead. */
type ExclusionRectType = { 'xMax': number; 'xMin': number; 'yMax': number; 'yMin': number };

let activeExclusion: ExclusionRectType | null = null;
/** Bounds the re-roll loop so a pathologically large exclusion rect can't spin forever — falls back to the last (excluded) roll instead of hanging. */
const MAX_REROLLS = 20;

function isInsideExclusion(x: number, y: number, rect: ExclusionRectType): boolean {
  return x >= rect.xMin && x <= rect.xMax && y >= rect.yMin && y <= rect.yMax;
}

export function randomPlacement(): { 'x': string; 'y': string } {
  let x = Math.random() * 100;
  let y = Math.random() * 100;
  let attempts = 0;
  while (activeExclusion !== null && isInsideExclusion(x, y, activeExclusion) && attempts < MAX_REROLLS) {
    x = Math.random() * 100;
    y = Math.random() * 100;
    attempts += 1;
  }
  return { 'x': x.toFixed(2), 'y': y.toFixed(2) };
}

/**
 * Configures (or clears, with `null`) the exclusion rectangle every
 * subsequent `randomPlacement()` roll re-rolls out of, until changed again.
 * A namespace merge rather than a second module export: every existing
 * renderer (renderDot.ts, renderStar.ts, …) imports only the bare
 * `randomPlacement` name and calls it with no arguments, so this stays one
 * public symbol while still letting a caller that knows a region to avoid —
 * currently only AmbientBackground.vue, for the hero's text bounding box —
 * configure it for the duration of a placement batch.
 */
export namespace randomPlacement {
  export function setExclusion(rect: ExclusionRectType | null): void {
    activeExclusion = rect;
  }
}
