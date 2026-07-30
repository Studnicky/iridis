class GetComplementaryHuesOperation {
  static run(baseHue: number): number[] {
    return [baseHue, (baseHue + 180) % 360];
  }
}

export const getComplementaryHues = GetComplementaryHuesOperation.run;
