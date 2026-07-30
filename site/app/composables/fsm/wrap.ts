/** Wraps a wrap-around index into `[0, count)`. */
class WrapOperation {
  static run(index: number, count: number): number {
    return ((index % count) + count) % count;
  }
}

export const wrap = WrapOperation.run;
