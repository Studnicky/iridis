class GetFreeformHuesOperation {
  static run(offsets: number[]): number[] {
    const hues = offsets.slice();
    return hues;
  }
}

export const getFreeformHues = GetFreeformHuesOperation.run;
