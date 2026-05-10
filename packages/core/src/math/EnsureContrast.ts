import type { ColorRecordInterface, ContrastAlgorithmType, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { contrastWcag21 } from './ContrastWcag21.ts';
import { contrastApca } from './ContrastApca.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

function isAlgorithm(v: unknown): v is ContrastAlgorithmType {
  return v === 'wcag21' || v === 'apca';
}

function getContrast(fg: ColorRecordInterface, bg: ColorRecordInterface, algorithm: ContrastAlgorithmType): number {
  if (algorithm === 'wcag21') {
    return contrastWcag21.apply(fg, bg) as number;
  }
  // APCA returns signed Lc; absolute value lets us use a single threshold
  // comparison regardless of polarity (text-on-bg vs. bg-on-text).
  return Math.abs(contrastApca.apply(fg, bg) as number);
}

/**
 * Math primitive that nudges a `foreground` color along the OKLCH
 * lightness axis until it satisfies `minRatio` against `background`
 * under the chosen algorithm (`wcag21` or `apca`). Direction is chosen
 * by comparing source vs. background lightness so dark fg/light bg
 * pairs darken further and vice versa.
 *
 * Up to 50 iterations with a 0.02 step; if the lightness rail clips
 * to 0 or 1 before passing, the boundary candidate is returned even
 * if it still falls short — caller is responsible for noticing and
 * choosing a different background.
 */
export class EnsureContrast implements MathPrimitiveInterface {
  readonly 'name' = 'ensureContrast';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [foreground, background, minRatio, algorithm] = args;
    if (!isColorRecord(foreground) || !isColorRecord(background)) {
      throw new Error('EnsureContrast.apply: expected (foreground: ColorRecord, background: ColorRecord, minRatio: number, algorithm: "wcag21" | "apca")');
    }
    if (typeof minRatio !== 'number') {
      throw new Error('EnsureContrast.apply: minRatio must be a number');
    }
    if (!isAlgorithm(algorithm)) {
      throw new Error('EnsureContrast.apply: algorithm must be "wcag21" or "apca"');
    }

    let current = foreground;
    const initialContrast = getContrast(current, background, algorithm);

    if (initialContrast >= minRatio) {
      return current;
    }

    const bgL = background.oklch.l;
    const step = foreground.oklch.l < bgL ? -0.02 : 0.02;

    for (let i = 0; i < 50; i++) {
      const newL = Math.max(0, Math.min(1, current.oklch.l + step));
      const candidate = colorRecordFactory.fromOklch(newL, current.oklch.c, current.oklch.h, current.alpha);
      const ratio = getContrast(candidate, background, algorithm);

      if (ratio >= minRatio) {
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
