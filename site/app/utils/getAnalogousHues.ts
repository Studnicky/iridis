class GetAnalogousHuesOperation {
  static run(baseHue: number, spacing = 30): number[] {
    return [baseHue, (baseHue - spacing + 360) % 360, (baseHue + spacing) % 360];
  }
}

export const getAnalogousHues = GetAnalogousHuesOperation.run;
