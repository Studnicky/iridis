import { RoleGeometry } from '@studnicky/iridis/tasks';

interface HueTargetArcInterface {
  readonly 'end': number;
  readonly 'start': number;
}

/** Projects a non-wrapping source hue arc through the engine hue-target operation. */
export class HueTargetArcProjection {
  static arcs(
    source: HueTargetArcInterface,
    target: number,
    clamp: number
  ): readonly HueTargetArcInterface[] {
    if (clamp >= 180) {
      return [{ 'end': target, 'start': target }];
    }
    if (clamp <= 0) {
      return [source];
    }
    const boundaries = HueTargetArcProjection.breakpoints(source, target, clamp);
    const result: HueTargetArcInterface[] = [];
    for (let index = 0; index < boundaries.length; index += 1) {
      const boundary = boundaries[index];
      if (boundary === undefined) {
        continue;
      }
      const image = RoleGeometry.hueTowards(boundary, target, clamp);
      result.push({ 'end': image, 'start': image });
      const next = boundaries[index + 1];
      if (next === undefined) {
        continue;
      }
      result.push(...HueTargetArcProjection.segmentArcs(boundary, next, target, clamp));
    }
    const merged = HueTargetArcProjection.merge(result);
    return merged;
  }

  static contains(arcs: readonly HueTargetArcInterface[], hue: number): boolean {
    const normalized = HueTargetArcProjection.normalize(hue);
    const result = arcs.some((arc) => {
      const contains = normalized >= arc.start && normalized <= arc.end;
      const wrapsZero = normalized === 0 && arc.end === 360;
      const result = contains || wrapsZero;
      return result;
    });
    return result;
  }

  private static breakpoints(
    source: HueTargetArcInterface,
    target: number,
    clamp: number
  ): readonly number[] {
    const candidates = [
      source.start,
      source.end,
      HueTargetArcProjection.normalize(target + 180),
      HueTargetArcProjection.normalize(target - clamp),
      HueTargetArcProjection.normalize(target + clamp)
    ];
    const withinSource = candidates.filter((candidate) => {
      const result = candidate >= source.start && candidate <= source.end;
      return result;
    });
    const result = [...new Set(withinSource)].sort((left, right) => {
      const difference = left - right;
      return difference;
    });
    return result;
  }

  private static normalize(value: number): number {
    const result = ((value % 360) + 360) % 360;
    return result;
  }

  private static merge(arcs: readonly HueTargetArcInterface[]): readonly HueTargetArcInterface[] {
    const sorted = [...arcs].sort((left, right) => {
      const difference = left.start - right.start;
      return difference;
    });
    const result: HueTargetArcInterface[] = [];
    for (let index = 0; index < sorted.length; index += 1) {
      const arc = sorted[index];
      const previous = result.at(-1);
      if (arc === undefined) {
        continue;
      }
      if (previous === undefined || arc.start > previous.end) {
        result.push(arc);
        continue;
      }
      result[result.length - 1] = { 'end': Math.max(previous.end, arc.end), 'start': previous.start };
    }
    return result;
  }

  private static segmentArcs(
    start: number,
    end: number,
    target: number,
    clamp: number
  ): readonly HueTargetArcInterface[] {
    const midpoint = (start + end) / 2;
    const delta = ((target - midpoint + 540) % 360) - 180;
    if (delta > clamp) {
      const result = HueTargetArcProjection.wrappedArcs(
        HueTargetArcProjection.normalize(start + clamp),
        HueTargetArcProjection.normalize(end + clamp)
      );
      return result;
    }
    if (delta < -clamp) {
      const result = HueTargetArcProjection.wrappedArcs(
        HueTargetArcProjection.normalize(start - clamp),
        HueTargetArcProjection.normalize(end - clamp)
      );
      return result;
    }
    const result = [{ 'end': target, 'start': target }];
    return result;
  }

  private static wrappedArcs(start: number, end: number): readonly HueTargetArcInterface[] {
    if (Math.abs(end - start) <= 180) {
      return [{ 'end': Math.max(start, end), 'start': Math.min(start, end) }];
    }
    const result = [
      { 'end': Math.min(start, end), 'start': 0 },
      { 'end': 360, 'start': Math.max(start, end) }
    ];
    return result;
  }


}
