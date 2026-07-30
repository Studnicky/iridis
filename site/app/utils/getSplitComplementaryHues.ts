class GetSplitComplementaryHuesOperation {
  static run(baseHue: number, offset = 30): number[] {
    const complement = (baseHue + 180) % 360;
    return [baseHue, (complement - offset + 360) % 360, (complement + offset) % 360];
  }
}

export const getSplitComplementaryHues = GetSplitComplementaryHuesOperation.run;
