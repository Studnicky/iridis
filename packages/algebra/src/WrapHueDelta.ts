import { Hue } from './Hue.ts';

/** Wraps a hue delta into (-180, 180], the shortest signed angular distance. */
class WrapHueDelta {
  static of(delta: number): number {
    const wrapped = Hue.normalize(delta + 180) - 180;
    const normalizedDelta = wrapped === -180 ? 180 : wrapped;
    return normalizedDelta;
  }
}

export { WrapHueDelta };
