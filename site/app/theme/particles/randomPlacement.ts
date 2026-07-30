/** Shared placement helper every renderer uses — a viewport-relative (vw/vh) position so the field scales with the window instead of clipping on a fixed px canvas. */

/** A region, in the same vw/vh scale as the returned placement, no roll is allowed to land inside — re-rolled instead. */
namespace PlacementTypes {
  export type ExclusionRectangleType = Record<'xMax' | 'xMin' | 'yMax' | 'yMin', number>;
}

let activeExclusion: PlacementTypes.ExclusionRectangleType | null = null;
/** Bounds the re-roll loop so a pathologically large exclusion rect can't spin forever — falls back to the last (excluded) roll instead of hanging. */
const MAXIMUM_REROLLS = 20;

class IsInsideExclusionOperation {
  static run(x: number, y: number, rectangle: PlacementTypes.ExclusionRectangleType): boolean {
    return x >= rectangle.xMin && x <= rectangle.xMax && y >= rectangle.yMin && y <= rectangle.yMax;
  }
}

const isInsideExclusion = IsInsideExclusionOperation.run;

class RandomPlacementOperation {
  static run(): { 'x': string; 'y': string } {
    let x = Math.random() * 100;
    let y = Math.random() * 100;
    let attempts = 0;
    while (activeExclusion !== null && isInsideExclusion(x, y, activeExclusion) && attempts < MAXIMUM_REROLLS) {
      x = Math.random() * 100;
      y = Math.random() * 100;
      attempts += 1;
    }
    return { 'x': x.toFixed(2), 'y': y.toFixed(2) };
  }
}

/**
 * Configures (or clears, with `null`) the exclusion rectangle every
 * subsequent `randomPlacement()` roll re-rolls out of, until changed again.
 * Every renderer imports the bare `randomPlacement` name and calls it with no
 * arguments; the attached method lets the ambient background configure a
 * region to avoid for the duration of a placement batch.
 */
class SetExclusionOperation {
  static run(rectangle: PlacementTypes.ExclusionRectangleType | null): void {
    activeExclusion = rectangle;
  }
}

export const randomPlacement = Object.assign(
  RandomPlacementOperation.run,
  { 'setExclusion': SetExclusionOperation.run }
);
