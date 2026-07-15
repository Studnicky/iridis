import { sampleT } from './sampleT.ts';

/** `count` evenly-spaced values between `min` and `max`; `single` is the value used when `count === 1` (defaults to the midpoint, but callers may override it since not every gradient's single-step value is the midpoint). */
export function lerpSteps(min: number, max: number, count: number, single: number = (min + max) / 2): number[] {
  const result = Array.from({ 'length': count }, (_, i) => {return (count === 1 ? single : min + sampleT(i, count) * (max - min));});
  return result;
}
