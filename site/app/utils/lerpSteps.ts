import { sampleT } from './sampleT.ts';

/** `count` evenly-spaced values between `minimum` and `maximum`; `single` is the value used when `count === 1` (defaults to the midpoint, but callers may override it since not every gradient's single-step value is the midpoint). */
class LerpStepsOperation {
  static run(minimum: number, maximum: number, count: number, single: number = (minimum + maximum) / 2): number[] {
    const result = new Array<number>(count);
    for (let index = 0; index < count; index += 1) {
      result[index] = count === 1 ? single : minimum + sampleT(index, count) * (maximum - minimum);
    }
    return result;
  }
}

export const lerpSteps = LerpStepsOperation.run;
