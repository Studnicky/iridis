import { getAnalogousHues } from './getAnalogousHues.ts';

class GetCompoundHuesOperation {
  static run(baseHue: number, spacing = 30): number[] {
    const analogous = getAnalogousHues(baseHue, spacing);
    const complement = (baseHue + 180) % 360;
    const complementAnalogous = getAnalogousHues(complement, spacing);
    return [...analogous, ...complementAnalogous];
  }
}

export const getCompoundHues = GetCompoundHuesOperation.run;
