import type { EasingFunctionType } from '../types/index.ts';

const NEWTON_ITERATIONS = 4;

function bezierA(a1: number, a2: number): number { return 1.0 - 3.0 * a2 + 3.0 * a1; }
function bezierB(a1: number, a2: number): number { return 3.0 * a2 - 6.0 * a1; }
function bezierC(a1: number): number { return 3.0 * a1; }

function calcBezier(t: number, a1: number, a2: number): number {
  return ((bezierA(a1, a2) * t + bezierB(a1, a2)) * t + bezierC(a1)) * t;
}

function getSlope(t: number, a1: number, a2: number): number {
  return 3.0 * bezierA(a1, a2) * t * t + 2.0 * bezierB(a1, a2) * t + bezierC(a1);
}

/**
 * Standard CSS-style cubic-bezier easing over control points (p1x, p1y) and
 * (p2x, p2y), with the curve's endpoints pinned to (0,0) and (1,1). Solves
 * for t given x via Newton-Raphson (falling back to the last guess if the
 * slope degenerates), then evaluates y at that t.
 */
export const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number): EasingFunctionType => {
  const solveTForX = (x: number): number => {
    let guess = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
      const slope = getSlope(guess, p1x, p2x);
      if (slope === 0) {return guess;}
      const currentX = calcBezier(guess, p1x, p2x) - x;
      guess -= currentX / slope;
    }
    return guess;
  };

  return (t: number): number => {
    if (t <= 0) {return 0;}
    if (t >= 1) {return 1;}
    return calcBezier(solveTForX(t), p1y, p2y);
  };
};
