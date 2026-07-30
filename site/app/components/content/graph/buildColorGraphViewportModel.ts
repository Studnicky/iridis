export const buildColorGraphViewportModel = class ColorGraphViewportModelBuilder {
  public static pointCentroid(
    points: readonly number[]
  ): readonly [number, number] | null {
    const pointValueCount = points.length;
    if (pointValueCount === 0) {return null;}
    let sumX = 0;
    let sumY = 0;
    const pointCount = pointValueCount / 2;
    for (let index = 0; index < pointValueCount; index += 2) {
      sumX += points[index] ?? 0;
      sumY += points[index + 1] ?? 0;
    }
    return [sumX / pointCount, sumY / pointCount];
  }

  public static translatePoints(
    points: readonly number[],
    dx: number,
    dy: number
  ): Float32Array {
    const pointValueCount = points.length;
    const next = new Float32Array(pointValueCount);
    for (let index = 0; index < pointValueCount; index += 2) {
      next[index] = (points[index] ?? 0) + dx;
      next[index + 1] = (points[index + 1] ?? 0) + dy;
    }
    return next;
  }
};
