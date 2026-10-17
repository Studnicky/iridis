import { Hue } from './Hue.ts';

/** Interpolates hue around the 0/360 circle with a resolved sweep strategy. */
class LerpHue {
  private static clockwiseSweep(forwardSweep: number, _backwardSweep: number): number {
    const sweep = forwardSweep;
    return sweep;
  }

  private static counterClockwiseSweep(_forwardSweep: number, backwardSweep: number): number {
    const sweep = -backwardSweep;
    return sweep;
  }

  private static shortestArcSweep(forwardSweep: number, backwardSweep: number): number {
    const sweep = forwardSweep <= backwardSweep ? forwardSweep : -backwardSweep;
    return sweep;
  }

  static clockwise(a: number, b: number, t: number): number {
    const interpolatedHue = LerpHue.of(a, b, t, LerpHue.clockwiseSweep);
    return interpolatedHue;
  }

  static counterClockwise(a: number, b: number, t: number): number {
    const interpolatedHue = LerpHue.of(a, b, t, LerpHue.counterClockwiseSweep);
    return interpolatedHue;
  }

  static shortestArc(a: number, b: number, t: number): number {
    const interpolatedHue = LerpHue.of(a, b, t, LerpHue.shortestArcSweep);
    return interpolatedHue;
  }

  static of(a: number, b: number, t: number, resolveSweep: typeof LerpHue.shortestArcSweep = LerpHue.shortestArcSweep): number {
    const forwardSweep = Hue.normalize(b - a);
    const backwardSweep = Hue.normalize(a - b);
    const sweep = resolveSweep(forwardSweep, backwardSweep);
    const interpolatedHue = Hue.normalize(a + t * sweep);
    return interpolatedHue;
  }
}

export { LerpHue };
