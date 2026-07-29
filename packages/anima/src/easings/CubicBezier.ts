import type { EasingFunctionType } from '../types/index.ts';

const NEWTON_ITERATIONS = 4;

class CubicBezier {
  private static coefficientA(first: number, second: number): number {
    return 1.0 - 3.0 * second + 3.0 * first;
  }

  private static coefficientB(first: number, second: number): number {
    return 3.0 * second - 6.0 * first;
  }

  private static coefficientC(first: number): number {
    return 3.0 * first;
  }

  private static calculate(t: number, first: number, second: number): number {
    return ((CubicBezier.coefficientA(first, second) * t + CubicBezier.coefficientB(first, second)) * t + CubicBezier.coefficientC(first)) * t;
  }

  private static slope(t: number, first: number, second: number): number {
    return 3.0 * CubicBezier.coefficientA(first, second) * t * t + 2.0 * CubicBezier.coefficientB(first, second) * t + CubicBezier.coefficientC(first);
  }

  /**
   * Standard CSS-style cubic-bezier easing over control points (p1x, p1y) and
   * (p2x, p2y), with the curve's endpoints pinned to (0,0) and (1,1). Solves
   * for t given x via Newton-Raphson (falling back to the last guess if the
   * slope degenerates), then evaluates y at that t.
   */
  static create(firstX: number, firstY: number, secondX: number, secondY: number): EasingFunctionType {
    const solveTForX = (x: number): number => {
      let guess = x;
      for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
        const slope = CubicBezier.slope(guess, firstX, secondX);
        if (slope === 0) {return guess;}
        const currentX = CubicBezier.calculate(guess, firstX, secondX) - x;
        guess -= currentX / slope;
      }
      return guess;
    };

    return (t: number): number => {
      if (t <= 0) {return 0;}
      if (t >= 1) {return 1;}
      return CubicBezier.calculate(solveTForX(t), firstY, secondY);
    };
  }
}

export const cubicBezier = CubicBezier.create;
