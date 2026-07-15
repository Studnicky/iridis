export function getComplementaryHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 180) % 360];
}
