/** Wraps a wrap-around index into `[0, count)`. */
class WrapOperation {
  static run(index: number, count: number): number {
    const result = ((index % count) + count) % count;
    return result;
  }
}

export const wrap = WrapOperation.run;
