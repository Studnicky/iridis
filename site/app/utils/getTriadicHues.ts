class GetTriadicHuesOperation {
  static run(baseHue: number): number[] {
    return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
  }
}

export const getTriadicHues = GetTriadicHuesOperation.run;
