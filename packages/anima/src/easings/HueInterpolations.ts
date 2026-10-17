import { LerpHue } from '@studnicky/iridis-algebra';

import type { HueInterpolationInterface } from '../interfaces/HueInterpolationInterface.ts';

interface HueInterpolationCatalogInterface {
  readonly 'clockwise': HueInterpolationInterface;
  readonly 'counterClockwise': HueInterpolationInterface;
  readonly 'shortestArc': HueInterpolationInterface;
}

export const hueInterpolations: HueInterpolationCatalogInterface = Object.freeze({
  'clockwise': {
    'apply': function apply(from: number, to: number, progress: number): number {
      const result = LerpHue.clockwise(from, to, progress);
      return result;
    }
  },
  'counterClockwise': {
    'apply': function apply(from: number, to: number, progress: number): number {
      const result = LerpHue.counterClockwise(from, to, progress);
      return result;
    }
  },
  'shortestArc': {
    'apply': function apply(from: number, to: number, progress: number): number {
      const result = LerpHue.shortestArc(from, to, progress);
      return result;
    }
  }
});
