import type { ColorRecordInterface, ContrastAlgorithmType } from '../types/index.ts';
import { clamp01 } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { contrastWcag21 } from './ContrastWcag21.ts';
import { contrastApca } from './ContrastApca.ts';

function getContrast(fg: ColorRecordInterface, bg: ColorRecordInterface, algorithm: ContrastAlgorithmType): number {
  if (algorithm === 'wcag21') {
    return contrastWcag21.apply(fg, bg);
  }
  return Math.abs(contrastApca.apply(fg, bg));
}

function meetsCriteria(contrast: number, minRatio: number): boolean {
  return contrast >= minRatio;
}

export class EnsureContrast {
  readonly 'name' = 'ensureContrast';

  apply(
    foreground: ColorRecordInterface,
    background: ColorRecordInterface,
    minRatio: number,
    algorithm: ContrastAlgorithmType = 'wcag21',
  ): ColorRecordInterface {
    let current = foreground;
    const initialContrast = getContrast(current, background, algorithm);

    if (meetsCriteria(initialContrast, minRatio)) {
      return current;
    }

    const bgL = background.oklch.l;
    const step = foreground.oklch.l < bgL ? -0.02 : 0.02;

    for (let i = 0; i < 50; i++) {
      const newL = clamp01(current.oklch.l + step);
      const candidate = colorRecordFactory.fromOklch(newL, current.oklch.c, current.oklch.h, current.alpha);
      const ratio = getContrast(candidate, background, algorithm);

      if (meetsCriteria(ratio, minRatio)) {
        return candidate;
      }

      if (newL === 0 || newL === 1) {
        return candidate;
      }

      current = candidate;
    }

    return current;
  }
}

/** Singleton instance registered as the `ensureContrast` math primitive. */
export const ensureContrast = new EnsureContrast();
