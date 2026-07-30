class GetMonochromaticHuesOperation {
  static run(baseHue: number): number[] {
    return [baseHue];
  }
}

export const getMonochromaticHues = GetMonochromaticHuesOperation.run;
