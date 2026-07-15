export function getSplitComplementaryHues(baseHue: number, offset = 30): number[] {
  const complement = (baseHue + 180) % 360;
  return [baseHue, (complement - offset + 360) % 360, (complement + offset) % 360];
}
