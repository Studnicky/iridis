export function getTriadicHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
}
