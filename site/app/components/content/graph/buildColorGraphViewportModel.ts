export function translateColorGraphPoints(
  points: readonly number[],
  dx: number,
  dy: number
): Float32Array {
  const next = new Float32Array(points.length);
  for (let index = 0; index < points.length; index += 2) {
    next[index] = (points[index] ?? 0) + dx;
    next[index + 1] = (points[index + 1] ?? 0) + dy;
  }
  return next;
}

export function getColorGraphPointCentroid(
  points: readonly number[]
): readonly [number, number] | null {
  if (points.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  const count = points.length / 2;
  for (let index = 0; index < points.length; index += 2) {
    sumX += points[index] ?? 0;
    sumY += points[index + 1] ?? 0;
  }
  return [sumX / count, sumY / count];
}
