export function getTetracticHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 90) % 360, (baseHue + 180) % 360, (baseHue + 270) % 360];
}
