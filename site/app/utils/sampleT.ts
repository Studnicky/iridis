/** Index `i` of `count` evenly-spaced steps, expressed as a 0..1 progress value. */
export function sampleT(i: number, count: number): number {
  return count <= 1 ? 0 : i / (count - 1);
}
