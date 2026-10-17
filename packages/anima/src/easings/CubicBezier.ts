import type { EasingFunctionInterface } from '../interfaces/EasingFunctionInterface.ts';

const NEWTON_ITERATIONS = 4;

class CubicBezier {
  private static coefficientA(first: number, second: number): number {
    const result = 1.0 - 3.0 * second + 3.0 * first;
    return result;
  }

  private static coefficientB(first: number, second: number): number {
    const result = 3.0 * second - 6.0 * first;
    return result;
  }

  private static coefficientC(first: number): number {
    const result = 3.0 * first;
    return result;
  }

  private static calculate(progress: number, first: number, second: number): number {
    const result = ((CubicBezier.coefficientA(first, second) * progress + CubicBezier.coefficientB(first, second)) * progress + CubicBezier.coefficientC(first)) * progress;
    return result;
  }

  private static slope(progress: number, first: number, second: number): number {
    const result = 3.0 * CubicBezier.coefficientA(first, second) * progress * progress + 2.0 * CubicBezier.coefficientB(first, second) * progress + CubicBezier.coefficientC(first);
    return result;
  }

  static create(firstX: number, firstY: number, secondX: number, secondY: number): EasingFunctionInterface {
    const solveProgressForX = (x: number): number => {
      let guess = x;
      for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
        const slope = CubicBezier.slope(guess, firstX, secondX);
        if (slope === 0) {
          return guess;
        }
        const currentX = CubicBezier.calculate(guess, firstX, secondX) - x;
        guess -= currentX / slope;
      }
      return guess;
    };
    const result: EasingFunctionInterface = Object.freeze({
      'apply': function apply(progress: number): number {
        if (progress <= 0) {
          return 0;
        }
        if (progress >= 1) {
          return 1;
        }
        const y = CubicBezier.calculate(solveProgressForX(progress), firstY, secondY);
        return y;
      }
    });
    return result;
  }
}

export const cubicBezier = CubicBezier.create;
