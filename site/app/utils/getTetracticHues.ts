class GetTetracticHuesOperation {
  static run(baseHue: number): number[] {
    return [baseHue, (baseHue + 90) % 360, (baseHue + 180) % 360, (baseHue + 270) % 360];
  }
}

export const getTetracticHues = GetTetracticHuesOperation.run;
