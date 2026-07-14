/** Wraps a wrap-around index into `[0, count)`. */
export function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}
